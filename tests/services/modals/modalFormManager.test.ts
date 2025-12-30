import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalFormManager } from '../../../src/services/modals/modalFormManager';
import { ELEMENTS, DEFAULTS } from '../../../src/utils/constants';
import { InventoryItem } from '../../../src/types/homeAssistant';
import { RawFormData } from '../../../src/types/inventoryItem';

describe('ModalFormManager', () => {
  let modalFormManager: ModalFormManager;
  let mockShadowRoot: ShadowRoot;
  let mockElements: Map<string, HTMLInputElement>;

  beforeEach(() => {
    mockElements = new Map();
    mockShadowRoot = {
      getElementById: vi.fn((id: string) => mockElements.get(id) || null),
    } as unknown as ShadowRoot;

    modalFormManager = new ModalFormManager(mockShadowRoot);

    vi.clearAllMocks();
  });

  const createMockInput = (value: string = '', checked: boolean = false): HTMLInputElement =>
    ({
      value,
      checked,
    }) as HTMLInputElement;

  const setupAddModalElements = (values: Partial<Record<string, string | boolean>> = {}) => {
    mockElements.set(`add-${ELEMENTS.NAME}`, createMockInput((values.name as string) || ''));
    mockElements.set(
      `add-${ELEMENTS.QUANTITY}`,
      createMockInput((values.quantity as string) || '0'),
    );
    mockElements.set(`add-${ELEMENTS.UNIT}`, createMockInput((values.unit as string) || ''));
    mockElements.set(
      `add-${ELEMENTS.CATEGORY}`,
      createMockInput((values.category as string) || ''),
    );
    mockElements.set(
      `add-${ELEMENTS.DESCRIPTION}`,
      createMockInput((values.description as string) || ''),
    );
    mockElements.set(
      `add-${ELEMENTS.LOCATION}`,
      createMockInput((values.location as string) || ''),
    );
    mockElements.set(
      `add-${ELEMENTS.EXPIRY_DATE}`,
      createMockInput((values.expiryDate as string) || ''),
    );
    mockElements.set(
      `add-${ELEMENTS.EXPIRY_ALERT_DAYS}`,
      createMockInput((values.expiryAlertDays as string) || '7'),
    );
    mockElements.set(
      `add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
      createMockInput((values.autoAddToListQuantity as string) || '0'),
    );
    mockElements.set(
      `add-${ELEMENTS.TODO_LIST}`,
      createMockInput((values.todoList as string) || ''),
    );
    mockElements.set(
      `add-${ELEMENTS.AUTO_ADD_ENABLED}`,
      createMockInput('', (values.autoAddEnabled as boolean) || false),
    );
    mockElements.set(
      `add-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`,
      createMockInput('', (values.autoAddIdToDescriptionEnabled as boolean) || false),
    );
  };

  const setupEditModalElements = (values: Partial<Record<string, string | boolean>> = {}) => {
    mockElements.set(`edit-${ELEMENTS.NAME}`, createMockInput((values.name as string) || ''));
    mockElements.set(
      `edit-${ELEMENTS.QUANTITY}`,
      createMockInput((values.quantity as string) || '0'),
    );
    mockElements.set(`edit-${ELEMENTS.UNIT}`, createMockInput((values.unit as string) || ''));
    mockElements.set(
      `edit-${ELEMENTS.CATEGORY}`,
      createMockInput((values.category as string) || ''),
    );
    mockElements.set(
      `edit-${ELEMENTS.DESCRIPTION}`,
      createMockInput((values.description as string) || ''),
    );
    mockElements.set(
      `edit-${ELEMENTS.LOCATION}`,
      createMockInput((values.location as string) || ''),
    );
    mockElements.set(
      `edit-${ELEMENTS.EXPIRY_DATE}`,
      createMockInput((values.expiryDate as string) || ''),
    );
    mockElements.set(
      `edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`,
      createMockInput((values.expiryAlertDays as string) || '7'),
    );
    mockElements.set(
      `edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
      createMockInput((values.autoAddToListQuantity as string) || '0'),
    );
    mockElements.set(
      `edit-${ELEMENTS.TODO_LIST}`,
      createMockInput((values.todoList as string) || ''),
    );
    mockElements.set(
      `edit-${ELEMENTS.AUTO_ADD_ENABLED}`,
      createMockInput('', (values.autoAddEnabled as boolean) || false),
    );
    mockElements.set(
      `edit-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`,
      createMockInput('', (values.autoAddIdToDescriptionEnabled as boolean) || false),
    );
  };

  describe('Constructor', () => {
    it('should initialize with shadow root', () => {
      expect(modalFormManager['shadowRoot']).toBe(mockShadowRoot);
    });
  });

  describe('getRawAddModalData', () => {
    it('should extract all form data from add modal', () => {
      setupAddModalElements({
        autoAddEnabled: true,
        autoAddIdToDescriptionEnabled: true,
        autoAddToListQuantity: '2',
        category: 'Food',
        description: 'Test description',
        expiryAlertDays: '10',
        expiryDate: '2024-12-31',
        location: 'Pantry',
        name: 'Test Item',
        quantity: '5',
        todoList: 'shopping',
        unit: 'pieces',
      });

      const result = modalFormManager.getRawAddModalData();

      const expected: RawFormData = {
        autoAddEnabled: true,
        autoAddIdToDescriptionEnabled: true,
        autoAddToListQuantity: '2',
        category: 'Food',
        description: 'Test description',
        expiryAlertDays: '10',
        expiryDate: '2024-12-31',
        location: 'Pantry',
        name: 'Test Item',
        quantity: '5',
        todoList: 'shopping',
        unit: 'pieces',
      };

      expect(result).toEqual(expected);
    });

    it('should return empty strings for missing elements', () => {
      // Don't setup any elements

      const result = modalFormManager.getRawAddModalData();

      const expected: RawFormData = {
        autoAddEnabled: false,
        autoAddIdToDescriptionEnabled: false,
        autoAddToListQuantity: '',
        category: '',
        description: '',
        expiryAlertDays: '',
        expiryDate: '',
        location: '',
        name: '',
        quantity: '',
        todoList: '',
        unit: '',
      };

      expect(result).toEqual(expected);
    });

    it('should trim whitespace from input values', () => {
      setupAddModalElements({
        category: ' Food ',
        description: '  Sample description  ',
        location: '  Fridge  ',
        name: '  Test Item  ',
        unit: '  pieces  ',
      });

      const result = modalFormManager.getRawAddModalData();

      expect(result.category).toBe('Food');
      expect(result.description).toBe('Sample description');
      expect(result.location).toBe('Fridge');
      expect(result.name).toBe('Test Item');
      expect(result.unit).toBe('pieces');
    });

    it('should handle checkbox states correctly', () => {
      setupAddModalElements({
        autoAddEnabled: true,
      });

      const result = modalFormManager.getRawAddModalData();

      expect(result.autoAddEnabled).toBe(true);
    });
  });

  describe('getRawEditModalData', () => {
    it('should extract all form data from edit modal', () => {
      setupEditModalElements({
        autoAddEnabled: false,
        autoAddIdToDescriptionEnabled: false,
        autoAddToListQuantity: '1',
        category: 'Grocery',
        description: 'Edited description',
        expiryAlertDays: '5',
        expiryDate: '2024-11-30',
        location: 'Kitchen',
        name: 'Edited Item',
        quantity: '3',
        todoList: 'groceries',
        unit: 'kg',
      });

      const result = modalFormManager.getRawEditModalData();

      const expected: RawFormData = {
        autoAddEnabled: false,
        autoAddIdToDescriptionEnabled: false,
        autoAddToListQuantity: '1',
        category: 'Grocery',
        description: 'Edited description',
        expiryAlertDays: '5',
        expiryDate: '2024-11-30',
        location: 'Kitchen',
        name: 'Edited Item',
        quantity: '3',
        todoList: 'groceries',
        unit: 'kg',
      };

      expect(result).toEqual(expected);
    });

    it('should return defaults for missing elements', () => {
      const result = modalFormManager.getRawEditModalData();

      const expected: RawFormData = {
        autoAddEnabled: false,
        autoAddIdToDescriptionEnabled: false,
        autoAddToListQuantity: '',
        category: '',
        description: '',
        expiryAlertDays: '',
        expiryDate: '',
        location: '',
        name: '',
        quantity: '',
        todoList: '',
        unit: '',
      };

      expect(result).toEqual(expected);
    });
  });

  describe('populateEditModal', () => {
    beforeEach(() => {
      setupEditModalElements(); // Setup elements with empty values
    });

    it('should populate all fields with item data', () => {
      const item: InventoryItem = {
        auto_add_enabled: true,
        auto_add_id_to_description_enabled: true,
        auto_add_to_list_quantity: 2,
        category: 'Food',
        description: 'Test description',
        expiry_alert_days: 10,
        expiry_date: '2024-12-31',
        location: 'Pantry',
        name: 'Test Item',
        quantity: 5,
        todo_list: 'shopping',
        unit: 'pieces',
      };

      modalFormManager.populateEditModal(item);

      expect(mockElements.get(`edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`)?.value).toBe('2');
      expect(mockElements.get(`edit-${ELEMENTS.CATEGORY}`)?.value).toBe('Food');
      expect(mockElements.get(`edit-${ELEMENTS.DESCRIPTION}`)?.value).toBe('Test description');
      expect(mockElements.get(`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`)?.value).toBe('10');
      expect(mockElements.get(`edit-${ELEMENTS.EXPIRY_DATE}`)?.value).toBe('2024-12-31');
      expect(mockElements.get(`edit-${ELEMENTS.LOCATION}`)?.value).toBe('Pantry');
      expect(mockElements.get(`edit-${ELEMENTS.NAME}`)?.value).toBe('Test Item');
      expect(mockElements.get(`edit-${ELEMENTS.QUANTITY}`)?.value).toBe('5');
      expect(mockElements.get(`edit-${ELEMENTS.TODO_LIST}`)?.value).toBe('shopping');
      expect(mockElements.get(`edit-${ELEMENTS.UNIT}`)?.value).toBe('pieces');
      expect(
        (mockElements.get(`edit-${ELEMENTS.AUTO_ADD_ENABLED}`) as HTMLInputElement)?.checked,
      ).toBe(true);
      expect(
        (
          mockElements.get(
            `edit-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`,
          ) as HTMLInputElement
        )?.checked,
      ).toBe(true);
    });

    it('should handle null/undefined values with defaults', () => {
      const item: InventoryItem = {
        auto_add_enabled: undefined as any,
        auto_add_id_to_description_enabled: undefined as any,
        auto_add_to_list_quantity: null as any,
        category: undefined as any,
        description: undefined as any,
        expiry_alert_days: undefined as any,
        expiry_date: undefined as any,
        location: null as any,
        name: 'Test Item',
        quantity: null as any,
        todo_list: null as any,
        unit: null as any,
      };

      modalFormManager.populateEditModal(item);

      expect(mockElements.get(`edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`)?.value).toBe('0');
      expect(mockElements.get(`edit-${ELEMENTS.CATEGORY}`)?.value).toBe('');
      expect(mockElements.get(`edit-${ELEMENTS.DESCRIPTION}`)?.value).toBe('');
      expect(mockElements.get(`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`)?.value).toBe('1');
      expect(mockElements.get(`edit-${ELEMENTS.EXPIRY_DATE}`)?.value).toBe('');
      expect(mockElements.get(`edit-${ELEMENTS.LOCATION}`)?.value).toBe('');
      expect(mockElements.get(`edit-${ELEMENTS.NAME}`)?.value).toBe('Test Item');
      expect(mockElements.get(`edit-${ELEMENTS.QUANTITY}`)?.value).toBe('1');
      expect(mockElements.get(`edit-${ELEMENTS.TODO_LIST}`)?.value).toBe('');
      expect(mockElements.get(`edit-${ELEMENTS.UNIT}`)?.value).toBe('');
      expect(
        (mockElements.get(`edit-${ELEMENTS.AUTO_ADD_ENABLED}`) as HTMLInputElement)?.checked,
      ).toBe(false);
      expect(
        (
          mockElements.get(
            `edit-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`,
          ) as HTMLInputElement
        )?.checked,
      ).toBe(false);
    });

    it('should handle missing form elements gracefully', () => {
      mockElements.clear(); // Remove all elements

      const item: InventoryItem = {
        auto_add_enabled: true,
        auto_add_id_to_description_enabled: true,
        category: 'Food',
        description: 'Test description',
        expiry_date: '2024-12-31',
        location: 'Pantry',
        name: 'Test Item',
        quantity: 5,
        todo_list: 'shopping',
        unit: 'pieces',
      };

      expect(() => modalFormManager.populateEditModal(item)).not.toThrow();
    });

    it('should handle partial item data', () => {
      const item: InventoryItem = {
        auto_add_enabled: false,
        auto_add_id_to_description_enabled: true,
        category: 'Test',
        description: '',
        expiry_date: '',
        location: '',
        name: 'Minimal Item',
        quantity: 1,
        todo_list: '',
        unit: '',
      };

      modalFormManager.populateEditModal(item);

      expect(mockElements.get(`edit-${ELEMENTS.NAME}`)?.value).toBe('Minimal Item');
      expect(mockElements.get(`edit-${ELEMENTS.QUANTITY}`)?.value).toBe('1');
      expect(mockElements.get(`edit-${ELEMENTS.CATEGORY}`)?.value).toBe('Test');
      expect(mockElements.get(`edit-${ELEMENTS.UNIT}`)?.value).toBe('');
      expect(mockElements.get(`edit-${ELEMENTS.DESCRIPTION}`)?.value).toBe('');
      expect(mockElements.get(`edit-${ELEMENTS.LOCATION}`)?.value).toBe('');
      expect(mockElements.get(`edit-${ELEMENTS.EXPIRY_DATE}`)?.value).toBe('');
      expect(mockElements.get(`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`)?.value).toBe('1');
      expect(mockElements.get(`edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`)?.value).toBe('0');
      expect(mockElements.get(`edit-${ELEMENTS.TODO_LIST}`)?.value).toBe('');
      expect(mockElements.get(`edit-${ELEMENTS.AUTO_ADD_ENABLED}`)?.checked).toBe(false);
      expect(mockElements.get(`edit-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`)?.checked).toBe(
        true,
      );
    });
  });

  describe('clearAddModalForm', () => {
    beforeEach(() => {
      // Setup elements with some values to clear
      setupAddModalElements({
        autoAddEnabled: true,
        autoAddIdToDescriptionEnabled: true,
        autoAddToListQuantity: '5',
        category: 'Food',
        expiryAlertDays: '15',
        description: 'Existing Item',
        expiryDate: '2024-12-31',
        location: 'Fridge',
        name: 'Existing Item',
        quantity: '10',
        todoList: 'shopping',
        unit: 'kg',
      });
    });

    it('should clear all form fields to default values', () => {
      modalFormManager.clearAddModalForm();

      expect(mockElements.get(`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`)?.value).toBe('0');
      expect(mockElements.get(`add-${ELEMENTS.CATEGORY}`)?.value).toBe('');
      expect(mockElements.get(`add-${ELEMENTS.DESCRIPTION}`)?.value).toBe('');
      expect(mockElements.get(`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`)?.value).toBe('1');
      expect(mockElements.get(`add-${ELEMENTS.EXPIRY_DATE}`)?.value).toBe('');
      expect(mockElements.get(`add-${ELEMENTS.LOCATION}`)?.value).toBe('');
      expect(mockElements.get(`add-${ELEMENTS.NAME}`)?.value).toBe('');
      expect(mockElements.get(`add-${ELEMENTS.QUANTITY}`)?.value).toBe('1');
      expect(mockElements.get(`add-${ELEMENTS.TODO_LIST}`)?.value).toBe('');
      expect(mockElements.get(`add-${ELEMENTS.UNIT}`)?.value).toBe('');
      expect(
        (mockElements.get(`add-${ELEMENTS.AUTO_ADD_ENABLED}`) as HTMLInputElement)?.checked,
      ).toBe(DEFAULTS.AUTO_ADD_ENABLED);
      expect(
        (mockElements.get(`add-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`) as HTMLInputElement)
          ?.checked,
      ).toBe(DEFAULTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED);
    });

    it('should handle missing form elements gracefully', () => {
      mockElements.clear();

      expect(() => modalFormManager.clearAddModalForm()).not.toThrow();
    });

    it('should handle missing checkbox element', () => {
      mockElements.delete(`add-${ELEMENTS.AUTO_ADD_ENABLED}`);

      expect(() => modalFormManager.clearAddModalForm()).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle getElementById returning null', () => {
      vi.mocked(mockShadowRoot.getElementById).mockReturnValue(null);

      const result = modalFormManager.getRawAddModalData();

      expect(result.name).toBe('');
      expect(result.autoAddEnabled).toBe(false);
    });

    it('should handle elements without value property', () => {
      const elementWithoutValue = {} as HTMLInputElement;
      mockElements.set(`add-${ELEMENTS.NAME}`, elementWithoutValue);

      const result = modalFormManager.getRawAddModalData();

      expect(result.name).toBe('');
    });

    it('should handle elements without checked property', () => {
      const elementWithoutChecked = {} as HTMLInputElement;
      mockElements.set(`add-${ELEMENTS.AUTO_ADD_ENABLED}`, elementWithoutChecked);

      const result = modalFormManager.getRawAddModalData();

      expect(result.autoAddEnabled).toBe(false);
    });

    it('should handle empty string values in trim operations', () => {
      setupAddModalElements({
        category: '   ',
        description: '      ',
        name: '',
        unit: null as any,
      });

      const result = modalFormManager.getRawAddModalData();

      expect(result.category).toBe('');
      expect(result.description).toBe('');
      expect(result.name).toBe('');
      expect(result.unit).toBe('');
    });

    it('should handle numeric conversions for populate operations', () => {
      setupEditModalElements();

      const item: InventoryItem = {
        auto_add_enabled: false,
        auto_add_id_to_description_enabled: false,
        auto_add_to_list_quantity: 0,
        category: '',
        description: '',
        expiry_alert_days: 0,
        expiry_date: '',
        location: '',
        name: 'Test',
        quantity: 0,
        todo_list: '',
        unit: '',
      };

      modalFormManager.populateEditModal(item);

      expect(mockElements.get(`edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`)?.value).toBe('0');
      expect(mockElements.get(`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`)?.value).toBe('0');
      expect(mockElements.get(`edit-${ELEMENTS.QUANTITY}`)?.value).toBe('0');
    });
  });

  describe('Private Method Integration', () => {
    it('should correctly use getElement method through public methods', () => {
      const getElementSpy = vi.spyOn(mockShadowRoot, 'getElementById');
      setupAddModalElements({ name: 'Test' });

      modalFormManager.getRawAddModalData();

      expect(getElementSpy).toHaveBeenCalledWith(`add-${ELEMENTS.NAME}`);
      expect(getElementSpy).toHaveBeenCalledWith(`add-${ELEMENTS.AUTO_ADD_ENABLED}`);
    });

    it('should call setFormValues through clearAddModalForm', () => {
      setupAddModalElements({
        name: 'Initial Value',
        quantity: '10',
        category: 'Food',
      });
      const initialValues = mockElements.get(`add-${ELEMENTS.NAME}`)?.value;

      modalFormManager.clearAddModalForm();

      const finalValues = mockElements.get(`add-${ELEMENTS.NAME}`)?.value;
      expect(finalValues).not.toBe(initialValues);
      expect(finalValues).toBe(''); // Should be cleared to empty
      expect(initialValues).toBe('Initial Value');
    });
  });
});
