import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Modals, InventoryServices, InventoryServiceResult } from '../../src/services/modals';
import { ELEMENTS, CSS_CLASSES, TIMING, DEFAULTS } from '../../src/utils/constants';
import {
  HomeAssistant,
  InventoryItem,
  InventoryConfig,
  HassEntity,
} from '../../src/types/home-assistant';
import { Utils } from '../../src/utils/utils';
import { SanitizedItemData, RawFormData, ItemData } from '../../src/types/inventoryItem';
import { ValidationError } from '../../src/types/validationError';

vi.mock('../../src/utils/utils', () => ({
  Utils: {
    validateRawFormData: vi.fn(),
    convertRawFormDataToItemData: vi.fn(),
    sanitizeItemData: vi.fn(),
  },
}));

interface MockHTMLInputElement {
  value: string;
  checked?: boolean;
  disabled?: boolean;
  placeholder?: string;
  classList: {
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    contains: ReturnType<typeof vi.fn>;
  };
  addEventListener: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  select?: ReturnType<typeof vi.fn>;
  closest: ReturnType<typeof vi.fn>;
  querySelector: ReturnType<typeof vi.fn>;
  querySelectorAll: ReturnType<typeof vi.fn>;
}

interface MockHTMLElement {
  id?: string;
  classList: {
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    contains: ReturnType<typeof vi.fn>;
  };
  dataset?: { [key: string]: string };
  closest: ReturnType<typeof vi.fn>;
  querySelector: ReturnType<typeof vi.fn>;
  querySelectorAll: ReturnType<typeof vi.fn>;
  textContent?: string;
  scrollTop?: number;
}

interface MockMouseEvent {
  target: {
    id?: string;
    dataset?: { [key: string]: string };
    classList?: {
      contains: ReturnType<typeof vi.fn>;
    };
    closest?: ReturnType<typeof vi.fn>;
  };
  preventDefault: ReturnType<typeof vi.fn>;
  stopPropagation: ReturnType<typeof vi.fn>;
}

const createMockHTMLElement = (overrides: Partial<MockHTMLElement> = {}): MockHTMLElement => ({
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
  },
  closest: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
  ...overrides,
});

const createMockHTMLInputElement = (
  initialValue: string,
  overrides: Partial<MockHTMLInputElement> = {},
): MockHTMLInputElement => {
  const element = {
    get value() {
      return this._value;
    },
    set value(val: string) {
      this._value = val;
    },
    _value: initialValue,
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
    },
    addEventListener: vi.fn(),
    focus: vi.fn(),
    closest: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(),
    ...overrides,
  };

  return element as MockHTMLInputElement;
};

describe('Modals', () => {
  let modals: Modals;
  let mockShadowRoot: ShadowRoot;
  let mockServices: InventoryServices;
  let mockGetInventoryId: (entityId: string) => string;
  let mockOnDataChanged: () => void;
  let mockElements: { [key: string]: MockHTMLElement | MockHTMLInputElement | null };

  beforeEach(() => {
    mockElements = {};

    mockShadowRoot = {
      getElementById: vi.fn((id: string) => mockElements[id] as HTMLElement | null),
      querySelectorAll: vi.fn(),
    } as any;

    mockServices = {
      addItem: vi.fn(),
      updateItem: vi.fn(),
    };

    mockGetInventoryId = vi.fn((entityId: string) => `inventory_${entityId}`);
    mockOnDataChanged = vi.fn();

    modals = new Modals(mockShadowRoot, mockServices, mockGetInventoryId, mockOnDataChanged);

    vi.clearAllMocks();
  });

  afterEach(() => {
    modals.destroy();
    vi.clearAllTimers();
  });

  describe('constructor and setup', () => {
    it('should initialize with required dependencies', () => {
      expect(modals).toBeDefined();
      expect(mockGetInventoryId).toBeDefined();
      expect(mockServices).toBeDefined();
    });

    it('should setup escape key listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      new Modals(mockShadowRoot, mockServices, mockGetInventoryId);

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should work without onDataChanged callback', () => {
      const modalsWithoutCallback = new Modals(mockShadowRoot, mockServices, mockGetInventoryId);

      expect(modalsWithoutCallback).toBeDefined();
    });
  });

  describe('escape key handling', () => {
    it('should close all modals when escape key is pressed', () => {
      const closeAllModalsSpy = vi.spyOn(modals, 'closeAllModals');

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(closeAllModalsSpy).toHaveBeenCalled();
    });

    it('should not close modals for other keys', () => {
      const closeAllModalsSpy = vi.spyOn(modals, 'closeAllModals');

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);

      expect(closeAllModalsSpy).not.toHaveBeenCalled();
    });
  });

  describe('openAddModal', () => {
    it('should open add modal when element exists', () => {
      const mockModal = createMockHTMLElement();
      mockElements[ELEMENTS.ADD_MODAL] = mockModal;

      const clearErrorSpy = vi.spyOn(modals, 'clearError' as any);

      modals.openAddModal();

      expect(mockModal.classList.add).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
      expect(clearErrorSpy).toHaveBeenCalledWith(true);
    });

    it('should handle missing add modal element gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      modals.openAddModal();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Add modal not found in DOM');
    });

    it('should focus name element with delay', () => {
      vi.useFakeTimers();

      const mockModal = createMockHTMLElement();
      const mockNameInput = createMockHTMLInputElement('', {
        select: vi.fn(),
      });
      mockElements[ELEMENTS.ADD_MODAL] = mockModal;
      mockElements[ELEMENTS.NAME] = mockNameInput;

      modals.openAddModal();

      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

      expect(mockNameInput.focus).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('closeAddModal', () => {
    it('should close add modal when element exists', () => {
      const mockModal = createMockHTMLElement();
      mockElements[ELEMENTS.ADD_MODAL] = mockModal;

      modals.closeAddModal();

      expect(mockModal.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
    });

    it('should handle missing add modal element gracefully', () => {
      expect(() => modals.closeAddModal()).not.toThrow();
    });
  });

  describe('openEditModal', () => {
    const mockConfig: InventoryConfig = {
      type: 'inventory-card',
      entity: 'sensor.inventory',
    };

    const mockItem: InventoryItem = {
      name: 'Test Item',
      quantity: 5,
      unit: 'pcs',
      category: 'Food',
      expiry_date: '2024-12-31',
      expiry_alert_days: 7,
      auto_add_enabled: true,
      auto_add_to_list_quantity: 2,
      todo_list: 'Shopping List',
    };

    const mockHassEntity: HassEntity = {
      entity_id: 'sensor.inventory',
      state: 'active',
      attributes: {
        items: [mockItem],
        friendly_name: 'Inventory',
      },
      context: { id: 'test' },
      last_changed: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-01T00:00:00Z',
    };

    const mockHass: HomeAssistant = {
      states: {
        'sensor.inventory': mockHassEntity,
      },
      config: {} as any,
      themes: {},
      selectedTheme: null,
      panels: {},
      panelUrl: '',
      language: 'en',
      selectedLanguage: 'en',
      localize: vi.fn(),
      translationMetadata: {},
      dockedSidebar: 'auto',
      moreInfoEntityId: null,
      callService: vi.fn(),
      callApi: vi.fn(),
      fetchWithAuth: vi.fn(),
      sendWS: vi.fn(),
      callWS: vi.fn(),
    };

    it('should open edit modal with valid item', () => {
      const mockModal = createMockHTMLElement();
      mockElements[ELEMENTS.EDIT_MODAL] = mockModal;

      const populateEditModalSpy = vi.spyOn(modals, 'populateEditModal' as any);
      const clearErrorSpy = vi.spyOn(modals, 'clearError' as any);

      modals.openEditModal('Test Item', mockHass, mockConfig);

      expect(populateEditModalSpy).toHaveBeenCalledWith(mockItem);
      expect(mockModal.classList.add).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
      expect(clearErrorSpy).toHaveBeenCalledWith(false);
    });

    it('should handle missing entity gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const hassWithoutEntity: HomeAssistant = {
        ...mockHass,
        states: {},
      };

      modals.openEditModal('Test Item', hassWithoutEntity, mockConfig);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Entity not found: sensor.inventory');
    });

    it('should handle missing item gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      modals.openEditModal('Nonexistent Item', mockHass, mockConfig);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Item not found: Nonexistent Item');
    });

    it('should handle empty items array', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const hassWithEmptyItems: HomeAssistant = {
        ...mockHass,
        states: {
          'sensor.inventory': {
            ...mockHassEntity,
            attributes: { items: [] },
          },
        },
      };

      modals.openEditModal('Test Item', hassWithEmptyItems, mockConfig);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Item not found: Test Item');
    });

    it('should handle missing items attribute', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const hassWithoutItems: HomeAssistant = {
        ...mockHass,
        states: {
          'sensor.inventory': {
            ...mockHassEntity,
            attributes: {},
          },
        },
      };

      modals.openEditModal('Test Item', hassWithoutItems, mockConfig);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Item not found: Test Item');
    });
  });

  describe('getRawAddModalData', () => {
    beforeEach(() => {
      mockElements[`add-${ELEMENTS.NAME}`] = createMockHTMLInputElement('  Test Item  ');
      mockElements[`add-${ELEMENTS.QUANTITY}`] = createMockHTMLInputElement('5');
      mockElements[`add-${ELEMENTS.AUTO_ADD_ENABLED}`] = createMockHTMLInputElement('', {
        checked: true,
      });
      mockElements[`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`] = createMockHTMLInputElement('2');
      mockElements[`add-${ELEMENTS.TODO_LIST}`] = createMockHTMLInputElement('Shopping');
      mockElements[`add-${ELEMENTS.EXPIRY_DATE}`] = createMockHTMLInputElement('2024-12-31');
      mockElements[`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`] = createMockHTMLInputElement('7');
      mockElements[`add-${ELEMENTS.CATEGORY}`] = createMockHTMLInputElement('Food');
      mockElements[`add-${ELEMENTS.UNIT}`] = createMockHTMLInputElement('pcs');
    });

    it('should return complete form data', () => {
      const result = modals.getRawAddModalData();

      expect(result).toEqual({
        name: 'Test Item',
        quantity: '5',
        autoAddEnabled: true,
        autoAddToListQuantity: '2',
        todoList: 'Shopping',
        expiryDate: '2024-12-31',
        expiryAlertDays: '7',
        category: 'Food',
        unit: 'pcs',
      });
    });

    it('should handle missing form elements', () => {
      mockElements = {};

      const result = modals.getRawAddModalData();

      expect(result).toEqual({
        name: '',
        quantity: '',
        autoAddEnabled: false,
        autoAddToListQuantity: '',
        todoList: '',
        expiryDate: '',
        expiryAlertDays: '',
        category: '',
        unit: '',
      });
    });
  });

  describe('addItem', () => {
    const mockConfig: InventoryConfig = {
      type: 'inventory-card',
      entity: 'sensor.inventory',
    };

    const mockRawFormData: RawFormData = {
      name: 'Test Item',
      quantity: '5',
      autoAddEnabled: false,
      autoAddToListQuantity: '0',
      todoList: '',
      expiryDate: '',
      expiryAlertDays: '',
      category: 'Food',
      unit: 'pcs',
    };

    beforeEach(() => {
      vi.spyOn(modals, 'getRawAddModalData').mockReturnValue(mockRawFormData);
      vi.spyOn(modals, 'clearError' as any).mockImplementation(() => {});
      vi.spyOn(modals, 'clearAddModalForm').mockImplementation(() => {});
    });

    it('should successfully add item with valid data', async () => {
      const mockValidation = { isValid: true, errors: [] };
      const mockItemData: ItemData = { name: 'Test Item', quantity: 5 };
      const mockSanitizedData: SanitizedItemData = {
        name: 'Test Item',
        quantity: 5,
        category: 'Food',
        unit: 'pcs',
        autoAddEnabled: false,
        autoAddToListQuantity: 0,
        todoList: '',
        expiryDate: '',
        expiryAlertDays: 7,
      };
      const mockResult: InventoryServiceResult = { success: true };

      vi.mocked(Utils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(Utils.convertRawFormDataToItemData).mockReturnValue(mockItemData);
      vi.mocked(Utils.sanitizeItemData).mockReturnValue(mockSanitizedData);
      vi.mocked(mockServices.addItem).mockResolvedValue(mockResult);

      const result = await modals.addItem(mockConfig);

      expect(result).toBe(true);
      expect(mockServices.addItem).toHaveBeenCalledWith(
        'inventory_sensor.inventory',
        mockSanitizedData,
      );
      expect(mockOnDataChanged).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const mockValidation = {
        isValid: false,
        errors: [{ field: 'name', message: 'Name is required' } as ValidationError],
      };

      vi.mocked(Utils.validateRawFormData).mockReturnValue(mockValidation);
      const highlightInvalidFieldsSpy = vi.spyOn(modals, 'highlightInvalidFields' as any);
      const showErrorSpy = vi.spyOn(modals, 'showError' as any);

      const result = await modals.addItem(mockConfig);

      expect(result).toBe(false);
      expect(highlightInvalidFieldsSpy).toHaveBeenCalledWith(mockValidation.errors, true);
      expect(showErrorSpy).toHaveBeenCalledWith('Name is required', true);
    });

    it('should handle service errors', async () => {
      const mockValidation = { isValid: true, errors: [] };
      const mockResult: InventoryServiceResult = { success: false, error: 'Database error' };

      vi.mocked(Utils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(Utils.convertRawFormDataToItemData).mockReturnValue({} as ItemData);
      vi.mocked(Utils.sanitizeItemData).mockReturnValue({} as SanitizedItemData);
      vi.mocked(mockServices.addItem).mockResolvedValue(mockResult);

      const showErrorSpy = vi.spyOn(modals, 'showError' as any);

      const result = await modals.addItem(mockConfig);

      expect(result).toBe(false);
      expect(showErrorSpy).toHaveBeenCalledWith('Error adding item: Database error', true);
    });
  });

  describe('handleModalClick', () => {
    let mockEvent: MockMouseEvent;

    beforeEach(() => {
      mockEvent = {
        target: {
          dataset: {},
          classList: { contains: vi.fn().mockReturnValue(false) },
          closest: vi.fn().mockReturnValue(false),
        },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };
    });

    it('should close add modal when clicking backdrop', () => {
      mockEvent.target.id = ELEMENTS.ADD_MODAL;
      const closeAddModalSpy = vi.spyOn(modals, 'closeAddModal');

      const result = modals.handleModalClick(mockEvent as any);

      expect(result).toBe(true);
      expect(closeAddModalSpy).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should close edit modal when clicking backdrop', () => {
      mockEvent.target.id = ELEMENTS.EDIT_MODAL;
      const closeEditModalSpy = vi.spyOn(modals, 'closeEditModal');

      const result = modals.handleModalClick(mockEvent as any);

      expect(result).toBe(true);
      expect(closeEditModalSpy).toHaveBeenCalled();
    });

    it('should close add modal when clicking close button with data-action', () => {
      mockEvent.target.dataset = { action: 'close_add_modal' };
      const closeAddModalSpy = vi.spyOn(modals, 'closeAddModal');

      const result = modals.handleModalClick(mockEvent as any);

      expect(result).toBe(true);
      expect(closeAddModalSpy).toHaveBeenCalled();
    });

    it('should not close modal when clicking inside modal content', () => {
      mockEvent.target.closest = vi.fn().mockReturnValue(true);

      const result = modals.handleModalClick(mockEvent as any);

      expect(result).toBe(false);
    });

    it('should return false for unhandled clicks', () => {
      mockEvent.target.id = 'some-other-element';

      const result = modals.handleModalClick(mockEvent as any);

      expect(result).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should remove event listener and clear reference', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      modals.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should handle multiple destroy calls gracefully', () => {
      modals.destroy();

      expect(() => modals.destroy()).not.toThrow();
    });
  });

  describe('error handling', () => {
    describe('showError', () => {
      let mockValidationMessage: MockHTMLElement;
      let mockValidationText: { textContent: string };
      let mockModalContent: { scrollTop: number };

      beforeEach(() => {
        vi.useFakeTimers();

        mockValidationText = { textContent: '' };
        mockModalContent = { scrollTop: 100 };

        mockValidationMessage = createMockHTMLElement({
          querySelector: vi.fn().mockReturnValue(mockValidationText),
          closest: vi.fn().mockReturnValue(mockModalContent),
        });

        mockElements['add-validation-message'] = mockValidationMessage;
        mockElements['edit-validation-message'] = mockValidationMessage;
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should show error message for add modal', () => {
        const clearErrorSpy = vi.spyOn(modals, 'clearError' as any);

        modals['showError']('Test error message', true);

        expect(mockValidationText.textContent).toBe('Test error message');
        expect(mockValidationMessage.classList.add).toHaveBeenCalledWith('show');
        expect(mockModalContent.scrollTop).toBe(0);

        vi.advanceTimersByTime(5000);

        expect(clearErrorSpy).toHaveBeenCalledWith(true);
      });

      it('should handle missing validation message element', () => {
        mockElements['add-validation-message'] = null;
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        modals['showError']('Test error', true);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Validation Error:', 'Test error');
      });
    });

    describe('clearError', () => {
      let mockValidationMessage: MockHTMLElement;

      beforeEach(() => {
        mockValidationMessage = createMockHTMLElement();

        mockElements['add-validation-message'] = mockValidationMessage;
        mockElements['edit-validation-message'] = mockValidationMessage;
      });

      it('should clear error for add modal', () => {
        modals['clearError'](true);

        expect(mockValidationMessage.classList.remove).toHaveBeenCalledWith('show');
      });

      it('should clear error for edit modal', () => {
        modals['clearError'](false);

        expect(mockValidationMessage.classList.remove).toHaveBeenCalledWith('show');
      });

      it('should handle missing validation message element', () => {
        mockElements['add-validation-message'] = null;

        expect(() => modals['clearError'](true)).not.toThrow();
      });
    });
  });

  describe('Modals - Enhanced Coverage', () => {
    describe('boundEscHandler setup logic', () => {
      it('should not setup escape handler if already bound', () => {
        const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

        const firstModals = new Modals(mockShadowRoot, mockServices, mockGetInventoryId);
        expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

        // Call setupEventListeners again (simulating internal call)
        firstModals['setupEventListeners']();

        // Should not add listener again
        expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

        firstModals.destroy();
      });
    });

    describe('populateEditModal - detailed field setting', () => {
      let mockFormElements: { [key: string]: MockHTMLInputElement };

      beforeEach(() => {
        mockFormElements = {
          [`edit-${ELEMENTS.NAME}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.QUANTITY}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.UNIT}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.CATEGORY}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.EXPIRY_DATE}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.TODO_LIST}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.AUTO_ADD_ENABLED}`]: createMockHTMLInputElement('', { checked: false }),
        };

        Object.entries(mockFormElements).forEach(([id, element]) => {
          mockElements[id] = element;
        });
      });

      it('should populate all fields with item values', () => {
        const mockItem: InventoryItem = {
          name: 'Test Item',
          quantity: 5,
          unit: 'kg',
          category: 'Food',
          expiry_date: '2024-12-31',
          expiry_alert_days: 10,
          auto_add_enabled: true,
          auto_add_to_list_quantity: 3,
          todo_list: 'Shopping',
        };

        modals['populateEditModal'](mockItem);

        expect(mockFormElements[`edit-${ELEMENTS.NAME}`].value).toBe('Test Item');
        expect(mockFormElements[`edit-${ELEMENTS.QUANTITY}`].value).toBe('5');
        expect(mockFormElements[`edit-${ELEMENTS.UNIT}`].value).toBe('kg');
        expect(mockFormElements[`edit-${ELEMENTS.CATEGORY}`].value).toBe('Food');
        expect(mockFormElements[`edit-${ELEMENTS.EXPIRY_DATE}`].value).toBe('2024-12-31');
        expect(mockFormElements[`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`].value).toBe('10');
        expect(mockFormElements[`edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`].value).toBe('3');
        expect(mockFormElements[`edit-${ELEMENTS.TODO_LIST}`].value).toBe('Shopping');
        expect(mockFormElements[`edit-${ELEMENTS.AUTO_ADD_ENABLED}`].checked).toBe(true);
      });

      it('should call setFormValues with correct default values', () => {
        // Spy on setFormValues to capture the arguments
        const setFormValuesSpy = vi.spyOn(modals, 'setFormValues' as any);

        const mockItem: InventoryItem = {
          name: null as any,
          quantity: null as any,
          unit: undefined as any,
          category: undefined as any,
          expiry_date: null as any,
          expiry_alert_days: undefined as any,
          auto_add_enabled: false,
          auto_add_to_list_quantity: null as any,
          todo_list: undefined as any,
        };

        modals['populateEditModal'](mockItem);

        // Verify setFormValues was called
        expect(setFormValuesSpy).toHaveBeenCalled();

        // Get the fields array that was passed to setFormValues
        const fieldsArray = setFormValuesSpy.mock.calls[0][0] as Array<{
          id: string;
          value: string;
        }>;

        // Find the specific fields we're interested in
        const nameField = fieldsArray.find((field: any) => field.id === `edit-${ELEMENTS.NAME}`);
        const quantityField = fieldsArray.find(
          (field: any) => field.id === `edit-${ELEMENTS.QUANTITY}`,
        );
        const expiryAlertField = fieldsArray.find(
          (field: any) => field.id === `edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`,
        );
        const autoAddQuantityField = fieldsArray.find(
          (field: any) => field.id === `edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
        );

        // Test the actual values that should be set
        expect(nameField?.value).toBe('');
        expect(quantityField?.value).toBe('0');
        expect(expiryAlertField?.value).toBe('7'); // This is the key test
        expect(autoAddQuantityField?.value).toBe('0');
      });

      it('should handle checkbox separately from setFormValues', () => {
        const mockCheckbox = createMockHTMLInputElement('', { checked: false });
        mockElements[`edit-${ELEMENTS.AUTO_ADD_ENABLED}`] = mockCheckbox;

        const mockItem: InventoryItem = {
          name: 'Test',
          quantity: 1,
          unit: '',
          category: '',
          expiry_date: '',
          auto_add_enabled: false,
          todo_list: '',
        };

        modals['populateEditModal'](mockItem);

        expect(mockCheckbox.checked).toBe(false); // undefined ?? false = false
      });

      it('should call updateExpiryThresholdState with false for edit modal', () => {
        const updateExpiryThresholdStateSpy = vi.spyOn(modals, 'updateExpiryThresholdState' as any);
        const mockItem: InventoryItem = {
          name: 'Test',
          quantity: 1,
          unit: '',
          category: '',
          expiry_date: '',
          auto_add_enabled: false,
          todo_list: '',
        };

        modals['populateEditModal'](mockItem);

        expect(updateExpiryThresholdStateSpy).toHaveBeenCalledWith(false);
      });
    });

    describe('updateExpiryThresholdState - detailed behavior', () => {
      let mockExpiryInput: MockHTMLInputElement;
      let mockThresholdInput: MockHTMLInputElement;

      beforeEach(() => {
        mockExpiryInput = createMockHTMLInputElement('');
        mockThresholdInput = createMockHTMLInputElement('', {
          disabled: false,
          placeholder: '',
        });

        mockElements[`add-${ELEMENTS.EXPIRY_DATE}`] = mockExpiryInput;
        mockElements[`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`] = mockThresholdInput;
        mockElements[`edit-${ELEMENTS.EXPIRY_DATE}`] = mockExpiryInput;
        mockElements[`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`] = mockThresholdInput;
      });

      it('should enable threshold input when expiry date has value', () => {
        mockExpiryInput.value = '2024-12-31';

        modals['updateExpiryThresholdState'](true);

        expect(mockThresholdInput.disabled).toBe(false);
        expect(mockThresholdInput.placeholder).toBe('Days before expiry to alert (default: 7)');
      });

      it('should set default value when threshold is empty and expiry has value', () => {
        mockExpiryInput.value = '2024-12-31';
        mockThresholdInput.value = '';

        modals['updateExpiryThresholdState'](true);

        expect(mockThresholdInput.value).toBe('7');
      });

      it('should not change existing threshold value when expiry has value', () => {
        mockExpiryInput.value = '2024-12-31';
        mockThresholdInput.value = '14';

        modals['updateExpiryThresholdState'](true);

        expect(mockThresholdInput.value).toBe('14');
      });

      it('should disable threshold input when expiry date is empty', () => {
        mockExpiryInput.value = '';

        modals['updateExpiryThresholdState'](true);

        expect(mockThresholdInput.disabled).toBe(true);
        expect(mockThresholdInput.value).toBe('');
        expect(mockThresholdInput.placeholder).toBe('Set expiry date first');
      });

      it('should handle whitespace-only expiry date as empty', () => {
        mockExpiryInput.value = '   ';

        modals['updateExpiryThresholdState'](true);

        expect(mockThresholdInput.disabled).toBe(true);
        expect(mockThresholdInput.placeholder).toBe('Set expiry date first');
      });

      it('should work for edit modal with correct element IDs', () => {
        mockExpiryInput.value = '2024-12-31';

        modals['updateExpiryThresholdState'](false);

        expect(mockThresholdInput.disabled).toBe(false);
      });

      it('should return early when expiry input is missing', () => {
        mockElements[`add-${ELEMENTS.EXPIRY_DATE}`] = null;

        expect(() => modals['updateExpiryThresholdState'](true)).not.toThrow();
      });

      it('should return early when threshold input is missing', () => {
        mockElements[`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`] = null;

        expect(() => modals['updateExpiryThresholdState'](true)).not.toThrow();
      });
    });

    describe('highlightInvalidFields - detailed behavior', () => {
      let mockFormElements: { [key: string]: MockHTMLInputElement };

      beforeEach(() => {
        mockFormElements = {
          [`add-${ELEMENTS.NAME}`]: createMockHTMLInputElement(''),
          [`add-${ELEMENTS.QUANTITY}`]: createMockHTMLInputElement(''),
          [`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`]: createMockHTMLInputElement(''),
          [`add-${ELEMENTS.TODO_LIST}`]: createMockHTMLInputElement(''),
          [`add-${ELEMENTS.EXPIRY_DATE}`]: createMockHTMLInputElement(''),
          [`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.NAME}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.QUANTITY}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.TODO_LIST}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.EXPIRY_DATE}`]: createMockHTMLInputElement(''),
          [`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`]: createMockHTMLInputElement(''),
        };

        Object.entries(mockFormElements).forEach(([id, element]) => {
          mockElements[id] = element;
        });
      });

      it('should add error class to all error fields for add modal', () => {
        const errors: ValidationError[] = [
          { field: 'name', message: 'Name required' },
          { field: 'quantity', message: 'Invalid quantity' },
          { field: 'autoAddToListQuantity', message: 'Invalid auto-add quantity' },
          { field: 'todoList', message: 'Todo list required' },
          { field: 'expiryDate', message: 'Invalid date' },
          { field: 'expiryAlertDays', message: 'Invalid alert days' },
        ];

        modals['highlightInvalidFields'](errors, true);

        expect(mockFormElements[`add-${ELEMENTS.NAME}`].classList.add).toHaveBeenCalledWith(
          'input-error',
        );
        expect(mockFormElements[`add-${ELEMENTS.QUANTITY}`].classList.add).toHaveBeenCalledWith(
          'input-error',
        );
        expect(
          mockFormElements[`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`].classList.add,
        ).toHaveBeenCalledWith('input-error');
        expect(mockFormElements[`add-${ELEMENTS.TODO_LIST}`].classList.add).toHaveBeenCalledWith(
          'input-error',
        );
        expect(mockFormElements[`add-${ELEMENTS.EXPIRY_DATE}`].classList.add).toHaveBeenCalledWith(
          'input-error',
        );
        expect(
          mockFormElements[`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`].classList.add,
        ).toHaveBeenCalledWith('input-error');
      });

      it('should add error class to fields for edit modal', () => {
        const errors: ValidationError[] = [{ field: 'name', message: 'Name required' }];

        modals['highlightInvalidFields'](errors, false);

        expect(mockFormElements[`edit-${ELEMENTS.NAME}`].classList.add).toHaveBeenCalledWith(
          'input-error',
        );
      });

      it('should skip invalid field names', () => {
        const errors: ValidationError[] = [{ field: 'unknownField', message: 'Unknown error' }];

        expect(() => modals['highlightInvalidFields'](errors, true)).not.toThrow();
      });

      it('should handle empty elementId gracefully', () => {
        const errors: ValidationError[] = [{ field: 'name', message: 'Name required' }];

        mockElements[`add-${ELEMENTS.NAME}`] = null;

        expect(() => modals['highlightInvalidFields'](errors, true)).not.toThrow();
      });
    });

    describe('clearFieldErrors - detailed behavior', () => {
      let mockModal: MockHTMLElement;
      let mockErrorElements: any[];

      beforeEach(() => {
        mockErrorElements = [
          { classList: { remove: vi.fn() } },
          { classList: { remove: vi.fn() } },
        ];

        mockModal = createMockHTMLElement({
          querySelectorAll: vi.fn().mockReturnValue(mockErrorElements),
        });

        mockElements[ELEMENTS.ADD_MODAL] = mockModal;
        mockElements[ELEMENTS.EDIT_MODAL] = mockModal;
      });

      it('should remove input-error class from all error elements in add modal', () => {
        modals['clearFieldErrors'](true);

        expect(mockModal.querySelectorAll).toHaveBeenCalledWith('.input-error');
        expect(mockErrorElements[0].classList.remove).toHaveBeenCalledWith('input-error');
        expect(mockErrorElements[1].classList.remove).toHaveBeenCalledWith('input-error');
      });

      it('should remove input-error class from all error elements in edit modal', () => {
        modals['clearFieldErrors'](false);

        expect(mockModal.querySelectorAll).toHaveBeenCalledWith('.input-error');
        expect(mockErrorElements[0].classList.remove).toHaveBeenCalledWith('input-error');
        expect(mockErrorElements[1].classList.remove).toHaveBeenCalledWith('input-error');
      });
    });

    describe('focusElementWithDelay - selectAll logic', () => {
      let mockElement: MockHTMLInputElement;

      beforeEach(() => {
        vi.useFakeTimers();
        mockElement = createMockHTMLInputElement('', {
          select: vi.fn(),
        });
        mockElements['test-element'] = mockElement;
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should call select when selectAll is true and select method exists', () => {
        modals['focusElementWithDelay']('test-element', true);

        vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

        expect(mockElement.focus).toHaveBeenCalled();
        expect(mockElement.select).toHaveBeenCalled();
      });

      it('should not call select when selectAll is false', () => {
        modals['focusElementWithDelay']('test-element', false);

        vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

        expect(mockElement.focus).toHaveBeenCalled();
        expect(mockElement.select).not.toHaveBeenCalled();
      });

      it('should not call select when element has no select method', () => {
        delete mockElement.select;

        modals['focusElementWithDelay']('test-element', true);

        vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

        expect(mockElement.focus).toHaveBeenCalled();
      });
    });

    describe('handleModalClick - comprehensive scenarios', () => {
      let mockEvent: MockMouseEvent;

      beforeEach(() => {
        mockEvent = {
          target: {
            dataset: {},
            classList: { contains: vi.fn().mockReturnValue(false) },
            closest: vi.fn().mockReturnValue(false),
          },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        };
      });

      it('should handle close button with CSS class in add modal', () => {
        mockEvent.target.classList!.contains = vi.fn().mockReturnValue(true);
        mockEvent.target.closest = vi
          .fn()
          .mockReturnValueOnce(true) // First call - add modal check
          .mockReturnValueOnce(false); // Second call - edit modal check

        const closeAddModalSpy = vi.spyOn(modals, 'closeAddModal');

        const result = modals.handleModalClick(mockEvent as any);

        expect(result).toBe(true);
        expect(closeAddModalSpy).toHaveBeenCalled();
      });

      it('should handle close button with CSS class in edit modal', () => {
        mockEvent.target.classList!.contains = vi.fn().mockReturnValue(true);
        mockEvent.target.closest = vi
          .fn()
          .mockReturnValueOnce(false) // First call - add modal check
          .mockReturnValueOnce(true); // Second call - edit modal check

        const closeEditModalSpy = vi.spyOn(modals, 'closeEditModal');

        const result = modals.handleModalClick(mockEvent as any);

        expect(result).toBe(true);
        expect(closeEditModalSpy).toHaveBeenCalled();
      });

      it('should return false when clicking inside modal content', () => {
        // Set up a click that would normally trigger modal closure
        mockEvent.target.dataset = { action: 'some-action' };
        mockEvent.target.classList!.contains = vi.fn().mockReturnValue(false);
        // But the click is inside modal content (this check happens last)
        mockEvent.target.closest = vi
          .fn()
          .mockReturnValueOnce(false) // add modal check
          .mockReturnValueOnce(false) // edit modal check
          .mockReturnValueOnce(true); // modal content check

        const result = modals.handleModalClick(mockEvent as any);

        expect(result).toBe(false); // Should not close modal
      });

      it('should handle clicks on elements that are not close buttons', () => {
        mockEvent.target.id = 'some-input';
        mockEvent.target.dataset = { action: 'some-other-action' };

        const result = modals.handleModalClick(mockEvent as any);

        expect(result).toBe(false);
      });
    });

    describe('clearAddModalForm - detailed behavior', () => {
      let mockFormElements: { [key: string]: MockHTMLInputElement };
      let mockCheckbox: MockHTMLInputElement;

      beforeEach(() => {
        vi.useFakeTimers();

        mockFormElements = {
          [`add-${ELEMENTS.NAME}`]: createMockHTMLInputElement('old value'),
          [`add-${ELEMENTS.QUANTITY}`]: createMockHTMLInputElement('10'),
          [`add-${ELEMENTS.UNIT}`]: createMockHTMLInputElement('old unit'),
          [`add-${ELEMENTS.CATEGORY}`]: createMockHTMLInputElement('old category'),
          [`add-${ELEMENTS.EXPIRY_DATE}`]: createMockHTMLInputElement('old date'),
          [`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`]: createMockHTMLInputElement('14'),
          [`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`]: createMockHTMLInputElement('5'),
          [`add-${ELEMENTS.TODO_LIST}`]: createMockHTMLInputElement('old list'),
        };

        mockCheckbox = createMockHTMLInputElement('', { checked: true });
        mockElements[`add-${ELEMENTS.AUTO_ADD_ENABLED}`] = mockCheckbox;

        Object.entries(mockFormElements).forEach(([id, element]) => {
          mockElements[id] = element;
        });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should reset all form fields to default values', () => {
        modals.clearAddModalForm();

        expect(mockFormElements[`add-${ELEMENTS.NAME}`].value).toBe('');
        expect(mockFormElements[`add-${ELEMENTS.QUANTITY}`].value).toBe('0');
        expect(mockFormElements[`add-${ELEMENTS.UNIT}`].value).toBe('');
        expect(mockFormElements[`add-${ELEMENTS.CATEGORY}`].value).toBe('');
        expect(mockFormElements[`add-${ELEMENTS.EXPIRY_DATE}`].value).toBe('');
        expect(mockFormElements[`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`].value).toBe('7');
        expect(mockFormElements[`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`].value).toBe('0');
        expect(mockFormElements[`add-${ELEMENTS.TODO_LIST}`].value).toBe('');
      });

      it('should set checkbox to default value', () => {
        modals.clearAddModalForm();

        expect(mockCheckbox.checked).toBe(DEFAULTS.AUTO_ADD_ENABLED);
      });

      it('should call updateExpiryThresholdState after delay', () => {
        const updateExpiryThresholdStateSpy = vi.spyOn(modals, 'updateExpiryThresholdState' as any);

        modals.clearAddModalForm();

        vi.advanceTimersByTime(10);

        expect(updateExpiryThresholdStateSpy).toHaveBeenCalledWith(true);
      });

      it('should handle missing checkbox gracefully', () => {
        mockElements[`add-${ELEMENTS.AUTO_ADD_ENABLED}`] = null;

        expect(() => modals.clearAddModalForm()).not.toThrow();
      });
    });

    describe('error display - detailed behavior', () => {
      let mockValidationMessage: MockHTMLElement;
      let mockValidationText: { textContent: string };
      let mockModalContent: { scrollTop: number };

      beforeEach(() => {
        vi.useFakeTimers();

        mockValidationText = { textContent: '' };
        mockModalContent = { scrollTop: 100 };

        mockValidationMessage = createMockHTMLElement({
          querySelector: vi.fn().mockReturnValue(mockValidationText),
          closest: vi.fn().mockReturnValue(mockModalContent),
        });

        mockElements['add-validation-message'] = mockValidationMessage;
        mockElements['edit-validation-message'] = mockValidationMessage;
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should set error text content and show validation message', () => {
        modals['showError']('Test error message', true);

        expect(mockValidationText.textContent).toBe('Test error message');
        expect(mockValidationMessage.classList.add).toHaveBeenCalledWith('show');
      });

      it('should scroll modal content to top', () => {
        modals['showError']('Test error', true);

        expect(mockModalContent.scrollTop).toBe(0);
      });

      it('should auto-clear error after 5 seconds', () => {
        const clearErrorSpy = vi.spyOn(modals, 'clearError' as any);

        modals['showError']('Test error', true);

        vi.advanceTimersByTime(5000);

        expect(clearErrorSpy).toHaveBeenCalledWith(true);
      });

      it('should handle missing modal content gracefully', () => {
        mockValidationMessage.closest = vi.fn().mockReturnValue(null);

        expect(() => modals['showError']('Test error', true)).not.toThrow();
      });

      it('should log to console when validation elements are missing', () => {
        mockElements['add-validation-message'] = null;
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        modals['showError']('Test error', true);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Validation Error:', 'Test error');
      });
    });

    describe('setupValidationListeners - detailed behavior', () => {
      let mockFormElements: { [key: string]: MockHTMLInputElement };

      beforeEach(() => {
        const elementIds = [
          'add-quantity',
          'add-auto-add-to-list-quantity',
          'add-todo-list',
          'add-auto-add-enabled',
          'add-name',
          'add-expiry-date',
          'edit-quantity',
          'edit-auto-add-to-list-quantity',
          'edit-todo-list',
          'edit-auto-add-enabled',
          'edit-name',
          'edit-expiry-date',
        ];

        mockFormElements = {};
        elementIds.forEach((id) => {
          mockFormElements[id] = createMockHTMLInputElement('', {
            checked: id.includes('auto-add-enabled') ? false : undefined,
          });
          mockElements[id] = mockFormElements[id];
        });
      });

      it('should setup input and change listeners for all form fields', () => {
        modals.setupValidationListeners();

        Object.values(mockFormElements).forEach((field) => {
          if (!field.value && field.checked === undefined) {
            // Skip checkbox
            expect(field.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
            expect(field.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
          }
        });
      });

      it('should setup change listener for auto-add checkbox', () => {
        modals.setupValidationListeners();

        expect(mockFormElements['add-auto-add-enabled'].addEventListener).toHaveBeenCalledWith(
          'change',
          expect.any(Function),
        );
        expect(mockFormElements['edit-auto-add-enabled'].addEventListener).toHaveBeenCalledWith(
          'change',
          expect.any(Function),
        );
      });

      it('should clear error when input value changes', () => {
        const clearErrorSpy = vi.spyOn(modals, 'clearError' as any);

        modals.setupValidationListeners();

        // Get the input event handler and call it
        const inputCall = mockFormElements['add-name'].addEventListener.mock.calls.find(
          (call) => call[0] === 'input',
        );

        expect(inputCall).toBeDefined();
        if (inputCall) {
          const inputHandler = inputCall[1];
          inputHandler();

          expect(mockFormElements['add-name'].classList.remove).toHaveBeenCalledWith('input-error');
          expect(clearErrorSpy).toHaveBeenCalledWith(true);
        }
      });

      it('should clear related errors when auto-add checkbox is unchecked', () => {
        const clearErrorSpy = vi.spyOn(modals, 'clearError' as any);

        modals.setupValidationListeners();

        // Get the change event handler for checkbox
        const changeCall = mockFormElements[
          'add-auto-add-enabled'
        ].addEventListener.mock.calls.find((call) => call[0] === 'change');

        expect(changeCall).toBeDefined();
        if (changeCall) {
          const changeHandler = changeCall[1];
          mockFormElements['add-auto-add-enabled'].checked = false;
          changeHandler();

          expect(
            mockFormElements['add-auto-add-to-list-quantity'].classList.remove,
          ).toHaveBeenCalledWith('input-error');
          expect(mockFormElements['add-todo-list'].classList.remove).toHaveBeenCalledWith(
            'input-error',
          );
          expect(clearErrorSpy).toHaveBeenCalledWith(true);
        }
      });
    });

    describe('closeEditModal - currentEditingItem management', () => {
      it('should clear currentEditingItem when closing edit modal', () => {
        // Set currentEditingItem
        modals['currentEditingItem'] = 'Test Item';

        modals.closeEditModal();

        expect(modals['currentEditingItem']).toBe(null);
      });
    });

    describe('saveEditModal - currentEditingItem validation', () => {
      it('should return false immediately when no item is being edited', async () => {
        modals['currentEditingItem'] = null;

        const result = await modals.saveEditModal({} as InventoryConfig);

        expect(result).toBe(false);
      });
    });

    describe('state attributes edge cases', () => {
      it('should handle missing attributes object in entity state', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const hassWithoutAttributes: HomeAssistant = {
          states: {
            'sensor.inventory': {
              entity_id: 'sensor.inventory',
              state: 'active',
              attributes: null as any,
              context: { id: 'test' },
              last_changed: '2024-01-01T00:00:00Z',
              last_updated: '2024-01-01T00:00:00Z',
            },
          },
        } as any;

        modals.openEditModal('Test Item', hassWithoutAttributes, {
          type: 'test',
          entity: 'sensor.inventory',
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith('Item not found: Test Item');
      });
    });

    describe('getInputValue edge cases', () => {
      it('should handle element with null value property', () => {
        const mockElement = { value: null } as any;
        mockElements['test-input'] = mockElement;

        const result = modals['getInputValue']('test-input');

        expect(result).toBe('');
      });

      it('should handle element with undefined value property', () => {
        const mockElement = { value: undefined } as any;
        mockElements['test-input'] = mockElement;

        const result = modals['getInputValue']('test-input');

        expect(result).toBe('');
      });
    });

    describe('setupExpiryThresholdFieldForModal edge cases', () => {
      it('should call updateExpiryThresholdState when input events are triggered', () => {
        const mockExpiryInput = createMockHTMLInputElement('2024-12-31');
        mockElements[`add-${ELEMENTS.EXPIRY_DATE}`] = mockExpiryInput;

        const updateExpiryThresholdStateSpy = vi.spyOn(modals, 'updateExpiryThresholdState' as any);

        modals['setupExpiryThresholdFieldForModal'](true);

        // Verify initial call
        expect(updateExpiryThresholdStateSpy).toHaveBeenCalledWith(true);

        // Get and trigger the input event handler
        const inputCall = mockExpiryInput.addEventListener.mock.calls.find(
          (call) => call[0] === 'input',
        );
        expect(inputCall).toBeDefined();
        if (inputCall) {
          const inputHandler = inputCall[1];
          inputHandler();
          expect(updateExpiryThresholdStateSpy).toHaveBeenCalledTimes(2);
        }

        // Get and trigger the change event handler
        const changeCall = mockExpiryInput.addEventListener.mock.calls.find(
          (call) => call[0] === 'change',
        );
        expect(changeCall).toBeDefined();
        if (changeCall) {
          const changeHandler = changeCall[1];
          changeHandler();
          expect(updateExpiryThresholdStateSpy).toHaveBeenCalledTimes(3);
        }
      });
    });
    describe('array declaration mutants', () => {
      it('should handle non-empty items array correctly', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const mockItem: InventoryItem = {
          name: 'Existing Item',
          quantity: 1,
          unit: '',
          category: '',
          expiry_date: '',
          auto_add_enabled: false,
          todo_list: '',
        };

        const hassWithItems: HomeAssistant = {
          states: {
            'sensor.inventory': {
              entity_id: 'sensor.inventory',
              state: 'active',
              attributes: { items: [mockItem] },
              context: { id: 'test' },
              last_changed: '2024-01-01T00:00:00Z',
              last_updated: '2024-01-01T00:00:00Z',
            },
          },
        } as any;

        // This should find the item and not warn
        modals.openEditModal('Existing Item', hassWithItems, {
          type: 'test',
          entity: 'sensor.inventory',
        });

        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });

    describe('closeEditModal DOM manipulation', () => {
      it('should actually remove CSS class from modal element', () => {
        const mockModal = createMockHTMLElement();
        mockElements[ELEMENTS.EDIT_MODAL] = mockModal;

        modals.closeEditModal();

        expect(mockModal.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
      });
    });

    describe('closeAllModals method calls', () => {
      it('should call both closeAddModal and closeEditModal', () => {
        const closeAddModalSpy = vi.spyOn(modals, 'closeAddModal');
        const closeEditModalSpy = vi.spyOn(modals, 'closeEditModal');

        modals.closeAllModals();

        expect(closeAddModalSpy).toHaveBeenCalled();
        expect(closeEditModalSpy).toHaveBeenCalled();
      });
    });

    describe('populateEditModal with actual values', () => {
      it('should use actual values instead of defaults when present', () => {
        const setFormValuesSpy = vi.spyOn(modals, 'setFormValues' as any);

        const mockItem: InventoryItem = {
          name: 'Real Name',
          quantity: 10,
          unit: 'real unit',
          category: 'real category',
          expiry_date: '2024-01-01',
          expiry_alert_days: 14,
          auto_add_enabled: true,
          auto_add_to_list_quantity: 5,
          todo_list: 'real list',
        };

        modals['populateEditModal'](mockItem);

        const fieldsArray = setFormValuesSpy.mock.calls[0][0] as Array<{
          id: string;
          value: string;
        }>;

        const unitField = fieldsArray.find((field) => field.id === `edit-${ELEMENTS.UNIT}`);
        const categoryField = fieldsArray.find((field) => field.id === `edit-${ELEMENTS.CATEGORY}`);
        const expiryDateField = fieldsArray.find(
          (field) => field.id === `edit-${ELEMENTS.EXPIRY_DATE}`,
        );
        const todoListField = fieldsArray.find(
          (field) => field.id === `edit-${ELEMENTS.TODO_LIST}`,
        );

        expect(unitField?.value).toBe('real unit');
        expect(categoryField?.value).toBe('real category');
        expect(expiryDateField?.value).toBe('2024-01-01');
        expect(todoListField?.value).toBe('real list');
      });
    });

    describe('updateExpiryThresholdState modalType', () => {
      let mockExpiryInput: MockHTMLInputElement;
      let mockThresholdInput: MockHTMLInputElement;

      beforeEach(() => {
        mockExpiryInput = createMockHTMLInputElement('2024-12-31');
        mockThresholdInput = createMockHTMLInputElement('', { disabled: false, placeholder: '' });
      });

      it('should use "add" prefix for add modal', () => {
        mockElements[`add-${ELEMENTS.EXPIRY_DATE}`] = mockExpiryInput;
        mockElements[`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`] = mockThresholdInput;

        modals['updateExpiryThresholdState'](true);

        // Verify it found the add elements (by checking they were used)
        expect(mockThresholdInput.disabled).toBe(false);
      });

      it('should use "edit" prefix for edit modal', () => {
        mockElements[`edit-${ELEMENTS.EXPIRY_DATE}`] = mockExpiryInput;
        mockElements[`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`] = mockThresholdInput;

        modals['updateExpiryThresholdState'](false);

        // Verify it found the edit elements (by checking they were used)
        expect(mockThresholdInput.disabled).toBe(false);
      });
    });

    describe('trim method usage', () => {
      let mockExpiryInput: MockHTMLInputElement;
      let mockThresholdInput: MockHTMLInputElement;

      beforeEach(() => {
        mockThresholdInput = createMockHTMLInputElement('   ', {
          disabled: false,
          placeholder: '',
        });
        mockExpiryInput = createMockHTMLInputElement('2024-12-31');

        mockElements[`add-${ELEMENTS.EXPIRY_DATE}`] = mockExpiryInput;
        mockElements[`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`] = mockThresholdInput;
      });

      it('should set default value when threshold input has only whitespace', () => {
        modals['updateExpiryThresholdState'](true);

        expect(mockThresholdInput.value).toBe('7');
      });
    });

    describe('highlightInvalidFields elementId logic', () => {
      it('should not attempt to highlight when elementId is empty', () => {
        const errors: ValidationError[] = [{ field: 'unknownField', message: 'Unknown error' }];

        // This should not throw and should not call classList.add on any element
        expect(() => modals['highlightInvalidFields'](errors, true)).not.toThrow();
      });

      it('should highlight when elementId is not empty', () => {
        const mockElement = createMockHTMLInputElement('');
        mockElements[`add-${ELEMENTS.NAME}`] = mockElement;

        const errors: ValidationError[] = [{ field: 'name', message: 'Name error' }];

        modals['highlightInvalidFields'](errors, true);

        expect(mockElement.classList.add).toHaveBeenCalledWith('input-error');
      });
    });

    describe('handleModalClick CSS selector usage', () => {
      let mockEvent: MockMouseEvent;

      beforeEach(() => {
        mockEvent = {
          target: {
            dataset: {},
            classList: { contains: vi.fn().mockReturnValue(true) },
            closest: vi.fn(),
          },
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        };
      });

      it('should use correct add modal selector', () => {
        mockEvent.target.closest = vi
          .fn()
          .mockReturnValueOnce(true) // add modal check
          .mockReturnValueOnce(false); // edit modal check

        modals.handleModalClick(mockEvent as any);

        expect(mockEvent.target.closest).toHaveBeenCalledWith(`#${ELEMENTS.ADD_MODAL}`);
      });

      it('should use correct edit modal selector', () => {
        mockEvent.target.closest = vi
          .fn()
          .mockReturnValueOnce(false) // add modal check
          .mockReturnValueOnce(true); // edit modal check

        modals.handleModalClick(mockEvent as any);

        expect(mockEvent.target.closest).toHaveBeenCalledWith(`#${ELEMENTS.EDIT_MODAL}`);
      });

      it('should use correct modal content selector', () => {
        mockEvent.target.closest = vi
          .fn()
          .mockReturnValueOnce(false) // add modal check
          .mockReturnValueOnce(false) // edit modal check
          .mockReturnValueOnce(true); // modal content check

        modals.handleModalClick(mockEvent as any);

        expect(mockEvent.target.closest).toHaveBeenCalledWith(`.${CSS_CLASSES.MODAL_CONTENT}`);
      });
    });

    describe('setupExpiryThresholdInteraction method calls', () => {
      it('should call setupExpiryThresholdFieldForModal for both modals', () => {
        const setupSpy = vi.spyOn(modals, 'setupExpiryThresholdFieldForModal' as any);

        modals.setupExpiryThresholdInteraction();

        expect(setupSpy).toHaveBeenCalledWith(true);
        expect(setupSpy).toHaveBeenCalledWith(false);
        expect(setupSpy).toHaveBeenCalledTimes(2);
      });
    });

    describe('error display CSS selectors', () => {
      let mockValidationMessage: MockHTMLElement;

      beforeEach(() => {
        mockValidationMessage = createMockHTMLElement({
          querySelector: vi.fn(),
          closest: vi.fn(),
        });
        mockElements['add-validation-message'] = mockValidationMessage;
      });

      it('should use correct validation text selector', () => {
        modals['showError']('test error', true);

        expect(mockValidationMessage.querySelector).toHaveBeenCalledWith('.validation-text');
      });

      it('should use correct modal content selector', () => {
        mockValidationMessage.querySelector = vi.fn().mockReturnValue({ textContent: '' });

        modals['showError']('test error', true);

        expect(mockValidationMessage.closest).toHaveBeenCalledWith('.modal-content');
      });
    });

    describe('validation listeners checkbox condition', () => {
      let mockAutoAddCheckbox: MockHTMLInputElement;
      let mockQuantityField: MockHTMLInputElement;
      let mockTodoField: MockHTMLInputElement;

      beforeEach(() => {
        mockAutoAddCheckbox = createMockHTMLInputElement('', { checked: true });
        mockQuantityField = createMockHTMLInputElement('');
        mockTodoField = createMockHTMLInputElement('');

        mockElements['add-auto-add-enabled'] = mockAutoAddCheckbox;
        mockElements['add-auto-add-to-list-quantity'] = mockQuantityField;
        mockElements['add-todo-list'] = mockTodoField;
        mockElements['add-quantity'] = createMockHTMLInputElement('');
        mockElements['add-name'] = createMockHTMLInputElement('');
        mockElements['add-expiry-date'] = createMockHTMLInputElement('');
      });

      it('should not clear errors when checkbox is checked', () => {
        modals.setupValidationListeners();

        const changeCall = mockAutoAddCheckbox.addEventListener.mock.calls.find(
          (call) => call[0] === 'change',
        );

        if (changeCall) {
          mockAutoAddCheckbox.checked = true; // Keep it checked
          changeCall[1]();

          // Should not clear related field errors when checked
          expect(mockQuantityField.classList.remove).not.toHaveBeenCalled();
          expect(mockTodoField.classList.remove).not.toHaveBeenCalled();
        }
      });
    });

    describe('clearError parameter testing', () => {
      let mockAddValidation: MockHTMLElement;
      let mockEditValidation: MockHTMLElement;

      beforeEach(() => {
        mockAddValidation = createMockHTMLElement();
        mockEditValidation = createMockHTMLElement();

        mockElements['add-validation-message'] = mockAddValidation;
        mockElements['edit-validation-message'] = mockEditValidation;
      });

      it('should clear add modal error when isAddModal is true', () => {
        modals['clearError'](true);

        expect(mockAddValidation.classList.remove).toHaveBeenCalledWith('show');
      });

      it('should clear edit modal error when isAddModal is false', () => {
        modals['clearError'](false);

        expect(mockEditValidation.classList.remove).toHaveBeenCalledWith('show');
      });
    });
  });
});
