import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { Modals } from '../../src/services/modals';
import { createAddModal } from '../../src/templates/modalTemplates';
import { InventoryConfig, InventoryItem } from '../../src/types/inventory';
import { InventoryServices } from '../../src/types/inventoryServices';
import { ELEMENTS } from '../../src/utils/constants';
import {
  createMockHassEntity,
  createMockHomeAssistant,
  createMockCardContext,
} from '../testHelpers';

const config: InventoryConfig = { type: 'inventory-card', entity: 'sensor.inventory' };
const milk: InventoryItem = {
  auto_add_enabled: false,
  auto_add_id_to_description_enabled: false,
  category: '',
  description: '',
  expiry_date: '',
  location: '',
  name: 'Milk',
  quantity: 3,
  todo_list: '',
  unit: 'L',
};

describe('Add Item modal: adding a duplicate as a new batch', () => {
  let host: HTMLElement;
  let root: ShadowRoot;
  let modals: Modals;
  let onDataChanged: Mock<() => void>;
  let items: InventoryItem[];
  let services: { [K in keyof InventoryServices]: Mock<InventoryServices[K]> };

  function setUp(batchesEnabled: boolean): void {
    root.innerHTML = createAddModal([], {}, [], [], batchesEnabled);
    const hass = createMockHomeAssistant({
      'sensor.inventory': createMockHassEntity('sensor.inventory', {}),
    });
    modals = new Modals(
      root,
      services,
      () => 'inv',
      onDataChanged,
      () => createMockCardContext({ hass, config, items }),
    );
    modals.openAddModal({});
  }

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.append(host);
    root = host.attachShadow({ mode: 'open' });
    items = [milk];
    onDataChanged = vi.fn<() => void>();
    services = {
      addItem: vi.fn<InventoryServices['addItem']>().mockResolvedValue({ success: true }),
      updateItem: vi.fn<InventoryServices['updateItem']>(),
      updateBatch: vi.fn<InventoryServices['updateBatch']>(),
      removeBatch: vi.fn<InventoryServices['removeBatch']>(),
      incrementItem: vi
        .fn<InventoryServices['incrementItem']>()
        .mockResolvedValue({ success: true }),
    };
  });

  afterEach(() => {
    modals.destroy();
    host.remove();
    vi.useRealTimers();
  });

  function input(element: string): HTMLInputElement {
    const found = root.getElementById(`add-${element}`);
    if (!(found instanceof HTMLInputElement)) {
      throw new Error(`missing add-${element}`);
    }
    return found;
  }

  function fill(values: Record<string, string>): void {
    for (const [element, value] of Object.entries(values)) {
      const found = root.getElementById(`add-${element}`);
      if (!(found instanceof HTMLInputElement || found instanceof HTMLTextAreaElement)) {
        throw new Error(`missing add-${element}`);
      }
      found.value = value;
    }
  }

  function offerButton(): HTMLButtonElement | null {
    const button = root.getElementById(ELEMENTS.ADD_DUPLICATE_BATCH_BTN);
    return button instanceof HTMLButtonElement && !button.closest('[hidden]') ? button : null;
  }

  function errorText(): string | null | undefined {
    return root.querySelector('#add-validation-message .validation-text')?.textContent;
  }

  it('keeps the duplicate error and offers to add the quantity as a batch', async () => {
    setUp(true);
    fill({ [ELEMENTS.NAME]: 'milk', [ELEMENTS.QUANTITY]: '2' });

    expect(await modals.addItem(config)).toBe(false);

    expect(services.addItem).not.toHaveBeenCalled();
    expect(errorText()).toBe('An item named "milk" already exists in this inventory.');
    const button = offerButton();
    expect(button?.textContent).toBe('Add 2 as a new batch of Milk');
    expect(button?.type).toBe('button');
    const noteId = button?.getAttribute('aria-describedby') ?? '';
    expect(root.getElementById(noteId)?.textContent).toBe(
      'Only the quantity, expiry date, first location and unit price are used. Description, category, barcode, aliases and auto-add settings are not changed.',
    );
    expect(root.getElementById(ELEMENTS.ADD_DUPLICATE_BATCH)?.getAttribute('role')).toBe('status');
  });

  it('keeps the label in step with the quantity field', async () => {
    setUp(true);
    fill({ [ELEMENTS.NAME]: 'Milk', [ELEMENTS.QUANTITY]: '2' });
    await modals.addItem(config);

    input(ELEMENTS.QUANTITY).value = '4';
    input(ELEMENTS.QUANTITY).dispatchEvent(new Event('input'));

    expect(offerButton()?.textContent).toBe('Add 4 as a new batch of Milk');
  });

  it('withdraws the offer when the name changes', async () => {
    setUp(true);
    fill({ [ELEMENTS.NAME]: 'Milk', [ELEMENTS.QUANTITY]: '2' });
    await modals.addItem(config);

    input(ELEMENTS.NAME).value = 'Oat milk';
    input(ELEMENTS.NAME).dispatchEvent(new Event('input'));

    expect(offerButton()).toBeNull();
  });

  it('only shows the duplicate error without the batches feature', async () => {
    setUp(false);
    fill({ [ELEMENTS.NAME]: 'Milk', [ELEMENTS.QUANTITY]: '2' });

    expect(await modals.addItem(config)).toBe(false);

    expect(errorText()).toBe('An item named "Milk" already exists in this inventory.');
    expect(root.getElementById(ELEMENTS.ADD_DUPLICATE_BATCH_BTN)).toBeNull();
  });

  it('restocks the existing item with the batch fields only, then clears and refreshes', async () => {
    setUp(true);
    fill({
      [ELEMENTS.NAME]: 'MILK',
      [ELEMENTS.QUANTITY]: '2',
      [ELEMENTS.EXPIRY_DATE]: '2026-12-01',
      [ELEMENTS.LOCATION]: ' , Pantry, Fridge',
      [ELEMENTS.PRICE]: '1.25',
      [ELEMENTS.DESCRIPTION]: 'Semi-skimmed',
    });
    await modals.addItem(config);

    expect(await modals.addItemAsBatch(config)).toBe(true);

    expect(services.incrementItem).toHaveBeenCalledWith('inv', 'Milk', 2, {
      expiryDate: '2026-12-01',
      location: 'Pantry',
      price: 1.25,
    });
    expect(services.addItem).not.toHaveBeenCalled();
    expect(services.updateItem).not.toHaveBeenCalled();
    expect(onDataChanged).toHaveBeenCalledTimes(1);
    expect(input(ELEMENTS.NAME).value).toBe('');
    expect(offerButton()).toBeNull();
  });

  it('sends only the quantity when no batch field is filled in', async () => {
    setUp(true);
    fill({ [ELEMENTS.NAME]: 'Milk', [ELEMENTS.QUANTITY]: '1', [ELEMENTS.PRICE]: '0' });
    await modals.addItem(config);

    expect(await modals.addItemAsBatch(config)).toBe(true);

    expect(services.incrementItem).toHaveBeenCalledWith('inv', 'Milk', 1, {});
  });

  it.each(['', '0'])('asks for a quantity above 0 (got %j) before adding', async (quantity) => {
    setUp(true);
    fill({ [ELEMENTS.NAME]: 'Milk', [ELEMENTS.QUANTITY]: '2' });
    await modals.addItem(config);
    input(ELEMENTS.QUANTITY).value = quantity;

    expect(await modals.addItemAsBatch(config)).toBe(false);

    expect(services.incrementItem).not.toHaveBeenCalled();
    expect(input(ELEMENTS.QUANTITY).classList.contains('input-error')).toBe(true);
    expect(errorText()).toBe('New batch quantity must be greater than 0');
    expect(offerButton()).not.toBeNull();
  });

  it('stays open with the backend message when the restock fails', async () => {
    setUp(true);
    fill({ [ELEMENTS.NAME]: 'Milk', [ELEMENTS.QUANTITY]: '2' });
    await modals.addItem(config);
    services.incrementItem.mockResolvedValueOnce({ success: false, error: 'Not allowed' });

    expect(await modals.addItemAsBatch(config)).toBe(false);

    expect(errorText()).toBe('Error adding batch: Not allowed');
    expect(onDataChanged).not.toHaveBeenCalled();
    expect(input(ELEMENTS.NAME).value).toBe('Milk');
    expect(offerButton()).not.toBeNull();
  });

  it('offers the batch when the integration reports the duplicate name', async () => {
    items = [];
    setUp(true);
    fill({ [ELEMENTS.NAME]: 'Milk', [ELEMENTS.QUANTITY]: '2' });
    services.addItem.mockResolvedValueOnce({
      success: false,
      error: 'An item named Milk already exists',
      errorCode: 'duplicate_item_name',
    });

    expect(await modals.addItem(config)).toBe(false);

    expect(errorText()).toBe('Error adding item: An item named Milk already exists');
    expect(offerButton()?.textContent).toBe('Add 2 as a new batch of Milk');

    expect(await modals.addItemAsBatch(config)).toBe(true);
    expect(services.incrementItem).toHaveBeenCalledWith('inv', 'Milk', 2, {});
  });

  it('does not offer a batch for other add failures or without the feature', async () => {
    setUp(true);
    fill({ [ELEMENTS.NAME]: 'Bread', [ELEMENTS.QUANTITY]: '2' });
    services.addItem.mockResolvedValueOnce({ success: false, error: 'boom' });
    await modals.addItem(config);
    expect(offerButton()).toBeNull();

    modals.destroy();
    setUp(false);
    fill({ [ELEMENTS.NAME]: 'Bread', [ELEMENTS.QUANTITY]: '2' });
    services.addItem.mockResolvedValueOnce({
      success: false,
      error: 'exists',
      errorCode: 'duplicate_item_name',
    });
    await modals.addItem(config);
    expect(root.getElementById(ELEMENTS.ADD_DUPLICATE_BATCH_BTN)).toBeNull();
  });

  it('starts every opening of the add modal without an offer', async () => {
    setUp(true);
    fill({ [ELEMENTS.NAME]: 'Milk', [ELEMENTS.QUANTITY]: '2' });
    await modals.addItem(config);

    modals.openAddModal({});

    expect(offerButton()).toBeNull();
  });
});
