import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventHandler } from '../../src/services/eventHandler';
import { Services } from '../../src/services/services';
import { Modals } from '../../src/services/modals';
import { Utilities } from '../../src/utils/utilities';
import { ELEMENTS, ACTIONS, DEFAULTS, CSS_CLASSES, SORT_METHODS } from '../../src/utils/constants';
import { HomeAssistant, InventoryConfig, InventoryItem } from '../../src/types/homeAssistant';
import { createMockHomeAssistant, createMockHassEntity } from '../testHelpers';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/services');
vi.mock('../../src/services/modals');
vi.mock('../../src/services/filters');
vi.mock('../../src/utils/utilities');
vi.mock('../../src/templates/autoCompleteInput', () => ({
  initializeAutocomplete: vi.fn(),
  createAutocompleteInput: vi.fn(() => '<div></div>'),
}));
vi.mock('../../src/services/multiSelect.ts', () => ({
  createMultiSelect: vi.fn(() => '<div></div>'),
  initializeMultiSelect: vi.fn(),
}));

describe('EventHandler', () => {
  let eventHandler: EventHandler;
  let mockConfig: InventoryConfig;
  let mockFilters: any;
  let mockHass: HomeAssistant;
  let mockModals: Modals;
  let mockRenderCallback: () => void;
  let mockRenderRoot: ShadowRoot;
  let mockServices: Services;
  let mockTranslations: TranslationData;
  let mockUpdateItemsCallback: (items: InventoryItem[], sortMethod: string) => void;

  const mockInventoryItems: InventoryItem[] = [
    {
      auto_add_enabled: false,
      auto_add_id_to_description_enabled: false,
      category: 'Food',
      description: 'A test item',
      expiry_date: '2024-12-31',
      location: 'Pantry',
      name: 'Test Item',
      quantity: 5,
      todo_list: 'shopping',
      unit: 'pieces',
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    mockRenderRoot = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
    } as unknown as ShadowRoot;

    mockTranslations = {
      items: {
        no_items: 'No items in inventory',
      },
    };

    mockServices = {
      incrementItem: vi.fn(),
      decrementItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Services;

    mockModals = {
      openAddModal: vi.fn(),
      closeAddModal: vi.fn(),
      openEditModal: vi.fn(),
      closeEditModal: vi.fn(),
      addItem: vi.fn(),
      saveEditModal: vi.fn(),
      handleModalClick: vi.fn(),
    } as unknown as Modals;

    mockFilters = {
      getCurrentFilters: vi.fn().mockReturnValue({
        category: [],
        expiry: '',
        location: [],
        quantity: '',
        searchText: '',
        showAdvanced: false,
        sortMethod: 'name',
      }),
      saveFilters: vi.fn(),
      clearFilters: vi.fn(),
      filterItems: vi.fn((items) => items),
      sortItems: vi.fn((items) => items),
      setupSearchInput: vi.fn(),
      updateFilterIndicators: vi.fn(),
    };
    mockHass = createMockHomeAssistant({
      'sensor.test_inventory': createMockHassEntity('sensor.test_inventory', {
        attributes: { items: mockInventoryItems },
      }),
    });

    mockConfig = {
      type: 'inventory-card',
      entity: 'sensor.test_inventory',
    };

    mockRenderCallback = vi.fn();
    mockUpdateItemsCallback = vi.fn();

    vi.mocked(Utilities.getInventoryId).mockReturnValue('test-inventory-id');
    vi.mocked(Utilities.validateInventoryItems).mockReturnValue(mockInventoryItems);

    globalThis.confirm = vi.fn();
    globalThis.alert = vi.fn();

    eventHandler = new EventHandler(
      mockRenderRoot,
      mockServices,
      mockModals,
      mockFilters,
      mockConfig,
      mockHass,
      mockRenderCallback,
      mockUpdateItemsCallback,
      () => ({ hass: mockHass, config: mockConfig }),
      mockTranslations,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should initialize with all dependencies', () => {
      expect(eventHandler['renderRoot']).toBe(mockRenderRoot);
      expect(eventHandler['services']).toBe(mockServices);
      expect(eventHandler['modals']).toBe(mockModals);
      expect(eventHandler['filters']).toBe(mockFilters);
      expect(eventHandler['config']).toBe(mockConfig);
      expect(eventHandler['hass']).toBe(mockHass);
      expect(eventHandler['renderCallback']).toBe(mockRenderCallback);
      expect(eventHandler['updateItemsCallback']).toBe(mockUpdateItemsCallback);
    });

    it('should initialize with default state', () => {
      expect(eventHandler['boundClickHandler']).toBe(undefined);
      expect(eventHandler['boundChangeHandler']).toBe(undefined);
      expect(eventHandler['eventListenersSetup']).toBe(false);
    });
  });

  describe('setupEventListeners', () => {
    it('should setup event listeners when not already setup', () => {
      eventHandler.setupEventListeners();

      expect(mockRenderRoot.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockRenderRoot.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockFilters.setupSearchInput).toHaveBeenCalledWith(
        mockConfig.entity,
        expect.any(Function),
      );
      expect(eventHandler['eventListenersSetup']).toBe(true);
    });

    it('should not setup event listeners if already setup', () => {
      eventHandler.setupEventListeners();
      vi.clearAllMocks();

      eventHandler.setupEventListeners();

      expect(mockRenderRoot.addEventListener).not.toHaveBeenCalled();
      expect(mockFilters.setupSearchInput).not.toHaveBeenCalled();
    });
  });

  describe('cleanupEventListeners', () => {
    it('should remove event listeners when bound handlers exist', () => {
      eventHandler.setupEventListeners();

      // Just verify cleanup doesn't throw errors
      expect(() => eventHandler.cleanupEventListeners()).not.toThrow();
      expect(eventHandler['eventListenersSetup']).toBe(false);
    });

    it('should handle cleanup when no bound handlers exist', () => {
      eventHandler.cleanupEventListeners();

      expect(mockRenderRoot.removeEventListener).not.toHaveBeenCalled();
      expect(eventHandler['eventListenersSetup']).toBe(false);
    });
  });

  describe('updateDependencies', () => {
    it('should update config and hass', () => {
      const newConfig = { ...mockConfig, entity: 'sensor.new_inventory' };
      const newHass = createMockHomeAssistant();

      eventHandler.updateDependencies(newConfig, newHass);

      expect(eventHandler['config']).toBe(newConfig);
      expect(eventHandler['hass']).toBe(newHass);
    });
  });

  describe('handleClick', () => {
    let mockTarget: HTMLElement;
    let mockEvent: Event;

    beforeEach(() => {
      eventHandler.setupEventListeners();
    });

    describe('button with data-processing attribute', () => {
      it('should prevent event and return early', async () => {
        mockTarget = {
          tagName: 'BUTTON',
          hasAttribute: vi.fn().mockReturnValue(true),
        } as unknown as HTMLElement;

        mockEvent = {
          target: mockTarget,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as Event;

        await eventHandler['handleClick'](mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
      });
    });

    describe('item actions', () => {
      beforeEach(() => {
        mockTarget = {
          tagName: 'BUTTON',
          hasAttribute: vi.fn().mockReturnValue(false),
          getAttribute: vi.fn().mockReturnValue('false'),
          setAttribute: vi.fn(),
          removeAttribute: vi.fn(),
          style: {},
          dataset: {
            action: ACTIONS.INCREMENT,
            name: 'Test Item',
          },
        } as unknown as HTMLElement;

        mockEvent = {
          target: mockTarget,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as Event;
      });

      it('should handle item actions', async () => {
        const handleItemActionSpy = vi.spyOn(eventHandler as any, 'handleItemAction');

        await eventHandler['handleClick'](mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
        expect(handleItemActionSpy).toHaveBeenCalledWith(
          mockTarget,
          ACTIONS.INCREMENT,
          'Test Item',
        );
      });
    });

    describe('modal clicks', () => {
      it('should handle modal clicks and return early if handled', async () => {
        mockTarget = {
          tagName: 'DIV',
          hasAttribute: vi.fn().mockReturnValue(false),
          dataset: {},
        } as unknown as HTMLElement;

        mockEvent = {
          target: mockTarget,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as MouseEvent;

        vi.mocked(mockModals.handleModalClick).mockReturnValue(true);

        await eventHandler['handleClick'](mockEvent);

        expect(mockModals.handleModalClick).toHaveBeenCalledWith(mockEvent);
        expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      });
    });

    describe('specific button actions', () => {
      it('should handle open add modal button', async () => {
        mockTarget = {
          tagName: 'BUTTON',
          id: ELEMENTS.OPEN_ADD_MODAL,
          hasAttribute: vi.fn().mockReturnValue(false),
          dataset: {},
        } as unknown as HTMLElement;

        mockEvent = {
          target: mockTarget,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as Event;

        vi.mocked(mockModals.handleModalClick).mockReturnValue(false);

        await eventHandler['handleClick'](mockEvent);

        expect(mockModals.openAddModal).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      });

      it('should handle add item button', async () => {
        mockTarget = {
          tagName: 'BUTTON',
          id: ELEMENTS.ADD_ITEM_BTN,
          hasAttribute: vi.fn().mockReturnValue(false),
          dataset: {},
        } as unknown as HTMLElement;

        mockEvent = {
          target: mockTarget,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as Event;

        vi.mocked(mockModals.handleModalClick).mockReturnValue(false);
        const handleAddItemSpy = vi.spyOn(eventHandler as any, 'handleAddItem');

        await eventHandler['handleClick'](mockEvent);

        expect(handleAddItemSpy).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      });

      it('should handle advanced search toggle', async () => {
        mockTarget = {
          tagName: 'BUTTON',
          id: ELEMENTS.ADVANCED_SEARCH_TOGGLE,
          hasAttribute: vi.fn().mockReturnValue(false),
          dataset: {},
        } as unknown as HTMLElement;

        mockEvent = {
          target: mockTarget,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as Event;

        vi.mocked(mockModals.handleModalClick).mockReturnValue(false);
        const toggleAdvancedFiltersSpy = vi.spyOn(eventHandler as any, 'toggleAdvancedFilters');

        await eventHandler['handleClick'](mockEvent);

        expect(toggleAdvancedFiltersSpy).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      });

      it('should handle clear filters button', async () => {
        mockTarget = {
          tagName: 'BUTTON',
          id: ELEMENTS.CLEAR_FILTERS,
          hasAttribute: vi.fn().mockReturnValue(false),
          dataset: {},
        } as unknown as HTMLElement;

        mockEvent = {
          target: mockTarget,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as Event;

        vi.mocked(mockModals.handleModalClick).mockReturnValue(false);
        const clearFiltersSpy = vi.spyOn(eventHandler as any, 'clearFilters');

        await eventHandler['handleClick'](mockEvent);

        expect(clearFiltersSpy).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      });
    });

    describe('CSS class-based buttons', () => {
      it('should handle save button in edit modal', async () => {
        const mockModal = document.createElement('div');
        mockModal.id = ELEMENTS.EDIT_MODAL;

        mockTarget = {
          tagName: 'BUTTON',
          classList: {
            contains: vi.fn().mockImplementation((className) => className === CSS_CLASSES.SAVE_BTN),
          },
          closest: vi.fn().mockReturnValue(mockModal),
          hasAttribute: vi.fn().mockReturnValue(false),
          dataset: {},
        } as unknown as HTMLElement;

        mockEvent = {
          target: mockTarget,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as Event;

        vi.mocked(mockModals.handleModalClick).mockReturnValue(false);
        const handleSaveEditsSpy = vi.spyOn(eventHandler as any, 'handleSaveEdits');

        await eventHandler['handleClick'](mockEvent);

        expect(handleSaveEditsSpy).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      });

      it('should handle cancel button in add modal', async () => {
        const mockModal = document.createElement('div');
        mockModal.id = ELEMENTS.ADD_MODAL;

        mockTarget = {
          tagName: 'BUTTON',
          classList: {
            contains: vi
              .fn()
              .mockImplementation((className) => className === CSS_CLASSES.CANCEL_BTN),
          },
          closest: vi.fn().mockReturnValue(mockModal),
          hasAttribute: vi.fn().mockReturnValue(false),
          dataset: {},
        } as unknown as HTMLElement;

        mockEvent = {
          target: mockTarget,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as Event;

        vi.mocked(mockModals.handleModalClick).mockReturnValue(false);

        await eventHandler['handleClick'](mockEvent);

        expect(mockModals.closeAddModal).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      });

      it('should handle cancel button in edit modal', async () => {
        // Create real DOM elements
        const mockModal = document.createElement('div');
        mockModal.id = ELEMENTS.EDIT_MODAL;

        const mockButton = document.createElement('button');
        mockButton.classList.add(CSS_CLASSES.CANCEL_BTN);
        mockModal.append(mockButton);

        mockEvent = {
          target: mockButton,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as Event;

        vi.mocked(mockModals.handleModalClick).mockReturnValue(false);

        await eventHandler['handleClick'](mockEvent);

        expect(mockModals.closeEditModal).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      });
    });
  });

  describe('handleChange', () => {
    let mockTarget: HTMLElement;
    let mockEvent: Event;

    describe('filter selects', () => {
      it('should handle sort method change', () => {
        const filterData = {
          category: [''],
          expiry: '',
          location: [''],
          quantity: '',
          searchText: 'test',
          showAdvanced: false,
          sortMethod: SORT_METHODS.NAME,
        };

        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);

        mockTarget = {
          id: ELEMENTS.SORT_METHOD,
        } as unknown as HTMLElement;

        mockEvent = { target: mockTarget } as unknown as Event;

        eventHandler['handleChange'](mockEvent);

        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('should handle auto-add checkbox change', () => {
        vi.useFakeTimers();

        const mockControls = document.createElement('div');
        mockControls.className = 'auto-add-controls';
        mockControls.style.display = 'none';

        const mockParent = document.createElement('div');
        mockParent.append(mockControls);

        const inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.id = 'auto-add-enabled';
        inputElement.checked = true;
        Object.defineProperty(inputElement, 'parentElement', {
          value: mockParent,
          writable: true,
        });

        mockEvent = { target: inputElement } as unknown as Event;

        eventHandler['handleChange'](mockEvent);

        vi.advanceTimersByTime(0);

        expect(mockControls.style.display).toBe('block');

        vi.useRealTimers();
      });
    });

    describe('handleSearchChange', () => {
      beforeEach(() => {
        const filterData = {
          category: [''],
          expiry: '',
          location: [''],
          quantity: '',
          searchText: 'test',
          showAdvanced: false,
          sortMethod: SORT_METHODS.NAME,
        };

        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);
        vi.mocked(mockFilters.filterItems).mockReturnValue(mockInventoryItems);
        vi.mocked(mockFilters.sortItems).mockReturnValue(mockInventoryItems);

        const mockSortSelect = document.createElement('select');
        mockSortSelect.value = 'name';
        vi.mocked(mockRenderRoot.querySelector).mockReturnValue(mockSortSelect);
      });

      it('should filter and sort items', () => {
        eventHandler['handleSearchChange']();

        expect(mockFilters.getCurrentFilters).toHaveBeenCalledWith(mockConfig.entity);
        expect(Utilities.validateInventoryItems).toHaveBeenCalledWith(mockInventoryItems);
        expect(mockFilters.filterItems).toHaveBeenCalled();
        expect(mockFilters.sortItems).toHaveBeenCalled();
        expect(mockUpdateItemsCallback).toHaveBeenCalledWith(mockInventoryItems, 'name');
        expect(mockFilters.updateFilterIndicators).toHaveBeenCalled();
      });

      it('should handle missing entity state', () => {
        eventHandler['hass'] = createMockHomeAssistant({});

        eventHandler['handleSearchChange']();

        expect(mockUpdateItemsCallback).not.toHaveBeenCalled();
      });

      it('should use default sort method when sort element not found', () => {
        vi.mocked(mockRenderRoot.querySelector).mockReturnValue(null);

        eventHandler['handleSearchChange']();

        expect(mockFilters.sortItems).toHaveBeenCalledWith(
          mockInventoryItems,
          DEFAULTS.SORT_METHOD,
          mockTranslations,
        );
      });
    });

    describe('handleItemAction', () => {
      let mockButton: HTMLElement;

      beforeEach(() => {
        mockButton = {
          hasAttribute: vi.fn().mockReturnValue(false),
          getAttribute: vi.fn().mockReturnValue('false'),
          setAttribute: vi.fn(),
          removeAttribute: vi.fn(),
          style: {},
        } as unknown as HTMLElement;

        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should return early if button is disabled', async () => {
        vi.mocked(mockButton.hasAttribute).mockReturnValue(true);

        await eventHandler['handleItemAction'](mockButton, ACTIONS.INCREMENT, 'Test Item');

        expect(mockServices.incrementItem).not.toHaveBeenCalled();
      });

      it('should return early if button is aria-disabled', async () => {
        vi.mocked(mockButton.getAttribute).mockReturnValue('true');

        await eventHandler['handleItemAction'](mockButton, ACTIONS.INCREMENT, 'Test Item');

        expect(mockServices.incrementItem).not.toHaveBeenCalled();
      });

      it('should handle increment action', async () => {
        await eventHandler['handleItemAction'](mockButton, ACTIONS.INCREMENT, 'Test Item');

        expect(mockButton.setAttribute).toHaveBeenCalledWith('data-processing', 'true');
        expect(mockButton.setAttribute).toHaveBeenCalledWith('disabled', 'true');
        expect(mockServices.incrementItem).toHaveBeenCalledWith('test-inventory-id', 'Test Item');
      });

      it('should handle decrement action', async () => {
        await eventHandler['handleItemAction'](mockButton, ACTIONS.DECREMENT, 'Test Item');

        expect(mockServices.decrementItem).toHaveBeenCalledWith('test-inventory-id', 'Test Item');
      });

      it('should handle remove action with confirmation', async () => {
        vi.mocked(globalThis.confirm).mockReturnValue(true);

        await eventHandler['handleItemAction'](mockButton, ACTIONS.REMOVE, 'Test Item');

        expect(globalThis.confirm).toHaveBeenCalledWith('Remove Test Item from inventory?');
        expect(mockServices.removeItem).toHaveBeenCalledWith('test-inventory-id', 'Test Item');
      });

      it('should not remove item without confirmation', async () => {
        vi.mocked(globalThis.confirm).mockReturnValue(false);

        await eventHandler['handleItemAction'](mockButton, ACTIONS.REMOVE, 'Test Item');

        expect(mockServices.removeItem).not.toHaveBeenCalled();
      });

      it('should handle open edit modal action', async () => {
        await eventHandler['handleItemAction'](mockButton, ACTIONS.OPEN_EDIT_MODAL, 'Test Item');

        expect(mockModals.openEditModal).toHaveBeenCalledTimes(1);

        const calls = vi.mocked(mockModals.openEditModal).mock.calls[0];
        expect(calls[0]).toBe('Test Item');

        expect(typeof calls[1]).toBe('function');
        const getFreshDataCallback = calls[1];
        const result = getFreshDataCallback();
        expect(result).toEqual({ hass: mockHass, config: mockConfig });
      });

      it('should handle unknown action', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await eventHandler['handleItemAction'](mockButton, 'unknown', 'Test Item');

        expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown action: unknown');
        consoleWarnSpy.mockRestore();
      });

      it('should handle service errors gracefully', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(mockServices.incrementItem).mockRejectedValue(new Error('Service error'));

        await eventHandler['handleItemAction'](mockButton, ACTIONS.INCREMENT, 'Test Item');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error performing increment on Test Item:',
          expect.any(Error),
        );
        consoleErrorSpy.mockRestore();
      });

      it('should restore button state after action', async () => {
        await eventHandler['handleItemAction'](mockButton, ACTIONS.INCREMENT, 'Test Item');

        vi.advanceTimersByTime(200);

        expect(mockButton.removeAttribute).toHaveBeenCalledWith('disabled');
        // expect(mockButton.removeAttribute).toHaveBeenCalledWith('data-processing');
        expect(mockButton.style.opacity).toBe('1');
        expect(mockButton.style.pointerEvents).toBe('auto');
      });
    });

    describe('handleAddItem', () => {
      it('should close modal on successful add', async () => {
        vi.mocked(mockModals.addItem).mockResolvedValue(true);

        await eventHandler['handleAddItem']();

        expect(mockModals.addItem).toHaveBeenCalledWith(mockConfig);
        expect(mockModals.closeAddModal).toHaveBeenCalled();
      });

      it('should not close modal on failed add', async () => {
        vi.mocked(mockModals.addItem).mockResolvedValue(false);

        await eventHandler['handleAddItem']();

        expect(mockModals.addItem).toHaveBeenCalledWith(mockConfig);
        expect(mockModals.closeAddModal).not.toHaveBeenCalled();
      });
    });

    describe('handleSaveEdits', () => {
      it('should close modal on successful save', async () => {
        vi.mocked(mockModals.saveEditModal).mockResolvedValue(true);

        await eventHandler['handleSaveEdits']();

        expect(mockModals.saveEditModal).toHaveBeenCalledWith(mockConfig);
        expect(mockModals.closeEditModal).toHaveBeenCalled();
      });

      it('should not close modal on failed save', async () => {
        vi.mocked(mockModals.saveEditModal).mockResolvedValue(false);

        await eventHandler['handleSaveEdits']();

        expect(mockModals.saveEditModal).toHaveBeenCalledWith(mockConfig);
        expect(mockModals.closeEditModal).not.toHaveBeenCalled();
      });
    });

    describe('toggleAdvancedFilters', () => {
      it('should toggle advanced filters', () => {
        const filterData = {
          category: [''],
          expiry: '',
          location: [''],
          quantity: '',
          searchText: '',
          showAdvanced: false,
        };
        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);

        eventHandler['toggleAdvancedFilters']();

        expect(filterData.showAdvanced).toBe(true);
        expect(mockFilters.saveFilters).toHaveBeenCalledWith(mockConfig.entity, filterData);
        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('should handle errors gracefully', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(mockFilters.getCurrentFilters).mockImplementation(() => {
          throw new Error('Toggle error');
        });

        eventHandler['toggleAdvancedFilters']();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error toggling advanced filters:',
          expect.any(Error),
        );
        consoleErrorSpy.mockRestore();
      });
    });

    describe('clearFilters', () => {
      it('should clear filters and search input', () => {
        const mockSearchInput = document.createElement('input');
        mockSearchInput.value = 'test search';
        vi.mocked(mockRenderRoot.querySelector).mockReturnValue(mockSearchInput);

        eventHandler['clearFilters']();

        expect(mockFilters.clearFilters).toHaveBeenCalledWith(mockConfig.entity);
        expect(mockSearchInput.value).toBe('');
        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('should handle missing search input', () => {
        vi.mocked(mockRenderRoot.querySelector).mockReturnValue(null);

        eventHandler['clearFilters']();

        expect(mockFilters.clearFilters).toHaveBeenCalledWith(mockConfig.entity);
        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('should handle errors gracefully', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(mockFilters.clearFilters).mockImplementation(() => {
          throw new Error('Clear error');
        });

        eventHandler['clearFilters']();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing filters:', expect.any(Error));
        expect(globalThis.alert).toHaveBeenCalledWith('Error clearing filters. Please try again.');
        consoleErrorSpy.mockRestore();
      });
    });
  });
});
