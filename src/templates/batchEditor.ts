import { ACTIONS, BATCH_FIELDS } from '@/utils/constants';
import { InventoryBatch } from '@/types/inventory';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '@/utils/utilities';
import { batchFields } from './modalPartials/batchFields';
import { button, iconButton } from './primitives';

/**
 * Rows of the edit modal's batch section, pre-filled with each batch's current values,
 * followed by the button that appends a `createNewBatchRow`.
 */
export function createBatchEditorRows(
  batches: readonly InventoryBatch[],
  translations: TranslationData,
): string {
  const addButton = button({
    kind: 'tonal',
    label: TranslationManager.localize(translations, 'batches.add_batch', undefined, '+ Add batch'),
    className: 'batch-add-btn',
    attrs: { 'data-action': ACTIONS.ADD_BATCH_ROW, 'data-batch-add': true },
  });

  if (batches.length === 0) {
    return `<p class="batch-editor-empty">${TranslationManager.localize(
      translations,
      'batches.editor_empty',
      undefined,
      'No stock. Use Restock… on the item row to add a batch.',
    )}</p>${addButton}`;
  }

  const removeLabel = TranslationManager.localize(
    translations,
    'batches.remove',
    undefined,
    'Remove batch',
  );

  const rows = batches
    .map((batch) => {
      const safeId = Utilities.sanitizeHtml(batch.id);
      return `
        <div class="batch-editor-row" data-batch-id="${safeId}">
          <div class="batch-editor-fields">
            ${quantityField(translations, String(batch.quantity))}
            ${batchFields(translations, batch)}
          </div>
          ${button({ kind: 'text', label: removeLabel, className: 'batch-remove-btn', attrs: { 'data-action': ACTIONS.TOGGLE_BATCH_REMOVED, 'data-batch-remove': batch.id } })}
        </div>
      `;
    })
    .join('');
  return `${rows}${addButton}`;
}

/** A blank batch row that becomes an increment on save; `key` identifies it until then. */
export function createNewBatchRow(key: string, translations: TranslationData): string {
  const safeKey = Utilities.sanitizeHtml(key);
  const discardLabel = TranslationManager.localize(
    translations,
    'batches.discard_new',
    undefined,
    'Discard new batch',
  );
  return `
    <div class="batch-editor-row batch-editor-row-new" data-new-batch="${safeKey}">
      <div class="batch-editor-fields">
        ${quantityField(translations, '', ' required')}
        ${batchFields(translations)}
      </div>
      <p class="batch-merge-note" role="status" hidden></p>
      ${iconButton({ icon: 'mdi:close', label: discardLabel, className: 'batch-discard-btn', row: true, attrs: { 'data-action': ACTIONS.DISCARD_BATCH_ROW, 'data-batch-discard': key } })}
    </div>
  `;
}

function quantityField(translations: TranslationData, value: string, attributes = ''): string {
  return `
    <label class="batch-field">
      <span>${TranslationManager.localize(translations, 'modal.quantity', undefined, 'Quantity')}</span>
      <input type="number" data-batch-field="${BATCH_FIELDS.QUANTITY}" min="0" step="any" value="${value}"${attributes} />
    </label>`;
}
