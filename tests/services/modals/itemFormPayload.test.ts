import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ModalFormManager } from '../../../src/services/modals/modalFormManager';
import { Services } from '../../../src/services/services';
import { FormUtils } from '../../../src/utils/formUtils';
import { ELEMENTS } from '../../../src/utils/constants';
import { InventoryItem } from '../../../src/types/inventory';
import { createMockHomeAssistant } from '../../testHelpers';

/**
 * Golden wire payloads: DOM form → ModalFormManager → FormUtils → Services → `callService`.
 * The JSON strings (keys sorted: HA receives a JSON object, so key order carries no meaning)
 * pin every param and value, so any refactor of the form/payload pipeline must leave what the
 * card sends identical.
 */
describe('item form → service payload (golden)', () => {
  let elements: Map<string, { value: string; checked: boolean }>;
  let forms: ModalFormManager;
  let callService: Mock;
  let services: Services;

  const FIELD_IDS = [
    ELEMENTS.ALIASES,
    ELEMENTS.AUTO_ADD_ENABLED,
    ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED,
    ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY,
    ELEMENTS.BARCODE,
    ELEMENTS.CATEGORY,
    ELEMENTS.DESCRIPTION,
    ELEMENTS.DESIRED_QUANTITY,
    ELEMENTS.EXPIRY_ALERT_DAYS,
    ELEMENTS.EXPIRY_DATE,
    ELEMENTS.LOCATION,
    ELEMENTS.NAME,
    ELEMENTS.PRICE,
    ELEMENTS.QUANTITY,
    ELEMENTS.TODO_LIST,
    ELEMENTS.TODO_QUANTITY_PLACEMENT,
    ELEMENTS.UNIT,
  ];

  const render = (prefix: 'add' | 'edit', withIcon: boolean): void => {
    const ids = withIcon ? [...FIELD_IDS, ELEMENTS.ICON] : FIELD_IDS;
    for (const id of ids) {
      elements.set(`${prefix}-${id}`, { value: '', checked: false });
    }
  };

  const field = (id: string): { value: string; checked: boolean } => {
    const element = elements.get(id);
    if (!element) {
      throw new Error(`missing ${id}`);
    }
    return element;
  };

  const sentPayload = (): string => {
    const [, , data] = callService.mock.calls[0];
    return JSON.stringify(data, Object.keys(data).sort());
  };

  beforeEach(() => {
    elements = new Map();
    const root = {
      getElementById: (id: string) => elements.get(id) ?? null,
    };
    forms = new ModalFormManager(root as unknown as ShadowRoot);
    const hass = createMockHomeAssistant();
    callService = vi.fn().mockResolvedValue(undefined);
    hass.callService = callService;
    services = new Services(() => hass);
  });

  const fillAdd = (): void => {
    field(`add-${ELEMENTS.NAME}`).value = '  Rolled oats  ';
    field(`add-${ELEMENTS.QUANTITY}`).value = '1000000';
    field(`add-${ELEMENTS.UNIT}`).value = 'bag';
    field(`add-${ELEMENTS.CATEGORY}`).value = 'Breakfast, Grains';
    field(`add-${ELEMENTS.LOCATION}`).value = 'Pantry';
    field(`add-${ELEMENTS.DESCRIPTION}`).value = 'd'.repeat(520);
    field(`add-${ELEMENTS.EXPIRY_DATE}`).value = '2026-12-01';
    field(`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`).value = '5';
    field(`add-${ELEMENTS.AUTO_ADD_ENABLED}`).checked = true;
    field(`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`).value = '2';
    field(`add-${ELEMENTS.DESIRED_QUANTITY}`).value = '6';
    field(`add-${ELEMENTS.TODO_LIST}`).value = 'todo.shopping';
    field(`add-${ELEMENTS.TODO_QUANTITY_PLACEMENT}`).value = 'description';
    field(`add-${ELEMENTS.PRICE}`).value = '3.5';
  };

  const submitAdd = async (): Promise<void> => {
    const raw = forms.getRawAddModalData();
    expect(FormUtils.validateRawFormData(raw).isValid).toBe(true);
    await services.addItem('inventory_1', FormUtils.convertRawFormDataToItemData(raw));
  };

  const submitEdit = async (oldName: string): Promise<void> => {
    const raw = forms.getRawEditModalData();
    expect(FormUtils.validateRawFormData(raw).isValid).toBe(true);
    await services.updateItem('inventory_1', oldName, FormUtils.convertRawFormDataToItemData(raw));
  };

  it('add without the icon field, empty tags', async () => {
    render('add', false);
    forms.clearAddModalForm();
    fillAdd();

    await submitAdd();

    expect(sentPayload()).toMatchInlineSnapshot(
      `"{"auto_add_enabled":true,"auto_add_id_to_description_enabled":false,"auto_add_to_list_quantity":2,"category":"Breakfast, Grains","description":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","desired_quantity":6,"expiry_alert_days":5,"expiry_date":"2026-12-01","inventory_id":"inventory_1","location":"Pantry","name":"Rolled oats","price":3.5,"quantity":999999,"todo_list":"todo.shopping","todo_quantity_placement":"description","unit":"bag"}"`,
    );
  });

  it('add with the icon field (item_icons), tags filled', async () => {
    render('add', true);
    forms.clearAddModalForm();
    fillAdd();
    field(`add-${ELEMENTS.ICON}`).value = ' mdi:barley ';
    field(`add-${ELEMENTS.BARCODE}`).value = '0123456789012, 999';
    field(`add-${ELEMENTS.ALIASES}`).value = 'oats, porridge';
    field(`add-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`).checked = true;

    await submitAdd();

    expect(sentPayload()).toMatchInlineSnapshot(
      `"{"aliases":"oats, porridge","auto_add_enabled":true,"auto_add_id_to_description_enabled":true,"auto_add_to_list_quantity":2,"barcode":"0123456789012, 999","category":"Breakfast, Grains","description":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","desired_quantity":6,"expiry_alert_days":5,"expiry_date":"2026-12-01","icon":"mdi:barley","inventory_id":"inventory_1","location":"Pantry","name":"Rolled oats","price":3.5,"quantity":999999,"todo_list":"todo.shopping","todo_quantity_placement":"description","unit":"bag"}"`,
    );
  });

  it('add with a cleared form sends the defaults', async () => {
    render('add', true);
    forms.clearAddModalForm();
    field(`add-${ELEMENTS.NAME}`).value = 'Salt';
    // The default alert threshold needs an expiry date; a bare add leaves it blank.
    field(`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`).value = '';

    await submitAdd();

    expect(sentPayload()).toMatchInlineSnapshot(
      `"{"auto_add_enabled":false,"auto_add_id_to_description_enabled":false,"auto_add_to_list_quantity":0,"category":"","description":"","desired_quantity":0,"expiry_alert_days":1,"expiry_date":"","icon":"","inventory_id":"inventory_1","location":"","name":"Salt","price":0,"quantity":1,"todo_list":"","todo_quantity_placement":"name","unit":""}"`,
    );
  });

  const item: InventoryItem = {
    name: 'Milk',
    quantity: 2.5,
    unit: 'l',
    category: 'Dairy',
    categories: ['Dairy', 'Fridge'],
    location: 'Fridge',
    locations: ['Fridge'],
    description: 'Whole milk',
    expiry_date: '2026-11-02',
    expiry_alert_days: 3,
    auto_add_enabled: true,
    auto_add_id_to_description_enabled: false,
    auto_add_to_list_quantity: 1,
    desired_quantity: 0,
    todo_list: 'todo.shopping',
    todo_quantity_placement: 'name',
    price: 1.25,
    barcodes: ['111', '222'],
    aliases: ['moo'],
    icon: 'mdi:cup',
  };

  it('update without the icon field: populate, change description', async () => {
    render('edit', false);
    forms.populateEditModal(item);
    field(`edit-${ELEMENTS.DESCRIPTION}`).value = 'Semi-skimmed';

    await submitEdit('Milk');

    expect(sentPayload()).toMatchInlineSnapshot(
      `"{"aliases":"moo","auto_add_enabled":true,"auto_add_id_to_description_enabled":false,"auto_add_to_list_quantity":1,"barcode":"111, 222","category":"Dairy, Fridge","description":"Semi-skimmed","desired_quantity":0,"expiry_alert_days":3,"expiry_date":"2026-11-02","inventory_id":"inventory_1","location":"Fridge","name":"Milk","old_name":"Milk","price":1.25,"quantity":2.5,"todo_list":"todo.shopping","todo_quantity_placement":"name","unit":"l"}"`,
    );
  });

  it('update with the icon field (item_icons): populate, rename, clear icon', async () => {
    render('edit', true);
    forms.populateEditModal(item);
    expect(field(`edit-${ELEMENTS.ICON}`).value).toBe('mdi:cup');
    field(`edit-${ELEMENTS.NAME}`).value = 'Oat milk';
    field(`edit-${ELEMENTS.ICON}`).value = '';
    field(`edit-${ELEMENTS.BARCODE}`).value = '';
    field(`edit-${ELEMENTS.ALIASES}`).value = '';

    await submitEdit('Milk');

    expect(sentPayload()).toMatchInlineSnapshot(
      `"{"aliases":"","auto_add_enabled":true,"auto_add_id_to_description_enabled":false,"auto_add_to_list_quantity":1,"barcode":"","category":"Dairy, Fridge","description":"Whole milk","desired_quantity":0,"expiry_alert_days":3,"expiry_date":"2026-11-02","icon":"","inventory_id":"inventory_1","location":"Fridge","name":"Oat milk","old_name":"Milk","price":1.25,"quantity":2.5,"todo_list":"todo.shopping","todo_quantity_placement":"name","unit":"l"}"`,
    );
  });

  it('update of a sparse item round-trips the populated defaults', async () => {
    render('edit', true);
    // Only the required fields; every optional one falls back to its default.
    forms.populateEditModal({
      name: 'Bread',
      quantity: 0,
      auto_add_enabled: false,
      auto_add_id_to_description_enabled: false,
      category: '',
      description: '',
      expiry_date: '',
      location: '',
      todo_list: '',
      unit: '',
    });
    field(`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`).value = '';

    await submitEdit('Bread');

    expect(sentPayload()).toMatchInlineSnapshot(
      `"{"aliases":"","auto_add_enabled":false,"auto_add_id_to_description_enabled":false,"auto_add_to_list_quantity":0,"barcode":"","category":"","description":"","desired_quantity":0,"expiry_alert_days":1,"expiry_date":"","icon":"","inventory_id":"inventory_1","location":"","name":"Bread","old_name":"Bread","price":0,"quantity":0,"todo_list":"","todo_quantity_placement":"name","unit":""}"`,
    );
  });
});
