import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Services } from '../../src/services/services';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { ItemData } from '../../src/types/inventoryItem';
import { DOMAIN, SERVICES, PARAMS, DEFAULTS } from '../../src/utils/constants';

describe('Services', () => {
  let services: Services;
  let mockHass: HomeAssistant;

  beforeEach(() => {
    mockHass = {
      states: {},
      config: {} as any,
      themes: {},
      selectedTheme: {},
      panels: {},
      panelUrl: '',
      language: 'en',
      selectedLanguage: 'en',
      localize: vi.fn(),
      translationMetadata: {},
      dockedSidebar: 'auto',
      moreInfoEntityId: null,
      callService: vi.fn().mockResolvedValue(undefined),
      callApi: vi.fn(),
      fetchWithAuth: vi.fn(),
      sendWS: vi.fn(),
      callWS: vi.fn(),
    };

    services = new Services(() => mockHass);

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should store the HomeAssistant instance', () => {
      const newServices = new Services(() => mockHass);
      expect(newServices).toBeInstanceOf(Services);
    });

    it('calls through the hass current at call time, not the one at construction', async () => {
      let current: HomeAssistant = mockHass;
      const reading = new Services(() => current);
      const later: HomeAssistant = {
        ...mockHass,
        callService: vi.fn().mockResolvedValue(undefined),
      };
      current = later;

      await reading.incrementItem('inv', 'Milk');

      expect(later.callService).toHaveBeenCalled();
      expect(mockHass.callService).not.toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    const inventoryId = 'test-inventory';
    const itemData: ItemData = {
      autoAddEnabled: true,
      autoAddIdToDescriptionEnabled: true,
      autoAddToListQuantity: 2,
      category: 'Food',
      description: 'A test item',
      expiryAlertDays: 3,
      expiryDate: '2023-12-25',
      location: 'Pantry',
      name: 'Test Item',
      quantity: 5,
      todoList: 'todo.shopping',
      unit: 'pieces',
      aliases: '',
      barcode: '',
      desiredQuantity: 0,
      price: 0,
      todoQuantityPlacement: 'name',
    };

    it('sends the icon when the form carries one (item_icons)', async () => {
      await services.addItem(inventoryId, { ...itemData, icon: ' mdi:apple ' });

      expect(mockHass.callService).toHaveBeenCalledWith(
        DOMAIN,
        SERVICES.ADD_ITEM,
        expect.objectContaining({ [PARAMS.ICON]: 'mdi:apple' }),
      );
    });

    it('never sends an icon key without the icon field', async () => {
      await services.addItem(inventoryId, itemData);

      const [, , data] = vi.mocked(mockHass.callService).mock.calls[0];
      expect(data).not.toHaveProperty(PARAMS.ICON);
    });

    it('should successfully add item with all data', async () => {
      const result = await services.addItem(inventoryId, itemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: itemData.autoAddEnabled,
        [PARAMS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED]: itemData.autoAddIdToDescriptionEnabled,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: itemData.autoAddToListQuantity,
        [PARAMS.CATEGORY]: itemData.category,
        [PARAMS.DESCRIPTION]: itemData.description,
        [PARAMS.DESIRED_QUANTITY]: DEFAULTS.DESIRED_QUANTITY,
        [PARAMS.EXPIRY_ALERT_DAYS]: itemData.expiryAlertDays,
        [PARAMS.EXPIRY_DATE]: itemData.expiryDate,
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: itemData.location,
        [PARAMS.NAME]: itemData.name,
        [PARAMS.PRICE]: DEFAULTS.PRICE,
        [PARAMS.QUANTITY]: itemData.quantity,
        [PARAMS.TODO_LIST]: itemData.todoList,
        [PARAMS.TODO_QUANTITY_PLACEMENT]: DEFAULTS.TODO_QUANTITY_PLACEMENT,
        [PARAMS.UNIT]: itemData.unit,
      });
    });

    it('should include aliases in service data when provided', async () => {
      const itemDataWithAliases: ItemData = { ...itemData, aliases: 'oats, hot cereal' };

      await services.addItem(inventoryId, itemDataWithAliases);

      expect(mockHass.callService).toHaveBeenCalledWith(
        DOMAIN,
        SERVICES.ADD_ITEM,
        expect.objectContaining({ [PARAMS.ALIASES]: 'oats, hot cereal' }),
      );
    });

    it('should use default values for undefined properties', async () => {
      const minimalItemData: Partial<ItemData> = {
        name: 'Minimal Item',
        quantity: 1,
      };

      // Untyped callers: the service boundary fills whatever is missing with defaults.
      const result = await services.addItem(inventoryId, minimalItemData as ItemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: DEFAULTS.AUTO_ADD_ENABLED,
        [PARAMS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED]: DEFAULTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY,
        [PARAMS.CATEGORY]: DEFAULTS.CATEGORY,
        [PARAMS.DESCRIPTION]: DEFAULTS.DESCRIPTION,
        [PARAMS.DESIRED_QUANTITY]: DEFAULTS.DESIRED_QUANTITY,
        [PARAMS.EXPIRY_ALERT_DAYS]: DEFAULTS.EXPIRY_ALERT_DAYS,
        [PARAMS.EXPIRY_DATE]: DEFAULTS.EXPIRY_DATE,
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: DEFAULTS.LOCATION,
        [PARAMS.NAME]: minimalItemData.name,
        [PARAMS.PRICE]: DEFAULTS.PRICE,
        [PARAMS.QUANTITY]: minimalItemData.quantity,
        [PARAMS.TODO_LIST]: DEFAULTS.TODO_LIST,
        [PARAMS.TODO_QUANTITY_PLACEMENT]: DEFAULTS.TODO_QUANTITY_PLACEMENT,
        [PARAMS.UNIT]: DEFAULTS.UNIT,
      });
    });

    it('should handle Error objects in catch block', async () => {
      const errorMessage = 'Service call failed';
      const error = new Error(errorMessage);
      mockHass.callService = vi.fn().mockRejectedValue(error);

      const result = await services.addItem(inventoryId, itemData);

      expect(result).toEqual({
        success: false,
        error: errorMessage,
      });
      expect(console.error).toHaveBeenCalledWith('Error adding item:', error);
    });

    it('should handle non-Error objects in catch block', async () => {
      const errorValue = 'String error';
      mockHass.callService = vi.fn().mockRejectedValue(errorValue);

      const result = await services.addItem(inventoryId, itemData);

      expect(result).toEqual({
        success: false,
        error: errorValue,
      });
      expect(console.error).toHaveBeenCalledWith('Error adding item:', errorValue);
    });

    it('should handle null and empty string values', async () => {
      const itemDataWithNulls: ItemData = {
        autoAddEnabled: false,
        autoAddIdToDescriptionEnabled: false,
        autoAddToListQuantity: 0,
        category: '',
        description: null as any,
        expiryAlertDays: 0,
        expiryDate: null as any,
        location: null as any,
        name: 'Test Item',
        quantity: 0,
        todoList: '',
        unit: null as any,
        aliases: '',
        barcode: '',
        desiredQuantity: 0,
        price: 0,
        todoQuantityPlacement: 'name',
      };

      const result = await services.addItem(inventoryId, itemDataWithNulls);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: false,
        [PARAMS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED]: false,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY, // 0 should use default
        [PARAMS.CATEGORY]: '', // empty string should be preserved
        [PARAMS.DESCRIPTION]: DEFAULTS.DESCRIPTION, // null should use default
        [PARAMS.DESIRED_QUANTITY]: DEFAULTS.DESIRED_QUANTITY,
        [PARAMS.EXPIRY_ALERT_DAYS]: 0,
        [PARAMS.EXPIRY_DATE]: DEFAULTS.EXPIRY_DATE, // null should use default
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: DEFAULTS.LOCATION, // null should use default
        [PARAMS.NAME]: itemDataWithNulls.name,
        [PARAMS.PRICE]: DEFAULTS.PRICE,
        [PARAMS.QUANTITY]: 0,
        [PARAMS.TODO_LIST]: '', // empty string should be preserved
        [PARAMS.TODO_QUANTITY_PLACEMENT]: DEFAULTS.TODO_QUANTITY_PLACEMENT,
        [PARAMS.UNIT]: DEFAULTS.UNIT, // null should use default
      });
    });
  });

  describe('removeItem', () => {
    const inventoryId = 'test-inventory';
    const itemName = 'Test Item';

    it('should successfully remove item', async () => {
      const result = await services.removeItem(inventoryId, itemName);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.REMOVE_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
      });
    });

    it('should handle Error objects in catch block', async () => {
      const errorMessage = 'Remove failed';
      const error = new Error(errorMessage);
      mockHass.callService = vi.fn().mockRejectedValue(error);

      const result = await services.removeItem(inventoryId, itemName);

      expect(result).toEqual({
        success: false,
        error: errorMessage,
      });
      expect(console.error).toHaveBeenCalledWith('Error removing item:', error);
    });

    it('should handle non-Error objects in catch block', async () => {
      const errorValue = { code: 404, message: 'Not found' };
      mockHass.callService = vi.fn().mockRejectedValue(errorValue);

      const result = await services.removeItem(inventoryId, itemName);

      expect(result).toEqual({
        success: false,
        error: 'Not found',
      });
    });
  });

  describe('incrementItem', () => {
    const inventoryId = 'test-inventory';
    const itemName = 'Test Item';

    it('should successfully increment item with default amount', async () => {
      const result = await services.incrementItem(inventoryId, itemName);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.INCREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.AMOUNT]: 1, // default
      });
    });

    it('should successfully increment item with custom amount', async () => {
      const customAmount = 5;
      const result = await services.incrementItem(inventoryId, itemName, customAmount);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.INCREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.AMOUNT]: customAmount,
      });
    });

    it('should handle zero amount', async () => {
      const result = await services.incrementItem(inventoryId, itemName, 0);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.INCREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.AMOUNT]: 0,
      });
    });

    it('should handle negative amount', async () => {
      const result = await services.incrementItem(inventoryId, itemName, -2);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.INCREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.AMOUNT]: -2,
      });
    });

    it('should handle Error in catch block', async () => {
      const error = new Error('Increment failed');
      mockHass.callService = vi.fn().mockRejectedValue(error);

      const result = await services.incrementItem(inventoryId, itemName);

      expect(result).toEqual({
        success: false,
        error: 'Increment failed',
      });
      expect(console.error).toHaveBeenCalledWith('Error incrementing item:', error);
    });
  });

  describe('decrementItem', () => {
    const inventoryId = 'test-inventory';
    const itemName = 'Test Item';

    it('should successfully decrement item with default amount', async () => {
      const result = await services.decrementItem(inventoryId, itemName);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.DECREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.AMOUNT]: 1, // default
      });
    });

    it('should successfully decrement item with custom amount', async () => {
      const customAmount = 3;
      const result = await services.decrementItem(inventoryId, itemName, customAmount);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.DECREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.AMOUNT]: customAmount,
      });
    });

    it('should handle Error in catch block', async () => {
      const error = new Error('Decrement failed');
      mockHass.callService = vi.fn().mockRejectedValue(error);

      const result = await services.decrementItem(inventoryId, itemName);

      expect(result).toEqual({
        success: false,
        error: 'Decrement failed',
      });
      expect(console.error).toHaveBeenCalledWith('Error decrementing item:', error);
    });
  });

  describe('updateItem', () => {
    const inventoryId = 'test-inventory';
    const oldName = 'Old Item Name';
    const itemData: ItemData = {
      autoAddEnabled: false,
      autoAddIdToDescriptionEnabled: true,
      autoAddToListQuantity: 3,
      category: 'Updated Category',
      description: 'Updated Description',
      expiryAlertDays: 5,
      expiryDate: '2024-01-01',
      location: 'Updated Location',
      name: 'Updated Item',
      quantity: 10,
      todoList: 'todo.updated',
      unit: 'kg',
      aliases: '',
      barcode: '',
      desiredQuantity: 0,
      price: 0,
      todoQuantityPlacement: 'name',
    };

    it('sends an emptied icon so the item goes back to the default icon', async () => {
      await services.updateItem(inventoryId, oldName, { ...itemData, icon: '' });

      expect(mockHass.callService).toHaveBeenCalledWith(
        DOMAIN,
        SERVICES.UPDATE_ITEM,
        expect.objectContaining({ [PARAMS.ICON]: '' }),
      );
    });

    it('never sends an icon key on update without the icon field', async () => {
      await services.updateItem(inventoryId, oldName, itemData);

      const [, , data] = vi.mocked(mockHass.callService).mock.calls[0];
      expect(data).not.toHaveProperty(PARAMS.ICON);
    });

    it('should successfully update item with all data', async () => {
      const result = await services.updateItem(inventoryId, oldName, itemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: itemData.autoAddEnabled,
        [PARAMS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED]: itemData.autoAddIdToDescriptionEnabled,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: itemData.autoAddToListQuantity,
        [PARAMS.CATEGORY]: itemData.category,
        [PARAMS.DESCRIPTION]: itemData.description,
        [PARAMS.DESIRED_QUANTITY]: DEFAULTS.DESIRED_QUANTITY,
        [PARAMS.EXPIRY_ALERT_DAYS]: itemData.expiryAlertDays,
        [PARAMS.EXPIRY_DATE]: itemData.expiryDate,
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: itemData.location,
        [PARAMS.NAME]: itemData.name,
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.PRICE]: DEFAULTS.PRICE,
        [PARAMS.QUANTITY]: itemData.quantity,
        [PARAMS.TODO_LIST]: itemData.todoList,
        [PARAMS.TODO_QUANTITY_PLACEMENT]: DEFAULTS.TODO_QUANTITY_PLACEMENT,
        [PARAMS.UNIT]: itemData.unit,
        [PARAMS.BARCODE]: DEFAULTS.BARCODE,
        [PARAMS.ALIASES]: DEFAULTS.ALIASES,
      });
    });

    it('should pass through a non-empty aliases value', async () => {
      const itemDataWithAliases: ItemData = { ...itemData, aliases: 'oats, hot cereal' };

      await services.updateItem(inventoryId, oldName, itemDataWithAliases);

      expect(mockHass.callService).toHaveBeenCalledWith(
        DOMAIN,
        SERVICES.UPDATE_ITEM,
        expect.objectContaining({ [PARAMS.ALIASES]: 'oats, hot cereal' }),
      );
    });

    it('should use default values for undefined properties', async () => {
      const minimalItemData: Partial<ItemData> = {
        name: 'Updated Name',
        quantity: 5,
      };

      // Untyped callers: the service boundary fills whatever is missing with defaults.
      const result = await services.updateItem(inventoryId, oldName, minimalItemData as ItemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: DEFAULTS.AUTO_ADD_ENABLED,
        [PARAMS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED]: DEFAULTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY,
        [PARAMS.CATEGORY]: DEFAULTS.CATEGORY,
        [PARAMS.DESCRIPTION]: DEFAULTS.DESCRIPTION,
        [PARAMS.DESIRED_QUANTITY]: DEFAULTS.DESIRED_QUANTITY,
        [PARAMS.EXPIRY_ALERT_DAYS]: DEFAULTS.EXPIRY_ALERT_DAYS,
        [PARAMS.EXPIRY_DATE]: DEFAULTS.EXPIRY_DATE,
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: DEFAULTS.LOCATION,
        [PARAMS.NAME]: minimalItemData.name,
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.PRICE]: DEFAULTS.PRICE,
        [PARAMS.QUANTITY]: minimalItemData.quantity,
        [PARAMS.TODO_LIST]: DEFAULTS.TODO_LIST,
        [PARAMS.TODO_QUANTITY_PLACEMENT]: DEFAULTS.TODO_QUANTITY_PLACEMENT,
        [PARAMS.UNIT]: DEFAULTS.UNIT,
        [PARAMS.BARCODE]: DEFAULTS.BARCODE,
        [PARAMS.ALIASES]: DEFAULTS.ALIASES,
      });
    });

    it('should preserve falsy values that are not undefined', async () => {
      const falsyItemData: ItemData = {
        autoAddEnabled: false,
        autoAddIdToDescriptionEnabled: false,
        autoAddToListQuantity: 0,
        category: '',
        description: '',
        expiryAlertDays: 0,
        expiryDate: '',
        location: '',
        name: '',
        quantity: 0,
        todoList: '',
        unit: '',
        aliases: '',
        barcode: '',
        desiredQuantity: 0,
        price: 0,
        todoQuantityPlacement: 'name',
      };

      const result = await services.updateItem(inventoryId, oldName, falsyItemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: false,
        [PARAMS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED]: false,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: 0,
        [PARAMS.CATEGORY]: DEFAULTS.CATEGORY, // empty string should use default
        [PARAMS.DESCRIPTION]: DEFAULTS.DESCRIPTION, // empty string should use default
        [PARAMS.DESIRED_QUANTITY]: DEFAULTS.DESIRED_QUANTITY,
        [PARAMS.EXPIRY_ALERT_DAYS]: 0,
        [PARAMS.EXPIRY_DATE]: '',
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: DEFAULTS.LOCATION, // empty string should use defaulth
        [PARAMS.NAME]: '',
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.PRICE]: DEFAULTS.PRICE,
        [PARAMS.QUANTITY]: 0,
        [PARAMS.TODO_LIST]: '',
        [PARAMS.TODO_QUANTITY_PLACEMENT]: DEFAULTS.TODO_QUANTITY_PLACEMENT,
        [PARAMS.UNIT]: DEFAULTS.UNIT, // empty string should use default
        [PARAMS.BARCODE]: DEFAULTS.BARCODE,
        [PARAMS.ALIASES]: DEFAULTS.ALIASES,
      });
    });

    it('should handle Error in catch block', async () => {
      const error = new Error('Update failed');
      mockHass.callService = vi.fn().mockRejectedValue(error);

      const result = await services.updateItem(inventoryId, oldName, itemData);

      expect(result).toEqual({
        success: false,
        error: 'Update failed',
      });
      expect(console.error).toHaveBeenCalledWith('Error updating item:', error);
    });

    it('should handle non-Error objects in catch block', async () => {
      const errorValue = 123;
      mockHass.callService = vi.fn().mockRejectedValue(errorValue);

      const result = await services.updateItem(inventoryId, oldName, itemData);

      expect(result).toEqual({
        success: false,
        error: '123',
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle null error', async () => {
      mockHass.callService = vi.fn().mockRejectedValue(null);

      const result = await services.addItem('test', { name: 'test' } as ItemData);

      expect(result).toEqual({
        success: false,
        error: 'null',
      });
    });

    it('should handle undefined error', async () => {
      mockHass.callService = vi.fn().mockRejectedValue(undefined);

      const result = await services.removeItem('test', 'test');

      expect(result).toEqual({
        success: false,
        error: 'undefined',
      });
    });

    it('should handle number error', async () => {
      mockHass.callService = vi.fn().mockRejectedValue(404);

      const result = await services.incrementItem('test', 'test');

      expect(result).toEqual({
        success: false,
        error: '404',
      });
    });

    it('should handle boolean error', async () => {
      mockHass.callService = vi.fn().mockRejectedValue(false);

      const result = await services.decrementItem('test', 'test');

      expect(result).toEqual({
        success: false,
        error: 'false',
      });
    });

    it.each([
      ['addItem', (s: Services) => s.addItem('inv', { name: 'Milk' } as ItemData)],
      ['removeItem', (s: Services) => s.removeItem('inv', 'Milk')],
      ['incrementItem', (s: Services) => s.incrementItem('inv', 'Milk')],
      ['decrementItem', (s: Services) => s.decrementItem('inv', 'Milk')],
      ['updateItem', (s: Services) => s.updateItem('inv', 'Milk', { name: 'Milk' } as ItemData)],
      ['scanBarcode', (s: Services) => s.scanBarcode('inv', '123', 'increment')],
      ['updateBatch', (s: Services) => s.updateBatch('inv', 'b1', { quantity: 1 })],
      ['removeBatch', (s: Services) => s.removeBatch('inv', 'b1')],
    ])('%s preserves the backend translation_key as errorCode', async (_name, call) => {
      mockHass.callService = vi.fn().mockRejectedValue({
        code: 'service_validation_error',
        message: "Validation error: No item found for barcode '123'",
        translation_key: 'barcode_not_found',
        translation_domain: 'simple_inventory',
        translation_placeholders: { barcode: '123' },
      });

      const result = await call(services);

      expect(result).toEqual({
        success: false,
        error: "Validation error: No item found for barcode '123'",
        errorCode: 'barcode_not_found',
      });
    });
  });

  describe('scanBarcode', () => {
    const inventoryId = 'test-inventory';
    const barcode = '1234567890';

    it('should successfully call scan_barcode service', async () => {
      const result = await services.scanBarcode(inventoryId, barcode, 'increment', 1);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.SCAN_BARCODE, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.BARCODE]: barcode,
        action: 'increment',
        [PARAMS.AMOUNT]: 1,
      });
    });

    it('should call with decrement action and custom amount', async () => {
      const result = await services.scanBarcode(inventoryId, barcode, 'decrement', 3);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.SCAN_BARCODE, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.BARCODE]: barcode,
        action: 'decrement',
        [PARAMS.AMOUNT]: 3,
      });
    });

    it('should return error on service failure', async () => {
      const error = new Error('Barcode not found');
      mockHass.callService = vi.fn().mockRejectedValue(error);

      const result = await services.scanBarcode(inventoryId, barcode, 'increment', 1);

      expect(result).toEqual({
        success: false,
        error: 'Barcode not found',
      });
      expect(console.error).toHaveBeenCalledWith('Error scanning barcode:', error);
    });

    it('should handle non-Error objects in catch block', async () => {
      mockHass.callService = vi.fn().mockRejectedValue('string error');

      const result = await services.scanBarcode(inventoryId, barcode, 'increment', 1);

      expect(result).toEqual({
        success: false,
        error: 'string error',
      });
    });
  });

  describe('lookupBarcodeProduct', () => {
    it('should call the correct WS command and return results array', async () => {
      const expected = {
        barcode: '123',
        results: [
          { provider: 'openfoodfacts', found: true, product: { name: 'Test' } },
          { provider: 'openbeautyfacts', found: false },
        ],
      };
      mockHass.callWS = vi.fn().mockResolvedValue(expected);

      const result = await services.lookupBarcodeProduct('123');

      expect(mockHass.callWS).toHaveBeenCalledWith({
        type: 'simple_inventory/lookup_barcode_product',
        barcode: '123',
      });
      expect(result).toEqual(expected);
    });

    it('should return empty results on error', async () => {
      mockHass.callWS = vi.fn().mockRejectedValue(new Error('fail'));

      const result = await services.lookupBarcodeProduct('bad');

      expect(result).toEqual({ barcode: 'bad', results: [] });
    });
  });

  describe('lookupByBarcode', () => {
    it('should call the correct WS command and return items', async () => {
      const expected = {
        items: [{ name: 'Milk', inventory_id: 'inv-1' }],
      };
      mockHass.callWS = vi.fn().mockResolvedValue(expected);

      const result = await services.lookupByBarcode('5901234123457');

      expect(mockHass.callWS).toHaveBeenCalledWith({
        type: 'simple_inventory/lookup_by_barcode',
        barcode: '5901234123457',
      });
      expect(result).toEqual(expected);
    });

    it('should return empty items on error', async () => {
      mockHass.callWS = vi.fn().mockRejectedValue(new Error('fail'));

      const result = await services.lookupByBarcode('bad');

      expect(result).toEqual({ items: [] });
    });
  });

  describe('getInfo', () => {
    it('calls simple_inventory/get_info and returns the backend info', async () => {
      const info = { version: '0.7.0', api_version: 2, features: [] };
      mockHass.callWS = vi.fn().mockResolvedValue(info);

      await expect(services.getInfo()).resolves.toEqual(info);
      expect(mockHass.callWS).toHaveBeenCalledWith({ type: 'simple_inventory/get_info' });
    });

    it('rethrows failures so callers can tell unknown_command from other errors', async () => {
      const error = { code: 'unknown_command', message: 'Unknown command.' };
      mockHass.callWS = vi.fn().mockRejectedValue(error);

      await expect(services.getInfo()).rejects.toBe(error);
    });
  });

  describe('batch parameters', () => {
    it('sends every restock field with an increment', async () => {
      await services.incrementItem('inv', 'Milk', 2, {
        expiryDate: '2026-11-01',
        location: 'Garage',
        purchasedAt: '2026-10-25',
        price: 1.25,
      });

      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.INCREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: 'inv',
        [PARAMS.NAME]: 'Milk',
        [PARAMS.AMOUNT]: 2,
        [PARAMS.EXPIRY_DATE]: '2026-11-01',
        [PARAMS.LOCATION]: 'Garage',
        [PARAMS.PURCHASED_AT]: '2026-10-25',
        [PARAMS.PRICE]: 1.25,
      });
    });

    it('omits unset restock fields so pre-batch integrations accept the call', async () => {
      await services.incrementItem('inv', 'Milk', 1, { location: 'Garage' });

      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.INCREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: 'inv',
        [PARAMS.NAME]: 'Milk',
        [PARAMS.AMOUNT]: 1,
        [PARAMS.LOCATION]: 'Garage',
      });
    });

    it('targets a batch or a location on decrement', async () => {
      await services.decrementItem('inv', 'Milk', 0.5, { batchId: 'b1' });
      await services.decrementItem('inv', 'Milk', 1, { location: 'Fridge' });

      expect(mockHass.callService).toHaveBeenNthCalledWith(1, DOMAIN, SERVICES.DECREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: 'inv',
        [PARAMS.NAME]: 'Milk',
        [PARAMS.AMOUNT]: 0.5,
        [PARAMS.BATCH_ID]: 'b1',
      });
      expect(mockHass.callService).toHaveBeenNthCalledWith(2, DOMAIN, SERVICES.DECREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: 'inv',
        [PARAMS.NAME]: 'Milk',
        [PARAMS.AMOUNT]: 1,
        [PARAMS.LOCATION]: 'Fridge',
      });
    });

    it('passes restock fields through scan_barcode', async () => {
      await services.scanBarcode('inv', '123', 'increment', 1, { expiryDate: '2026-11-01' });

      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.SCAN_BARCODE, {
        [PARAMS.INVENTORY_ID]: 'inv',
        [PARAMS.BARCODE]: '123',
        action: 'increment',
        [PARAMS.AMOUNT]: 1,
        [PARAMS.EXPIRY_DATE]: '2026-11-01',
      });
    });
  });

  describe('updateBatch', () => {
    it('sends only the fields being changed, including cleared ones', async () => {
      const result = await services.updateBatch('inv', 'b1', {
        quantity: 0.5,
        expiryDate: '',
        location: '',
        unitPrice: 2,
        purchasedAt: '2026-10-01',
      });

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_BATCH, {
        [PARAMS.INVENTORY_ID]: 'inv',
        [PARAMS.BATCH_ID]: 'b1',
        [PARAMS.QUANTITY]: 0.5,
        [PARAMS.EXPIRY_DATE]: '',
        [PARAMS.LOCATION]: '',
        [PARAMS.UNIT_PRICE]: 2,
        [PARAMS.PURCHASED_AT]: '2026-10-01',
      });
    });

    it('never sends a blank purchase date', async () => {
      await services.updateBatch('inv', 'b1', { purchasedAt: '' });

      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_BATCH, {
        [PARAMS.INVENTORY_ID]: 'inv',
        [PARAMS.BATCH_ID]: 'b1',
      });
    });

    it('sends just the batch id for an empty change', async () => {
      await services.updateBatch('inv', 'b1', {});

      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_BATCH, {
        [PARAMS.INVENTORY_ID]: 'inv',
        [PARAMS.BATCH_ID]: 'b1',
      });
    });
  });

  describe('removeBatch', () => {
    it('calls remove_batch with the batch id', async () => {
      const result = await services.removeBatch('inv', 'b1');

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.REMOVE_BATCH, {
        [PARAMS.INVENTORY_ID]: 'inv',
        [PARAMS.BATCH_ID]: 'b1',
      });
    });
  });

  describe('transferItem', () => {
    it('moves an amount of one batch to the destination', async () => {
      const result = await services.transferItem('inv', 'Milk', {
        batchId: 'b1',
        amount: 2,
        toLocation: 'Garage',
      });

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.TRANSFER_ITEM, {
        [PARAMS.INVENTORY_ID]: 'inv',
        [PARAMS.NAME]: 'Milk',
        [PARAMS.BATCH_ID]: 'b1',
        [PARAMS.AMOUNT]: 2,
        [PARAMS.TO_LOCATION]: 'Garage',
      });
    });

    it('returns the message and the backend error code when the move is refused', async () => {
      vi.mocked(mockHass.callService).mockRejectedValueOnce({
        message: 'Only 1 of Milk available at Fridge; nothing was moved',
        translation_key: 'insufficient_stock',
      });

      const result = await services.transferItem('inv', 'Milk', {
        batchId: 'b1',
        amount: 2,
        toLocation: 'Garage',
      });

      expect(result).toEqual({
        success: false,
        error: 'Only 1 of Milk available at Fridge; nothing was moved',
        errorCode: 'insufficient_stock',
      });
    });
  });

  describe('item images', () => {
    function jsonResponse(status: number, body: unknown): Response {
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    it('fetches an image with the auth header as a blob', async () => {
      vi.mocked(mockHass.fetchWithAuth).mockResolvedValueOnce(
        new Response('img', { status: 200, headers: { 'Content-Type': 'image/webp' } }),
      );

      const blob = await services.fetchImage('/api/simple_inventory/image/abc?thumb=1&v=1');

      expect(mockHass.fetchWithAuth).toHaveBeenCalledWith(
        '/api/simple_inventory/image/abc?thumb=1&v=1',
      );
      expect(await blob.text()).toBe('img');
    });

    it('rejects an image fetch the server refuses', async () => {
      vi.mocked(mockHass.fetchWithAuth).mockResolvedValueOnce(
        jsonResponse(404, { code: 'image_not_found' }),
      );

      await expect(services.fetchImage('/api/simple_inventory/image/abc?v=1')).rejects.toThrow(
        'HTTP 404',
      );
    });

    it('uploads the file as multipart field "file" and returns the new stamp', async () => {
      vi.mocked(mockHass.fetchWithAuth).mockResolvedValueOnce(
        jsonResponse(200, { image: '18f3a2' }),
      );
      const file = new File(['png'], 'milk.png', { type: 'image/png' });

      const result = await services.uploadItemImage('a/b', file);

      expect(result).toEqual({ success: true, image: '18f3a2' });
      const [path, init] = vi.mocked(mockHass.fetchWithAuth).mock.calls[0];
      expect(path).toBe('/api/simple_inventory/image/a%2Fb');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBeInstanceOf(FormData);
      const sent = init?.body instanceof FormData ? init.body.get('file') : null;
      expect(sent).toBeInstanceOf(File);
    });

    it('returns the server error code when an upload is refused', async () => {
      vi.mocked(mockHass.fetchWithAuth).mockResolvedValueOnce(
        jsonResponse(413, { code: 'image_too_large' }),
      );

      const result = await services.uploadItemImage('abc', new Blob(['x']));

      expect(result).toEqual({ success: false, error: 'HTTP 413', errorCode: 'image_too_large' });
    });

    it('returns a failure when the upload request itself fails', async () => {
      vi.mocked(mockHass.fetchWithAuth).mockRejectedValueOnce(new Error('offline'));

      const result = await services.uploadItemImage('abc', new Blob(['x']));

      expect(result).toEqual({ success: false, error: 'offline' });
    });

    it('deletes the image with DELETE', async () => {
      vi.mocked(mockHass.fetchWithAuth).mockResolvedValueOnce(jsonResponse(200, { image: '' }));

      const result = await services.deleteItemImage('abc');

      expect(result).toEqual({ success: true, image: '' });
      expect(mockHass.fetchWithAuth).toHaveBeenCalledWith('/api/simple_inventory/image/abc', {
        method: 'DELETE',
      });
    });

    it('sets the image from the barcode lookup, naming the lookup barcode when given', async () => {
      await services.setItemImageFromBarcode('inv', 'Milk', '4006381333931');
      await services.setItemImageFromBarcode('inv', 'Milk');

      expect(mockHass.callService).toHaveBeenNthCalledWith(
        1,
        DOMAIN,
        SERVICES.SET_ITEM_IMAGE_FROM_BARCODE,
        {
          [PARAMS.INVENTORY_ID]: 'inv',
          [PARAMS.NAME]: 'Milk',
          [PARAMS.LOOKUP_BARCODE]: '4006381333931',
        },
      );
      expect(mockHass.callService).toHaveBeenNthCalledWith(
        2,
        DOMAIN,
        SERVICES.SET_ITEM_IMAGE_FROM_BARCODE,
        { [PARAMS.INVENTORY_ID]: 'inv', [PARAMS.NAME]: 'Milk' },
      );
    });

    it('returns the backend error code when the product has no photo', async () => {
      vi.mocked(mockHass.callService).mockRejectedValueOnce({
        message: 'No product photo',
        translation_key: 'image_not_found',
      });

      const result = await services.setItemImageFromBarcode('inv', 'Milk');

      expect(result).toEqual({
        success: false,
        error: 'No product photo',
        errorCode: 'image_not_found',
      });
    });

    it('sets the image from a media source id', async () => {
      const result = await services.setItemImageFromMedia(
        'inv',
        'Milk',
        'media-source://media_source/local/milk.jpg',
      );

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(
        DOMAIN,
        SERVICES.SET_ITEM_IMAGE_FROM_MEDIA,
        {
          [PARAMS.INVENTORY_ID]: 'inv',
          [PARAMS.NAME]: 'Milk',
          [PARAMS.MEDIA_CONTENT_ID]: 'media-source://media_source/local/milk.jpg',
        },
      );
    });
  });
});
