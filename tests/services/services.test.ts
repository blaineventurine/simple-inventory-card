import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Services } from '../../src/services/services';
import { HomeAssistant } from '../../src/types/home-assistant';
import { ItemData } from '../../src/types/inventoryItem';
import { DOMAIN, SERVICES, PARAMS, DEFAULTS } from '../../src/utils/constants';

describe('Services', () => {
  let services: Services;
  let mockHass: HomeAssistant;

  beforeEach(() => {
    // Mock HomeAssistant with callService method
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

    // Mock console.error
    vi.spyOn(console, 'error').mockImplementation(() => {});
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
      name: 'Test Item',
      quantity: 5,
      unit: 'pieces',
      category: 'Food',
      expiryDate: '2023-12-25',
      todoList: 'todo.shopping',
      expiryAlertDays: 3,
      autoAddToListQuantity: 2,
      autoAddEnabled: true,
    };

    it('should successfully add item with all data', async () => {
      const result = await services.addItem(inventoryId, itemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemData.name,
        [PARAMS.QUANTITY]: itemData.quantity,
        [PARAMS.UNIT]: itemData.unit,
        [PARAMS.CATEGORY]: itemData.category,
        [PARAMS.EXPIRY_DATE]: itemData.expiryDate,
        [PARAMS.TODO_LIST]: itemData.todoList,
        [PARAMS.EXPIRY_ALERT_DAYS]: itemData.expiryAlertDays,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: itemData.autoAddToListQuantity,
        [PARAMS.AUTO_ADD_ENABLED]: itemData.autoAddEnabled,
      });
    });

    it('should use default values for undefined properties', async () => {
      const minimalItemData: ItemData = {
        name: 'Minimal Item',
        quantity: 1,
        unit: undefined as any,
        category: undefined as any,
        expiryDate: undefined as any,
        todoList: undefined as any,
        expiryAlertDays: undefined as any,
        autoAddToListQuantity: undefined as any,
        autoAddEnabled: undefined as any,
      };

      const result = await services.addItem(inventoryId, minimalItemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: minimalItemData.name,
        [PARAMS.QUANTITY]: minimalItemData.quantity,
        [PARAMS.UNIT]: DEFAULTS.UNIT,
        [PARAMS.CATEGORY]: DEFAULTS.CATEGORY,
        [PARAMS.EXPIRY_DATE]: DEFAULTS.EXPIRY_DATE,
        [PARAMS.TODO_LIST]: DEFAULTS.TODO_LIST,
        [PARAMS.EXPIRY_ALERT_DAYS]: 7,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: 0,
        [PARAMS.AUTO_ADD_ENABLED]: DEFAULTS.AUTO_ADD_ENABLED,
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
        name: 'Test Item',
        quantity: 0,
        unit: null as any,
        category: '',
        expiryDate: null as any,
        todoList: '',
        expiryAlertDays: 0,
        autoAddToListQuantity: 0,
        autoAddEnabled: false,
      };

      const result = await services.addItem(inventoryId, itemDataWithNulls);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemDataWithNulls.name,
        [PARAMS.QUANTITY]: 0,
        [PARAMS.UNIT]: DEFAULTS.UNIT, // null should use default
        [PARAMS.CATEGORY]: '', // empty string should be preserved
        [PARAMS.EXPIRY_DATE]: DEFAULTS.EXPIRY_DATE, // null should use default
        [PARAMS.TODO_LIST]: '', // empty string should be preserved
        [PARAMS.EXPIRY_ALERT_DAYS]: 0,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: 0,
        [PARAMS.AUTO_ADD_ENABLED]: false,
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
      name: 'Updated Item',
      quantity: 10,
      unit: 'kg',
      category: 'Updated Category',
      expiryDate: '2024-01-01',
      todoList: 'todo.updated',
      expiryAlertDays: 5,
      autoAddToListQuantity: 3,
      autoAddEnabled: false,
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
        [PARAMS.NAME]: itemData.name,
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.QUANTITY]: itemData.quantity,
        [PARAMS.TODO_LIST]: itemData.todoList,
        [PARAMS.UNIT]: itemData.unit,
      });
    });

    it('should use default values for undefined properties', async () => {
      const minimalItemData: ItemData = {
        name: 'Updated Name',
        quantity: 5,
        unit: undefined as any,
        category: undefined as any,
        expiryDate: undefined as any,
        todoList: undefined as any,
        expiryAlertDays: undefined as any,
        autoAddToListQuantity: undefined as any,
        autoAddEnabled: undefined as any,
      };

      const result = await services.updateItem(inventoryId, oldName, minimalItemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: DEFAULTS.AUTO_ADD_ENABLED,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: 0,
        [PARAMS.CATEGORY]: DEFAULTS.CATEGORY,
        [PARAMS.EXPIRY_ALERT_DAYS]: 7,
        [PARAMS.EXPIRY_DATE]: DEFAULTS.EXPIRY_DATE,
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: minimalItemData.name,
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.QUANTITY]: minimalItemData.quantity,
        [PARAMS.TODO_LIST]: DEFAULTS.TODO_LIST,
        [PARAMS.UNIT]: DEFAULTS.UNIT,
      });
    });

    it('should preserve falsy values that are not undefined', async () => {
      const falsyItemData: ItemData = {
        name: '',
        quantity: 0,
        unit: '',
        category: '',
        expiryDate: '',
        todoList: '',
        expiryAlertDays: 0,
        autoAddToListQuantity: 0,
        autoAddEnabled: false,
      };

      const result = await services.updateItem(inventoryId, oldName, falsyItemData);

      expect(result).toEqual({ success: true });
      expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: false,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: 0,
        [PARAMS.CATEGORY]: '',
        [PARAMS.EXPIRY_ALERT_DAYS]: 0,
        [PARAMS.EXPIRY_DATE]: '',
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: '',
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.QUANTITY]: 0,
        [PARAMS.TODO_LIST]: '',
        [PARAMS.UNIT]: '',
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
