import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildStockSeries,
  buildConsumptionBuckets,
  isTruncated,
  parseHistoryTimestamp,
} from '../../src/utils/chartData';
import { HistoryEvent } from '@/types/historyEvent';
import { must } from '../testHelpers';

const DAY_MS = 86_400_000;
const NOW = Date.parse('2026-08-12T12:00:00Z');

function makeEvent(overrides: Partial<HistoryEvent> = {}): HistoryEvent {
  return {
    id: '1',
    item_id: 'item-1',
    inventory_id: 'inv-1',
    event_type: 'decrement',
    amount: 1,
    quantity_before: 3,
    quantity_after: 2,
    source: 'manual',
    location_from: '',
    location_to: '',
    timestamp: '2026-08-10T10:00:00Z',
    metadata: '',
    ...overrides,
  };
}

// Bucket boundaries are local calendar days; pin a zone west of UTC (with DST) for this file only.
const originalTz = process.env.TZ;
beforeEach(() => {
  process.env.TZ = 'America/Los_Angeles';
});
afterEach(() => {
  if (originalTz === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = originalTz;
  }
});

function daysAgo(n: number): string {
  return new Date(NOW - n * DAY_MS).toISOString();
}

describe('buildStockSeries', () => {
  it('returns null when there are no events', () => {
    expect(buildStockSeries([], 30, NOW)).toBeNull();
  });

  it('returns null when all timestamps are invalid', () => {
    expect(buildStockSeries([makeEvent({ timestamp: 'garbage' })], 30, NOW)).toBeNull();
  });

  it('anchors a finite window at window start with quantity_before of the first in-window event', () => {
    const events = [
      makeEvent({ timestamp: daysAgo(10), quantity_before: 5, quantity_after: 4 }),
      makeEvent({ timestamp: daysAgo(5), quantity_before: 4, quantity_after: 2 }),
    ];
    const series = must(buildStockSeries(events, 30, NOW));

    expect(series.start).toBe(NOW - 30 * DAY_MS);
    expect(series.end).toBe(NOW);
    expect(series.points[0]).toEqual({ time: NOW - 30 * DAY_MS, quantity: 5 });
    expect(series.points[1]).toEqual({ time: NOW - 10 * DAY_MS, quantity: 4 });
    expect(series.points[2]).toEqual({ time: NOW - 5 * DAY_MS, quantity: 2 });
    // extended flat to now at current level
    expect(series.points[3]).toEqual({ time: NOW, quantity: 2 });
    expect(series.maxQuantity).toBe(5);
  });

  it('sorts unsorted events ascending and drops invalid timestamps', () => {
    const events = [
      makeEvent({ timestamp: daysAgo(2), quantity_before: 3, quantity_after: 1 }),
      makeEvent({ timestamp: 'not-a-date' }),
      makeEvent({ timestamp: daysAgo(8), quantity_before: 6, quantity_after: 3 }),
    ];
    const series = must(buildStockSeries(events, 30, NOW));
    const quantities = series.points.map((p) => p.quantity);
    expect(quantities).toEqual([6, 3, 1, 1]);
  });

  it('uses the first event as start for the All window (null)', () => {
    const events = [
      makeEvent({ timestamp: daysAgo(100), quantity_before: 9, quantity_after: 8 }),
      makeEvent({ timestamp: daysAgo(50), quantity_before: 8, quantity_after: 6 }),
    ];
    const series = must(buildStockSeries(events, null, NOW));
    expect(series.start).toBe(NOW - 100 * DAY_MS);
    expect(series.points[0]).toEqual({ time: NOW - 100 * DAY_MS, quantity: 9 });
  });

  it('renders a flat line at the latest level when no events fall inside the window', () => {
    const events = [makeEvent({ timestamp: daysAgo(60), quantity_before: 5, quantity_after: 4 })];
    const series = must(buildStockSeries(events, 30, NOW));
    expect(series.points).toEqual([
      { time: NOW - 30 * DAY_MS, quantity: 4 },
      { time: NOW, quantity: 4 },
    ]);
  });

  it('handles a single in-window event (flat extension to now)', () => {
    const events = [
      makeEvent({
        timestamp: daysAgo(3),
        quantity_before: 2,
        quantity_after: 7,
        event_type: 'increment',
        amount: 5,
      }),
    ];
    const series = must(buildStockSeries(events, 30, NOW));
    expect(series.points.at(-1)).toEqual({ time: NOW, quantity: 7 });
    expect(series.maxQuantity).toBe(7);
  });
});

describe('parseHistoryTimestamp', () => {
  it('treats naive backend timestamps as UTC', () => {
    expect(parseHistoryTimestamp('2026-08-12T10:00:00.123456')).toBe(
      Date.parse('2026-08-12T10:00:00.123Z'),
    );
  });

  it('leaves timestamps with a zone designator unchanged', () => {
    expect(parseHistoryTimestamp('2026-08-12T10:00:00Z')).toBe(Date.parse('2026-08-12T10:00:00Z'));
    expect(parseHistoryTimestamp('2026-08-12T10:00:00+00:00')).toBe(
      Date.parse('2026-08-12T10:00:00Z'),
    );
    expect(parseHistoryTimestamp('2026-08-12T12:00:00+02:00')).toBe(
      Date.parse('2026-08-12T10:00:00Z'),
    );
  });

  it('returns NaN for garbage', () => {
    expect(parseHistoryTimestamp('garbage')).toBeNaN();
  });
});

describe('naive UTC and clock-skew handling', () => {
  const naiveRecent = '2026-08-12T11:30:00.123456'; // 30 min before NOW, backend naive UTC

  it('includes a naive-timestamp event from 30 minutes ago in the stock series', () => {
    const events = [
      makeEvent({ timestamp: daysAgo(5), quantity_before: 5, quantity_after: 3 }),
      makeEvent({ timestamp: naiveRecent, quantity_before: 3, quantity_after: 2 }),
    ];
    const series = must(buildStockSeries(events, 30, NOW));
    expect(series.points.map((p) => p.quantity)).toEqual([5, 3, 2, 2]);
    expect(series.points[2].time).toBe(Date.parse('2026-08-12T11:30:00.123Z'));
  });

  it('counts a naive-timestamp decrement from 30 minutes ago in the last bucket', () => {
    const buckets = buildConsumptionBuckets(
      [makeEvent({ timestamp: naiveRecent, amount: 1 })],
      30,
      NOW,
    );
    expect(must(buckets.at(-1)).total).toBe(1);
  });

  it('clamps events slightly in the future (clock skew) to now instead of dropping them', () => {
    const future = new Date(NOW + 3_600_000).toISOString();
    const events = [
      makeEvent({ timestamp: daysAgo(5), quantity_before: 5, quantity_after: 3 }),
      makeEvent({ timestamp: future, quantity_before: 3, quantity_after: 1, amount: 2 }),
    ];
    const series = must(buildStockSeries(events, 30, NOW));
    expect(series.points.map((p) => p.quantity)).toEqual([5, 3, 1, 1]);
    expect(series.points[2].time).toBe(NOW);
    expect(must(buildConsumptionBuckets(events, 30, NOW).at(-1)).total).toBe(2);
  });
});

describe('buildConsumptionBuckets', () => {
  const total = (buckets: { total: number }[]): number =>
    buckets.reduce((sum, b) => sum + b.total, 0);

  it('creates local calendar-day buckets covering the 30d window', () => {
    const buckets = buildConsumptionBuckets([], 30, NOW);
    // NOW is Aug 12 05:00 PDT; window start Jul 13 05:00 PDT → Jul 13 .. Aug 12 = 31 days
    expect(buckets).toHaveLength(31);
    expect(buckets[0].start).toBe(Date.parse('2026-07-13T07:00:00Z'));
    expect(must(buckets.at(-1)).start).toBe(Date.parse('2026-08-12T07:00:00Z'));
    expect(must(buckets.at(-1)).end).toBe(Date.parse('2026-08-13T07:00:00Z'));
    expect(buckets.every((b) => new Date(b.start).getHours() === 0)).toBe(true);
    expect(buckets.every((b, i) => i === 0 || b.start === buckets[i - 1].end)).toBe(true);
  });

  it('creates 7-day buckets for 60d and 90d windows without over-running the window', () => {
    const sixty = buildConsumptionBuckets(
      [
        makeEvent({ timestamp: daysAgo(62), amount: 4 }), // older than window → excluded
        makeEvent({ timestamp: daysAgo(59), amount: 1 }),
      ],
      60,
      NOW,
    );
    expect(sixty).toHaveLength(9);
    expect(sixty.every((b) => new Date(b.start).getHours() === 0)).toBe(true);
    expect(total(sixty)).toBe(1);
    expect(sixty[0].total).toBe(1);
    expect(buildConsumptionBuckets([], 90, NOW)).toHaveLength(13);
  });

  it('sums only decrement amounts into the right local-day buckets', () => {
    const events = [
      makeEvent({ timestamp: '2026-08-12T08:00:00Z', amount: 2 }), // Aug 12 01:00 PDT
      makeEvent({ timestamp: '2026-08-12T07:30:00Z', amount: 1 }), // Aug 12 00:30 PDT
      makeEvent({ timestamp: '2026-08-12T06:30:00Z', amount: 4 }), // Aug 11 23:30 PDT
      makeEvent({ timestamp: daysAgo(2.5), amount: 8, event_type: 'increment' }), // ignored
      makeEvent({ timestamp: daysAgo(40), amount: 9 }), // outside 30d window
    ];
    const buckets = buildConsumptionBuckets(events, 30, NOW);
    expect(must(buckets.at(-1)).total).toBe(3);
    expect(must(buckets.at(-2)).total).toBe(4);
    expect(total(buckets)).toBe(7);
  });

  it('uses weekly buckets for All when span <= 52 weeks', () => {
    const events = [
      makeEvent({ timestamp: daysAgo(70), amount: 1 }),
      makeEvent({ timestamp: daysAgo(1), amount: 2 }),
    ];
    const buckets = buildConsumptionBuckets(events, null, NOW);
    expect(buckets).toHaveLength(11);
    expect(buckets[0].start).toBeLessThanOrEqual(NOW - 70 * DAY_MS);
    expect(buckets.every((b) => b.end - b.start === 7 * DAY_MS)).toBe(true);
    expect(total(buckets)).toBe(3);
  });

  it('switches to calendar-month buckets for All when weekly would exceed 52 bars', () => {
    const events = [
      makeEvent({ timestamp: daysAgo(500), amount: 1 }), // 2025-03-31
      makeEvent({ timestamp: daysAgo(1), amount: 2 }),
    ];
    const buckets = buildConsumptionBuckets(events, null, NOW);
    // Mar 2025 .. Aug 2026
    expect(buckets).toHaveLength(18);
    expect(buckets.every((b) => new Date(b.start).getDate() === 1)).toBe(true);
    expect(buckets.every((b) => new Date(b.start).getHours() === 0)).toBe(true);
    expect(buckets[0].total).toBe(1);
    expect(must(buckets.at(-1)).total).toBe(2);
  });

  it('keeps day buckets at local midnight across a DST transition', () => {
    const now = Date.parse('2026-11-05T20:00:00Z'); // PST; window spans the Nov 1 fall-back
    const buckets = buildConsumptionBuckets([], 30, now);
    expect(buckets.every((b) => new Date(b.start).getHours() === 0)).toBe(true);
    expect(buckets.some((b) => b.end - b.start === 25 * 3_600_000)).toBe(true);
  });

  it('returns a single empty bucket for All with no decrement events', () => {
    const buckets = buildConsumptionBuckets([], null, NOW);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].total).toBe(0);
  });

  it('clamps an event exactly at now into the last bucket', () => {
    const events = [makeEvent({ timestamp: new Date(NOW).toISOString(), amount: 5 })];
    const buckets = buildConsumptionBuckets(events, 30, NOW);
    expect(must(buckets.at(-1)).total).toBe(5);
  });
});

describe('isTruncated', () => {
  const limit = 3;

  it('is false when fewer events than the requested limit', () => {
    expect(isTruncated([makeEvent()], limit, 30, NOW)).toBe(false);
  });

  it('is true for the All window when the limit was hit', () => {
    const events = [makeEvent(), makeEvent(), makeEvent()];
    expect(isTruncated(events, limit, null, NOW)).toBe(true);
  });

  it('is true for a finite window when limit hit and earliest event is inside the window', () => {
    const events = [
      makeEvent({ timestamp: daysAgo(20) }),
      makeEvent({ timestamp: daysAgo(10) }),
      makeEvent({ timestamp: daysAgo(5) }),
    ];
    expect(isTruncated(events, limit, 30, NOW)).toBe(true);
  });

  it('is false for a finite window when history extends past the window start', () => {
    const events = [
      makeEvent({ timestamp: daysAgo(40) }),
      makeEvent({ timestamp: daysAgo(10) }),
      makeEvent({ timestamp: daysAgo(5) }),
    ];
    expect(isTruncated(events, limit, 30, NOW)).toBe(false);
  });
});
