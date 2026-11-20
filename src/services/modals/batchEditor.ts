import { BATCH_FIELDS, ELEMENTS } from '../../utils/constants';
import { InventoryBatch, InventoryItem } from '@/types/inventory';
import { BatchUpdate, RestockOptions } from '@/types/batchOptions';
import { InventoryServices } from '@/types/inventoryServices';
import { ServiceResult } from '@/types/serviceResult';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '../translationManager';
import { createBatchEditorRows, createNewBatchRow } from '../../templates/batchEditor';
import {
  batchFieldValue,
  firstLocation,
  isIsoDate,
  readRestockFields,
} from '../../utils/batchFields';

/** Stock a batch holds (or will hold) as far as the D4 merge rule and the item totals see it. */
interface StockEntry {
  quantity: number;
  expiryDate: string;
  location: string;
  unitPrice: number;
}

export type BatchOperation =
  | { kind: 'remove'; batchId: string }
  | { kind: 'update'; batchId: string; update: BatchUpdate }
  /** A new-batch row, sent as an increment; `rowKey` is its `data-new-batch`. */
  | { kind: 'add'; rowKey: string; quantity: number; restock: RestockOptions };

export type BatchEditResult =
  { valid: true; operations: BatchOperation[] } | { valid: false; message: string };

/**
 * The edit modal's batch section. Edits are staged in the form and turned into
 * update/remove/add operations that `Modals.saveEditModal` applies after the item update.
 */
export class BatchEditor {
  private batches: InventoryBatch[] = [];
  private readonly removed = new Set<string>();
  /** New rows applied since opening; part of the item total and expiry (D5), and mergeable (D4). */
  private added: StockEntry[] = [];
  /** The item expiry and price as loaded: update_item only changes what differs from them. */
  private loadedExpiry = '';
  private loadedPrice = 0;
  /** The item quantity update_item must see: the loaded total, then what the batches hold. */
  private stockQuantity = '0';
  private nextRowKey = 0;
  private unit = '';
  private translations: TranslationData = {};
  private stopWatching: (() => void) | undefined = undefined;

  constructor(private readonly shadowRoot: ShadowRoot) {}

  /** Show `item`'s batches; does nothing when the card was rendered without the batches feature. */
  open(item: InventoryItem, translations: TranslationData): void {
    this.stopWatching?.();
    this.stopWatching = undefined;
    this.removed.clear();
    this.added = [];
    this.unit = item.unit;
    this.loadedExpiry = item.expiry_date;
    this.loadedPrice = item.price ?? 0;
    this.stockQuantity = String(item.quantity);
    this.translations = translations;
    const container = this.shadowRoot.getElementById(ELEMENTS.EDIT_BATCH_EDITOR);
    this.batches = container ? [...(item.batches ?? [])] : [];
    if (container) {
      container.innerHTML = createBatchEditorRows(this.batches, translations);
      this.watchMergeInputs(container);
    }
    // D6: with several batches the item has no single expiry to edit; the batches carry it.
    const expiryGroup = this.shadowRoot.getElementById(`edit-${ELEMENTS.EXPIRY_DATE}-group`);
    if (expiryGroup) {
      expiryGroup.hidden = this.batches.length > 1;
    }
    this.syncQuantityLock();
  }

  /** Append a blank new-batch row above the add button and focus its quantity. */
  addRow(): void {
    const container = this.shadowRoot.getElementById(ELEMENTS.EDIT_BATCH_EDITOR);
    if (!container) {
      return;
    }
    const template = document.createElement('template');
    template.innerHTML = createNewBatchRow(`new-${++this.nextRowKey}`, this.translations);
    const row = template.content.firstElementChild;
    container.insertBefore(template.content, container.querySelector('[data-batch-add]'));
    const quantity = row?.querySelector(`[data-batch-field="${BATCH_FIELDS.QUANTITY}"]`);
    if (quantity instanceof HTMLInputElement) {
      quantity.focus();
    }
    this.syncQuantityLock();
    this.updateMergeNotes();
  }

  /** Drop an unsaved new-batch row (✕) and return focus to "+ Add batch". */
  discardRow(rowKey: string): void {
    this.removeNewRow(rowKey);
    const addButton = this.shadowRoot
      .getElementById(ELEMENTS.EDIT_BATCH_EDITOR)
      ?.querySelector('[data-batch-add]');
    if (addButton instanceof HTMLElement) {
      addButton.focus();
    }
  }

  private removeNewRow(rowKey: string): void {
    this.newRows()
      .find((row) => row.dataset.newBatch === rowKey)
      ?.remove();
    this.syncQuantityLock();
    this.updateMergeNotes();
  }

  /** Mark a batch for removal on save, or keep it again. */
  toggleRemoved(batchId: string): void {
    const row = this.row(batchId);
    if (!row) {
      return;
    }
    const removing = !this.removed.delete(batchId);
    if (removing) {
      this.removed.add(batchId);
    }
    row.classList.toggle('batch-removed', removing);
    for (const input of row.querySelectorAll('input')) {
      input.disabled = removing;
    }
    const button = row.querySelector('.batch-remove-btn');
    if (button) {
      button.textContent = removing
        ? this.localize('batches.undo_remove', 'Keep batch')
        : this.localize('batches.remove', 'Remove batch');
    }
    this.updateMergeNotes();
  }

  /**
   * Pending operations — batch edits/removals in batch order (only changed fields), then
   * new batches in row order — or the first invalid input.
   */
  collect(): BatchEditResult {
    const container = this.shadowRoot.getElementById(ELEMENTS.EDIT_BATCH_EDITOR);
    for (const marked of container?.querySelectorAll('.input-error') ?? []) {
      marked.classList.remove('input-error');
    }
    const operations: BatchOperation[] = [];
    for (const batch of this.batches) {
      if (this.removed.has(batch.id)) {
        operations.push({ kind: 'remove', batchId: batch.id });
        continue;
      }
      const row = this.row(batch.id);
      if (!row) {
        continue;
      }

      const quantityText = batchFieldValue(row, BATCH_FIELDS.QUANTITY);
      const quantity = Number(quantityText);
      if (quantityText === '' || !Number.isFinite(quantity) || quantity < 0) {
        return this.invalid(
          row,
          BATCH_FIELDS.QUANTITY,
          this.localize('batches.invalid_quantity', 'Batch quantity must be a number of 0 or more'),
        );
      }
      const unitPrice = this.unitPrice(row);
      if (unitPrice === undefined) {
        return this.invalidUnitPrice(row);
      }
      const purchasedAt = batchFieldValue(row, BATCH_FIELDS.PURCHASED_AT);
      // The integration requires a purchase date; it never accepts a blank one.
      if (purchasedAt === '' && batch.purchased_at !== '') {
        return this.invalid(
          row,
          BATCH_FIELDS.PURCHASED_AT,
          this.localize('batches.invalid_purchased_at', "Purchase date can't be empty"),
        );
      }

      const update: BatchUpdate = {};
      if (quantity !== batch.quantity) {
        update.quantity = quantity;
      }
      const expiryDate = batchFieldValue(row, BATCH_FIELDS.EXPIRY_DATE);
      if (expiryDate !== batch.expiry_date) {
        update.expiryDate = expiryDate;
      }
      const location = batchFieldValue(row, BATCH_FIELDS.LOCATION);
      if (location !== batch.location) {
        update.location = location;
      }
      if (unitPrice !== batch.unit_price) {
        update.unitPrice = unitPrice;
      }
      if (purchasedAt !== batch.purchased_at) {
        update.purchasedAt = purchasedAt;
      }
      if (Object.keys(update).length > 0) {
        operations.push({ kind: 'update', batchId: batch.id, update });
      }
    }

    for (const row of this.newRows()) {
      const quantityText = batchFieldValue(row, BATCH_FIELDS.QUANTITY);
      const quantity = Number(quantityText);
      if (quantityText === '' || !Number.isFinite(quantity) || quantity <= 0) {
        return this.invalid(
          row,
          BATCH_FIELDS.QUANTITY,
          this.localize(
            'batches.invalid_new_quantity',
            'New batch quantity must be greater than 0',
          ),
        );
      }
      if (this.unitPrice(row) === undefined) {
        return this.invalidUnitPrice(row);
      }
      for (const field of [BATCH_FIELDS.EXPIRY_DATE, BATCH_FIELDS.PURCHASED_AT]) {
        const date = batchFieldValue(row, field);
        if (date !== '' && !isIsoDate(date)) {
          return this.invalid(
            row,
            field,
            this.localize('batches.invalid_date', 'Enter a valid date (YYYY-MM-DD)'),
          );
        }
      }
      operations.push({
        kind: 'add',
        rowKey: row.dataset.newBatch ?? '',
        quantity,
        restock: readRestockFields(row),
      });
    }
    return { valid: true, operations };
  }

  /**
   * Run `operations` in order against the item saved as `itemName`; stop at the first failure
   * (message localized, backend text kept).
   */
  async apply(
    services: InventoryServices,
    inventoryId: string,
    itemName: string,
    operations: readonly BatchOperation[],
  ): Promise<ServiceResult> {
    this.snapshotSavedItem();
    for (const operation of operations) {
      let result: ServiceResult;
      if (operation.kind === 'add') {
        result = await services.incrementItem(
          inventoryId,
          itemName,
          operation.quantity,
          operation.restock,
        );
      } else if (operation.kind === 'remove') {
        result = await services.removeBatch(inventoryId, operation.batchId);
      } else {
        result = await services.updateBatch(inventoryId, operation.batchId, operation.update);
      }
      if (!result.success) {
        const error = result.error ?? '';
        return {
          success: false,
          error:
            operation.kind === 'add'
              ? this.localize('batches.add_failed', `Error adding batch: ${error}`, { error })
              : this.localize('batches.update_failed', `Error updating batch: ${error}`, {
                  error,
                }),
        };
      }
      if (operation.kind === 'add') {
        this.markAdded(operation);
      } else {
        this.markApplied(operation);
      }
    }
    return { success: true };
  }

  /**
   * Fold a successful operation into the loaded batches so a retried save does not resend it,
   * and bring the item form in line with what the integration now derives from the batches (D5):
   * a retry resends that form, and D6 would read a stale total or expiry as a stock change.
   */
  private markApplied(operation: Exclude<BatchOperation, { kind: 'add' }>): void {
    // D7: a batch updated to quantity 0 is deleted by the integration, like a removal.
    if (operation.kind === 'remove' || operation.update.quantity === 0) {
      this.removed.delete(operation.batchId);
      this.batches = this.batches.filter((batch) => batch.id !== operation.batchId);
      this.row(operation.batchId)?.remove();
    } else {
      const { update } = operation;
      this.batches = this.batches.map((batch) =>
        batch.id === operation.batchId
          ? {
              ...batch,
              quantity: update.quantity ?? batch.quantity,
              expiry_date: update.expiryDate ?? batch.expiry_date,
              location: update.location ?? batch.location,
              unit_price: update.unitPrice ?? batch.unit_price,
              purchased_at: update.purchasedAt ?? batch.purchased_at,
            }
          : batch,
      );
      // The item's price is the last known unit price; 0 means "unknown" and leaves it.
      if (update.unitPrice !== undefined && update.unitPrice > 0) {
        this.setItemField(ELEMENTS.PRICE, String(update.unitPrice));
      }
    }
    this.syncItemStock();
  }

  /** Like `markApplied` for an added batch: its row goes, its stock counts in the item form. */
  private markAdded(operation: Extract<BatchOperation, { kind: 'add' }>): void {
    this.added.push(this.newStock(operation.quantity, operation.restock));
    this.removeNewRow(operation.rowKey);
    // Only a positive price is ever sent, and it becomes the item's price.
    if (operation.restock.price !== undefined) {
      this.setItemField(ELEMENTS.PRICE, String(operation.restock.price));
    }
    this.syncItemStock();
  }

  /** Item total and earliest expiry as the integration derives them from all its batches. */
  private syncItemStock(): void {
    const stock = [
      ...this.batches.map((batch) => ({
        quantity: batch.quantity,
        expiryDate: batch.expiry_date,
      })),
      ...this.added,
    ];
    const total = stock.reduce((sum, entry) => sum + entry.quantity, 0);
    this.stockQuantity = String(Math.round(total * 1e6) / 1e6);
    this.setItemField(ELEMENTS.QUANTITY, this.stockQuantity);
    const expiries = stock
      .map((entry) => entry.expiryDate)
      .filter((expiry) => expiry !== '')
      .sort();
    this.setItemField(ELEMENTS.EXPIRY_DATE, expiries[0] ?? '');
    this.snapshotSavedItem();
  }

  /**
   * Treat the item form's expiry and price as saved: `update_item` succeeded before any batch
   * operation, and the form is kept in step with the integration after each one.
   */
  private snapshotSavedItem(): void {
    this.loadedExpiry = this.itemField(ELEMENTS.EXPIRY_DATE);
    this.loadedPrice = this.itemPrice();
  }

  /** Re-evaluate the merge notes whenever anything they depend on changes in the edit modal. */
  private watchMergeInputs(container: HTMLElement): void {
    // The item's price and locations are the defaults of a blank price / location (D4).
    const scope = container.closest(`#${ELEMENTS.EDIT_MODAL}`) ?? container;
    const update = (): void => this.updateMergeNotes();
    scope.addEventListener('input', update);
    scope.addEventListener('change', update);
    this.stopWatching = () => {
      scope.removeEventListener('input', update);
      scope.removeEventListener('change', update);
    };
  }

  /**
   * D4: an increment whose expiry, location and unit price equal an existing batch's — or an
   * earlier new row's — tops that batch up. Show it under each new row.
   */
  private updateMergeNotes(): void {
    const rows = this.newRows();
    if (rows.length === 0) {
      return;
    }
    const kept = this.batches.filter((batch) => !this.removed.has(batch.id));
    const candidates: StockEntry[] = [
      ...kept.flatMap((batch) => this.batchStock(batch, kept.length === 1)),
      ...this.added,
    ];

    for (const row of rows) {
      const restock = readRestockFields(row);
      const quantity = Number(batchFieldValue(row, BATCH_FIELDS.QUANTITY));
      const stock = this.newStock(quantity, restock);
      const note = row.querySelector<HTMLElement>('.batch-merge-note');
      const match = candidates.find(
        (candidate) =>
          candidate.expiryDate === stock.expiryDate &&
          candidate.location.toLowerCase() === stock.location.toLowerCase() &&
          candidate.unitPrice === stock.unitPrice,
      );
      // A later row merges into this one once it is added.
      if (quantity > 0 && this.unitPrice(row) !== undefined) {
        candidates.push(stock);
      }
      if (!note) {
        continue;
      }
      note.hidden = !match;
      note.textContent = match ? this.mergeNote(match) : '';
    }
  }

  /**
   * What a batch row will hold once the save has run, or nothing when it will be gone
   * (removed, or edited down to 0 — D7). With a `single` batch, update_item applies a changed
   * item expiry or price to it (D6) unless the row itself changes that field.
   */
  private batchStock(batch: InventoryBatch, single: boolean): StockEntry[] {
    const row = this.row(batch.id);
    const quantity = Number(row ? batchFieldValue(row, BATCH_FIELDS.QUANTITY) : '');
    if (!row || !(quantity > 0)) {
      return [];
    }
    let expiryDate = batchFieldValue(row, BATCH_FIELDS.EXPIRY_DATE);
    let unitPrice = this.unitPrice(row) ?? Number.NaN;
    if (single) {
      const itemExpiry = this.itemField(ELEMENTS.EXPIRY_DATE).trim();
      if (expiryDate === batch.expiry_date && itemExpiry !== this.loadedExpiry) {
        expiryDate = itemExpiry;
      }
      const itemPrice = this.itemPrice();
      if (unitPrice === batch.unit_price && itemPrice !== this.loadedPrice) {
        unitPrice = itemPrice;
      }
    }
    return [
      { quantity, expiryDate, location: batchFieldValue(row, BATCH_FIELDS.LOCATION), unitPrice },
    ];
  }

  /**
   * The batch an increment of `quantity` with `restock` lands in (D4): blank location = the
   * item's first usual location, blank price = the item's price; both read from the item form,
   * which update_item saves before the increments run.
   */
  private newStock(quantity: number, restock: RestockOptions): StockEntry {
    const itemPrice = this.itemPrice();
    return {
      quantity,
      expiryDate: restock.expiryDate ?? '',
      location: restock.location ?? firstLocation(this.itemField(ELEMENTS.LOCATION)),
      unitPrice: restock.price ?? (itemPrice > 0 ? itemPrice : 0),
    };
  }

  private mergeNote(match: StockEntry): string {
    const quantity = `${match.quantity} ${this.unit}`.trim();
    const expiry = match.expiryDate
      ? this.localize('batches.merge_expires', `expires ${match.expiryDate}`, {
          date: match.expiryDate,
        })
      : this.localize('batches.merge_no_expiry', 'no expiry');
    const location = match.location || this.localize('batches.merge_no_location', 'no location');
    return this.localize(
      'batches.merge_note',
      `Will be added to the existing batch (${quantity}, ${expiry}, ${location})`,
      { quantity, expiry, location },
    );
  }

  /** The item form's price; blank (or not a number) = 0, "unknown". */
  private itemPrice(): number {
    const price = Number.parseFloat(this.itemField(ELEMENTS.PRICE));
    return Number.isFinite(price) ? price : 0;
  }

  /** Unit price of a batch row: blank = 0 (unknown); undefined when not a number ≥ 0. */
  private unitPrice(row: HTMLElement): number | undefined {
    const text = batchFieldValue(row, BATCH_FIELDS.UNIT_PRICE);
    const price = text === '' ? 0 : Number(text);
    return Number.isFinite(price) && price >= 0 ? price : undefined;
  }

  private invalidUnitPrice(row: HTMLElement): BatchEditResult {
    return this.invalid(
      row,
      BATCH_FIELDS.UNIT_PRICE,
      this.localize('batches.invalid_unit_price', 'Batch unit price must be a number of 0 or more'),
    );
  }

  /** Raw value of an item field of the edit form; '' when absent. */
  private itemField(element: string): string {
    const input = this.shadowRoot.getElementById(`edit-${element}`);
    return input instanceof HTMLInputElement ? input.value : '';
  }

  /** Set an item field of the edit form; `change` keeps dependent fields (expiry threshold) in sync. */
  private setItemField(element: string, value: string): void {
    const input = this.shadowRoot.getElementById(`edit-${element}`);
    if (input instanceof HTMLInputElement && input.value !== value) {
      input.value = value;
      input.dispatchEvent(new Event('change'));
    }
  }

  /** Flag `field` in `row` as the input to fix and move focus to it. */
  private invalid(row: HTMLElement, field: string, message: string): BatchEditResult {
    const input = row.querySelector(`[data-batch-field="${field}"]`);
    if (input instanceof HTMLInputElement) {
      input.classList.add('input-error');
      input.focus();
    }
    return { valid: false, message };
  }

  private row(batchId: string): HTMLElement | undefined {
    const container = this.shadowRoot.getElementById(ELEMENTS.EDIT_BATCH_EDITOR);
    for (const row of container?.querySelectorAll<HTMLElement>('.batch-editor-row') ?? []) {
      if (row.dataset.batchId === batchId) {
        return row;
      }
    }
    return undefined;
  }

  private newRows(): HTMLElement[] {
    const container = this.shadowRoot.getElementById(ELEMENTS.EDIT_BATCH_EDITOR);
    return [...(container?.querySelectorAll<HTMLElement>('[data-new-batch]') ?? [])];
  }

  /**
   * Batch rows carry the stock; a total typed here as well would be applied on top of them.
   * Read-only keeps the loaded total, so update_item sees no quantity change (D6). New rows
   * lock it too, and put back a total typed before: they add the stock themselves.
   */
  private syncQuantityLock(): void {
    const input = this.shadowRoot.getElementById(`edit-${ELEMENTS.QUANTITY}`);
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const locked = this.batches.length > 0 || this.added.length > 0 || this.newRows().length > 0;
    if (locked) {
      this.setItemField(ELEMENTS.QUANTITY, this.stockQuantity);
    }
    this.lockQuantity(input, locked);
  }

  /** Toggle the read-only total and the hint telling the user where to edit stock instead. */
  private lockQuantity(input: HTMLInputElement, locked: boolean): void {
    input.readOnly = locked;
    const hintId = `${input.id}-hint`;
    let hint = this.shadowRoot.getElementById(hintId);
    if (!hint && locked) {
      hint = document.createElement('small');
      hint.id = hintId;
      hint.className = 'quantity-readonly-hint';
      input.after(hint);
    }
    if (locked) {
      const text = this.localize(
        'batches.quantity_readonly',
        'Total of all batches — edit quantities in the batch list below',
      );
      input.title = text;
      input.setAttribute('aria-describedby', hintId);
      if (hint) {
        hint.textContent = text;
      }
    } else {
      input.removeAttribute('title');
      input.removeAttribute('aria-describedby');
    }
    if (hint) {
      hint.hidden = !locked;
    }
  }

  private localize(key: string, fallback: string, params?: Record<string, string>): string {
    return TranslationManager.localize(this.translations, key, params, fallback);
  }
}
