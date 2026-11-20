import { BATCH_FIELDS } from './constants';
import { RestockOptions } from '@/types/batchOptions';

/** Trimmed value of the `[data-batch-field]` input inside `container`; '' when absent. */
export function batchFieldValue(container: ParentNode, field: string): string {
  const input = container.querySelector(`[data-batch-field="${field}"]`);
  return input instanceof HTMLInputElement ? input.value.trim() : '';
}

/** Restock options from a `batchFields` block; blank inputs are left to the integration's defaults (D4). */
export function readRestockFields(container: ParentNode): RestockOptions {
  const restock: RestockOptions = {};
  const expiryDate = batchFieldValue(container, BATCH_FIELDS.EXPIRY_DATE);
  const location = batchFieldValue(container, BATCH_FIELDS.LOCATION);
  const purchasedAt = batchFieldValue(container, BATCH_FIELDS.PURCHASED_AT);
  const price = Number.parseFloat(batchFieldValue(container, BATCH_FIELDS.UNIT_PRICE));
  if (expiryDate) {
    restock.expiryDate = expiryDate;
  }
  if (location) {
    restock.location = location;
  }
  if (purchasedAt) {
    restock.purchasedAt = purchasedAt;
  }
  // The integration stores 0 as "unknown price", so it is never sent as a price.
  if (price > 0) {
    restock.price = price;
  }
  return restock;
}

/** True for a real calendar date written `YYYY-MM-DD`, the only form the integration accepts. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** First non-empty entry of a comma-separated location list ('' when there is none). */
export function firstLocation(locations: string): string {
  return (
    locations
      .split(',')
      .map((location) => location.trim())
      .find((location) => location !== '') ?? ''
  );
}
