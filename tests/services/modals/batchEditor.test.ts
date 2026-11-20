import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { BatchEditor } from '../../../src/services/modals/batchEditor';
import { InventoryBatch, InventoryItem } from '../../../src/types/inventory';
import { InventoryServices } from '../../../src/types/inventoryServices';
import { BATCH_FIELDS, ELEMENTS } from '../../../src/utils/constants';

vi.mock('../../../src/services/translationManager', () => import('../../mocks/translationManager'));

const FRIDGE: InventoryBatch = {
  id: 'b1',
  quantity: 2,
  expiry_date: '2026-11-01',
  location: 'Fridge',
  unit_price: 1.5,
  purchased_at: '2026-10-01',
};
const GARAGE: InventoryBatch = {
  id: 'b2',
  quantity: 1,
  expiry_date: '',
  location: 'Garage',
  unit_price: 0,
  purchased_at: '2026-10-20',
};

function milk(batches: InventoryBatch[]): InventoryItem {
  return {
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    category: '',
    description: '',
    expiry_date: '2026-11-01',
    location: '',
    name: 'Milk',
    quantity: 3,
    todo_list: '',
    unit: 'L',
    batches,
  };
}

describe('BatchEditor', () => {
  let root: ShadowRoot;
  let editor: BatchEditor;
  let services: { [K in keyof InventoryServices]: Mock<InventoryServices[K]> };

  function input(batchId: string, field: string): HTMLInputElement {
    const row = [...root.querySelectorAll<HTMLElement>('.batch-editor-row')].find(
      (candidate) => candidate.dataset.batchId === batchId,
    );
    const found = row?.querySelector(`[data-batch-field="${field}"]`);
    if (!(found instanceof HTMLInputElement)) {
      throw new Error(`missing ${field} for ${batchId}`);
    }
    return found;
  }

  function itemQuantity(): HTMLInputElement {
    const found = root.getElementById(`edit-${ELEMENTS.QUANTITY}`);
    if (!(found instanceof HTMLInputElement)) {
      throw new Error('missing item quantity');
    }
    return found;
  }

  function expiryGroup(): HTMLElement {
    const group = root.getElementById(`edit-${ELEMENTS.EXPIRY_DATE}-group`);
    if (!group) {
      throw new Error('missing expiry group');
    }
    return group;
  }

  beforeEach(() => {
    root = document.createElement('div').attachShadow({ mode: 'open' });
    root.innerHTML = `
      <input id="edit-${ELEMENTS.QUANTITY}" />
      <div class="input-group" id="edit-${ELEMENTS.EXPIRY_DATE}-group"><input id="edit-${ELEMENTS.EXPIRY_DATE}" /></div>
      <div id="${ELEMENTS.EDIT_BATCH_EDITOR}"></div>`;
    editor = new BatchEditor(root);
    services = {
      addItem: vi.fn<InventoryServices['addItem']>(),
      updateItem: vi.fn<InventoryServices['updateItem']>(),
      updateBatch: vi.fn<InventoryServices['updateBatch']>().mockResolvedValue({ success: true }),
      removeBatch: vi.fn<InventoryServices['removeBatch']>().mockResolvedValue({ success: true }),
      incrementItem: vi
        .fn<InventoryServices['incrementItem']>()
        .mockResolvedValue({ success: true }),
    };
  });

  it('renders a row per batch and hides the scalar expiry when there are several', () => {
    editor.open(milk([FRIDGE, GARAGE]), {});

    expect(root.querySelectorAll('.batch-editor-row')).toHaveLength(2);
    expect(expiryGroup().hidden).toBe(true);
  });

  it('keeps the scalar expiry for one batch or none (D6)', () => {
    editor.open(milk([FRIDGE, GARAGE]), {});
    editor.open(milk([FRIDGE]), {});
    expect(expiryGroup().hidden).toBe(false);

    editor.open(milk([]), {});
    expect(expiryGroup().hidden).toBe(false);
  });

  it('has nothing to save when the card was rendered without batches', () => {
    root.getElementById(ELEMENTS.EDIT_BATCH_EDITOR)?.remove();

    editor.open(milk([FRIDGE, GARAGE]), {});

    expect(editor.collect()).toEqual({ valid: true, operations: [] });
    expect(expiryGroup().hidden).toBe(false);
    expect(itemQuantity().readOnly).toBe(false);
  });

  it('locks the item quantity while batch rows carry the stock', () => {
    editor.open(milk([FRIDGE]), {});
    expect(itemQuantity().readOnly).toBe(true);

    editor.open(milk([]), {});
    expect(itemQuantity().readOnly).toBe(false);

    editor.open(milk([FRIDGE, GARAGE]), {});
    root.getElementById(ELEMENTS.EDIT_BATCH_EDITOR)?.remove();
    editor.open(milk([FRIDGE, GARAGE]), {});
    expect(itemQuantity().readOnly).toBe(false);
  });

  it('explains why the item quantity is read-only, and only then', () => {
    const hint = (): HTMLElement | null => root.getElementById(`edit-${ELEMENTS.QUANTITY}-hint`);
    const text = 'Total of all batches — edit quantities in the batch list below';

    editor.open(milk([FRIDGE]), {});
    expect(itemQuantity().title).toBe(text);
    expect(hint()?.textContent).toBe(text);
    expect(hint()?.hidden).toBe(false);
    expect(itemQuantity().getAttribute('aria-describedby')).toBe(`edit-${ELEMENTS.QUANTITY}-hint`);

    editor.open(milk([FRIDGE]), {});
    expect(root.querySelectorAll(`#edit-${ELEMENTS.QUANTITY}-hint`)).toHaveLength(1);

    editor.open(milk([]), {});
    expect(itemQuantity().title).toBe('');
    expect(hint()?.hidden).toBe(true);
    expect(itemQuantity().hasAttribute('aria-describedby')).toBe(false);
  });

  it('collects only the fields that changed', () => {
    editor.open(milk([FRIDGE, GARAGE]), {});
    expect(editor.collect()).toEqual({ valid: true, operations: [] });

    input('b1', BATCH_FIELDS.QUANTITY).value = '1.5';
    input('b1', BATCH_FIELDS.EXPIRY_DATE).value = '';
    input('b2', BATCH_FIELDS.LOCATION).value = 'Fridge';
    input('b2', BATCH_FIELDS.UNIT_PRICE).value = '3';

    expect(editor.collect()).toEqual({
      valid: true,
      operations: [
        { kind: 'update', batchId: 'b1', update: { quantity: 1.5, expiryDate: '' } },
        { kind: 'update', batchId: 'b2', update: { location: 'Fridge', unitPrice: 3 } },
      ],
    });
  });

  it('rejects clearing the purchase date the integration requires', () => {
    editor.open(milk([FRIDGE]), {});
    const purchasedAt = input('b1', BATCH_FIELDS.PURCHASED_AT);
    const focus = vi.spyOn(purchasedAt, 'focus');
    purchasedAt.value = '';

    expect(editor.collect()).toEqual({
      valid: false,
      message: "Purchase date can't be empty",
    });
    expect(purchasedAt.classList.contains('input-error')).toBe(true);
    expect(focus).toHaveBeenCalled();
  });

  it('marks a batch for removal and back', () => {
    editor.open(milk([FRIDGE, GARAGE]), {});
    const row = root.querySelector('.batch-editor-row');
    const button = row?.querySelector('.batch-remove-btn');

    editor.toggleRemoved('b1');
    expect(row?.classList.contains('batch-removed')).toBe(true);
    expect(button?.hasAttribute('aria-pressed')).toBe(false);
    expect(button?.textContent).toBe('Keep batch');
    expect(input('b1', BATCH_FIELDS.QUANTITY).disabled).toBe(true);
    expect(editor.collect()).toEqual({
      valid: true,
      operations: [{ kind: 'remove', batchId: 'b1' }],
    });

    editor.toggleRemoved('b1');
    expect(row?.classList.contains('batch-removed')).toBe(false);
    expect(button?.textContent).toBe('Remove batch');
    expect(input('b1', BATCH_FIELDS.QUANTITY).disabled).toBe(false);
    expect(editor.collect()).toEqual({ valid: true, operations: [] });
  });

  it.each([
    [BATCH_FIELDS.QUANTITY, '', 'Batch quantity must be a number of 0 or more'],
    [BATCH_FIELDS.QUANTITY, '-1', 'Batch quantity must be a number of 0 or more'],
    [BATCH_FIELDS.UNIT_PRICE, '-2', 'Batch unit price must be a number of 0 or more'],
  ])('rejects %s = %j', (field, value, message) => {
    editor.open(milk([FRIDGE]), {});
    input('b1', field).value = value;

    expect(editor.collect()).toEqual({ valid: false, message });
  });

  it('highlights and focuses the invalid batch input, and clears it once fixed', () => {
    editor.open(milk([FRIDGE, GARAGE]), {});
    const quantity = input('b2', BATCH_FIELDS.QUANTITY);
    const focus = vi.spyOn(quantity, 'focus');
    quantity.value = '-1';

    expect(editor.collect().valid).toBe(false);
    expect(quantity.classList.contains('input-error')).toBe(true);
    expect(focus).toHaveBeenCalled();
    expect(input('b1', BATCH_FIELDS.QUANTITY).classList.contains('input-error')).toBe(false);

    quantity.value = '1';
    expect(editor.collect().valid).toBe(true);
    expect(quantity.classList.contains('input-error')).toBe(false);
  });

  it('applies operations in order', async () => {
    editor.open(milk([FRIDGE, GARAGE]), {});

    const result = await editor.apply(services, 'inv', 'Milk', [
      { kind: 'update', batchId: 'b1', update: { quantity: 1 } },
      { kind: 'remove', batchId: 'b2' },
    ]);

    expect(result).toEqual({ success: true });
    expect(services.updateBatch).toHaveBeenCalledWith('inv', 'b1', { quantity: 1 });
    expect(services.removeBatch).toHaveBeenCalledWith('inv', 'b2');
    expect(services.updateBatch.mock.invocationCallOrder[0]).toBeLessThan(
      services.removeBatch.mock.invocationCallOrder[0],
    );
  });

  it('stops at the first failure and does not resend applied changes on retry', async () => {
    editor.open(milk([FRIDGE, GARAGE]), {});
    input('b1', BATCH_FIELDS.QUANTITY).value = '1';
    editor.toggleRemoved('b2');
    services.removeBatch.mockResolvedValueOnce({ success: false, error: 'boom' });

    const first = editor.collect();
    if (!first.valid) {
      throw new Error('expected valid edits');
    }
    expect(await editor.apply(services, 'inv', 'Milk', first.operations)).toEqual({
      success: false,
      error: 'Error updating batch: boom',
    });

    expect(editor.collect()).toEqual({
      valid: true,
      operations: [{ kind: 'remove', batchId: 'b2' }],
    });
  });

  it('drops the row of a batch it removed, so a retry cannot touch it', async () => {
    editor.open(milk([FRIDGE, GARAGE]), {});
    editor.toggleRemoved('b2');

    await editor.apply(services, 'inv', 'Milk', [{ kind: 'remove', batchId: 'b2' }]);

    const rows = [...root.querySelectorAll<HTMLElement>('.batch-editor-row')];
    expect(rows.map((row) => row.dataset.batchId)).toEqual(['b1']);
    expect(editor.collect()).toEqual({ valid: true, operations: [] });
  });

  it('treats a batch set to 0 as removed once the integration applied it (D7)', async () => {
    editor.open(milk([FRIDGE, GARAGE]), {});
    input('b1', BATCH_FIELDS.QUANTITY).value = '0';
    editor.toggleRemoved('b2');
    services.removeBatch.mockResolvedValueOnce({ success: false, error: 'boom' });

    const first = editor.collect();
    if (!first.valid) {
      throw new Error('expected valid edits');
    }
    expect(first.operations[0]).toEqual({
      kind: 'update',
      batchId: 'b1',
      update: { quantity: 0 },
    });
    await editor.apply(services, 'inv', 'Milk', first.operations);

    const rows = [...root.querySelectorAll<HTMLElement>('.batch-editor-row')];
    expect(rows.map((row) => row.dataset.batchId)).toEqual(['b2']);
    expect(editor.collect()).toEqual({
      valid: true,
      operations: [{ kind: 'remove', batchId: 'b2' }],
    });
  });
});
