import { HistoryEvent } from '../types/historyEvent';
import { Utilities } from '../utils/utilities';

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

export function createHistoryView(events: HistoryEvent[], itemName: string): string {
  if (events.length === 0) {
    return `
      <div class="history-view">
        <h3>History: ${Utilities.sanitizeHtml(itemName)}</h3>
        <p class="history-empty">No history recorded yet.</p>
      </div>
    `;
  }

  return `
    <div class="history-view">
      <h3>History: ${Utilities.sanitizeHtml(itemName)}</h3>
      <div class="history-timeline">
        ${events.map(renderEvent).join('')}
      </div>
    </div>
  `;
}
