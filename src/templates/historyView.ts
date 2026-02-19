import { HistoryEvent } from '../types/historyEvent';
import { ItemConsumptionRates } from '../types/consumptionRates';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '../utils/utilities';
import { ELEMENTS } from '../utils/constants';

const EVENT_ICONS: Record<string, string> = {
  add: '➕',
  remove: '❌',
  increment: '⬆️',
  decrement: '⬇️',
  transfer: '↔️',
  update: '✏️',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString();
}

function renderEvent(event: HistoryEvent): string {
  const icon = EVENT_ICONS[event.event_type] || '📝';
  const locationInfo =
    event.event_type === 'transfer' && event.location_from && event.location_to
      ? ` (${Utilities.sanitizeHtml(event.location_from)} → ${Utilities.sanitizeHtml(event.location_to)})`
      : '';

  return `
    <div class="history-event">
      <span class="history-icon">${icon}</span>
      <div class="history-details">
        <span class="history-type">${event.event_type}${locationInfo}</span>
        <span class="history-qty">${event.quantity_before} → ${event.quantity_after} (${event.amount >= 0 ? '+' : ''}${event.amount})</span>
        <span class="history-time">${formatTimestamp(event.timestamp)}</span>
      </div>
    </div>
  `;
}

function getDepletionClass(days: number | null): string {
  if (days === null) return '';
  if (days <= 7) return 'depletion-critical';
  if (days <= 14) return 'depletion-warning';
  return 'depletion-safe';
}

function formatRate(value: number | null, suffix: string): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}${suffix}`;
}

function formatDays(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value)}`;
}

function t(translations: TranslationData, key: string, fallback: string): string {
  return TranslationManager.localize(translations, key, undefined, fallback);
}

export function createHistoryContent(events: HistoryEvent[]): string {
  if (events.length === 0) {
    return '<p class="history-empty">No history recorded yet.</p>';
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

export function createConsumptionView(
  rates: ItemConsumptionRates,
  activeWindow: number | null,
  translations: TranslationData,
): string {
  if (!rates.has_sufficient_data) {
    return `
      <div class="consumption-empty">
        <div class="consumption-empty-icon">📊</div>
        <p class="consumption-empty-title">${t(translations, 'analytics.insufficient_data', 'Not enough data yet')}</p>
        <p class="consumption-empty-detail">${t(translations, 'analytics.insufficient_data_detail', 'Need at least 2 consumption events to calculate rates.')}</p>
      </div>
    `;
  }

  const depletionClass = getDepletionClass(rates.days_until_depletion);
  const windows = [
    { days: 30, label: t(translations, 'analytics.window_30', '30d') },
    { days: 60, label: t(translations, 'analytics.window_60', '60d') },
    { days: 90, label: t(translations, 'analytics.window_90', '90d') },
    { days: null, label: t(translations, 'analytics.window_all', 'All') },
  ];

  const perDay = t(translations, 'analytics.per_day', '/day');

  return `
    <div class="window-pills">
      ${windows
        .map((w) => {
          const isActive = w.days === activeWindow || (w.days === null && activeWindow === null);
          const dataValue = w.days !== null ? String(w.days) : 'all';
          return `<button class="window-pill${isActive ? ' active' : ''}" data-window="${dataValue}">${w.label}</button>`;
        })
        .join('')}
    </div>
    <div class="consumption-metrics">
      <div class="metric-card">
        <div class="metric-value">${formatRate(rates.daily_rate, perDay)}</div>
        <div class="metric-label">${t(translations, 'analytics.daily_rate', 'Daily')}</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${formatRate(rates.weekly_rate, '/wk')}</div>
        <div class="metric-label">${t(translations, 'analytics.weekly_rate', 'Weekly')}</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${depletionClass}">${formatDays(rates.days_until_depletion)}</div>
        <div class="metric-label">${t(translations, 'analytics.days_until_depletion', 'Days Left')}</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${formatDays(rates.avg_restock_days)}</div>
        <div class="metric-label">${t(translations, 'analytics.avg_restock_days', 'Avg Restock')}</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${rates.total_consumed}</div>
        <div class="metric-label">${t(translations, 'analytics.total_consumed', 'Total Used')}</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${rates.decrement_count}</div>
        <div class="metric-label">${t(translations, 'analytics.events_tracked', 'Events')}</div>
      </div>
    </div>
  `;
}

export function createHistoryAndConsumptionView(
  events: HistoryEvent[],
  itemName: string,
  translations: TranslationData,
): string {
  const tabHistory = t(translations, 'analytics.tab_history', 'History');
  const tabConsumption = t(translations, 'analytics.tab_consumption', 'Consumption');

  return `
    <div class="history-view">
      <h3>${tabHistory}: ${Utilities.sanitizeHtml(itemName)}</h3>
      <div class="history-tabs">
        <button class="history-tab active" id="${ELEMENTS.HISTORY_TAB_HISTORY}">${tabHistory}</button>
        <button class="history-tab" id="${ELEMENTS.HISTORY_TAB_CONSUMPTION}">${tabConsumption}</button>
      </div>
      <div id="${ELEMENTS.HISTORY_TAB_CONTENT}">
        ${createHistoryContent(events)}
      </div>
    </div>
  `;
}

/** Backward-compat alias */
export function createHistoryView(
  events: HistoryEvent[],
  itemName: string,
  translations?: TranslationData,
): string {
  return createHistoryAndConsumptionView(events, itemName, translations || {});
}
