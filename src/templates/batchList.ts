import { valueFormatter } from '@/utils/currency';
import { ACTIONS, BATCH_FIELDS, ELEMENTS } from '@/utils/constants';
import { InventoryBatch, InventoryConfig, InventoryItem } from '@/types/inventory';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '@/utils/utilities';
import { expiryTone, getExpiryStatus } from './expiryStatus';
import { batchFields } from './modalPartials/batchFields';
import { Tone, button, formatQuantity, iconButton, secondaryLine } from './primitives';

/** Fallback when no `formatValue` is supplied (isolated calls without `rowOptions`). */
const PLAIN_VALUE = valueFormatter('en', undefined);

/**
 * The batch list inside an item's details panel: one row per batch in the order the
 * integration sent them (D3: next to be consumed first), each with its own take-one
 * button — and Move when the integration supports transfers — plus the restock form.
 */
export function createBatchPanel(
  item: InventoryItem,
  translations: TranslationData,
  config: InventoryConfig | undefined,
  transfers = false,
  formatValue: (value: number) => string = PLAIN_VALUE,
): string {
  const label = (key: string, fallback: string): string =>
    TranslationManager.localize(translations, key, undefined, fallback);
  const rows = (item.batches ?? [])
    .map((batch) => createBatchRow(batch, item, translations, config, transfers, formatValue))
    .join('');
  const listLabel = TranslationManager.localize(
    translations,
    'batches.list_label',
    { name: item.name },
    `Batches of ${item.name}`,
  );
  const target = { 'data-name': item.name };

  return `
    <div class="batch-panel">
      <ul class="batch-list" aria-label="${Utilities.sanitizeHtml(listLabel)}">${rows}</ul>
      ${button({ kind: 'tonal', label: label('batches.restock', 'Restock…'), icon: 'mdi:plus', className: 'restock-open-btn', attrs: { 'data-action': ACTIONS.OPEN_RESTOCK, ...target } })}
      <div class="restock-form" hidden>
        <label class="batch-field">
          <span>${label('scanner.amount', 'Amount')}</span>
          <input type="number" data-batch-field="${BATCH_FIELDS.AMOUNT}" value="1" min="0" step="any" />
        </label>
        ${batchFields(translations)}
        <div class="restock-actions">
          ${button({ kind: 'tonal', label: label('modal.cancel', 'Cancel'), className: 'restock-cancel-btn', attrs: { 'data-action': ACTIONS.CANCEL_RESTOCK, ...target } })}
          ${button({ kind: 'filled', label: label('batches.restock_submit', 'Restock'), className: 'restock-submit-btn', attrs: { 'data-action': ACTIONS.SUBMIT_RESTOCK, ...target } })}
        </div>
      </div>
    </div>
  `;
}

function createBatchRow(
  batch: InventoryBatch,
  item: InventoryItem,
  translations: TranslationData,
  config: InventoryConfig | undefined,
  transfers: boolean,
  formatValue: (value: number) => string,
): string {
  const quantity = `${formatQuantity(batch.quantity)} ${item.unit || ''}`.trim();
  const parts: Array<{ text: string; tone?: Tone | undefined; className?: string }> = [
    { text: quantity, className: 'batch-quantity' },
  ];
  if (config?.show_location !== false && batch.location !== '') {
    parts.push({ text: batch.location, className: 'batch-location' });
  }
  if (config?.show_expiry !== false && batch.expiry_date) {
    const expiry = getExpiryStatus(batch.expiry_date, translations, item.expiry_alert_days);
    parts.push({
      text: expiry.label,
      tone: expiryTone(expiry),
      className: `batch-expiry ${expiry.class}`,
    });
  }
  if (config?.show_price !== false && batch.unit_price > 0) {
    const price = formatValue(batch.unit_price);
    parts.push({
      text: TranslationManager.localize(
        translations,
        'batches.unit_price',
        { price },
        `${price} each`,
      ),
      className: 'batch-price',
    });
  }

  const summary = [quantity, batch.location, batch.expiry_date]
    .filter((part) => part !== '')
    .join(', ');
  const target = { 'data-name': item.name, 'data-batch-id': batch.id };
  const moveButton = transfers
    ? iconButton({
        icon: 'mdi:swap-horizontal',
        label: TranslationManager.localize(
          translations,
          'batches.move_from_batch',
          { batch: summary },
          `Move from batch: ${summary}`,
        ),
        row: true,
        className: 'batch-move-btn',
        attrs: { 'data-action': ACTIONS.OPEN_MOVE, ...target },
      })
    : '';
  const takeOneButton = iconButton({
    icon: 'mdi:minus',
    label: TranslationManager.localize(
      translations,
      'batches.use_from_batch',
      { batch: summary },
      `Use from batch: ${summary}`,
    ),
    row: true,
    className: 'batch-decrement-btn',
    attrs: {
      'data-action': ACTIONS.DECREMENT_BATCH,
      ...target,
      'data-amount': Math.min(1, batch.quantity),
    },
  });

  return `
    <li class="batch-row">
      <div class="batch-row__line">
        ${secondaryLine(parts)}
        <div class="batch-row__actions">${moveButton}${takeOneButton}</div>
      </div>
      ${transfers ? createMoveForm(batch, item.name, translations) : ''}
    </li>
  `;
}

/** A batch row's hidden Move form: amount (default: the whole batch) and destination. */
function createMoveForm(
  batch: InventoryBatch,
  itemName: string,
  translations: TranslationData,
): string {
  const label = (key: string, fallback: string): string =>
    TranslationManager.localize(translations, key, undefined, fallback);
  const target = { 'data-name': itemName, 'data-batch-id': batch.id };
  return `
      <div class="move-form" hidden>
        <label class="batch-field">
          <span>${label('scanner.amount', 'Amount')}</span>
          <input type="number" data-batch-field="${BATCH_FIELDS.AMOUNT}" value="${batch.quantity}" min="0" max="${batch.quantity}" step="any" />
        </label>
        <label class="batch-field">
          <span>${label('batches.move_to', 'Move to')}</span>
          <input type="text" data-batch-field="${BATCH_FIELDS.LOCATION}" list="${ELEMENTS.BATCH_LOCATION_OPTIONS}" value="" />
        </label>
        <div class="move-actions">
          ${button({ kind: 'tonal', label: label('modal.cancel', 'Cancel'), className: 'move-cancel-btn', attrs: { 'data-action': ACTIONS.CANCEL_MOVE, ...target } })}
          ${button({ kind: 'filled', label: label('batches.move_submit', 'Move'), className: 'move-submit-btn', attrs: { 'data-action': ACTIONS.SUBMIT_MOVE, ...target } })}
        </div>
      </div>`;
}
