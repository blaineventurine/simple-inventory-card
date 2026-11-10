import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModalUIManager } from '../../../src/services/modals/modalUIManager';
import { ModalFormManager } from '../../../src/services/modals/modalFormManager';
import { ModalValidationManager } from '../../../src/services/modals/modalValidationManager';
import { ELEMENTS, CSS_CLASSES, TIMING } from '../../../src/utils/constants';
import { HomeAssistant } from '../../../src/types/homeAssistant';
import { InventoryItem, InventoryConfig } from '../../../src/types/inventory';
import { createMockHomeAssistant, createMockHassEntity } from '../../testHelpers';
import { TranslationData } from '@/types/translatableComponent';
import { initializeAliasTagInput } from '../../../src/services/aliasTagInput';
import { initializeIconField } from '../../../src/services/iconFieldInput';

vi.mock('../../../src/services/modals/modalFormManager');
vi.mock('../../../src/services/modals/modalValidationManager');
vi.mock('../../../src/services/iconFieldInput', () => ({
  initializeIconField: vi.fn(),
}));
vi.mock('../../../src/services/aliasTagInput', () => ({
  initializeAliasTagInput: vi.fn(),
}));

describe('ModalUIManager', () => {
  let modalUIManager: ModalUIManager;
  let mockShadowRoot: ShadowRoot;
  let mockFormManager: ModalFormManager;
  let mockValidationManager: ModalValidationManager;
  let mockHass: HomeAssistant;
  let mockConfig: InventoryConfig;
  let mockElements: Map<string, HTMLElement>;
  const mockTranslations: TranslationData = {
    modal: {
      add_item: 'Add Item',
      auto_add_id_to_description_enabled: 'Auto-add inventory ID to item description',
      auto_add_settings: 'Auto-add Settings',
      auto_add_when_low: 'Auto-add to todo list when low',
      cancel: 'Cancel',
      category: 'Category',
      description: 'Description',
      description_placeholder: 'Item description',
      category_placeholder: 'Food, Cleaning, etc.',
      location_placeholder: 'Pantry, Fridge, etc.',
      days_before_expiry: '(days before expiry)',
      edit_item: 'Edit Item',
      expiry_alert_threshold: 'Expiry Alert Threshold',
      expiry_date: 'Expiry Date',
      expiry_help_text: 'How many days before expiry to show alerts',
      location: 'Location',
      minimum_quantity: 'Minimum quantity',
      name_required: 'Name *',
      quantity: 'Quantity',
      quantity_threshold: 'Quantity Threshold',
      save_changes: 'Save Changes',
      select_list: 'Select list...',
      set_expiry_first: 'Set expiry date first',
      todo_list: 'Todo List',
      unit: 'Unit',
      unit_placeholder: 'kg, pcs, etc.',
    },
  };

  const mockInventoryItems: InventoryItem[] = [
    {
      auto_add_enabled: false,
      auto_add_id_to_description_enabled: false,
      category: 'Food',
      description: 'A test item for unit testing',
      expiry_date: '2024-12-31',
      location: 'Pantry',
      name: 'Test Item',
      quantity: 5,
      todo_list: 'shopping',
      unit: 'pieces',
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

    // The manager's document listeners are recorded, not attached (the document stays real).
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});

    // Mock timers
    vi.useFakeTimers();

    vi.clearAllMocks();

    modalUIManager = new ModalUIManager(mockShadowRoot, mockFormManager, mockValidationManager);
  });

  afterEach(() => {
    vi.useRealTimers();
    modalUIManager.destroy();
    vi.restoreAllMocks();
  });

  /** The press that starts a click; the manager records it from a document listener. */
  function pressOn(target: unknown): void {
    const listener = vi
      .mocked(document.addEventListener)
      .mock.calls.filter(([type]) => type === 'pointerdown')
      .at(-1)?.[1];
    if (typeof listener !== 'function') {
      throw new Error('no pointerdown listener');
    }
    listener({ composedPath: () => [target] } as unknown as Event);
  }

  // Sheet panel (.modal-content) of every mock modal: the focus target on open
  const mockPanel = { focus: vi.fn() } as unknown as HTMLElement;

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
      dispatchEvent: vi.fn(),
      querySelector: vi.fn((selector: string) =>
        selector === `.${CSS_CLASSES.MODAL_CONTENT}` ? mockPanel : null,
      ),
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
      mockElements.set(`add-${ELEMENTS.NAME}`, mockNameInput);

      modalUIManager.openAddModal(mockTranslations);

      expect(mockValidationManager.clearError).toHaveBeenCalledWith(true);
      expect(mockModal.classList.add).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
      expect(mockValidationManager.setupValidationListeners).toHaveBeenCalled();
      expect(initializeAliasTagInput).toHaveBeenCalledWith(mockShadowRoot, 'add', mockTranslations);
      expect(initializeIconField).toHaveBeenCalledWith(mockShadowRoot, 'add');

      // Test focus with delay
      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);
      expect(mockNameInput.focus).toHaveBeenCalled();
    });

    it('should handle missing add modal element', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      modalUIManager.openAddModal(mockTranslations);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Add modal not found in DOM');
      expect(mockValidationManager.clearError).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should setup expiry threshold interaction', () => {
      const mockModal = createMockModal(ELEMENTS.ADD_MODAL);
      mockElements.set(ELEMENTS.ADD_MODAL, mockModal);

      const setupSpy = vi.spyOn(modalUIManager, 'setupExpiryThresholdInteraction');

      modalUIManager.openAddModal(mockTranslations);

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
      mockElements.set(`edit-${ELEMENTS.NAME}`, mockNameInput);

      const result = modalUIManager.openEditModal(
        'Test Item',
        () => ({
          hass: mockHass,
          config: mockConfig,
          items: mockInventoryItems,
        }),
        mockTranslations,
      );

      expect(result.found).toBe(true);
      expect(result.item).toEqual(mockInventoryItems[0]);
      expect(mockFormManager.populateEditModal).toHaveBeenCalledWith(mockInventoryItems[0]);
      expect(mockValidationManager.clearError).toHaveBeenCalledWith(false);
      expect(mockModal.classList.add).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
      expect(mockValidationManager.setupValidationListeners).toHaveBeenCalled();
      expect(initializeAliasTagInput).toHaveBeenCalledWith(
        mockShadowRoot,
        'edit',
        mockTranslations,
      );
      expect(initializeIconField).toHaveBeenCalledWith(mockShadowRoot, 'edit');

      // The sheet itself takes focus: no keyboard, no selected name
      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);
      expect(mockPanel.focus).toHaveBeenCalled();
      expect(mockNameInput.focus).not.toHaveBeenCalled();
      expect(mockNameInput.select).not.toHaveBeenCalled();
    });

    it('should handle missing entity', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const configWithMissingEntity = { ...mockConfig, entity: 'sensor.nonexistent' };

      const result = modalUIManager.openEditModal(
        'Test Item',
        () => ({
          hass: mockHass,
          config: configWithMissingEntity,
          items: [],
        }),
        mockTranslations,
      );

      expect(result.found).toBe(false);
      expect(result.item).toBe(undefined);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Entity not found: sensor.nonexistent');
      expect(mockFormManager.populateEditModal).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle missing item', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = modalUIManager.openEditModal(
        'Nonexistent Item',
        () => ({
          hass: mockHass,
          config: mockConfig,
          items: mockInventoryItems,
        }),
        mockTranslations,
      );

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

      const result = modalUIManager.openEditModal(
        'Test Item',
        () => ({
          hass: emptyHass,
          config: mockConfig,
          items: [],
        }),
        mockTranslations,
      );

      expect(result.found).toBe(false);
      expect(result.item).toBe(undefined);
    });

    it('should handle missing items attribute', () => {
      const hassWithoutItems = createMockHomeAssistant({
        'sensor.test_inventory': createMockHassEntity('sensor.test_inventory', {
          attributes: {},
        }),
      });

      const result = modalUIManager.openEditModal(
        'Test Item',
        () => ({
          hass: hassWithoutItems,
          config: mockConfig,
          items: [],
        }),
        mockTranslations,
      );

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
      const backdrop = { id: ELEMENTS.ADD_MODAL };
      pressOn(backdrop);
      const mockEvent = {
        target: backdrop,
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
      const backdrop = { id: ELEMENTS.EDIT_MODAL };
      pressOn(backdrop);
      const mockEvent = {
        target: backdrop,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      const closeEditSpy = vi.spyOn(modalUIManager, 'closeEditModal');

      const result = modalUIManager.handleModalClick(mockEvent);

      expect(result).toBe(true);
      expect(closeEditSpy).toHaveBeenCalled();
    });

    it('ignores a backdrop click whose press started elsewhere', () => {
      const backdrop = {
        id: ELEMENTS.ADD_MODAL,
        dataset: {},
        classList: { contains: vi.fn() },
        closest: vi.fn(),
      };
      pressOn({ id: 'add-name' });
      const closeAddSpy = vi.spyOn(modalUIManager, 'closeAddModal');

      const result = modalUIManager.handleModalClick({
        target: backdrop,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent);

      expect(result).toBe(false);
      expect(closeAddSpy).not.toHaveBeenCalled();
    });

    // Cancel is a data-action control: the EventHandler's action registry closes the sheet
    // (eventHandler.test.ts "closes the add sheet from its Cancel").
    it('leaves a data-action Cancel click to the action registry', () => {
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

      expect(result).toBe(false);
      expect(closeAddSpy).not.toHaveBeenCalled();
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
          closest: vi.fn((selector: string) =>
            selector === `.${CSS_CLASSES.MODAL_CONTENT}` ? mockModalContent : null,
          ),
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
          closest: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as MouseEvent;

      const result = modalUIManager.handleModalClick(mockEvent);

      expect(result).toBe(false);
    });
  });

  describe('setupExpiryThresholdInteraction', () => {
    it('should setup interactions for both modals', () => {
      const setupSpy = vi.spyOn(modalUIManager as any, 'setupExpiryThresholdFieldForModal');

      modalUIManager.setupExpiryThresholdInteraction(mockTranslations);

      expect(setupSpy).toHaveBeenCalledWith(true, mockTranslations); // Add modal
      expect(setupSpy).toHaveBeenCalledWith(false, mockTranslations); // Edit modal
    });
  });

  describe('setupExpiryThresholdFieldForModal', () => {
    it('should setup expiry threshold for add modal', () => {
      const mockExpiryInput = createMockInput();
      mockElements.set(`add-${ELEMENTS.EXPIRY_DATE}`, mockExpiryInput);

      const updateStateSpy = vi.spyOn(modalUIManager as any, 'updateExpiryThresholdState');

      modalUIManager['setupExpiryThresholdFieldForModal'](true, mockTranslations);

      expect(updateStateSpy).toHaveBeenCalledWith(true, mockTranslations);
      expect(mockExpiryInput.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(mockExpiryInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should setup expiry threshold for edit modal', () => {
      const mockExpiryInput = createMockInput();
      mockElements.set(`edit-${ELEMENTS.EXPIRY_DATE}`, mockExpiryInput);

      const updateStateSpy = vi.spyOn(modalUIManager as any, 'updateExpiryThresholdState');

      modalUIManager['setupExpiryThresholdFieldForModal'](false, mockTranslations);

      expect(updateStateSpy).toHaveBeenCalledWith(false, mockTranslations);
      expect(mockExpiryInput.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(mockExpiryInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle missing expiry input', () => {
      expect(() =>
        modalUIManager['setupExpiryThresholdFieldForModal'](true, mockTranslations),
      ).not.toThrow();
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

      modalUIManager['updateExpiryThresholdState'](true, mockTranslations);

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

      modalUIManager['updateExpiryThresholdState'](false, mockTranslations);

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

      modalUIManager['updateExpiryThresholdState'](true, mockTranslations);

      expect(mockThresholdInput.disabled).toBe(false);
      // Should not change existing value of '10'
    });

    it('should handle missing elements', () => {
      expect(() =>
        modalUIManager['updateExpiryThresholdState'](true, mockTranslations),
      ).not.toThrow();
    });
  });

  describe('handleEscapeKey', () => {
    it('does nothing while the card host is hidden (an inactive panel tab)', () => {
      const host = document.createElement('div');
      host.hidden = true;
      Object.assign(mockShadowRoot, { host });
      const closeAllSpy = vi.spyOn(modalUIManager, 'closeAllModals');

      modalUIManager['handleEscapeKey'](new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(closeAllSpy).not.toHaveBeenCalled();
    });

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

  describe('focusOnOpen', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function stubPointer(coarse: boolean): void {
      vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: coarse && query === '(pointer: coarse)' })),
      );
    }

    it('focuses the field after the delay on a fine pointer', () => {
      stubPointer(false);
      const mockElement = createMockInput();
      mockElements.set('test-element', mockElement);

      modalUIManager['focusOnOpen'](createMockModal('test-modal'), 'test-element');
      expect(mockElement.focus).not.toHaveBeenCalled();
      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

      expect(mockElement.focus).toHaveBeenCalled();
      expect(mockPanel.focus).not.toHaveBeenCalled();
    });

    it('focuses the sheet panel instead of the field on a coarse pointer', () => {
      stubPointer(true);
      const mockElement = createMockInput();
      mockElements.set('test-element', mockElement);

      modalUIManager['focusOnOpen'](createMockModal('test-modal'), 'test-element');
      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

      expect(mockElement.focus).not.toHaveBeenCalled();
      expect(mockPanel.focus).toHaveBeenCalled();
    });

    it('focuses the sheet panel when no field is given', () => {
      stubPointer(false);

      modalUIManager['focusOnOpen'](createMockModal('test-modal'), undefined);
      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

      expect(mockPanel.focus).toHaveBeenCalled();
    });

    it('falls back to the panel when the field is missing', () => {
      stubPointer(false);

      modalUIManager['focusOnOpen'](createMockModal('test-modal'), 'nonexistent-element');
      vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);

      expect(mockPanel.focus).toHaveBeenCalled();
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
      mockElements.set(`add-${ELEMENTS.NAME}`, mockNameInput);

      // Open modal
      modalUIManager.openAddModal(mockTranslations);
      expect(mockModal.classList.add).toHaveBeenCalledWith(CSS_CLASSES.SHOW);

      // Close modal
      modalUIManager.closeAddModal();
      expect(mockModal.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
    });

    it('should handle complete edit modal workflow', () => {
      const mockModal = createMockModal(ELEMENTS.EDIT_MODAL);
      const mockNameInput = createMockInput();
      mockElements.set(ELEMENTS.EDIT_MODAL, mockModal);
      mockElements.set(`edit-${ELEMENTS.NAME}`, mockNameInput);

      // Open modal
      const result = modalUIManager.openEditModal(
        'Test Item',
        () => ({
          hass: mockHass,
          config: mockConfig,
          items: mockInventoryItems,
        }),
        mockTranslations,
      );
      expect(result.found).toBe(true);
      expect(mockModal.classList.add).toHaveBeenCalledWith(CSS_CLASSES.SHOW);

      // Close modal
      modalUIManager.closeEditModal();
      expect(mockModal.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.SHOW);
    });
  });
});
