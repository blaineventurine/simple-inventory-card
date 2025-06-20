import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LifecycleManager } from '../../src/services/lifecycleManager';
import { Services } from '../../src/services/services';
import { Modals } from '../../src/services/modals';
import { Filters } from '../../src/services/filters';
import { Renderer } from '../../src/services/renderer';
import { State } from '../../src/services/state';
import { EventHandler } from '../../src/services/eventHandler';
import { Utils } from '../../src/utils/utils';
import { HomeAssistant, InventoryConfig } from '../../src/types/home-assistant';
import { createMockHomeAssistant } from '../testHelpers';

vi.mock('../../src/services/services');
vi.mock('../../src/services/modals');
vi.mock('../../src/services/filters');
vi.mock('../../src/services/renderer');
vi.mock('../../src/services/state');
vi.mock('../../src/services/eventHandler');
vi.mock('../../src/utils/utils');

describe('LifecycleManager', () => {
  let lifecycleManager: LifecycleManager;
  let mockRenderRoot: ShadowRoot;
  let mockHass: HomeAssistant;
  let mockConfig: InventoryConfig;
  let mockRenderCallback: () => void;
  let mockRefreshCallback: () => void;
  let mockUpdateItemsCallback: (items: any[], sortMethod: string) => void;
  let mockGetFreshStateCallback: () => { hass: HomeAssistant; config: InventoryConfig };

  let mockServices: Services;
  let mockModals: Modals;
  let mockFilters: Filters;
  let mockRenderer: Renderer;
  let mockState: State;
  let mockEventHandler: EventHandler;

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

    vi.mocked(Services).mockImplementation(() => mockServices);
    vi.mocked(Modals).mockImplementation(() => mockModals);
    vi.mocked(Filters).mockImplementation(() => mockFilters);
    vi.mocked(Renderer).mockImplementation(() => mockRenderer);
    vi.mocked(State).mockImplementation(() => mockState);
    vi.mocked(EventHandler).mockImplementation(() => mockEventHandler);
    vi.mocked(Utils.getInventoryId).mockReturnValue('test-inventory-id');

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up singleton instance after each test
    if ((LifecycleManager as any).currentInstance) {
      (LifecycleManager as any).currentInstance = null;
    }
  });

  describe('Constructor and Singleton Pattern', () => {
    it('should create a new instance with renderRoot', () => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);

      expect(lifecycleManager['renderRoot']).toBe(mockRenderRoot);
      expect(lifecycleManager['isInitialized']).toBe(false);
      expect(lifecycleManager['services']).toBe(null);
    });

    it('should set itself as current instance', () => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);

      expect((LifecycleManager as any).currentInstance).toBe(lifecycleManager);
    });

    it('should cleanup previous instance when creating new one', () => {
      const firstInstance = new LifecycleManager(mockRenderRoot);
      const firstCleanupSpy = vi.spyOn(firstInstance, 'cleanup');

      const secondInstance = new LifecycleManager(mockRenderRoot);

      expect(firstCleanupSpy).toHaveBeenCalled();
      expect((LifecycleManager as any).currentInstance).toBe(secondInstance);
    });

    it('should not cleanup self when creating same instance', () => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
      const cleanupSpy = vi.spyOn(lifecycleManager, 'cleanup');

      // Simulating the same instance being "recreated"
      (LifecycleManager as any).currentInstance = lifecycleManager;
      new LifecycleManager(mockRenderRoot);

      expect(cleanupSpy).toHaveBeenCalled();
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
      );

      // Initialize again
      const secondServices = lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
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
      );

      expect(result).toBe(null);
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
      );

      expect(result).toBe(null);
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
      );

      expect(result).toBe(null);
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
      expect(Utils.getInventoryId).toHaveBeenCalledWith(mockHass, testEntityId);
    });

    it('should create event handler with correct parameters', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
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
      );

      expect(lifecycleManager['isInitialized']).toBe(true);
      expect(lifecycleManager['services']).toBe(result);
    });

    it('should handle initialization errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
      );

      expect(result).toBe(null);
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
      lifecycleManager['services'] = null;

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
      );

      const result = lifecycleManager.getServices();

      expect(result).toBe(initializedServices);
    });

    it('should return null when not initialized', () => {
      const result = lifecycleManager.getServices();

      expect(result).toBe(null);
    });

    it('should return null after cleanup', () => {
      lifecycleManager.initialize(
        mockHass,
        mockConfig,
        mockRenderCallback,
        mockRefreshCallback,
        mockUpdateItemsCallback,
        mockGetFreshStateCallback,
      );

      lifecycleManager.cleanup();

      const result = lifecycleManager.getServices();

      expect(result).toBe(null);
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
      );

      expect(lifecycleManager.isReady()).toBe(true);
    });

    it('should return false when not initialized', () => {
      expect(lifecycleManager.isReady()).toBe(false);
    });

    it('should return false when services is null', () => {
      lifecycleManager['isInitialized'] = true;
      lifecycleManager['services'] = null;

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
      );

      lifecycleManager.cleanup();

      expect(lifecycleManager['services']).toBe(null);
      expect(lifecycleManager['isInitialized']).toBe(false);
    });

    it('should clear current instance reference when cleaning up current instance', () => {
      expect((LifecycleManager as any).currentInstance).toBe(lifecycleManager);

      lifecycleManager.cleanup();

      expect((LifecycleManager as any).currentInstance).toBe(null);
    });

    it('should not clear current instance reference when cleaning up non-current instance', () => {
      const anotherInstance = new LifecycleManager(mockRenderRoot);

      // Now lifecycleManager is no longer the current instance
      lifecycleManager.cleanup();

      expect((LifecycleManager as any).currentInstance).toBe(anotherInstance);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
    });

    it('should handle service instantiation failures individually', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
      );

      expect(result).toBe(null);
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
      );

      expect(result).toBeDefined();
      expect(mockState.setRenderCallback).toHaveBeenCalledWith(undefined);
    });
  });
});
