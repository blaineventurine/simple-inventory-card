import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { Modals } from '../../src/services/modals';
import { createEditModal } from '../../src/templates/modalTemplates';
import { InventoryConfig, InventoryItem } from '../../src/types/inventory';
import { InventoryServices } from '../../src/types/inventoryServices';
import { BATCH_FIELDS, ELEMENTS } from '../../src/utils/constants';
import { createMockHassEntity, createMockHomeAssistant } from '../testHelpers';

const config: InventoryConfig = { type: 'inventory-card', entity: 'sensor.inventory' };
const milk: InventoryItem = {
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
  batches: [
    {
      id: 'b1',
      quantity: 2,
      expiry_date: '2026-11-01',
      location: 'Fridge',
      unit_price: 0,
      purchased_at: '2026-10-01',
    },
    {
      id: 'b2',
      quantity: 1,
      expiry_date: '',
      location: 'Garage',
      unit_price: 0,
      purchased_at: '2026-10-20',
    },
  ],
};

describe('Modals with the real edit modal and batch editor', () => {
  let host: HTMLElement;
  let root: ShadowRoot;
  let modals: Modals;
  let services: { [K in keyof InventoryServices]: Mock<InventoryServices[K]> };

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.append(host);
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = createEditModal([], {}, [], [], true);
    services = {
      addItem: vi.fn<InventoryServices['addItem']>(),
      updateItem: vi.fn<InventoryServices['updateItem']>().mockResolvedValue({ success: true }),
      updateBatch: vi.fn<InventoryServices['updateBatch']>().mockResolvedValue({ success: true }),
      removeBatch: vi.fn<InventoryServices['removeBatch']>().mockResolvedValue({ success: true }),
      incrementItem: vi
        .fn<InventoryServices['incrementItem']>()
        .mockResolvedValue({ success: true }),
    };
    const hass = createMockHomeAssistant({
      'sensor.inventory': createMockHassEntity('sensor.inventory', {}),
    });
    modals = new Modals(root, services, () => 'inv', vi.fn());
    modals.openEditModal('Milk', () => ({ hass, config, items: [milk] }), {});
  });

  afterEach(() => {
    modals.destroy();
    host.remove();
    vi.useRealTimers();
  });

  function field(selector: string): HTMLInputElement {
    const found = root.querySelector(selector);
    if (!(found instanceof HTMLInputElement)) {
      throw new Error(`missing ${selector}`);
    }
    return found;
  }

  function batchInput(batchId: string, name: string): HTMLInputElement {
    return field(`.batch-editor-row[data-batch-id="${batchId}"] [data-batch-field="${name}"]`);
  }

  it('sends a batch quantity edit without changing the item quantity', async () => {
    expect(field(`#edit-${ELEMENTS.QUANTITY}`).readOnly).toBe(true);
    batchInput('b1', BATCH_FIELDS.QUANTITY).value = '1';

    expect(await modals.saveEditModal(config)).toBe(true);

    expect(services.updateItem).toHaveBeenCalledWith(
      'inv',
      'Milk',
      expect.objectContaining({ quantity: 3 }),
    );
    expect(services.updateBatch).toHaveBeenCalledWith('inv', 'b1', { quantity: 1 });
  });

  it('retries the item update with the stock the integration now holds', async () => {
    batchInput('b1', BATCH_FIELDS.QUANTITY).value = '1';
    batchInput('b1', BATCH_FIELDS.EXPIRY_DATE).value = '2026-12-01';
    batchInput('b1', BATCH_FIELDS.UNIT_PRICE).value = '2.5';
    modals.toggleBatchRemoved('b2');
    services.removeBatch.mockResolvedValueOnce({ success: false, error: 'busy' });

    expect(await modals.saveEditModal(config)).toBe(false);
    expect(services.updateBatch).toHaveBeenCalledWith('inv', 'b1', {
      quantity: 1,
      expiryDate: '2026-12-01',
      unitPrice: 2.5,
    });

    expect(await modals.saveEditModal(config)).toBe(true);

    // b1 is now 1 unit expiring 2026-12-01 at 2.5; b2 (1 unit, no expiry) was still there.
    expect(services.updateItem).toHaveBeenLastCalledWith(
      'inv',
      'Milk',
      expect.objectContaining({ quantity: 2, expiryDate: '2026-12-01', price: 2.5 }),
    );
    expect(services.updateBatch).toHaveBeenCalledTimes(1);
    expect(services.removeBatch).toHaveBeenCalledTimes(2);
  });
});

describe('Adding batches from the edit modal', () => {
  const stocked: InventoryItem = {
    ...milk,
    location: 'Fridge',
    locations: ['Fridge', 'Garage'],
    price: 1.5,
    batches: [
      {
        id: 'b1',
        quantity: 2,
        expiry_date: '2026-11-01',
        location: 'Fridge',
        unit_price: 1.5,
        purchased_at: '2026-10-01',
      },
      {
        id: 'b2',
        quantity: 1,
        expiry_date: '',
        location: 'Garage',
        unit_price: 0,
        purchased_at: '2026-10-20',
      },
    ],
  };

  let host: HTMLElement;
  let root: ShadowRoot;
  let modals: Modals;
  let services: { [K in keyof InventoryServices]: Mock<InventoryServices[K]> };

  function open(item: InventoryItem): void {
    const hass = createMockHomeAssistant({
      'sensor.inventory': createMockHassEntity('sensor.inventory', {}),
    });
    modals.openEditModal(item.name, () => ({ hass, config, items: [item] }), {});
  }

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.append(host);
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = createEditModal([], {}, [], [], true);
    services = {
      addItem: vi.fn<InventoryServices['addItem']>(),
      updateItem: vi.fn<InventoryServices['updateItem']>().mockResolvedValue({ success: true }),
      updateBatch: vi.fn<InventoryServices['updateBatch']>().mockResolvedValue({ success: true }),
      removeBatch: vi.fn<InventoryServices['removeBatch']>().mockResolvedValue({ success: true }),
      incrementItem: vi
        .fn<InventoryServices['incrementItem']>()
        .mockResolvedValue({ success: true }),
    };
    modals = new Modals(root, services, () => 'inv', vi.fn());
  });

  afterEach(() => {
    modals.destroy();
    host.remove();
    vi.useRealTimers();
  });

  function field(selector: string): HTMLInputElement {
    const found = root.querySelector(selector);
    if (!(found instanceof HTMLInputElement)) {
      throw new Error(`missing ${selector}`);
    }
    return found;
  }

  function newRows(): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('[data-new-batch]')];
  }

  function newInput(index: number, name: string): HTMLInputElement {
    const found = newRows()[index]?.querySelector(`[data-batch-field="${name}"]`);
    if (!(found instanceof HTMLInputElement)) {
      throw new Error(`missing new row ${index} ${name}`);
    }
    return found;
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  function mergeNote(index: number): HTMLElement {
    const note = newRows()[index]?.querySelector<HTMLElement>('.batch-merge-note');
    if (!note) {
      throw new Error(`missing merge note ${index}`);
    }
    return note;
  }

  function addButton(): HTMLButtonElement {
    const button = root.querySelector(`#${ELEMENTS.EDIT_BATCH_EDITOR} [data-batch-add]`);
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('missing add batch button');
    }
    return button;
  }

  it('offers "+ Add batch" after the batches and in the empty state', () => {
    open(stocked);
    expect(addButton().textContent?.trim()).toBe('+ Add batch');

    open({ ...stocked, quantity: 0, batches: [] });
    expect(root.querySelector('.batch-editor-empty')).not.toBeNull();
    expect(addButton()).toBeDefined();
  });

  it('appends a blank new-batch row per click before the button, and discards it', () => {
    open(stocked);

    modals.addBatchRow();
    modals.addBatchRow();

    const rows = newRows();
    expect(rows).toHaveLength(2);
    expect(rows[0].dataset.newBatch).not.toBe(rows[1].dataset.newBatch);
    expect(rows[1].nextElementSibling).toBe(addButton());
    expect(newInput(0, BATCH_FIELDS.QUANTITY).value).toBe('');
    expect(newInput(0, BATCH_FIELDS.LOCATION).getAttribute('list')).toBe(
      ELEMENTS.BATCH_LOCATION_OPTIONS,
    );

    modals.discardBatchRow(rows[0].dataset.newBatch ?? '');
    expect(newRows()).toEqual([rows[1]]);
    expect(root.activeElement).toBe(addButton());
  });

  it('says when a new row would top up an existing batch, using the item defaults', () => {
    open(stocked);
    modals.addBatchRow();
    const note = mergeNote(0);
    expect(note.hidden).toBe(true);

    // Blank location → first usual location (Fridge); blank price → item price (1.5).
    type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2026-11-01');
    expect(note.hidden).toBe(false);
    expect(note.textContent).toBe(
      'Will be added to the existing batch (2 L, expires 2026-11-01, Fridge)',
    );

    type(newInput(0, BATCH_FIELDS.UNIT_PRICE), '2');
    expect(note.hidden).toBe(true);

    type(newInput(0, BATCH_FIELDS.UNIT_PRICE), '');
    type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2026-12-01');
    expect(note.hidden).toBe(true);

    // Garage has no price; the default price 1.5 makes it a different batch.
    type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '');
    type(newInput(0, BATCH_FIELDS.LOCATION), 'garage');
    expect(note.hidden).toBe(true);
  });

  it('matches a location typed in other capitals and names the batch as stored', () => {
    open(stocked);
    modals.addBatchRow();
    type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2026-11-01');
    type(newInput(0, BATCH_FIELDS.LOCATION), 'fRIDGE');

    expect(mergeNote(0).hidden).toBe(false);
    expect(mergeNote(0).textContent).toBe(
      'Will be added to the existing batch (2 L, expires 2026-11-01, Fridge)',
    );
  });

  describe('with a single batch, which update_item changes first (D6)', () => {
    const single: InventoryItem = {
      ...stocked,
      quantity: 2,
      batches: (stocked.batches ?? []).slice(0, 1),
    };

    it('uses the item expiry typed in the form, unless the batch row changes it', () => {
      open(single);
      modals.addBatchRow();
      type(field(`#edit-${ELEMENTS.EXPIRY_DATE}`), '2026-12-01');

      type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2026-11-01');
      expect(mergeNote(0).hidden).toBe(true);
      type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2026-12-01');
      expect(mergeNote(0).hidden).toBe(false);
      expect(mergeNote(0).textContent).toBe(
        'Will be added to the existing batch (2 L, expires 2026-12-01, Fridge)',
      );

      type(
        field(
          `.batch-editor-row[data-batch-id="b1"] [data-batch-field="${BATCH_FIELDS.EXPIRY_DATE}"]`,
        ),
        '2026-11-15',
      );
      expect(mergeNote(0).hidden).toBe(true);
      type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2026-11-15');
      expect(mergeNote(0).hidden).toBe(false);
    });

    it('uses the item price typed in the form, unless the batch row changes it', () => {
      open(single);
      modals.addBatchRow();
      type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2026-11-01');
      expect(mergeNote(0).hidden).toBe(false);

      // Blank row price = the new item price 2, which update_item also gives the batch.
      type(field(`#edit-${ELEMENTS.PRICE}`), '2');
      expect(mergeNote(0).hidden).toBe(false);
      type(newInput(0, BATCH_FIELDS.UNIT_PRICE), '1.5');
      expect(mergeNote(0).hidden).toBe(true);

      type(
        field(
          `.batch-editor-row[data-batch-id="b1"] [data-batch-field="${BATCH_FIELDS.UNIT_PRICE}"]`,
        ),
        '1.5',
      );
      // The row keeps its loaded price: the form price applies again.
      expect(mergeNote(0).hidden).toBe(true);
      type(
        field(
          `.batch-editor-row[data-batch-id="b1"] [data-batch-field="${BATCH_FIELDS.UNIT_PRICE}"]`,
        ),
        '1.25',
      );
      type(newInput(0, BATCH_FIELDS.UNIT_PRICE), '1.25');
      expect(mergeNote(0).hidden).toBe(false);
    });
  });

  it('also matches earlier new rows', () => {
    open(stocked);
    modals.addBatchRow();
    modals.addBatchRow();
    type(newInput(0, BATCH_FIELDS.QUANTITY), '2');
    type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2027-01-01');
    type(newInput(0, BATCH_FIELDS.LOCATION), 'Pantry');
    type(newInput(1, BATCH_FIELDS.EXPIRY_DATE), '2027-01-01');
    type(newInput(1, BATCH_FIELDS.LOCATION), 'pantry');

    expect(mergeNote(0).hidden).toBe(true);
    expect(mergeNote(1).hidden).toBe(false);
    expect(mergeNote(1).textContent).toBe(
      'Will be added to the existing batch (2 L, expires 2027-01-01, Pantry)',
    );
  });

  it('also matches batches added by an earlier, partly failed save', async () => {
    open(stocked);
    modals.addBatchRow();
    modals.addBatchRow();
    newInput(0, BATCH_FIELDS.QUANTITY).value = '2';
    newInput(0, BATCH_FIELDS.EXPIRY_DATE).value = '2027-01-01';
    newInput(0, BATCH_FIELDS.LOCATION).value = 'Pantry';
    newInput(1, BATCH_FIELDS.QUANTITY).value = '1';
    services.incrementItem
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'busy' });
    expect(await modals.saveEditModal(config)).toBe(false);

    type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2027-01-01');
    type(newInput(0, BATCH_FIELDS.LOCATION), 'Pantry');

    expect(mergeNote(0).hidden).toBe(false);
    expect(mergeNote(0).textContent).toBe(
      'Will be added to the existing batch (2 L, expires 2027-01-01, Pantry)',
    );
  });

  it('follows location chips removed in the multi-select', () => {
    open(stocked);
    vi.runAllTimers();
    modals.addBatchRow();
    type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2026-11-01');
    expect(mergeNote(0).hidden).toBe(false);

    const remove = root.querySelector<HTMLElement>(
      '.modal-multi-select-chip-remove[data-value="Fridge"]',
    );
    remove?.click();

    expect(field(`#edit-${ELEMENTS.LOCATION}`).value).toBe('Garage');
    expect(mergeNote(0).hidden).toBe(true);
  });

  it('names "none" and "no location" when the matching batch has neither', () => {
    open({
      ...milk,
      quantity: 4,
      batches: [
        {
          id: 'b3',
          quantity: 4,
          expiry_date: '',
          location: '',
          unit_price: 0,
          purchased_at: '2026-10-01',
        },
      ],
    });
    modals.addBatchRow();
    type(newInput(0, BATCH_FIELDS.QUANTITY), '1');

    expect(mergeNote(0).hidden).toBe(false);
    expect(mergeNote(0).textContent).toBe(
      'Will be added to the existing batch (4 L, no expiry, no location)',
    );

    type(newInput(0, BATCH_FIELDS.LOCATION), 'Pantry');
    expect(mergeNote(0).hidden).toBe(true);
  });

  it('follows the item form: a changed price or first location is the new default', () => {
    open(stocked);
    modals.addBatchRow();
    type(newInput(0, BATCH_FIELDS.LOCATION), 'Garage');
    expect(mergeNote(0).hidden).toBe(true);

    type(field(`#edit-${ELEMENTS.PRICE}`), '');
    expect(mergeNote(0).hidden).toBe(false);
    expect(mergeNote(0).textContent).toBe(
      'Will be added to the existing batch (1 L, no expiry, Garage)',
    );
  });

  it('matches the edited, not the loaded, values of existing batches', () => {
    open(stocked);
    modals.addBatchRow();
    type(newInput(0, BATCH_FIELDS.EXPIRY_DATE), '2026-11-01');
    expect(mergeNote(0).hidden).toBe(false);

    modals.toggleBatchRemoved('b1');
    expect(mergeNote(0).hidden).toBe(true);
  });

  it.each(['', '0', '-1'])(
    'blocks every write when a new batch quantity is %j',
    async (quantity) => {
      open(stocked);
      modals.addBatchRow();
      newInput(0, BATCH_FIELDS.QUANTITY).value = quantity;

      expect(await modals.saveEditModal(config)).toBe(false);

      expect(services.updateItem).not.toHaveBeenCalled();
      expect(services.incrementItem).not.toHaveBeenCalled();
      const input = newInput(0, BATCH_FIELDS.QUANTITY);
      expect(input.classList.contains('input-error')).toBe(true);
      expect(root.activeElement).toBe(input);
      expect(root.querySelector('.validation-text')?.textContent).toBe(
        'New batch quantity must be greater than 0',
      );
    },
  );

  it.each([BATCH_FIELDS.EXPIRY_DATE, BATCH_FIELDS.PURCHASED_AT])(
    'blocks every write when the new batch %s is not a date',
    async (dateField) => {
      open(stocked);
      modals.addBatchRow();
      newInput(0, BATCH_FIELDS.QUANTITY).value = '1';
      // Date inputs drop malformed values in browsers; a text fallback keeps them.
      const input = newInput(0, dateField);
      input.type = 'text';
      input.value = '2026-02-31';

      expect(await modals.saveEditModal(config)).toBe(false);

      expect(services.updateItem).not.toHaveBeenCalled();
      expect(services.incrementItem).not.toHaveBeenCalled();
      expect(input.classList.contains('input-error')).toBe(true);
      expect(root.activeElement).toBe(input);
      expect(root.querySelector('.validation-text')?.textContent).toBe(
        'Enter a valid date (YYYY-MM-DD)',
      );
    },
  );

  it('saves the item, then batch edits and removals, then new batches (only set keys)', async () => {
    open(stocked);
    field(`#edit-${ELEMENTS.NAME}`).value = 'Whole milk';
    field(
      `.batch-editor-row[data-batch-id="b1"] [data-batch-field="${BATCH_FIELDS.QUANTITY}"]`,
    ).value = '1';
    modals.toggleBatchRemoved('b2');
    modals.addBatchRow();
    modals.addBatchRow();
    newInput(0, BATCH_FIELDS.QUANTITY).value = '2';
    newInput(0, BATCH_FIELDS.EXPIRY_DATE).value = '2026-12-01';
    newInput(0, BATCH_FIELDS.LOCATION).value = ' Pantry ';
    newInput(0, BATCH_FIELDS.UNIT_PRICE).value = '2.5';
    newInput(0, BATCH_FIELDS.PURCHASED_AT).value = '2026-10-20';
    newInput(1, BATCH_FIELDS.QUANTITY).value = '0.5';

    expect(await modals.saveEditModal(config)).toBe(true);

    expect(services.incrementItem.mock.calls).toEqual([
      [
        'inv',
        'Whole milk',
        2,
        { expiryDate: '2026-12-01', location: 'Pantry', price: 2.5, purchasedAt: '2026-10-20' },
      ],
      ['inv', 'Whole milk', 0.5, {}],
    ]);
    const order = [
      services.updateItem.mock.invocationCallOrder[0],
      services.updateBatch.mock.invocationCallOrder[0],
      services.removeBatch.mock.invocationCallOrder[0],
      ...services.incrementItem.mock.invocationCallOrder,
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(newRows()).toHaveLength(0);
  });

  it('keeps the modal open on a failed new batch and does not resend applied ones', async () => {
    open(stocked);
    modals.addBatchRow();
    modals.addBatchRow();
    newInput(0, BATCH_FIELDS.QUANTITY).value = '2';
    newInput(0, BATCH_FIELDS.EXPIRY_DATE).value = '2026-10-28';
    newInput(0, BATCH_FIELDS.UNIT_PRICE).value = '3';
    newInput(1, BATCH_FIELDS.QUANTITY).value = '1';
    newInput(1, BATCH_FIELDS.LOCATION).value = 'Pantry';
    services.incrementItem
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'Location is full' });

    expect(await modals.saveEditModal(config)).toBe(false);

    expect(root.querySelector('.validation-text')?.textContent).toBe(
      'Error adding batch: Location is full',
    );
    expect(newRows()).toHaveLength(1);
    expect(newInput(0, BATCH_FIELDS.LOCATION).value).toBe('Pantry');
    // The form now holds what the integration derives: 3 + 2, earliest expiry, the new price.
    expect(field(`#edit-${ELEMENTS.QUANTITY}`).value).toBe('5');
    expect(field(`#edit-${ELEMENTS.EXPIRY_DATE}`).value).toBe('2026-10-28');
    expect(field(`#edit-${ELEMENTS.PRICE}`).value).toBe('3');

    expect(await modals.saveEditModal(config)).toBe(true);

    expect(services.incrementItem).toHaveBeenCalledTimes(3);
    expect(services.incrementItem).toHaveBeenLastCalledWith('inv', 'Milk', 1, {
      location: 'Pantry',
    });
    expect(services.updateItem).toHaveBeenLastCalledWith(
      'inv',
      'Milk',
      expect.objectContaining({ quantity: 5, expiryDate: '2026-10-28', price: 3 }),
    );
    expect(field(`#edit-${ELEMENTS.QUANTITY}`).value).toBe('6');
  });

  it('makes the item quantity read-only while a new row exists, even without batches', () => {
    open({ ...milk, quantity: 0, batches: [] });
    const quantity = field(`#edit-${ELEMENTS.QUANTITY}`);
    expect(quantity.readOnly).toBe(false);

    modals.addBatchRow();
    expect(quantity.readOnly).toBe(true);

    modals.discardBatchRow(newRows()[0].dataset.newBatch ?? '');
    expect(quantity.readOnly).toBe(false);
  });

  it('puts back the loaded quantity when a new row locks it, so only the row adds stock', async () => {
    open({ ...milk, quantity: 0, batches: [] });
    const quantity = field(`#edit-${ELEMENTS.QUANTITY}`);
    quantity.value = '3';

    modals.addBatchRow();
    expect(quantity.value).toBe('0');
    newInput(0, BATCH_FIELDS.QUANTITY).value = '2';

    expect(await modals.saveEditModal(config)).toBe(true);

    expect(services.updateItem).toHaveBeenCalledWith(
      'inv',
      'Milk',
      expect.objectContaining({ quantity: 0 }),
    );
    expect(services.incrementItem).toHaveBeenCalledWith('inv', 'Milk', 2, {});
  });

  it('starts every opening without new rows', () => {
    open(stocked);
    modals.addBatchRow();
    open(stocked);
    expect(newRows()).toHaveLength(0);
  });
});
