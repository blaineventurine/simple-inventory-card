import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModalValidationManager } from '../../../src/services/modals/modalValidationManager';
import { ELEMENTS } from '../../../src/utils/constants';
import { ValidationError } from '../../../src/types/validationError';

describe('ModalValidationManager', () => {
  let modalValidationManager: ModalValidationManager;
  let mockShadowRoot: ShadowRoot;
  let mockElements: Map<string, HTMLElement>;

  beforeEach(() => {
    mockElements = new Map();
    mockShadowRoot = {
      getElementById: vi.fn((id: string) => mockElements.get(id) || null),
    } as unknown as ShadowRoot;

    vi.useFakeTimers();
    vi.clearAllMocks();

    modalValidationManager = new ModalValidationManager(mockShadowRoot);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockInput = (id: string, type: string = 'text'): HTMLInputElement =>
    ({
      id,
      type,
      value: '',
      checked: false,
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
      },
      addEventListener: vi.fn(),
    }) as unknown as HTMLInputElement;

  const createMockSelect = (id: string): HTMLSelectElement =>
    ({
      id,
      value: '',
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
      },
      addEventListener: vi.fn(),
    }) as unknown as HTMLSelectElement;

  const createMockDiv = (id: string): HTMLElement =>
    ({
      id,
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
      },
      querySelector: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([]),
      closest: vi.fn(),
      scrollTop: 0,
      textContent: '',
    }) as unknown as HTMLElement;

  // Helper function to setup form elements for a modal
  const setupModalElements = (isAddModal: boolean) => {
    const prefix = isAddModal ? 'add' : 'edit';
    const modalId = isAddModal ? ELEMENTS.ADD_MODAL : ELEMENTS.EDIT_MODAL;

    // Create modal
    const modal = createMockDiv(modalId);
    mockElements.set(modalId, modal);

    // Create form fields
    mockElements.set(`${prefix}-${ELEMENTS.NAME}`, createMockInput(`${prefix}-${ELEMENTS.NAME}`));
    mockElements.set(
      `${prefix}-${ELEMENTS.QUANTITY}`,
      createMockInput(`${prefix}-${ELEMENTS.QUANTITY}`, 'number'),
    );
    mockElements.set(
      `${prefix}-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
      createMockInput(`${prefix}-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`, 'number'),
    );
    mockElements.set(
      `${prefix}-${ELEMENTS.TODO_LIST}`,
      createMockSelect(`${prefix}-${ELEMENTS.TODO_LIST}`),
    );
    mockElements.set(
      `${prefix}-${ELEMENTS.EXPIRY_DATE}`,
      createMockInput(`${prefix}-${ELEMENTS.EXPIRY_DATE}`, 'date'),
    );
    mockElements.set(
      `${prefix}-${ELEMENTS.EXPIRY_ALERT_DAYS}`,
      createMockInput(`${prefix}-${ELEMENTS.EXPIRY_ALERT_DAYS}`, 'number'),
    );
    mockElements.set(
      `${prefix}-${ELEMENTS.AUTO_ADD_ENABLED}`,
      createMockInput(`${prefix}-${ELEMENTS.AUTO_ADD_ENABLED}`, 'checkbox'),
    );

    // Create validation message elements
    const validationMessage = createMockDiv(`${prefix}-validation-message`);
    const validationText = createMockDiv('validation-text');
    const modalContent = createMockDiv('modal-content');

    vi.mocked(validationMessage.querySelector).mockReturnValue(validationText);
    vi.mocked(validationMessage.closest).mockReturnValue(modalContent);

    mockElements.set(`${prefix}-validation-message`, validationMessage);

    return {
      modal,
      validationMessage,
      validationText,
      modalContent,
    };
  };

  describe('Constructor', () => {
    it('should initialize with shadow root', () => {
      expect(modalValidationManager['shadowRoot']).toBe(mockShadowRoot);
    });
  });

  describe('highlightInvalidFields', () => {
    it('should highlight invalid fields in add modal', () => {
      setupModalElements(true);

      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is required' },
        { field: 'quantity', message: 'Invalid quantity' },
        { field: 'autoAddToListQuantity', message: 'Invalid auto-add quantity' },
      ];

      modalValidationManager.highlightInvalidFields(errors, true);

      expect(mockElements.get(`add-${ELEMENTS.NAME}`)?.classList.add).toHaveBeenCalledWith(
        'input-error',
      );
      expect(mockElements.get(`add-${ELEMENTS.QUANTITY}`)?.classList.add).toHaveBeenCalledWith(
        'input-error',
      );
      expect(
        mockElements.get(`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`)?.classList.add,
      ).toHaveBeenCalledWith('input-error');
    });

    it('should highlight invalid fields in edit modal', () => {
      setupModalElements(false);

      const errors: ValidationError[] = [
        { field: 'todoList', message: 'Todo list is required' },
        { field: 'expiryDate', message: 'Invalid expiry date' },
        { field: 'expiryAlertDays', message: 'Invalid alert days' },
      ];

      modalValidationManager.highlightInvalidFields(errors, false);

      expect(mockElements.get(`edit-${ELEMENTS.TODO_LIST}`)?.classList.add).toHaveBeenCalledWith(
        'input-error',
      );
      expect(mockElements.get(`edit-${ELEMENTS.EXPIRY_DATE}`)?.classList.add).toHaveBeenCalledWith(
        'input-error',
      );
      expect(
        mockElements.get(`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`)?.classList.add,
      ).toHaveBeenCalledWith('input-error');
    });

    it('should clear previous field errors before highlighting new ones', () => {
      setupModalElements(true);

      const clearFieldErrorsSpy = vi.spyOn(modalValidationManager, 'clearFieldErrors');

      const errors: ValidationError[] = [{ field: 'name', message: 'Name is required' }];

      modalValidationManager.highlightInvalidFields(errors, true);

      expect(clearFieldErrorsSpy).toHaveBeenCalledWith(true);
    });

    it('should handle empty errors array', () => {
      setupModalElements(true);

      const errors: ValidationError[] = [];

      expect(() => modalValidationManager.highlightInvalidFields(errors, true)).not.toThrow();
    });

    it('should handle unknown field names gracefully', () => {
      setupModalElements(true);

      const errors: ValidationError[] = [{ field: 'unknownField', message: 'Unknown field error' }];

      expect(() => modalValidationManager.highlightInvalidFields(errors, true)).not.toThrow();
    });

    it('should handle missing elements gracefully', () => {
      // Don't setup any elements

      const errors: ValidationError[] = [{ field: 'name', message: 'Name is required' }];

      expect(() => modalValidationManager.highlightInvalidFields(errors, true)).not.toThrow();
    });
  });

  describe('clearFieldErrors', () => {
    it('should clear field errors from add modal', () => {
      const { modal } = setupModalElements(true);

      const mockErrorFields = [
        { classList: { remove: vi.fn() } },
        { classList: { remove: vi.fn() } },
      ];

      vi.mocked(modal.querySelectorAll).mockReturnValue(mockErrorFields as any);

      modalValidationManager.clearFieldErrors(true);

      mockErrorFields.forEach((field) => {
        expect(field.classList.remove).toHaveBeenCalledWith('input-error');
      });
    });

    it('should clear field errors from edit modal', () => {
      const { modal } = setupModalElements(false);

      const mockErrorFields = [{ classList: { remove: vi.fn() } }];

      vi.mocked(modal.querySelectorAll).mockReturnValue(mockErrorFields as any);

      modalValidationManager.clearFieldErrors(false);

      expect(modal.querySelectorAll).toHaveBeenCalledWith('.input-error');
      mockErrorFields.forEach((field) => {
        expect(field.classList.remove).toHaveBeenCalledWith('input-error');
      });
    });

    it('should handle missing modal element', () => {
      expect(() => modalValidationManager.clearFieldErrors(true)).not.toThrow();
    });
  });

  describe('showError', () => {
    it('should show error message in add modal', () => {
      const { validationMessage, validationText, modalContent } = setupModalElements(true);

      modalValidationManager.showError('Test error message', true);

      expect(validationText.textContent).toBe('Test error message');
      expect(validationMessage.classList.add).toHaveBeenCalledWith('show');
      expect(modalContent.scrollTop).toBe(0);
    });

    it('should show error message in edit modal', () => {
      const { validationMessage, validationText, modalContent } = setupModalElements(false);

      modalValidationManager.showError('Test error message', false);

      expect(validationText.textContent).toBe('Test error message');
      expect(validationMessage.classList.add).toHaveBeenCalledWith('show');
      expect(modalContent.scrollTop).toBe(0);
    });

    it('should auto-clear error after 5 seconds', () => {
      setupModalElements(true);

      const clearErrorSpy = vi.spyOn(modalValidationManager, 'clearError');

      modalValidationManager.showError('Test error message', true);

      expect(clearErrorSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);

      expect(clearErrorSpy).toHaveBeenCalledWith(true);
    });

    it('should default to add modal when isAddModal not specified', () => {
      const { validationMessage, validationText } = setupModalElements(true);

      modalValidationManager.showError('Test error message');

      expect(validationText.textContent).toBe('Test error message');
      expect(validationMessage.classList.add).toHaveBeenCalledWith('show');
    });

    it('should handle missing validation message element', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      modalValidationManager.showError('Test error message', true);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Validation Error:', 'Test error message');

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing validation text element', () => {
      const { validationMessage } = setupModalElements(true);
      vi.mocked(validationMessage.querySelector).mockReturnValue(null);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      modalValidationManager.showError('Test error message', true);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Validation Error:', 'Test error message');

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing modal content for scroll', () => {
      const { validationMessage, validationText } = setupModalElements(true);
      vi.mocked(validationMessage.closest).mockReturnValue(null);

      modalValidationManager.showError('Test error message', true);

      expect(validationText.textContent).toBe('Test error message');
      expect(validationMessage.classList.add).toHaveBeenCalledWith('show');
    });
  });

  describe('clearError', () => {
    it('should clear error from add modal', () => {
      const { validationMessage } = setupModalElements(true);

      modalValidationManager.clearError(true);

      expect(validationMessage.classList.remove).toHaveBeenCalledWith('show');
    });

    it('should clear error from edit modal', () => {
      const { validationMessage } = setupModalElements(false);

      modalValidationManager.clearError(false);

      expect(validationMessage.classList.remove).toHaveBeenCalledWith('show');
    });

    it('should default to add modal when isAddModal not specified', () => {
      const { validationMessage } = setupModalElements(true);

      modalValidationManager.clearError();

      expect(validationMessage.classList.remove).toHaveBeenCalledWith('show');
    });

    it('should handle missing validation message element', () => {
      expect(() => modalValidationManager.clearError(true)).not.toThrow();
    });
  });

  describe('setupValidationListeners', () => {
    it('should setup listeners for both add and edit modals', () => {
      const setupSpy = vi.spyOn(modalValidationManager as any, 'setupClearErrorsForModal');

      modalValidationManager.setupValidationListeners();

      expect(setupSpy).toHaveBeenCalledWith(true); // Add modal
      expect(setupSpy).toHaveBeenCalledWith(false); // Edit modal
    });
  });

  describe('setupClearErrorsForModal', () => {
    it('should setup input listeners for add modal fields', () => {
      setupModalElements(true);

      modalValidationManager['setupClearErrorsForModal'](true);

      expect(mockElements.get(`add-${ELEMENTS.NAME}`)?.addEventListener).toHaveBeenCalledWith(
        'input',
        expect.any(Function),
      );
      expect(mockElements.get(`add-${ELEMENTS.NAME}`)?.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
      expect(mockElements.get(`add-${ELEMENTS.QUANTITY}`)?.addEventListener).toHaveBeenCalledWith(
        'input',
        expect.any(Function),
      );
      expect(mockElements.get(`add-${ELEMENTS.QUANTITY}`)?.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
      expect(
        mockElements.get(`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`)?.addEventListener,
      ).toHaveBeenCalledWith('input', expect.any(Function));
      expect(mockElements.get(`add-${ELEMENTS.TODO_LIST}`)?.addEventListener).toHaveBeenCalledWith(
        'input',
        expect.any(Function),
      );
      expect(
        mockElements.get(`add-${ELEMENTS.EXPIRY_DATE}`)?.addEventListener,
      ).toHaveBeenCalledWith('input', expect.any(Function));
    });

    it('should setup input listeners for edit modal fields', () => {
      setupModalElements(false);

      modalValidationManager['setupClearErrorsForModal'](false);

      expect(mockElements.get(`edit-${ELEMENTS.NAME}`)?.addEventListener).toHaveBeenCalledWith(
        'input',
        expect.any(Function),
      );
      expect(mockElements.get(`edit-${ELEMENTS.QUANTITY}`)?.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    });

    it('should setup special handling for auto-add checkbox', () => {
      setupModalElements(true);

      modalValidationManager['setupClearErrorsForModal'](true);

      expect(
        mockElements.get(`add-${ELEMENTS.AUTO_ADD_ENABLED}`)?.addEventListener,
      ).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should clear errors when field input occurs', () => {
      setupModalElements(true);

      const nameField = mockElements.get(`add-${ELEMENTS.NAME}`) as HTMLInputElement;
      const clearErrorSpy = vi.spyOn(modalValidationManager, 'clearError');

      modalValidationManager['setupClearErrorsForModal'](true);

      const inputHandler = vi
        .mocked(nameField.addEventListener)
        .mock.calls.find((call) => call[0] === 'input')?.[1] as () => void;

      if (inputHandler) {
        inputHandler();
      }

      expect(nameField.classList.remove).toHaveBeenCalledWith('input-error');
      expect(clearErrorSpy).toHaveBeenCalledWith(true);
    });

    it('should clear errors when auto-add checkbox is unchecked', () => {
      setupModalElements(true);

      const autoAddCheckbox = mockElements.get(
        `add-${ELEMENTS.AUTO_ADD_ENABLED}`,
      ) as HTMLInputElement;
      const quantityField = mockElements.get(
        `add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
      ) as HTMLInputElement;
      const todoListField = mockElements.get(`add-${ELEMENTS.TODO_LIST}`) as HTMLSelectElement;
      const clearErrorSpy = vi.spyOn(modalValidationManager, 'clearError');

      Object.defineProperty(autoAddCheckbox, 'checked', { value: false, writable: true });

      modalValidationManager['setupClearErrorsForModal'](true);

      const changeHandler = vi
        .mocked(autoAddCheckbox.addEventListener)
        .mock.calls.find((call) => call[0] === 'change')?.[1] as () => void;

      if (changeHandler) {
        changeHandler();
      }

      expect(quantityField.classList.remove).toHaveBeenCalledWith('input-error');
      expect(todoListField.classList.remove).toHaveBeenCalledWith('input-error');
      expect(clearErrorSpy).toHaveBeenCalledWith(true);
    });

    it('should not clear errors when auto-add checkbox is checked', () => {
      setupModalElements(true);

      const autoAddCheckbox = mockElements.get(
        `add-${ELEMENTS.AUTO_ADD_ENABLED}`,
      ) as HTMLInputElement;
      const clearErrorSpy = vi.spyOn(modalValidationManager, 'clearError');

      Object.defineProperty(autoAddCheckbox, 'checked', { value: true, writable: true });

      modalValidationManager['setupClearErrorsForModal'](true);

      const changeHandler = vi
        .mocked(autoAddCheckbox.addEventListener)
        .mock.calls.find((call) => call[0] === 'change')?.[1] as () => void;

      if (changeHandler) {
        changeHandler();
      }

      expect(clearErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle missing form fields gracefully', () => {
      // Don't setup any elements

      expect(() => modalValidationManager['setupClearErrorsForModal'](true)).not.toThrow();
    });
  });

  describe('getElement', () => {
    it('should retrieve element by ID', () => {
      const mockElement = createMockInput('test-id');
      mockElements.set('test-id', mockElement);

      const result = modalValidationManager['getElement']('test-id');

      expect(result).toBe(mockElement);
      expect(mockShadowRoot.getElementById).toHaveBeenCalledWith('test-id');
    });

    it('should return null for missing element', () => {
      const result = modalValidationManager['getElement']('nonexistent-id');

      expect(result).toBe(null);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete validation workflow', () => {
      setupModalElements(true);

      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is required' },
        { field: 'quantity', message: 'Invalid quantity' },
      ];

      modalValidationManager.highlightInvalidFields(errors, true);

      expect(mockElements.get(`add-${ELEMENTS.NAME}`)?.classList.add).toHaveBeenCalledWith(
        'input-error',
      );
      expect(mockElements.get(`add-${ELEMENTS.QUANTITY}`)?.classList.add).toHaveBeenCalledWith(
        'input-error',
      );

      modalValidationManager.showError('Please fix the highlighted fields', true);

      const validationMessage = mockElements.get('add-validation-message');
      expect(validationMessage?.classList.add).toHaveBeenCalledWith('show');

      modalValidationManager.clearFieldErrors(true);
      modalValidationManager.clearError(true);

      expect(validationMessage?.classList.remove).toHaveBeenCalledWith('show');
    });

    it('should handle validation for both modal types', () => {
      setupModalElements(true);
      setupModalElements(false);

      const addErrors: ValidationError[] = [{ field: 'name', message: 'Name required' }];
      const editErrors: ValidationError[] = [{ field: 'quantity', message: 'Invalid quantity' }];

      modalValidationManager.highlightInvalidFields(addErrors, true);
      modalValidationManager.highlightInvalidFields(editErrors, false);

      expect(mockElements.get(`add-${ELEMENTS.NAME}`)?.classList.add).toHaveBeenCalledWith(
        'input-error',
      );
      expect(mockElements.get(`edit-${ELEMENTS.QUANTITY}`)?.classList.add).toHaveBeenCalledWith(
        'input-error',
      );
    });
  });
});
