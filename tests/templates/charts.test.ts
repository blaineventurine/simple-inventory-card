import { describe, it, expect, afterEach } from 'vitest';
import { renderStockChart, renderBarChart } from '../../src/templates/charts';
import { StockSeries, ConsumptionBucket } from '../../src/utils/chartData';

const DAY_MS = 86_400_000;
const NOW = Date.parse('2026-08-12T12:00:00Z');

function makeSeries(overrides: Partial<StockSeries> = {}): StockSeries {
  return {
    points: [
      { time: NOW - 10 * DAY_MS, quantity: 5 },
      { time: NOW - 5 * DAY_MS, quantity: 2 },
      { time: NOW, quantity: 2 },
    ],
    start: NOW - 10 * DAY_MS,
    end: NOW,
    maxQuantity: 5,
    ...overrides,
  };
}

describe('renderStockChart', () => {
  it('renders an svg with a stepped path and area fill', () => {
    const html = renderStockChart(makeSeries(), { title: 'Stock Level', language: 'en' });
    expect(html).toContain('<svg');
    expect(html).toContain('class="chart-svg"');
    expect(html).toContain('chart-line');
    expect(html).toContain('chart-area');
    expect(html).toContain('Stock Level');
  });

  it('shows the y-max and start/end date labels', () => {
    const html = renderStockChart(makeSeries(), { title: 'Stock Level', language: 'en' });
    expect(html).toContain('>5<'); // y-max label
    // start/end labels derived via toLocaleDateString(language, { month: 'short', day: 'numeric' })
    const start = new Date(NOW - 10 * DAY_MS).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
    });
    const end = new Date(NOW).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    expect(html).toContain(start);
    expect(html).toContain(end);
  });

  it('survives a zero-quantity flat series (yMax clamps to 1, no NaN coordinates)', () => {
    const series = makeSeries({
      points: [
        { time: NOW - DAY_MS, quantity: 0 },
        { time: NOW, quantity: 0 },
      ],
      maxQuantity: 0,
    });
    const html = renderStockChart(series, { title: 'Stock Level', language: 'en' });
    expect(html).not.toContain('NaN');
  });

  it('survives a zero-duration series (start === end)', () => {
    const series = makeSeries({
      points: [{ time: NOW, quantity: 3 }],
      start: NOW,
      end: NOW,
      maxQuantity: 3,
    });
    const html = renderStockChart(series, { title: 'Stock Level', language: 'en' });
    expect(html).not.toContain('NaN');
  });
});

describe('chart accessibility and number formatting', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it('gives both svgs an accessible name from the title', () => {
    const stock = renderStockChart(makeSeries(), { title: 'Stock <Level>', language: 'en' });
    expect(stock).toContain('role="img" aria-label="Stock &lt;Level&gt;"');
    const bars = renderBarChart([{ start: NOW - DAY_MS, end: NOW, total: 1 }], {
      title: 'Consumption',
      language: 'en',
    });
    expect(bars).toContain('role="img" aria-label="Consumption"');
  });

  it('rounds a floating-point y-max label', () => {
    const html = renderStockChart(makeSeries({ maxQuantity: 1.1 + 2.2 }), {
      title: 'Stock Level',
      language: 'en',
    });
    expect(html).toContain('>3.3<');
    expect(html).not.toContain('3.3000000000000003');
  });

  it('labels the bar chart end with the last bucket day, not the exclusive end', () => {
    process.env.TZ = 'America/Los_Angeles';
    const start = Date.parse('2026-08-12T07:00:00Z'); // Aug 12 00:00 PDT
    const end = Date.parse('2026-08-13T07:00:00Z'); // Aug 13 00:00 PDT (exclusive)
    const html = renderBarChart([{ start, end, total: 1 }], { title: 'C', language: 'en' });
    expect(html).toContain('>Aug 12<');
    expect(html).not.toContain('Aug 13');
  });
});

describe('renderBarChart', () => {
  function makeBuckets(totals: number[]): ConsumptionBucket[] {
    return totals.map((total, index) => ({
      start: NOW - (totals.length - index) * DAY_MS,
      end: NOW - (totals.length - index - 1) * DAY_MS,
      total,
    }));
  }

  it('renders one rect per bucket', () => {
    const html = renderBarChart(makeBuckets([1, 0, 3]), { title: 'Consumption', language: 'en' });
    const rects = html.match(/<rect class="chart-bar"/g) || [];
    expect(rects).toHaveLength(3);
    expect(html).toContain('Consumption');
  });

  it('scales bars against the max total without NaN on all-zero buckets', () => {
    const html = renderBarChart(makeBuckets([0, 0]), { title: 'Consumption', language: 'en' });
    expect(html).not.toContain('NaN');
  });

  it('returns an empty string for zero buckets (defensive guard)', () => {
    const html = renderBarChart([], { title: 'Consumption', language: 'en' });
    expect(html).toBe('');
  });
});

describe('empty-input guards', () => {
  it('renderStockChart returns an empty string for a series with no points', () => {
    const html = renderStockChart(makeSeries({ points: [] }), {
      title: 'Stock Level',
      language: 'en',
    });
    expect(html).toBe('');
  });
});
