import { valueFormatter } from '@/utils/currency';
import { HistoryEvent } from '@/types/historyEvent';
import { ItemConsumptionRates } from '@/types/consumptionRates';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '../utils/utilities';
import { ELEMENTS } from '../utils/constants';
import {
  buildStockSeries,
  buildConsumptionBuckets,
  isTruncated,
  parseHistoryTimestamp,
  DAY_MS,
} from '../utils/chartData';
import { renderStockChart, renderBarChart } from './charts';
import { Tone, formatQuantity, iconCircle, secondaryLine } from './primitives';

export interface ConsumptionFormatOptions {
  currency?: string | undefined;
  language: string;
  requestedLimit: number;
}

interface EventStyle {
  icon: string;
  tone: Tone;
}

/** Timeline icon per `consumption_history.event_type` (coordinator events plus `import`). */
const EVENT_STYLES = new Map<string, EventStyle>([
  ['add', { icon: 'mdi:plus', tone: 'success' }],
  ['increment', { icon: 'mdi:arrow-up', tone: 'success' }],
  ['decrement', { icon: 'mdi:arrow-down', tone: 'primary' }],
  ['transfer', { icon: 'mdi:swap-horizontal', tone: 'primary' }],
  ['update', { icon: 'mdi:pencil-outline', tone: 'primary' }],
  ['import', { icon: 'mdi:import', tone: 'primary' }],
  ['remove', { icon: 'mdi:delete-outline', tone: 'error' }],
]);

const UNKNOWN_EVENT_STYLE: EventStyle = { icon: 'mdi:history', tone: 'disabled' };

interface Depletion {
  className: string;
  tone: Tone;
}

interface MetricTile {
  valueHtml: string;
  label: string;
  tone?: Tone;
  valueClass?: string;
  title?: string | undefined;
}

function formatTimestamp(iso: string): string {
  return new Date(parseHistoryTimestamp(iso)).toLocaleString();
}

function signedAmount(event: HistoryEvent): string {
  let sign = '';
  if (event.quantity_before > event.quantity_after) {
    sign = '-';
  } else if (event.quantity_before < event.quantity_after) {
    sign = '+';
  }
  return `${sign}${formatQuantity(event.amount)}`;
}

function renderEvent(event: HistoryEvent): string {
  const style = EVENT_STYLES.get(event.event_type) ?? UNKNOWN_EVENT_STYLE;
  const locationInfo =
    event.event_type === 'transfer' && event.location_from && event.location_to
      ? ` (${event.location_from} → ${event.location_to})`
      : '';
  const change = `${formatQuantity(event.quantity_before)} → ${formatQuantity(event.quantity_after)} (${signedAmount(event)})`;

  return `
    <div class="history-event">
      ${iconCircle(style.icon, style.tone, true)}
      <div class="history-details">
        <span class="history-type">${Utilities.sanitizeHtml(`${event.event_type}${locationInfo}`)}</span>
        ${secondaryLine([
          { text: change, className: 'history-qty' },
          { text: formatTimestamp(event.timestamp), className: 'history-time' },
        ])}
      </div>
    </div>
  `;
}

function getDepletion(days: number | null): Depletion {
  if (days === null) {
    return { className: '', tone: 'primary' };
  }
  if (days <= 7) {
    return { className: 'depletion-critical', tone: 'error' };
  }
  if (days <= 14) {
    return { className: 'depletion-warning', tone: 'warning' };
  }
  return { className: 'depletion-safe', tone: 'success' };
}

function formatRate(value: number | null, unit: string, suffix: string): string {
  if (value === null) {
    return '—';
  }
  const safeUnit = unit ? ` ${Utilities.sanitizeHtml(unit)}` : '';
  return `${value.toFixed(1)}${safeUnit}${suffix}`;
}

function formatDays(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return `${Math.round(value)}`;
}

function formatCurrency(value: number | null, options: ConsumptionFormatOptions): string {
  if (value === null) {
    return '—';
  }
  return valueFormatter(options.language, options.currency)(value);
}

function t(translations: TranslationData, key: string, fallback: string): string {
  return TranslationManager.localize(translations, key, undefined, fallback);
}

function metricTile(tile: MetricTile): string {
  const valueClass = tile.valueClass ? `metric-value ${tile.valueClass}` : 'metric-value';
  const title = tile.title ? ` title="${Utilities.sanitizeHtml(tile.title)}"` : '';
  return `
      <div class="metric-card si-tint si-tone-${tile.tone ?? 'primary'}">
        <div class="${valueClass}"${title}>${tile.valueHtml}</div>
        <div class="metric-label">${Utilities.sanitizeHtml(tile.label)}</div>
      </div>`;
}

export function createHistoryContent(events: HistoryEvent[]): string {
  if (events.length === 0) {
    return `
      <div class="history-empty">
        ${iconCircle('mdi:history', 'disabled')}
        <p>No history recorded yet.</p>
      </div>
    `;
  }

  return `
    <div class="history-timeline">
      ${events.map(renderEvent).join('')}
    </div>
  `;
}

export function createConsumptionLoading(translations: TranslationData): string {
  const loading = t(translations, 'analytics.loading', 'Loading...');
  return `<div class="consumption-loading"><p>${loading}</p></div>`;
}

function renderWindowPills(activeWindow: number | null, translations: TranslationData): string {
  const windows = [
    { days: 30, label: t(translations, 'analytics.window_30', '30d') },
    { days: 60, label: t(translations, 'analytics.window_60', '60d') },
    { days: 90, label: t(translations, 'analytics.window_90', '90d') },
    { days: null, label: t(translations, 'analytics.window_all', 'All') },
  ];
  return `
    <div class="window-pills">
      ${windows
        .map((w) => {
          const isActive = w.days === activeWindow;
          const dataValue = w.days !== null ? String(w.days) : 'all';
          const classes = isActive
            ? 'si-chip si-tone-primary window-pill active'
            : 'si-chip window-pill';
          return `<button type="button" class="${classes}" data-window="${dataValue}" aria-pressed="${isActive}">${Utilities.sanitizeHtml(w.label)}</button>`;
        })
        .join('')}
    </div>
  `;
}

function renderCharts(
  events: HistoryEvent[],
  activeWindow: number | null,
  translations: TranslationData,
  options: ConsumptionFormatOptions,
  now: number,
): string {
  const series = buildStockSeries(events, activeWindow, now);
  if (!series) {
    return '';
  }

  const stockChart = renderStockChart(series, {
    title: t(translations, 'analytics.stock_level', 'Stock Level'),
    language: options.language,
  });

  const buckets = buildConsumptionBuckets(events, activeWindow, now);
  const hasConsumption = buckets.some((bucket) => bucket.total > 0);
  const barChart = hasConsumption
    ? renderBarChart(buckets, {
        title: t(translations, 'analytics.consumption_over_time', 'Consumption'),
        language: options.language,
      })
    : `<p class="chart-note">${t(translations, 'analytics.no_consumption_in_window', 'No consumption in this window.')}</p>`;

  const hint = isTruncated(events, options.requestedLimit, activeWindow, now)
    ? `<p class="chart-hint">${t(translations, 'analytics.showing_recent_history', 'Showing recent history only')}</p>`
    : '';

  return `<div class="consumption-charts">${stockChart}${barChart}${hint}</div>`;
}

export function createConsumptionView(
  rates: ItemConsumptionRates,
  events: HistoryEvent[],
  activeWindow: number | null,
  translations: TranslationData,
  options: ConsumptionFormatOptions,
): string {
  const now = Date.now();
  const pills = renderWindowPills(activeWindow, translations);
  const charts = renderCharts(events, activeWindow, translations, options, now);

  if (!rates.has_sufficient_data) {
    const detail =
      typeof rates.decrement_count === 'number'
        ? TranslationManager.localize(
            translations,
            'analytics.insufficient_data_progress',
            { count: rates.decrement_count },
            `${rates.decrement_count} of 2 consumption events recorded — decrement this item to start tracking.`,
          )
        : t(
            translations,
            'analytics.insufficient_data_detail',
            'Need at least 2 consumption events to calculate rates.',
          );
    return `
      ${pills}
      ${charts}
      <div class="consumption-empty">
        ${iconCircle('mdi:chart-line', 'disabled')}
        <p class="consumption-empty-title">${t(translations, 'analytics.insufficient_data', 'Not enough data yet')}</p>
        <p class="consumption-empty-detail">${detail}</p>
      </div>
    `;
  }

  const depletion = getDepletion(rates.days_until_depletion);
  const perDay = t(translations, 'analytics.per_day', '/day');
  const perWeek = t(translations, 'analytics.per_week', '/wk');
  const unit = rates.unit || '';
  const safeUnitSuffix = unit ? ` ${Utilities.sanitizeHtml(unit)}` : '';

  let runsOut: string | undefined;
  if (rates.days_until_depletion !== null) {
    const runOutDate = new Date(now + rates.days_until_depletion * DAY_MS).toLocaleDateString(
      options.language,
      { month: 'short', day: 'numeric' },
    );
    runsOut = TranslationManager.localize(
      translations,
      'analytics.runs_out',
      { date: runOutDate },
      `Runs out ~${runOutDate}`,
    );
  }

  const tiles: MetricTile[] = [
    {
      valueHtml: formatRate(rates.daily_rate, unit, perDay),
      label: t(translations, 'analytics.daily_rate', 'Daily'),
    },
    {
      valueHtml: formatRate(rates.weekly_rate, unit, perWeek),
      label: t(translations, 'analytics.weekly_rate', 'Weekly'),
    },
    {
      valueHtml: formatDays(rates.days_until_depletion),
      label: t(translations, 'analytics.days_until_depletion', 'Days Left'),
      tone: depletion.tone,
      valueClass: depletion.className,
      title: runsOut,
    },
    {
      valueHtml: formatDays(rates.avg_restock_days),
      label: t(translations, 'analytics.avg_restock_days', 'Avg Restock'),
    },
    {
      valueHtml: `${rates.total_consumed.toLocaleString(options.language, { maximumFractionDigits: 1 })}${safeUnitSuffix}`,
      label: t(translations, 'analytics.total_consumed', 'Total Used'),
    },
    {
      valueHtml: String(rates.decrement_count),
      label: t(translations, 'analytics.events_tracked', 'Events'),
    },
  ];
  if (rates.total_spend !== null && rates.total_spend > 0) {
    tiles.push(
      {
        valueHtml: formatCurrency(rates.daily_spend_rate, options),
        label: t(translations, 'analytics.daily_spend', 'Daily Spend'),
      },
      {
        valueHtml: formatCurrency(rates.weekly_spend_rate, options),
        label: t(translations, 'analytics.weekly_spend', 'Weekly Spend'),
      },
      {
        valueHtml: formatCurrency(rates.total_spend, options),
        label: t(translations, 'analytics.total_spend', 'Total Spend'),
      },
    );
  }

  return `
    ${pills}
    ${charts}
    <div class="consumption-metrics">
      ${tiles.map(metricTile).join('')}
    </div>
  `;
}

/**
 * History/Consumption segments above the tab content (the history sheet's body, or the item
 * page's section). `idPrefix` keeps the ids unique when both are in the card at once.
 */
export function createHistoryAndConsumptionView(
  events: HistoryEvent[],
  translations: TranslationData,
  idPrefix = '',
): string {
  const historyId = `${idPrefix}${ELEMENTS.HISTORY_TAB_HISTORY}`;
  const consumptionId = `${idPrefix}${ELEMENTS.HISTORY_TAB_CONSUMPTION}`;
  const contentId = `${idPrefix}${ELEMENTS.HISTORY_TAB_CONTENT}`;
  const tabHistory = t(translations, 'analytics.tab_history', 'History');
  const tabConsumption = t(translations, 'analytics.tab_consumption', 'Consumption');

  return `
    <div class="history-view">
      <div class="history-tabs" role="tablist">
        <button type="button" class="si-tone-primary si-tint history-tab active" id="${historyId}" role="tab" aria-selected="true" aria-controls="${contentId}">${Utilities.sanitizeHtml(tabHistory)}</button>
        <button type="button" class="si-tone-primary history-tab" id="${consumptionId}" role="tab" aria-selected="false" aria-controls="${contentId}">${Utilities.sanitizeHtml(tabConsumption)}</button>
      </div>
      <div id="${contentId}" role="tabpanel">
        ${createHistoryContent(events)}
      </div>
    </div>
  `;
}
