import { TranslationManager } from '@/services/translationManager';
import { InventoryBatch } from '@/types/inventory';
import { TranslationData } from '@/types/translatableComponent';
import { BATCH_FIELDS, ELEMENTS } from '@/utils/constants';
import { Utilities } from '@/utils/utilities';

type BatchFieldValues = Partial<
  Pick<InventoryBatch, 'expiry_date' | 'location' | 'unit_price' | 'purchased_at'>
>;

/**
 * Expiry / location / unit price / purchase date inputs for one batch. Inputs are
 * addressed by `data-batch-field` inside their container (rows repeat, so no ids);
 * read them back with `readRestockFields` / `batchFieldValue` (utils/batchFields).
 * Without `values.location` the location input hints at the D4 default.
 */
export function batchFields(translations: TranslationData, values: BatchFieldValues = {}): string {
  const label = (key: string, fallback: string): string =>
    TranslationManager.localize(translations, key, undefined, fallback);
  const locationHint =
    values.location === undefined
      ? ` placeholder="${label('batches.location_placeholder', 'Default: first usual location')}"`
      : '';

  return `
    <label class="batch-field">
      <span>${label('modal.expiry_date', 'Expiry Date')}</span>
      <input type="date" data-batch-field="${BATCH_FIELDS.EXPIRY_DATE}" value="${Utilities.sanitizeHtml(values.expiry_date ?? '')}" />
    </label>
    <label class="batch-field">
      <span>${label('modal.location', 'Location')}</span>
      <input type="text" data-batch-field="${BATCH_FIELDS.LOCATION}" list="${ELEMENTS.BATCH_LOCATION_OPTIONS}" value="${Utilities.sanitizeHtml(values.location ?? '')}"${locationHint} />
    </label>
    <label class="batch-field">
      <span>${label('modal.price', 'Unit Price')}</span>
      <input type="number" data-batch-field="${BATCH_FIELDS.UNIT_PRICE}" min="0" step="0.01" value="${values.unit_price ? values.unit_price : ''}" />
    </label>
    <label class="batch-field">
      <span>${label('batches.purchased_at', 'Purchased')}</span>
      <input type="date" data-batch-field="${BATCH_FIELDS.PURCHASED_AT}" value="${Utilities.sanitizeHtml(values.purchased_at ?? '')}" />
    </label>
  `;
}

/** The one `<datalist>` every batch location input suggests from. */
export function batchLocationOptions(locations: readonly string[]): string {
  const options = locations
    .map((location) => `<option value="${Utilities.sanitizeHtml(location)}"></option>`)
    .join('');
  return `<datalist id="${ELEMENTS.BATCH_LOCATION_OPTIONS}">${options}</datalist>`;
}
