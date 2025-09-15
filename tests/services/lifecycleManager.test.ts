import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LifecycleManager } from '../../src/services/lifecycleManager';
import { Services } from '../../src/services/services';
import { Modals } from '../../src/services/modals';
import { Filters } from '../../src/services/filters';
import { Renderer } from '../../src/services/renderer';
import { State } from '../../src/services/state';
import { EventHandler } from '../../src/services/eventHandler';
import { Utilities } from '../../src/utils/utilities';
import { HomeAssistant, InventoryConfig } from '../../src/types/homeAssistant';
import { createMockHomeAssistant } from '../testHelpers';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/services');
vi.mock('../../src/services/modals');
vi.mock('../../src/services/filters');
vi.mock('../../src/services/renderer');
vi.mock('../../src/services/state');
vi.mock('../../src/services/eventHandler');
vi.mock('../../src/utils/utilities');

describe('LifecycleManager', () => {
  let lifecycleManager: LifecycleManager;
  let mockConfig: InventoryConfig;
  let mockGetFreshStateCallback: () => { hass: HomeAssistant; config: InventoryConfig };
  let mockHass: HomeAssistant;
  let mockRefreshCallback: () => void;
  let mockRenderCallback: () => void;
  let mockRenderRoot: ShadowRoot;
  let mockTranslations: TranslationData;
  let mockUpdateItemsCallback: (items: any[], sortMethod: string) => void;

  let mockEventHandler: EventHandler;
  let mockFilters: Filters;
  let mockModals: Modals;
  let mockRenderer: Renderer;
  let mockServices: Services;
  let mockState: State;

  beforeEach(() => {
    mockRenderRoot = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    } as unknown as ShadowRoot;

    mockHass = createMockHomeAssistant();
    mockConfig = {
      type: 'inventory-card',
      entity: 'sensor.test_inventory',
    };

    mockTranslations = {
      items: {
        no_items: 'No items in inventory',
      },
    };

    mockRenderCallback = vi.fn();
    mockRefreshCallback = vi.fn();
    mockUpdateItemsCallback = vi.fn();
    mockGetFreshStateCallback = vi.fn(() => ({ hass: mockHass, config: mockConfig }));

    mockServices = {
      callService: vi.fn(),
    } as unknown as Services;

    mockModals = {
      destroy: vi.fn(),
    } as unknown as Modals;

    mockFilters = {} as unknown as Filters;
    mockRenderer = {} as unknown as Renderer;

    mockState = {
      setRenderCallback: vi.fn(),
      cleanup: vi.fn(),
    } as unknown as State;

    mockEventHandler = {
      updateDependencies: vi.fn(),
      cleanupEventListeners: vi.fn(),
    } as unknown as EventHandler;

    vi.mocked(EventHandler).mockImplementation(() => mockEventHandler);
    vi.mocked(Filters).mockImplementation(() => mockFilters);
    vi.mocked(Modals).mockImplementation(() => mockModals);
    vi.mocked(Renderer).mockImplementation(() => mockRenderer);
    vi.mocked(Services).mockImplementation(() => mockServices);
    vi.mocked(State).mockImplementation(() => mockState);
    vi.mocked(Utilities.getInventoryId).mockReturnValue('test-inventory-id');

    vi.clearAllMocks();
  });

  describe('Constructor and Singleton Pattern', () => {
    it('should create a new instance with renderRoot', () => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);

      expect(lifecycleManager['renderRoot']).toBe(mockRenderRoot);
      expect(lifecycleManager['isInitialized']).toBe(false);
      expect(lifecycleManager['services']).toBe(undefined);
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
    });

    it('should return existing services if already initialized', () => {
      // Initialize once
      const initialServices = lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      // Initialize again
      const secondServices = lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(initialServices).toBe(secondServices);
      expect(vi.mocked(Services)).toHaveBeenCalledTimes(1);
    });

    it('should return null if hass is missing', () => {
      const result = lifecycleManager.initialize(
        null as any,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(result).toBe(undefined);
      expect(lifecycleManager['isInitialized']).toBe(false);
    });

    it('should return null if config is missing', () => {
      const result = lifecycleManager.initialize(
        mockHass,
        null as any,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(result).toBe(undefined);
      expect(lifecycleManager['isInitialized']).toBe(false);
    });

    it('should return null if renderRoot is missing', () => {
      const lifecycleManagerWithoutRoot = new LifecycleManager(null as any);

      const result = lifecycleManagerWithoutRoot.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(result).toBe(undefined);
      expect(lifecycleManagerWithoutRoot['isInitialized']).toBe(false);
    });

    it('should create all services correctly', () => {
      const result = lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(vi.mocked(Services)).toHaveBeenCalledWith(mockHass);
      expect(vi.mocked(Filters)).toHaveBeenCalledWith(mockRenderRoot);
      expect(vi.mocked(Renderer)).toHaveBeenCalledWith(mockRenderRoot);
      expect(vi.mocked(State)).toHaveBeenCalled();
      expect(mockState.setRenderCallback).toHaveBeenCalledWith(mockRenderCallback);

      expect(result).toEqual({
        services: mockServices,
        modals: mockModals,
        filters: mockFilters,
        renderer: mockRenderer,
        state: mockState,
        eventHandler: mockEventHandler,
      });
    });

    it('should create modals with correct parameters', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(vi.mocked(Modals)).toHaveBeenCalledWith(
        mockRenderRoot,
        mockServices,
        expect.any(Function),
        mockRefreshCallback,
      );

      // Test the getInventoryId function passed to Modals
      const getInventoryIdFunction = vi.mocked(Modals).mock.calls[0][2];
      const testEntityId = 'sensor.test';
      getInventoryIdFunction(testEntityId);
      expect(Utilities.getInventoryId).toHaveBeenCalledWith(mockHass, testEntityId);
    });

    it('should create event handler with correct parameters', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(vi.mocked(EventHandler)).toHaveBeenCalledWith(
        mockRenderRoot,
        mockServices,
        mockModals,
        mockFilters,
        mockConfig,
        mockHass,
        mockRenderCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );
    });

    it('should set initialized state correctly', () => {
      const result = lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(lifecycleManager['isInitialized']).toBe(true);
      expect(lifecycleManager['services']).toBe(result);
    });

    it('should handle initialization errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      vi.mocked(Services).mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      const result = lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(result).toBe(undefined);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize modules:',
        expect.any(Error),
      );
      expect(lifecycleManager['isInitialized']).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateDependencies', () => {
    beforeEach(() => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
    });

    it('should update event handler dependencies when initialized', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      const newConfig = { ...mockConfig, entity: 'sensor.new_inventory' };
      const newHass = createMockHomeAssistant();

      lifecycleManager.updateDependencies(newHass, newConfig);

      expect(mockEventHandler.updateDependencies).toHaveBeenCalledWith(newConfig, newHass);
    });

    it('should not update dependencies when not initialized', () => {
      lifecycleManager.updateDependencies(mockHass, mockConfig);

      expect(mockEventHandler.updateDependencies).not.toHaveBeenCalled();
    });

    it('should not update dependencies when services is null', () => {
      lifecycleManager['isInitialized'] = true;
      lifecycleManager['services'] = undefined;

      lifecycleManager.updateDependencies(mockHass, mockConfig);

      expect(mockEventHandler.updateDependencies).not.toHaveBeenCalled();
    });
  });

  describe('getServices', () => {
    beforeEach(() => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
    });

    it('should return services when initialized', () => {
      const initializedServices = lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      const result = lifecycleManager.getServices();

      expect(result).toBe(initializedServices);
    });

    it('should return null when not initialized', () => {
      const result = lifecycleManager.getServices();

      expect(result).toBe(undefined);
    });

    it('should return null after cleanup', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      lifecycleManager.cleanup();

      const result = lifecycleManager.getServices();

      expect(result).toBe(undefined);
    });
  });

  describe('isReady', () => {
    beforeEach(() => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
    });

    it('should return true when initialized and services exist', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(lifecycleManager.isReady()).toBe(true);
    });

    it('should return false when not initialized', () => {
      expect(lifecycleManager.isReady()).toBe(false);
    });

    it('should return false when services is null', () => {
      lifecycleManager['isInitialized'] = true;
      lifecycleManager['services'] = undefined;

      expect(lifecycleManager.isReady()).toBe(false);
    });

    it('should return false after cleanup', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      lifecycleManager.cleanup();

      expect(lifecycleManager.isReady()).toBe(false);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
    });

    it('should cleanup all services when they exist', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      lifecycleManager.cleanup();

      expect(mockEventHandler.cleanupEventListeners).toHaveBeenCalled();
      expect(mockState.cleanup).toHaveBeenCalled();
      expect(mockModals.destroy).toHaveBeenCalled();
    });

    it('should handle cleanup when services is null', () => {
      expect(() => lifecycleManager.cleanup()).not.toThrow();
    });

    it('should handle missing service methods gracefully', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      // Remove some methods to test graceful handling
      lifecycleManager['services']!.eventHandler = null as any;
      lifecycleManager['services']!.state = null as any;
      lifecycleManager['services']!.modals = null as any;

      expect(() => lifecycleManager.cleanup()).not.toThrow();
    });

    it('should reset instance state after cleanup', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      lifecycleManager.cleanup();

      expect(lifecycleManager['services']).toBe(undefined);
      expect(lifecycleManager['isInitialized']).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
    });

    it('should handle service instantiation failures individually', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      vi.mocked(EventHandler).mockImplementation(() => {
        throw new Error('EventHandler failed');
      });

      const result = lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
        mockTranslations,
      );

      expect(result).toBe(undefined);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle undefined callbacks gracefully', () => {
      const result = lifecycleManager.initialize(
        mockHass,
        mockConfig,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        mockTranslations,
      );

      expect(result).toBeDefined();
      expect(mockState.setRenderCallback).toHaveBeenCalledWith(undefined);
    });
  });
});
