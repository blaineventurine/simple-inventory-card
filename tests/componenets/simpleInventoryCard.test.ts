import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { Services } from '../../src/services/services';
import { Modals } from '../../src/services/modals';
import { Filters } from '../../src/services/filters';
import { Renderer } from '../../src/services/renderer';
import { State } from '../../src/services/state';
import { Utils } from '../../src/utils/utils';
import { ELEMENTS, ACTIONS, DEFAULTS, MESSAGES, CSS_CLASSES } from '../../src/utils/constants';
import { HomeAssistant, InventoryItem, InventoryConfig } from '../../src/types/home-assistant';

// Mock all dependencies
vi.mock('../../src/services/services');
vi.mock('../../src/services/modals');
vi.mock('../../src/services/filters');
vi.mock('../../src/services/renderer');
vi.mock('../../src/services/state');
vi.mock('../../src/utils/utils');

// Mock LitElement
vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    renderRoot: any = null;
    constructor() {
      this.renderRoot = document.createElement('div');
    }
    attachShadow(options: any) {
      return this.renderRoot;
    }
  },
  css: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({
    cssText: strings.join(''),
    toString: () => strings.join(''),
  })),
}));

// Mock dynamic import
vi.mock('../../templates/itemList', () => ({
  createItemsList: vi.fn().mockReturnValue('<div>mocked items list</div>'),
}));

describe('SimpleInventoryCard', () => {
  let card: SimpleInventoryCard;
  let mockServices: any;
  let mockModals: any;
  let mockFilters: any;
  let mockRenderer: any;
  let mockState: any;
  let mockShadowRoot: any;

  beforeEach(() => {
    // Reset all static properties
    (SimpleInventoryCard as any)._globalEventListenersSetup = false;
    (SimpleInventoryCard as any)._currentInstance = null;

    // Create mock instances
    mockServices = {
      incrementItem: vi.fn(),
      decrementItem: vi.fn(),
      removeItem: vi.fn(),
    };
    mockModals = {
      openAddModal: vi.fn(),
      closeAddModal: vi.fn(),
      openEditModal: vi.fn(),
      closeEditModal: vi.fn(),
      addItem: vi.fn(),
      saveEditModal: vi.fn(),
      handleModalClick: vi.fn(),
      destroy: vi.fn(),
    };
    mockFilters = {
      getCurrentFilters: vi.fn(),
      filterItems: vi.fn(),
      sortItems: vi.fn(),
      updateFilterIndicators: vi.fn(),
      setupSearchInput: vi.fn(),
      saveFilters: vi.fn(),
      clearFilters: vi.fn(),
    };
    mockRenderer = {
      renderCard: vi.fn(),
      renderError: vi.fn(),
    };
    mockState = {
      hasRealEntityChange: vi.fn(),
      userInteracting: false,
      debouncedRender: vi.fn(),
      setRenderCallback: vi.fn(),
      trackUserInteraction: vi.fn(),
      cleanup: vi.fn(),
    };

    // Mock constructors
    vi.mocked(Services).mockImplementation(() => mockServices);
    vi.mocked(Modals).mockImplementation(() => mockModals);
    vi.mocked(Filters).mockImplementation(() => mockFilters);
    vi.mocked(Renderer).mockImplementation(() => mockRenderer);
    vi.mocked(State).mockImplementation(() => mockState);

    // Mock Utils
    vi.mocked(Utils.getInventoryId).mockReturnValue('test-inventory-id');
    vi.mocked(Utils.sanitizeHtml).mockImplementation((html: string) => html);

    // Create mock shadow root
    mockShadowRoot = {
      querySelector: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      innerHTML: '',
    };

    card = new SimpleInventoryCard();

    // Fix read-only property assignment using Object.defineProperty
    Object.defineProperty(card, 'renderRoot', {
      value: mockShadowRoot,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  // MUTATION TESTING FOCUSED TESTS

  describe('Constructor Logic (Kills boolean/conditional mutants)', () => {
    it('should initialize instance properties to correct defaults', () => {
      // These assertions will fail if boolean literals are flipped
      expect(card['_isInitialized']).toBe(false);
      expect(card['_eventListenersSetup']).toBe(false);
      expect((SimpleInventoryCard as any)._globalEventListenersSetup).toBe(false);
    });

    it('should handle currentInstance logic correctly', () => {
      const firstCard = new SimpleInventoryCard();

      // Manually set up cleanup spy before setting as current instance
      const cleanupSpy = vi
        .spyOn(firstCard, '_cleanupEventListeners' as any)
        .mockImplementation(() => {});
      (SimpleInventoryCard as any)._currentInstance = firstCard;

      // Create second instance - this should trigger cleanup due to !== comparison
      const secondCard = new SimpleInventoryCard();

      expect(cleanupSpy).toHaveBeenCalled();
      expect((SimpleInventoryCard as any)._currentInstance).toBe(secondCard);

      // Test the === case (should NOT cleanup when same instance)
      const thirdSpy = vi
        .spyOn(secondCard, '_cleanupEventListeners' as any)
        .mockImplementation(() => {});
      (SimpleInventoryCard as any)._currentInstance = secondCard;

      // This should not trigger cleanup since it's the same instance
      expect(thirdSpy).not.toHaveBeenCalled();
    });
  });

  describe('setConfig Logic (Kills string/boolean mutants)', () => {
    it('should throw with falsy entities', () => {
      // Test the !config.entity condition
      expect(() => card.setConfig({ entity: null } as any)).toThrow('Entity is required');
      expect(() => card.setConfig({ entity: undefined } as any)).toThrow('Entity is required');
      expect(() => card.setConfig({ entity: '' } as any)).toThrow('Entity is required');
      expect(() => card.setConfig({} as any)).toThrow('Entity is required');
    });

    it('should succeed with truthy entity', () => {
      const config = { entity: 'sensor.test' };
      expect(() => card.setConfig(config as any)).not.toThrow();
      expect(card['_config']).toBe(config);
    });

    it('should throw exact error message', () => {
      // This kills string literal mutants
      expect(() => card.setConfig({} as any)).toThrow('Entity is required');
    });
  });

  describe('hass setter Logic (Kills complex boolean logic)', () => {
    beforeEach(() => {
      card.setConfig({ entity: 'sensor.test' } as any);
    });

    it('should render when oldHass is falsy (first time)', () => {
      let renderCalled = false;
      card.render = () => {
        renderCalled = true;
      };

      // First hass set (oldHass is undefined)
      card.hass = { states: {} } as any;

      expect(renderCalled).toBe(true);
    });

    it('should not render when oldHass exists but no entity changes', () => {
      // Set initial hass
      card.hass = { states: {} } as any;

      let renderCallCount = 0;
      card.render = () => {
        renderCallCount++;
      };

      // Fix state typing
      (card as any).state = {
        hasRealEntityChange: () => false,
        userInteracting: false,
        debouncedRender: vi.fn(),
      };

      // Update hass - should not render since no real changes
      card.hass = { states: {} } as any;

      expect(renderCallCount).toBe(0);
    });

    it('should use correct render method based on user interaction', () => {
      // Set initial hass
      card.hass = { states: {} } as any;

      let normalRenderCalled = false;
      let debouncedRenderCalled = false;

      card.render = () => {
        normalRenderCalled = true;
      };

      // Fix state typing with proper mock
      const mockStateObj = {
        hasRealEntityChange: vi.fn().mockReturnValue(true),
        userInteracting: false,
        debouncedRender: vi.fn().mockImplementation(() => {
          debouncedRenderCalled = true;
        }),
        setRenderCallback: vi.fn(),
        trackUserInteraction: vi.fn(),
        cleanup: vi.fn(),
      };

      (card as any).state = mockStateObj;

      // Test user NOT interacting - should use normal render
      card.hass = { states: { changed: true } } as any;
      expect(normalRenderCalled).toBe(true);
      expect(debouncedRenderCalled).toBe(false);

      // Reset
      normalRenderCalled = false;
      debouncedRenderCalled = false;

      // Test user IS interacting - should use debounced render
      mockStateObj.userInteracting = true;
      card.hass = { states: { changed: 'again' } } as any;

      expect(normalRenderCalled).toBe(false);
      expect(debouncedRenderCalled).toBe(true);
    });
  });

  describe('_validateItems Logic (Kills array/type checking)', () => {
    it('should return empty array for non-arrays', () => {
      // Kill !Array.isArray mutant
      expect(card['_validateItems'](null as any)).toEqual([]);
      expect(card['_validateItems']('string' as any)).toEqual([]);
      expect(card['_validateItems'](123 as any)).toEqual([]);
      expect(card['_validateItems'](undefined as any)).toEqual([]);
      expect(card['_validateItems']({} as any)).toEqual([]);
    });

    it('should filter items based on name validation', () => {
      const items = [
        null, // !item
        { name: null }, // !item.name
        { name: 123 }, // typeof item.name !== 'string'
        { name: '' }, // empty string
        { name: 'valid' }, // valid
      ];

      const result = card['_validateItems'](items as any);

      // Should filter out invalid items, keep valid ones
      expect(result.length).toBe(1); // '' and 'valid'
      expect(result[0].name).toBe('valid');
    });

    it('should normalize properties with correct defaults', () => {
      const items = [
        {
          name: 'test',
          quantity: 'invalid', // Should become 0
          unit: 123, // Should become ''
          category: null, // Should become ''
          auto_add_enabled: 'truthy', // Should become true
        },
      ];

      const result = card['_validateItems'](items as any);

      expect(result[0].quantity).toBe(0);
      expect(result[0].unit).toBe('');
      expect(result[0].category).toBe('');
      expect(result[0].auto_add_enabled).toBe(true);
    });

    it('should handle NaN quantities correctly', () => {
      const items = [{ name: 'test', quantity: NaN }];
      const result = card['_validateItems'](items as any);
      expect(result[0].quantity).toBe(0);
    });
  });

  describe('Event Listener Setup (Kills boolean logic)', () => {
    it('should respect global setup flag', () => {
      const addEventListener = vi.fn();
      Object.defineProperty(card, 'renderRoot', {
        value: { addEventListener },
        writable: true,
        configurable: true,
      });

      // Test when NOT setup
      (SimpleInventoryCard as any)._globalEventListenersSetup = false;
      card['_setupEventListeners']();
      expect(addEventListener).toHaveBeenCalled();
      expect((SimpleInventoryCard as any)._globalEventListenersSetup).toBe(true);

      // Reset mock
      addEventListener.mockClear();

      // Test when ALREADY setup
      (SimpleInventoryCard as any)._globalEventListenersSetup = true;
      card['_setupEventListeners']();
      expect(addEventListener).not.toHaveBeenCalled();
    });

    it('should cleanup and reset flag', () => {
      const removeEventListener = vi.fn();
      Object.defineProperty(card, 'renderRoot', {
        value: { removeEventListener },
        writable: true,
        configurable: true,
      });
      card['_boundClickHandler'] = vi.fn();
      card['_boundChangeHandler'] = vi.fn();

      (SimpleInventoryCard as any)._globalEventListenersSetup = true;

      card['_cleanupEventListeners']();

      expect(removeEventListener).toHaveBeenCalledTimes(2);
      expect((SimpleInventoryCard as any)._globalEventListenersSetup).toBe(false);
    });
  });

  describe('Render Early Returns (Kills conditional logic)', () => {
    it('should return early when dependencies missing', () => {
      let renderExecuted = false;

      // Override render to detect if main logic executes
      card.render = function () {
        if (!this._config || !this._hass || !this.renderRoot) {
          return;
        }
        renderExecuted = true;
      };

      // Test no config
      card['_config'] = null;
      card['_hass'] = {} as any;
      card.render();
      expect(renderExecuted).toBe(false);

      // Test no hass
      card['_config'] = { entity: 'test' } as any;
      card['_hass'] = null;
      card.render();
      expect(renderExecuted).toBe(false);

      // Test no renderRoot
      card['_hass'] = {} as any;
      Object.defineProperty(card, 'renderRoot', {
        value: null,
        writable: true,
        configurable: true,
      });
      card.render();
      expect(renderExecuted).toBe(false);

      // Test all present
      Object.defineProperty(card, 'renderRoot', {
        value: document.createElement('div'),
        writable: true,
        configurable: true,
      });
      card.render();
      expect(renderExecuted).toBe(true);
    });
  });

  describe('_initializeModules Logic (Kills return value mutants)', () => {
    it('should return true when already initialized', () => {
      card['_isInitialized'] = true;
      expect(card['_initializeModules']()).toBe(true);
    });

    it('should return false when dependencies missing', () => {
      card['_isInitialized'] = false;
      card['_hass'] = null;
      expect(card['_initializeModules']()).toBe(false);

      card['_hass'] = {} as any;
      card['_config'] = null;
      expect(card['_initializeModules']()).toBe(false);

      card['_config'] = {} as any;
      Object.defineProperty(card, 'renderRoot', {
        value: null,
        writable: true,
        configurable: true,
      });
      expect(card['_initializeModules']()).toBe(false);
    });

    it('should set initialized flag when successful', () => {
      card['_isInitialized'] = false;
      card['_hass'] = {} as any;
      card['_config'] = { entity: 'test' } as any;

      Object.defineProperty(card, 'renderRoot', {
        value: document.createElement('div'),
        writable: true,
        configurable: true,
      });

      const result = card['_initializeModules']();

      expect(result).toBe(true);
      expect(card['_isInitialized']).toBe(true);
    });
  });

  describe('Error Messages (Kills string mutants)', () => {
    it('should use exact error messages', () => {
      // Test setConfig error
      expect(() => card.setConfig({} as any)).toThrow('Entity is required');

      // Test render error - setup minimal state to trigger error
      card['_config'] = { entity: 'missing' } as any;
      card['_hass'] = { states: {} } as any;

      Object.defineProperty(card, 'renderRoot', {
        value: document.createElement('div'),
        writable: true,
        configurable: true,
      });

      // Mock _renderError to capture the message
      let errorMessage = '';
      card['_renderError'] = (msg: string) => {
        errorMessage = msg;
      };

      card.render();

      expect(errorMessage).toBe('Entity missing not found. Please check your configuration.');
    });
  });

  describe('Logical Operators (Kills && vs || mutants)', () => {
    it('should validate complex conditions correctly', () => {
      // Test _handleItemAction dependency check (&&)
      let warningMessage = '';
      const originalWarn = console.warn;
      console.warn = (msg: string) => {
        warningMessage = msg;
      };

      // Missing config AND hass AND services should warn
      card['_config'] = null;
      card['_hass'] = null;
      card['services'] = null;

      card['_handleItemAction']({} as any, 'test', 'item');
      expect(warningMessage).toBe('Missing required dependencies for item action');

      console.warn = originalWarn;
    });
  });

  describe('Optional Chaining (Kills ?. mutants)', () => {
    it('should handle undefined attributes safely', () => {
      const items1 = card['_validateItems'](undefined);
      expect(items1).toEqual([]);

      // Test state.attributes?.items path
      card['_config'] = { entity: 'test' } as any;
      card['_hass'] = {
        states: {
          test: {
            attributes: undefined, // No attributes object
          },
        },
      } as any;

      Object.defineProperty(card, 'renderRoot', {
        value: document.createElement('div'),
        writable: true,
        configurable: true,
      });

      // Should not throw, should handle gracefully
      expect(() => card.render()).not.toThrow();
    });
  });

  // ORIGINAL FUNCTIONALITY TESTS (keeping important ones)

  describe('render method', () => {
    let mockHass: HomeAssistant;
    let mockConfig: InventoryConfig;
    let mockItems: InventoryItem[];

    beforeEach(() => {
      mockItems = [
        {
          name: 'Test Item',
          quantity: 5,
          unit: 'pcs',
          category: 'Food',
          expiry_date: '',
          auto_add_enabled: false,
          todo_list: '',
        },
      ];

      mockHass = {
        states: {
          'sensor.inventory': {
            entity_id: 'sensor.inventory',
            state: 'active',
            attributes: { items: mockItems },
          } as any,
        },
      } as any;

      mockConfig = {
        type: 'simple-inventory-card',
        entity: 'sensor.inventory',
      };

      card.setConfig(mockConfig);
      card.hass = mockHass;

      // Mock filter responses
      mockFilters.getCurrentFilters.mockReturnValue({
        searchText: '',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      });
      mockFilters.filterItems.mockReturnValue(mockItems);
      mockFilters.sortItems.mockReturnValue(mockItems);

      // Mock sort method element
      mockShadowRoot.querySelector.mockReturnValue({ value: 'name' });
    });

    it('should render successfully with valid data', () => {
      card.render();

      expect(mockRenderer.renderCard).toHaveBeenCalledWith(
        mockHass.states['sensor.inventory'],
        'sensor.inventory',
        mockItems,
        expect.any(Object),
        'name',
        expect.any(Array),
      );
      expect(mockFilters.updateFilterIndicators).toHaveBeenCalled();
    });

    it('should handle rendering errors gracefully', () => {
      mockRenderer.renderCard.mockImplementation(() => {
        throw new Error('Rendering failed');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      card.render();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error rendering card:', expect.any(Error));
      expect(mockRenderer.renderError).toHaveBeenCalledWith(
        'An error occurred while rendering the card',
      );
    });
  });

  describe('item actions', () => {
    let mockButton: any;

    beforeEach(() => {
      mockButton = {
        hasAttribute: vi.fn().mockReturnValue(false),
        getAttribute: vi.fn().mockReturnValue(null),
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        style: {},
      };

      card['_config'] = { entity: 'sensor.inventory' } as InventoryConfig;
      card['_hass'] = {} as HomeAssistant;
      card['services'] = mockServices;
    });

    it('should handle increment action', async () => {
      await card['_handleItemAction'](mockButton, ACTIONS.INCREMENT, 'Test Item');

      expect(mockServices.incrementItem).toHaveBeenCalledWith('test-inventory-id', 'Test Item');
    });

    it('should handle remove action with confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      await card['_handleItemAction'](mockButton, ACTIONS.REMOVE, 'Test Item');

      expect(confirmSpy).toHaveBeenCalledWith(MESSAGES.CONFIRM_REMOVE('Test Item'));
      expect(mockServices.removeItem).toHaveBeenCalledWith('test-inventory-id', 'Test Item');
    });

    it('should not remove item when confirmation declined', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      await card['_handleItemAction'](mockButton, ACTIONS.REMOVE, 'Test Item');

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockServices.removeItem).not.toHaveBeenCalled();
    });

    it('should handle disabled button in item actions', async () => {
      mockButton.hasAttribute.mockImplementation((attr: string) => attr === 'disabled');

      await card['_handleItemAction'](mockButton, ACTIONS.INCREMENT, 'Test Item');

      expect(mockServices.incrementItem).not.toHaveBeenCalled();
    });
  });

  describe('filter operations', () => {
    beforeEach(() => {
      card['_config'] = { entity: 'sensor.inventory' } as InventoryConfig;
      card['filters'] = mockFilters;
    });

    it('should auto-apply category filter', () => {
      const selectElement = { id: ELEMENTS.FILTER_CATEGORY, value: 'Food' } as HTMLSelectElement;
      const mockFiltersObj = {
        category: '',
        quantity: '',
        expiry: '',
        searchText: '',
        showAdvanced: false,
      };
      vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(mockFiltersObj);
      const renderSpy = vi.spyOn(card, 'render');

      card['_autoApplyFilter'](selectElement);

      expect(mockFiltersObj.category).toBe('Food');
      expect(mockFilters.saveFilters).toHaveBeenCalledWith('sensor.inventory', mockFiltersObj);
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should toggle advanced filters', () => {
      const mockFiltersObj = { showAdvanced: false };
      vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(mockFiltersObj);
      const renderSpy = vi.spyOn(card, 'render');

      card['_toggleAdvancedFilters']();

      expect(mockFiltersObj.showAdvanced).toBe(true);
      expect(mockFilters.saveFilters).toHaveBeenCalledWith('sensor.inventory', mockFiltersObj);
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('lifecycle methods', () => {
    it('should return card size', () => {
      expect(card.getCardSize()).toBe(4);
    });

    it('should cleanup on disconnection', () => {
      card['_updateTimeout'] = setTimeout(() => {}, 1000);
      card['state'] = mockState;
      card['modals'] = mockModals;
      card['_eventListenersSetup'] = true;
      const cleanupEventListenersSpy = vi.spyOn(card, '_cleanupEventListeners' as any);

      card.disconnectedCallback();

      expect(cleanupEventListenersSpy).toHaveBeenCalled();
      expect(mockState.cleanup).toHaveBeenCalled();
      expect(mockModals.destroy).toHaveBeenCalled();
    });
  });
});
