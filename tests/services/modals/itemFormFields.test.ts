import { describe, it, expect, vi, type Mock } from 'vitest';
import { ITEM_FORM_FIELDS, ITEM_FORM_KEYS } from '../../../src/utils/itemFormFields';
import { Services } from '../../../src/services/services';
import { RawFormData } from '../../../src/types/inventoryItem';
import { ELEMENTS, PARAMS } from '../../../src/utils/constants';
import { FormUtils } from '../../../src/utils/formUtils';
import { createMockHomeAssistant } from '../../testHelpers';

/** Every RawFormData key, icon included: the literal fails to compile when a key is added. */
const FULL_FORM: Required<RawFormData> = {
  aliases: 'oats',
  autoAddEnabled: true,
  autoAddIdToDescriptionEnabled: true,
  autoAddToListQuantity: '1',
  barcode: '123',
  category: 'Food',
  description: 'Rolled',
  desiredQuantity: '4',
  expiryAlertDays: '2',
  expiryDate: '2026-12-01',
  icon: 'mdi:barley',
  location: 'Pantry',
  name: 'Oats',
  price: '2',
  quantity: '3',
  todoList: 'todo.shopping',
  todoQuantityPlacement: 'name',
  unit: 'bag',
};

/** Payload params that address the item rather than describe it; not form fields. */
const ADDRESS_PARAMS = [PARAMS.INVENTORY_ID, PARAMS.OLD_NAME];

const sentParams = async (send: (services: Services) => Promise<unknown>): Promise<string[]> => {
  const hass = createMockHomeAssistant();
  const callService: Mock = vi.fn().mockResolvedValue(undefined);
  hass.callService = callService;
  await send(new Services(() => hass));
  const [, , data] = callService.mock.calls[0];
  return Object.keys(data).filter((param) => !ADDRESS_PARAMS.includes(param));
};

describe('ITEM_FORM_FIELDS', () => {
  const tableParams = ITEM_FORM_KEYS.map((key) => ITEM_FORM_FIELDS[key].param);

  it('has one row per RawFormData key', () => {
    expect([...ITEM_FORM_KEYS].sort()).toEqual(Object.keys(FULL_FORM).sort());
  });

  it('names known, distinct element ids and payload params', () => {
    const elements = ITEM_FORM_KEYS.map((key) => ITEM_FORM_FIELDS[key].element);
    expect(new Set(elements).size).toBe(elements.length);
    expect(Object.values(ELEMENTS)).toEqual(expect.arrayContaining(elements));
    expect(new Set(tableParams).size).toBe(tableParams.length);
    expect(Object.values(PARAMS)).toEqual(expect.arrayContaining(tableParams));
  });

  it('covers every add_item payload param the card sends, in order', async () => {
    const item = FormUtils.convertRawFormDataToItemData(FULL_FORM);

    expect(await sentParams((services) => services.addItem('inv', item))).toEqual(tableParams);
  });

  it('covers every update_item payload param the card sends, in order', async () => {
    const item = FormUtils.convertRawFormDataToItemData(FULL_FORM);

    expect(await sentParams((services) => services.updateItem('inv', 'Old', item))).toEqual(
      tableParams,
    );
  });
});
