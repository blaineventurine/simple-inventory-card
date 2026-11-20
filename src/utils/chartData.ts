import { HistoryEvent } from '@/types/historyEvent';

export const DAY_MS = 86_400_000;

export interface StockPoint {
  time: number;
  quantity: number;
}

export interface StockSeries {
  points: StockPoint[];
  start: number;
  end: number;
  maxQuantity: number;
}

export interface ConsumptionBucket {
  start: number;
  end: number;
  total: number;
}

interface TimedEvent extends HistoryEvent {
  timeMs: number;
}

const HAS_TZ_DESIGNATOR = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** Backend history timestamps are naive UTC; JS parses offset-less date-times as local time. */
export function parseHistoryTimestamp(iso: string): number {
  return Date.parse(HAS_TZ_DESIGNATOR.test(iso) ? iso : `${iso}Z`);
}

function parseAndSort(events: HistoryEvent[]): TimedEvent[] {
  return events
    .map((event) => ({ ...event, timeMs: parseHistoryTimestamp(event.timestamp) }))
    .filter((event) => Number.isFinite(event.timeMs))
    .sort((a, b) => a.timeMs - b.timeMs);
}

export function buildStockSeries(
  events: HistoryEvent[],
  windowDays: number | null,
  now: number,
): StockSeries | null {
  const sorted = parseAndSort(events);
  if (sorted.length === 0) return null;

  const start = windowDays !== null ? now - windowDays * DAY_MS : sorted[0].timeMs;
  // Events after `now` (host/browser clock skew) are clamped to now rather than dropped.
  const inWindow = sorted.filter((event) => event.timeMs >= start);

  const points: StockPoint[] = [];
  if (inWindow.length === 0) {
    const level = sorted[sorted.length - 1].quantity_after;
    points.push({ time: start, quantity: level }, { time: now, quantity: level });
  } else {
    points.push({ time: start, quantity: inWindow[0].quantity_before });
    for (const event of inWindow) {
      points.push({ time: Math.min(event.timeMs, now), quantity: event.quantity_after });
    }
    points.push({ time: now, quantity: inWindow[inWindow.length - 1].quantity_after });
  }

  let maxQuantity = 0;
  for (const point of points) {
    if (point.quantity > maxQuantity) maxQuantity = point.quantity;
  }

  return { points, start, end: now, maxQuantity };
}

type BucketUnit = 'day' | 'week' | 'month';

/** End (exclusive) of the k-th local calendar bucket back from today; k = 0 is tomorrow's start. */
function bucketEnd(today: Date, unit: BucketUnit, k: number): number {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  if (unit === 'day') return new Date(y, m, d + 1 - k).getTime();
  if (unit === 'week') return new Date(y, m, d + 1 - 7 * k).getTime();
  return new Date(y, m + 1 - k, 1).getTime();
}

export function buildConsumptionBuckets(
  events: HistoryEvent[],
  windowDays: number | null,
  now: number,
): ConsumptionBucket[] {
  const decrements = parseAndSort(events).filter((event) => event.event_type === 'decrement');

  const start =
    windowDays !== null
      ? now - windowDays * DAY_MS
      : decrements.length > 0
        ? Math.min(decrements[0].timeMs, now)
        : now;

  const spanDays = Math.max((now - start) / DAY_MS, 1);
  let unit: BucketUnit;
  if (windowDays === 30) {
    unit = 'day';
  } else if (windowDays !== null) {
    unit = 'week';
  } else {
    unit = spanDays / 7 > 52 ? 'month' : 'week';
  }

  const nowDate = new Date(now);
  const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  const buckets: ConsumptionBucket[] = [];
  // k = 0 is the bucket containing today; walk back until the window start is covered.
  for (let k = 0; ; k++) {
    const bucketStart = bucketEnd(today, unit, k + 1);
    buckets.unshift({ start: bucketStart, end: bucketEnd(today, unit, k), total: 0 });
    if (bucketStart <= start) break;
  }

  for (const event of decrements) {
    if (event.timeMs < start) continue;
    const index = buckets.findIndex((bucket) => event.timeMs < bucket.end);
    // Events after the last bucket (clock skew) are clamped into today.
    buckets[index === -1 ? buckets.length - 1 : index].total += event.amount;
  }

  return buckets;
}

export function isTruncated(
  events: HistoryEvent[],
  requestedLimit: number,
  windowDays: number | null,
  now: number,
): boolean {
  if (events.length < requestedLimit) return false;
  if (windowDays === null) return true;
  const sorted = parseAndSort(events);
  if (sorted.length === 0) return false;
  return sorted[0].timeMs > now - windowDays * DAY_MS;
}
