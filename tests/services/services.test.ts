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

    services = new Services(mockHass);

    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should store the HomeAssistant instance', () => {
      const newServices = new Services(mockHass);
      expect(newServices).toBeInstanceOf(Services);
    });
  });

  describe('addItem', () => {
    const inventoryId = 'test-inventory';
    const itemData: ItemData = {
      autoAddEnabled: true,
      autoAddToListQuantity: 2,
      category: 'Food',
      expiryAlertDays: 3,
      expiryDate: '2023-12-25',
      location: 'Pantry',
      name: 'Test Item',
      quantity: 5,
      todoList: 'todo.shopping',
      unit: 'pieces',
    };

    it('should successfully add item with all data', async () => {
      const result = await services.addItem(inventoryId, itemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: itemData.autoAddEnabled,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: itemData.autoAddToListQuantity,
        [PARAMS.CATEGORY]: itemData.category,
        [PARAMS.EXPIRY_ALERT_DAYS]: itemData.expiryAlertDays,
        [PARAMS.EXPIRY_DATE]: itemData.expiryDate,
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: itemData.location,
        [PARAMS.NAME]: itemData.name,
        [PARAMS.QUANTITY]: itemData.quantity,
        [PARAMS.TODO_LIST]: itemData.todoList,
        [PARAMS.UNIT]: itemData.unit,
      });
    });

    it('should use default values for undefined properties', async () => {
      const minimalItemData: ItemData = {
        autoAddEnabled: undefined as any,
        autoAddToListQuantity: undefined as any,
        category: undefined as any,
        expiryAlertDays: undefined as any,
        expiryDate: undefined as any,
        location: undefined as any,
        name: 'Minimal Item',
        quantity: 1,
        todoList: undefined as any,
        unit: undefined as any,
      };

      const result = await services.addItem(inventoryId, minimalItemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: DEFAULTS.AUTO_ADD_ENABLED,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY,
        [PARAMS.CATEGORY]: DEFAULTS.CATEGORY,
        [PARAMS.EXPIRY_ALERT_DAYS]: DEFAULTS.EXPIRY_ALERT_DAYS,
        [PARAMS.EXPIRY_DATE]: DEFAULTS.EXPIRY_DATE,
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: DEFAULTS.LOCATION,
        [PARAMS.NAME]: minimalItemData.name,
        [PARAMS.QUANTITY]: minimalItemData.quantity,
        [PARAMS.TODO_LIST]: DEFAULTS.TODO_LIST,
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
        autoAddToListQuantity: 0,
        category: '',
        expiryAlertDays: 0,
        expiryDate: null as any,
        location: null as any,
        name: 'Test Item',
        quantity: 0,
        todoList: '',
        unit: null as any,
      };

      const result = await services.addItem(inventoryId, itemDataWithNulls);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: false,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY, // 0 should use default
        [PARAMS.CATEGORY]: '', // empty string should be preserved
        [PARAMS.EXPIRY_ALERT_DAYS]: 0,
        [PARAMS.EXPIRY_DATE]: DEFAULTS.EXPIRY_DATE, // null should use default
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: DEFAULTS.LOCATION, // null should use default
        [PARAMS.NAME]: itemDataWithNulls.name,
        [PARAMS.QUANTITY]: 0,
        [PARAMS.TODO_LIST]: '', // empty string should be preserved
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
        error: '[object Object]', // String(errorValue)
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
      autoAddToListQuantity: 3,
      category: 'Updated Category',
      expiryAlertDays: 5,
      expiryDate: '2024-01-01',
      location: 'Updated Location',
      name: 'Updated Item',
      quantity: 10,
      todoList: 'todo.updated',
      unit: 'kg',
    };

    it('should successfully update item with all data', async () => {
      const result = await services.updateItem(inventoryId, oldName, itemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: itemData.autoAddEnabled,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: itemData.autoAddToListQuantity,
        [PARAMS.CATEGORY]: itemData.category,
        [PARAMS.EXPIRY_ALERT_DAYS]: itemData.expiryAlertDays,
        [PARAMS.EXPIRY_DATE]: itemData.expiryDate,
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: itemData.location,
        [PARAMS.NAME]: itemData.name,
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.QUANTITY]: itemData.quantity,
        [PARAMS.TODO_LIST]: itemData.todoList,
        [PARAMS.UNIT]: itemData.unit,
      });
    });

    it('should use default values for undefined properties', async () => {
      const minimalItemData: ItemData = {
        autoAddEnabled: undefined as any,
        autoAddToListQuantity: undefined as any,
        category: undefined as any,
        expiryAlertDays: undefined as any,
        expiryDate: undefined as any,
        location: undefined as any,
        name: 'Updated Name',
        quantity: 5,
        todoList: undefined as any,
        unit: undefined as any,
      };

      const result = await services.updateItem(inventoryId, oldName, minimalItemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: DEFAULTS.AUTO_ADD_ENABLED,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY,
        [PARAMS.CATEGORY]: DEFAULTS.CATEGORY,
        [PARAMS.EXPIRY_ALERT_DAYS]: DEFAULTS.EXPIRY_ALERT_DAYS,
        [PARAMS.EXPIRY_DATE]: DEFAULTS.EXPIRY_DATE,
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: DEFAULTS.LOCATION,
        [PARAMS.NAME]: minimalItemData.name,
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.QUANTITY]: minimalItemData.quantity,
        [PARAMS.TODO_LIST]: DEFAULTS.TODO_LIST,
        [PARAMS.UNIT]: DEFAULTS.UNIT,
      });
    });

    it('should preserve falsy values that are not undefined', async () => {
      const falsyItemData: ItemData = {
        autoAddEnabled: false,
        autoAddToListQuantity: 0,
        category: '',
        expiryAlertDays: 0,
        expiryDate: '',
        location: '',
        name: '',
        quantity: 0,
        todoList: '',
        unit: '',
      };

      const result = await services.updateItem(inventoryId, oldName, falsyItemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: false,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: 0,
        [PARAMS.CATEGORY]: DEFAULTS.CATEGORY, // empty string should use default
        [PARAMS.EXPIRY_ALERT_DAYS]: 0,
        [PARAMS.EXPIRY_DATE]: '',
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.LOCATION]: DEFAULTS.LOCATION, // empty string should use defaulth
        [PARAMS.NAME]: '',
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.QUANTITY]: 0,
        [PARAMS.TODO_LIST]: '',
        [PARAMS.UNIT]: DEFAULTS.UNIT, // empty string should use default
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
  });
});
