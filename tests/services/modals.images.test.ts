import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { Modals } from '../../src/services/modals';
import { ItemImageField } from '../../src/services/modals/itemImageField';
import { ImageLoader } from '../../src/services/imageLoader';
import { createAddModal, createEditModal } from '../../src/templates/modalTemplates';
import { HomeAssistant } from '../../src/types/homeAssistant';
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
  id: 'milk-id',
  image: '',
  location: '',
  name: 'Milk',
  quantity: 3,
  todo_list: '',
  unit: 'L',
};

describe('Modals saving the item image after the item', () => {
  let host: HTMLElement;
  let root: ShadowRoot;
  let modals: Modals;
  let imageField: ItemImageField;
  let order: string[];
  let services: { [K in keyof InventoryServices]: Mock<InventoryServices[K]> };
  let onDataChanged: Mock<() => void>;
  let hass: HomeAssistant;

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.append(host);
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      createAddModal([], {}, [], [], false, false, true) +
      createEditModal([], {}, [], [], false, false, true);
    order = [];
    services = {
      addItem: vi.fn<InventoryServices['addItem']>(async () => {
        order.push('addItem');
        return { success: true };
      }),
      updateItem: vi.fn<InventoryServices['updateItem']>(async () => {
        order.push('updateItem');
        return { success: true };
      }),
      updateBatch: vi.fn<InventoryServices['updateBatch']>(),
      removeBatch: vi.fn<InventoryServices['removeBatch']>(),
      incrementItem: vi.fn<InventoryServices['incrementItem']>(),
    };
    hass = createMockHomeAssistant({
      'sensor.inventory': createMockHassEntity('sensor.inventory', {}),
    });
    imageField = new ItemImageField(
      root,
      {
        getItem: vi.fn(),
        uploadItemImage: vi.fn(),
        deleteItemImage: vi.fn(),
        setItemImageFromBarcode: vi.fn(),
        setItemImageFromMedia: vi.fn(),
      },
      new ImageLoader(vi.fn<(path: string) => Promise<Blob>>()),
      () => createMockCardContext({ hass }),
    );
    vi.spyOn(imageField, 'apply').mockImplementation(async (prefix, inventoryId, name) => {
      order.push(`image:${prefix}:${inventoryId}:${name}`);
    });
    onDataChanged = vi.fn<() => void>(() => {
      order.push('refresh');
    });
    modals = new Modals(
      root,
      services,
      () => 'inv',
      onDataChanged,
      () => createMockCardContext({ hass, config, items: [milk] }),
      imageField,
    );
  });

  afterEach(() => {
    modals.destroy();
    host.remove();
    vi.useRealTimers();
  });

  function fill(prefix: string, element: string, value: string): void {
    const found = root.getElementById(`${prefix}-${element}`);
    if (!(found instanceof HTMLInputElement)) {
      throw new Error(`missing ${prefix}-${element}`);
    }
    found.value = value;
  }

  it('resets the image field when a sheet opens, with the edited item', () => {
    const open = vi.spyOn(imageField, 'open');

    modals.openAddModal({});
    modals.openEditModal('Milk', () => ({ hass, config, items: [milk] }), {});

    expect(open).toHaveBeenNthCalledWith(1, 'add', {});
    expect(open).toHaveBeenNthCalledWith(2, 'edit', {}, milk);
  });

  it('creates the item first, then its image, then refreshes', async () => {
    modals.openAddModal({});
    fill('add', ELEMENTS.NAME, 'Oat milk');
    fill('add', ELEMENTS.QUANTITY, '1');

    expect(await modals.addItem(config)).toBe(true);

    expect(order).toEqual(['addItem', 'image:add:inv:Oat milk', 'refresh']);
  });

  it('saves the image under the name the item was created with (100 characters)', async () => {
    modals.openAddModal({});
    fill('add', ELEMENTS.NAME, 'x'.repeat(120));
    fill('add', ELEMENTS.QUANTITY, '1');

    expect(await modals.addItem(config)).toBe(true);

    expect(imageField.apply).toHaveBeenCalledWith('add', 'inv', 'x'.repeat(100));
  });

  it('saves no image when the item could not be created', async () => {
    services.addItem.mockResolvedValueOnce({ success: false, error: 'boom' });
    modals.openAddModal({});
    fill('add', ELEMENTS.NAME, 'Oat milk');

    expect(await modals.addItem(config)).toBe(false);

    expect(imageField.apply).not.toHaveBeenCalled();
  });

  it('saves the image after the item update, under the saved name', async () => {
    modals.openEditModal('Milk', () => ({ hass, config, items: [milk] }), {});
    fill('edit', ELEMENTS.NAME, 'Whole milk');

    expect(await modals.saveEditModal(config)).toBe(true);

    expect(order).toEqual(['updateItem', 'image:edit:inv:Whole milk', 'refresh']);
  });

  function primaryButton(sheet: string): HTMLButtonElement {
    const found = root.querySelector(`#${sheet} .save-btn`);
    if (!(found instanceof HTMLButtonElement)) {
      throw new Error(`missing primary button of ${sheet}`);
    }
    return found;
  }

  it('ignores a second add while the first, image included, is saving', async () => {
    let finishImage: () => void = () => {};
    vi.mocked(imageField.apply).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishImage = resolve;
        }),
    );
    modals.openAddModal({});
    fill('add', ELEMENTS.NAME, 'Oat milk');
    fill('add', ELEMENTS.QUANTITY, '1');

    const first = modals.addItem(config);
    await vi.runAllTimersAsync();

    expect(primaryButton(ELEMENTS.ADD_MODAL).disabled).toBe(true);
    expect(await modals.addItem(config)).toBe(false);
    expect(services.addItem).toHaveBeenCalledTimes(1);

    finishImage();
    expect(await first).toBe(true);
    expect(primaryButton(ELEMENTS.ADD_MODAL).disabled).toBe(false);
  });

  it('ignores a second save while an edit is saving and re-enables Save when it fails', async () => {
    let finishUpdate: (result: { success: boolean; error?: string }) => void = () => {};
    services.updateItem.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishUpdate = resolve;
        }),
    );
    modals.openEditModal('Milk', () => ({ hass, config, items: [milk] }), {});

    const first = modals.saveEditModal(config);
    await vi.runAllTimersAsync();

    expect(primaryButton(ELEMENTS.EDIT_MODAL).disabled).toBe(true);
    expect(await modals.saveEditModal(config)).toBe(false);
    expect(services.updateItem).toHaveBeenCalledTimes(1);

    finishUpdate({ success: false, error: 'boom' });
    expect(await first).toBe(false);
    expect(primaryButton(ELEMENTS.EDIT_MODAL).disabled).toBe(false);
  });

  it('re-enables Add after a failed add', async () => {
    services.addItem.mockRejectedValueOnce(new Error('offline'));
    modals.openAddModal({});
    fill('add', ELEMENTS.NAME, 'Oat milk');
    fill('add', ELEMENTS.QUANTITY, '1');

    expect(await modals.addItem(config)).toBe(false);

    expect(primaryButton(ELEMENTS.ADD_MODAL).disabled).toBe(false);
    expect(await modals.addItem(config)).toBe(true);
  });
});
