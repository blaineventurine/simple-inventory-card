import { StockSeries, ConsumptionBucket } from '../utils/chartData';
import { Utilities } from '../utils/utilities';

const WIDTH = 300;
const HEIGHT = 80;
const PAD_TOP = 6;
const PAD_BOTTOM = 14;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

export interface ChartLabels {
  title: string;
  language: string;
}

function formatDateLabel(timeMs: number, language: string): string {
  return new Date(timeMs).toLocaleDateString(language, { month: 'short', day: 'numeric' });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function axisLabels(start: number, end: number, yMax: number, language: string): string {
  return `
    <text class="chart-label" x="2" y="${PAD_TOP + 8}">${yMax.toLocaleString(language, { maximumFractionDigits: 1 })}</text>
    <text class="chart-label" x="2" y="${HEIGHT - 3}">${formatDateLabel(start, language)}</text>
    <text class="chart-label" x="${WIDTH - 2}" y="${HEIGHT - 3}" text-anchor="end">${formatDateLabel(end, language)}</text>
  `;
}

export function renderStockChart(series: StockSeries, labels: ChartLabels): string {
  if (series.points.length === 0) return '';
  const yMax = Math.max(series.maxQuantity, 1);
  const span = Math.max(series.end - series.start, 1);

  const x = (time: number): number => round2(((time - series.start) / span) * WIDTH);
  const y = (quantity: number): number => round2(PAD_TOP + (1 - quantity / yMax) * PLOT_HEIGHT);

  const [first, ...rest] = series.points;
  let path = `M ${x(first.time)} ${y(first.quantity)}`;
  let lastY = y(first.quantity);
  for (const point of rest) {
    path += ` H ${x(point.time)}`;
    const nextY = y(point.quantity);
    if (nextY !== lastY) {
      path += ` V ${nextY}`;
      lastY = nextY;
    }
  }
  const lastX = x(series.points[series.points.length - 1].time);
  const baseline = PAD_TOP + PLOT_HEIGHT;
  const areaPath = `${path} L ${lastX} ${baseline} L ${x(first.time)} ${baseline} Z`;

  return `
    <div class="chart-block">
      <div class="chart-title">${labels.title}</div>
      <svg class="chart-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="none" role="img" aria-label="${Utilities.sanitizeHtml(labels.title)}">
        <path class="chart-area" d="${areaPath}" />
        <path class="chart-line" d="${path}" fill="none" />
        ${axisLabels(series.start, series.end, yMax, labels.language)}
      </svg>
    </div>
  `;
}

export function renderBarChart(buckets: ConsumptionBucket[], labels: ChartLabels): string {
  if (buckets.length === 0) return '';
  let maxTotal = 0;
  for (const bucket of buckets) {
    if (bucket.total > maxTotal) maxTotal = bucket.total;
  }
  const yMax = Math.max(maxTotal, 1);
  const slot = WIDTH / buckets.length;
  const barWidth = round2(slot * 0.8);

  const bars = buckets
    .map((bucket, index) => {
      const barHeight = round2((bucket.total / yMax) * PLOT_HEIGHT);
      const barX = round2(index * slot + slot * 0.1);
      const barY = round2(PAD_TOP + PLOT_HEIGHT - barHeight);
      return `<rect class="chart-bar" x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="1" />`;
    })
    .join('');

  const start = buckets[0].start;
  // Bucket ends are exclusive (next local midnight); label the last instant inside the range.
  const end = buckets[buckets.length - 1].end - 1;

  return `
    <div class="chart-block">
      <div class="chart-title">${labels.title}</div>
      <svg class="chart-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="none" role="img" aria-label="${Utilities.sanitizeHtml(labels.title)}">
        ${bars}
        ${axisLabels(start, end, yMax, labels.language)}
      </svg>
    </div>
  `;
}
