import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModalUIManager } from '../../../src/services/modals/modalUIManager';
import { ModalFormManager } from '../../../src/services/modals/modalFormManager';
import { ModalValidationManager } from '../../../src/services/modals/modalValidationManager';
import { ELEMENTS, CSS_CLASSES, TIMING } from '../../../src/utils/constants';
import { HomeAssistant, InventoryItem, InventoryConfig } from '../../../src/types/homeAssistant';
import { createMockHomeAssistant, createMockHassEntity } from '../../testHelpers';

vi.mock('../../../src/services/modals/modalFormManager');
vi.mock('../../../src/services/modals/modalValidationManager');

describe('ModalUIManager', () => {
  let modalUIManager: ModalUIManager;
  let mockShadowRoot: ShadowRoot;
  let mockFormManager: ModalFormManager;
  let mockValidationManager: ModalValidationManager;
  let mockHass: HomeAssistant;
  let mockConfig: InventoryConfig;
  let mockElements: Map<string, HTMLElement>;

  const mockInventoryItems: InventoryItem[] = [
    {
      name: 'Test Item',
      quantity: 5,
      category: 'Food',
      unit: 'pieces',
      expiry_date: '2024-12-31',
      todo_list: 'shopping',
      auto_add_enabled: false,
    },
  ];

  beforeEach(() => {
    mockElements = new Map();

    // Mock shadow root
    mockShadowRoot = {
      getElementById: vi.fn((id: string) => mockElements.get(id) || undefined),
    } as unknown as ShadowRoot;

    // Mock form manager
    mockFormManager = {
      populateEditModal: vi.fn(),
    } as unknown as ModalFormManager;

    // Mock validation manager
    mockValidationManager = {
      clearError: vi.fn(),
      setupValidationListeners: vi.fn(),
    } as unknown as ModalValidationManager;

    // Mock Home Assistant with inventory entity
    mockHass = createMockHomeAssistant({
      'sensor.test_inventory': createMockHassEntity('sensor.test_inventory', {
        attributes: { items: mockInventoryItems },
      }),
    });

    mockConfig = {
      type: 'inventory-card',
      entity: 'sensor.test_inventory',
    };

    // Mock global document
    globalThis.document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;

    // Mock timers
    vi.useFakeTimers();

    vi.clearAllMocks();

    modalUIManager = new ModalUIManager(mockShadowRoot, mockFormManager, mockValidationManager);
  });

  afterEach(() => {
    vi.useRealTimers();
    modalUIManager.destroy();
  });

  // Helper function to create mock modal element
  const createMockModal = (id: string): HTMLElement =>
    ({
      id,
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
      },
      closest: vi.fn(),
    }) as unknown as HTMLElement;

  // Helper function to create mock input element
  const createMockInput = (value: string = ''): HTMLInputElement =>
    ({
      value,
      disabled: false,
      placeholder: '',
      focus: vi.fn(),
      select: vi.fn(),
      addEventListener: vi.fn(),
      trim: vi.fn(),
    }) as unknown as HTMLInputElement;

  describe('Constructor', () => {
    it('should initialize with dependencies and setup event listeners', () => {
      expect(modalUIManager['shadowRoot']).toBe(mockShadowRoot);
      expect(modalUIManager['formManager']).toBe(mockFormManager);
      expect(modalUIManager['validationManager']).toBe(mockValidationManager);
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should bind escape handler', () => {
      expect(modalUIManager['boundEscHandler']).not.toBe(undefined);
    });
  });

  describe('openAddModal', () => {
    it('should open add modal successfully', () => {
      const mockModal = createMockModal(ELEMENTS.ADD_MODAL);
      const mockNameInput = createMockInput();
      mockElements.set(ELEMENTS.ADD_MODAL, mockModal);
      mockElements.set(ELEMENTS.NAME, mockNameInput);

      modalUIManager.openAddModal();

      expect(mockValidationManager.clearError).toHaveBeenCalledWith(true);
      expect(mockModal.classList.add).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
      expect(mockValidationManager.setupValidationListeners).toHaveBeenCalled();

      // Test focus with delay
      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);
      expect(mockNameInput.focus).toHaveBeenCalled();
    });

    it('should handle missing add modal element', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      modalUIManager.openAddModal();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Add modal not found in DOM');
      expect(mockValidationManager.clearError).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should setup expiry threshold interaction', () => {
      const mockModal = createMockModal(ELEMENTS.ADD_MODAL);
      mockElements.set(ELEMENTS.ADD_MODAL, mockModal);

      const setupSpy = vi.spyOn(modalUIManager, 'setupExpiryThresholdInteraction');

      modalUIManager.openAddModal();

      expect(setupSpy).toHaveBeenCalled();
    });
  });

  describe('closeAddModal', () => {
    it('should close add modal successfully', () => {
      const mockModal = createMockModal(ELEMENTS.ADD_MODAL);
      mockElements.set(ELEMENTS.ADD_MODAL, mockModal);

      modalUIManager.closeAddModal();

      expect(mockModal.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
    });

    it('should handle missing add modal element', () => {
      expect(() => modalUIManager.closeAddModal()).not.toThrow();
    });
  });

  describe('openEditModal', () => {
    it('should open edit modal with valid item', () => {
      const mockModal = createMockModal(ELEMENTS.EDIT_MODAL);
      const mockNameInput = createMockInput();
      mockElements.set(ELEMENTS.EDIT_MODAL, mockModal);
      mockElements.set(ELEMENTS.NAME, mockNameInput);

      const result = modalUIManager.openEditModal('Test Item', () => ({
        hass: mockHass,
        config: mockConfig,
      }));

      expect(result.found).toBe(true);
      expect(result.item).toEqual(mockInventoryItems[0]);
      expect(mockFormManager.populateEditModal).toHaveBeenCalledWith(mockInventoryItems[0]);
      expect(mockValidationManager.clearError).toHaveBeenCalledWith(false);
      expect(mockModal.classList.add).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
      expect(mockValidationManager.setupValidationListeners).toHaveBeenCalled();

      // Test focus with delay and select all
      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);
      expect(mockNameInput.focus).toHaveBeenCalled();
      expect(mockNameInput.select).toHaveBeenCalled();
    });

    it('should handle missing entity', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const configWithMissingEntity = { ...mockConfig, entity: 'sensor.nonexistent' };

      const result = modalUIManager.openEditModal('Test Item', () => ({
        hass: mockHass,
        config: configWithMissingEntity,
      }));

      expect(result.found).toBe(false);
      expect(result.item).toBe(undefined);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Entity not found: sensor.nonexistent');
      expect(mockFormManager.populateEditModal).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle missing item', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = modalUIManager.openEditModal('Nonexistent Item', () => ({
        hass: mockHass,
        config: mockConfig,
      }));

      expect(result.found).toBe(false);
      expect(result.item).toBe(undefined);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Item not found: Nonexistent Item');
      expect(mockFormManager.populateEditModal).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle empty items array', () => {
      const emptyHass = createMockHomeAssistant({
        'sensor.test_inventory': createMockHassEntity('sensor.test_inventory', {
          attributes: { items: [] },
        }),
      });

      const result = modalUIManager.openEditModal('Test Item', () => ({
        hass: emptyHass,
        config: mockConfig,
      }));

      expect(result.found).toBe(false);
      expect(result.item).toBe(undefined);
    });

    it('should handle missing items attribute', () => {
      const hassWithoutItems = createMockHomeAssistant({
        'sensor.test_inventory': createMockHassEntity('sensor.test_inventory', {
          attributes: {},
        }),
      });

      const result = modalUIManager.openEditModal('Test Item', () => ({
        hass: hassWithoutItems,
        config: mockConfig,
      }));

      expect(result.found).toBe(false);
      expect(result.item).toBe(undefined);
    });
  });

  describe('closeEditModal', () => {
    it('should close edit modal successfully', () => {
      const mockModal = createMockModal(ELEMENTS.EDIT_MODAL);
      mockElements.set(ELEMENTS.EDIT_MODAL, mockModal);

      modalUIManager.closeEditModal();

      expect(mockModal.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
    });

    it('should handle missing edit modal element', () => {
      expect(() => modalUIManager.closeEditModal()).not.toThrow();
    });
  });

  describe('closeAllModals', () => {
    it('should close both modals', () => {
      const closeAddSpy = vi.spyOn(modalUIManager, 'closeAddModal');
      const closeEditSpy = vi.spyOn(modalUIManager, 'closeEditModal');

      modalUIManager.closeAllModals();

      expect(closeAddSpy).toHaveBeenCalled();
      expect(closeEditSpy).toHaveBeenCalled();
    });
  });

  describe('handleModalClick', () => {
    it('should close add modal on backdrop click', () => {
      const mockEvent = {
        target: { id: ELEMENTS.ADD_MODAL },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      const closeAddSpy = vi.spyOn(modalUIManager, 'closeAddModal');

      const result = modalUIManager.handleModalClick(mockEvent);

      expect(result).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(closeAddSpy).toHaveBeenCalled();
    });

    it('should close edit modal on backdrop click', () => {
      const mockEvent = {
        target: { id: ELEMENTS.EDIT_MODAL },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      const closeEditSpy = vi.spyOn(modalUIManager, 'closeEditModal');

      const result = modalUIManager.handleModalClick(mockEvent);

      expect(result).toBe(true);
      expect(closeEditSpy).toHaveBeenCalled();
    });

    it('should close add modal on close button click', () => {
      const mockEvent = {
        target: {
          dataset: { action: 'close_add_modal' },
          classList: { contains: vi.fn() },
          closest: vi.fn(),
        },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      const closeAddSpy = vi.spyOn(modalUIManager, 'closeAddModal');

      const result = modalUIManager.handleModalClick(mockEvent);

      expect(result).toBe(true);
      expect(closeAddSpy).toHaveBeenCalled();
    });

    it('should close add modal on close button class', () => {
      const mockAddModal = {
        id: ELEMENTS.ADD_MODAL,
      } as HTMLElement;

      const mockTarget = {
        dataset: {},
        classList: { contains: vi.fn().mockReturnValue(true) },
        closest: vi.fn().mockReturnValue(mockAddModal),
      } as unknown as HTMLElement;

      const mockEvent = {
        target: mockTarget,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      vi.mocked(mockTarget.classList.contains).mockImplementation(
        (className: string) => className === CSS_CLASSES.CLOSE_BTN,
      );

      const closeAddSpy = vi.spyOn(modalUIManager, 'closeAddModal');

      const result = modalUIManager.handleModalClick(mockEvent);

      expect(result).toBe(true);
      expect(closeAddSpy).toHaveBeenCalled();
    });

    it('should close edit modal on close button class', () => {
      const mockEditModal = {
        id: ELEMENTS.EDIT_MODAL,
      } as HTMLElement;

      const mockTarget = {
        dataset: {},
        classList: { contains: vi.fn().mockReturnValue(true) },
        closest: vi.fn().mockImplementation((selector: string) => {
          if (selector === `#${ELEMENTS.EDIT_MODAL}`) {
            return mockEditModal;
          }
          return;
        }),
      } as unknown as HTMLElement;

      const mockEvent = {
        target: mockTarget,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      vi.mocked(mockTarget.classList.contains).mockImplementation(
        (className: string) => className === CSS_CLASSES.CLOSE_BTN,
      );

      const closeEditSpy = vi.spyOn(modalUIManager, 'closeEditModal');

      const result = modalUIManager.handleModalClick(mockEvent);

      expect(result).toBe(true);
      expect(closeEditSpy).toHaveBeenCalled();
    });

    it('should not close modal for content clicks', () => {
      const mockModalContent = {
        className: CSS_CLASSES.MODAL_CONTENT,
      } as HTMLElement;

      const mockEvent = {
        target: {
          id: 'some-input',
          dataset: {},
          classList: { contains: vi.fn().mockReturnValue(false) },
          closest: vi.fn().mockReturnValue(mockModalContent),
        },
      } as unknown as MouseEvent;

      const result = modalUIManager.handleModalClick(mockEvent);

      expect(result).toBe(false);
    });

    it('should return false for unhandled clicks', () => {
      const mockEvent = {
        target: {
          id: 'some-other-element',
          dataset: {},
          classList: { contains: vi.fn().mockReturnValue(false) },
          closest: vi.fn().mockReturnValue(),
        },
      } as unknown as MouseEvent;

      const result = modalUIManager.handleModalClick(mockEvent);

      expect(result).toBe(false);
    });
  });

  describe('setupExpiryThresholdInteraction', () => {
    it('should setup interactions for both modals', () => {
      const setupSpy = vi.spyOn(modalUIManager as any, 'setupExpiryThresholdFieldForModal');

      modalUIManager.setupExpiryThresholdInteraction();

      expect(setupSpy).toHaveBeenCalledWith(true); // Add modal
      expect(setupSpy).toHaveBeenCalledWith(false); // Edit modal
    });
  });

  describe('setupExpiryThresholdFieldForModal', () => {
    it('should setup expiry threshold for add modal', () => {
      const mockExpiryInput = createMockInput();
      mockElements.set(`add-${ELEMENTS.EXPIRY_DATE}`, mockExpiryInput);

      const updateStateSpy = vi.spyOn(modalUIManager as any, 'updateExpiryThresholdState');

      modalUIManager['setupExpiryThresholdFieldForModal'](true);

      expect(updateStateSpy).toHaveBeenCalledWith(true);
      expect(mockExpiryInput.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(mockExpiryInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should setup expiry threshold for edit modal', () => {
      const mockExpiryInput = createMockInput();
      mockElements.set(`edit-${ELEMENTS.EXPIRY_DATE}`, mockExpiryInput);

      const updateStateSpy = vi.spyOn(modalUIManager as any, 'updateExpiryThresholdState');

      modalUIManager['setupExpiryThresholdFieldForModal'](false);

      expect(updateStateSpy).toHaveBeenCalledWith(false);
      expect(mockExpiryInput.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(mockExpiryInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle missing expiry input', () => {
      expect(() => modalUIManager['setupExpiryThresholdFieldForModal'](true)).not.toThrow();
    });
  });

  describe('updateExpiryThresholdState', () => {
    it('should enable threshold when expiry date is set', () => {
      const mockExpiryInput = createMockInput('2024-12-31');
      const mockThresholdInput = createMockInput('');
      mockElements.set(`add-${ELEMENTS.EXPIRY_DATE}`, mockExpiryInput);
      mockElements.set(`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`, mockThresholdInput);

      Object.defineProperty(mockExpiryInput, 'value', {
        get: () => '2024-12-31',
        configurable: true,
      });

      modalUIManager['updateExpiryThresholdState'](true);

      expect(mockThresholdInput.disabled).toBe(false);
      expect(mockThresholdInput.placeholder).toBe('Days before expiry to alert (default: 0)');
      expect(mockThresholdInput.value).toBe('0');
    });

    it('should disable threshold when expiry date is empty', () => {
      const mockExpiryInput = createMockInput('');
      const mockThresholdInput = createMockInput('5');
      mockElements.set(`edit-${ELEMENTS.EXPIRY_DATE}`, mockExpiryInput);
      mockElements.set(`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`, mockThresholdInput);

      Object.defineProperty(mockExpiryInput, 'value', {
        get: () => '',
        configurable: true,
      });

      modalUIManager['updateExpiryThresholdState'](false);

      expect(mockThresholdInput.disabled).toBe(true);
      expect(mockThresholdInput.value).toBe('');
      expect(mockThresholdInput.placeholder).toBe('Set expiry date first');
    });

    it('should not override existing threshold value', () => {
      const mockExpiryInput = createMockInput('2024-12-31');
      const mockThresholdInput = createMockInput('10');
      mockElements.set(`add-${ELEMENTS.EXPIRY_DATE}`, mockExpiryInput);
      mockElements.set(`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`, mockThresholdInput);

      Object.defineProperty(mockExpiryInput, 'value', {
        get: () => '2024-12-31',
        configurable: true,
      });
      Object.defineProperty(mockThresholdInput, 'value', {
        get: () => '10',
        configurable: true,
      });

      modalUIManager['updateExpiryThresholdState'](true);

      expect(mockThresholdInput.disabled).toBe(false);
      // Should not change existing value of '10'
    });

    it('should handle missing elements', () => {
      expect(() => modalUIManager['updateExpiryThresholdState'](true)).not.toThrow();
    });
  });

  describe('handleEscapeKey', () => {
    it('should close all modals on escape key', () => {
      const closeAllSpy = vi.spyOn(modalUIManager, 'closeAllModals');
      const mockEvent = { key: 'Escape' } as KeyboardEvent;

      modalUIManager['handleEscapeKey'](mockEvent);

      expect(closeAllSpy).toHaveBeenCalled();
    });

    it('should not close modals on other keys', () => {
      const closeAllSpy = vi.spyOn(modalUIManager, 'closeAllModals');
      const mockEvent = { key: 'Enter' } as KeyboardEvent;

      modalUIManager['handleEscapeKey'](mockEvent);

      expect(closeAllSpy).not.toHaveBeenCalled();
    });
  });

  describe('focusElementWithDelay', () => {
    it('should focus element after delay', () => {
      const mockElement = createMockInput();
      mockElements.set('test-element', mockElement);

      modalUIManager['focusElementWithDelay']('test-element');

      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

      expect(mockElement.focus).toHaveBeenCalled();
    });

    it('should focus and select all text when specified', () => {
      const mockElement = createMockInput();
      mockElements.set('test-element', mockElement);

      modalUIManager['focusElementWithDelay']('test-element', true);

      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

      expect(mockElement.focus).toHaveBeenCalled();
      expect(mockElement.select).toHaveBeenCalled();
    });

    it('should handle missing element', () => {
      modalUIManager['focusElementWithDelay']('nonexistent-element');

      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

      // Should not throw
    });
  });

  describe('getElement', () => {
    it('should retrieve element by ID', () => {
      const mockElement = createMockModal('test-id');
      mockElements.set('test-id', mockElement);

      const result = modalUIManager['getElement']('test-id');

      expect(result).toBe(mockElement);
      expect(mockShadowRoot.getElementById).toHaveBeenCalledWith('test-id');
    });

    it('should return undefined for missing element', () => {
      const result = modalUIManager['getElement']('nonexistent-id');

      expect(result).toBe(undefined);
    });
  });

  describe('destroy', () => {
    it('should remove event listeners and clear bound handler', () => {
      modalUIManager.destroy();

      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(modalUIManager['boundEscHandler']).toBe(undefined);
    });

    it('should handle multiple destroy calls', () => {
      modalUIManager.destroy();
      modalUIManager.destroy();

      expect(modalUIManager['boundEscHandler']).toBe(undefined);
    });

    it('should handle destroy when no handler exists', () => {
      modalUIManager['boundEscHandler'] = undefined;

      expect(() => modalUIManager.destroy()).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete add modal workflow', () => {
      const mockModal = createMockModal(ELEMENTS.ADD_MODAL);
      const mockNameInput = createMockInput();
      mockElements.set(ELEMENTS.ADD_MODAL, mockModal);
      mockElements.set(ELEMENTS.NAME, mockNameInput);

      // Open modal
      modalUIManager.openAddModal();
      expect(mockModal.classList.add).toHaveBeenCalledWith(CSS_CLASSES.SHOW);

      // Close modal
      modalUIManager.closeAddModal();
      expect(mockModal.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
    });

    it('should handle complete edit modal workflow', () => {
      const mockModal = createMockModal(ELEMENTS.EDIT_MODAL);
      const mockNameInput = createMockInput();
      mockElements.set(ELEMENTS.EDIT_MODAL, mockModal);
      mockElements.set(ELEMENTS.NAME, mockNameInput);

      // Open modal
      const result = modalUIManager.openEditModal('Test Item', () => ({
        hass: mockHass,
        config: mockConfig,
      }));
      expect(result.found).toBe(true);
      expect(mockModal.classList.add).toHaveBeenCalledWith(CSS_CLASSES.SHOW);

      // Close modal
      modalUIManager.closeEditModal();
      expect(mockModal.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
    });
  });
});
