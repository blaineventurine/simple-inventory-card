import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenderingCoordinator } from '../../src/services/renderingCoordinator';
import { LifecycleManager } from '../../src/services/lifecycleManager';
import { Utilities } from '../../src/utils/utilities';
import { DEFAULTS } from '../../src/utils/constants';
import { HomeAssistant, InventoryConfig, InventoryItem } from '../../src/types/homeAssistant';
import { TranslationData } from '@/types/translatableComponent';
import { createMockHomeAssistant, createMockHassEntity } from '../testHelpers';

vi.mock('../../src/services/lifecycleManager');
vi.mock('../../src/utils/utilities');

vi.mock('../../src/templates/itemList', () => ({
  createItemsList: vi.fn().mockReturnValue('<div>mocked items list</div>'),
}));

describe('RenderingCoordinator', () => {
  let renderingCoordinator: RenderingCoordinator;
  let mockLifecycleManager: LifecycleManager;
  let mockRenderRoot: ShadowRoot;
  let mockHass: HomeAssistant;
  let mockConfig: InventoryConfig;
  let mockTodoLists: Array<{ id: string; name: string }>;
  let mockValidateItemsCallback: (items: InventoryItem[]) => InventoryItem[];
  let mockTranslations: TranslationData;

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

  let mockServices: any;

  beforeEach(() => {
    mockRenderRoot = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
      innerHTML: '',
    } as unknown as ShadowRoot;

    mockTranslations = {
      items: {
        no_items: 'No items in inventory',
      },
    };

    mockServices = {
      filters: {
        getCurrentFilters: vi.fn(),
        filterItems: vi.fn(),
        sortItems: vi.fn(),
        updateFilterIndicators: vi.fn(),
      },
      renderer: {
        renderCard: vi.fn(),
        renderError: vi.fn(),
      },
      eventHandler: {
        setupEventListeners: vi.fn(),
      },
      state: {
        trackUserInteraction: vi.fn(),
      },
    };

    mockLifecycleManager = {
      getServices: vi.fn().mockReturnValue(mockServices),
    } as unknown as LifecycleManager;

    mockHass = createMockHomeAssistant({
      'sensor.test_inventory': createMockHassEntity('sensor.test_inventory', {
        attributes: { items: mockInventoryItems },
      }),
    });

    mockConfig = {
      type: 'inventory-card',
      entity: 'sensor.test_inventory',
    };

    mockTodoLists = [
      { id: 'shopping', name: 'Shopping List' },
      { id: 'groceries', name: 'Groceries' },
    ];

    mockValidateItemsCallback = vi.fn().mockImplementation((items) => items);

    vi.mocked(Utilities.sanitizeHtml).mockImplementation((html) => html);
    vi.useFakeTimers();
    vi.clearAllMocks();

    renderingCoordinator = new RenderingCoordinator(mockLifecycleManager, mockRenderRoot);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should initialize with lifecycle manager and render root', () => {
      expect(renderingCoordinator['lifecycleManager']).toBe(mockLifecycleManager);
      expect(renderingCoordinator['renderRoot']).toBe(mockRenderRoot);
      expect(renderingCoordinator['updateTimeout']).toBe(undefined);
    });
  });

  describe('render', () => {
    beforeEach(() => {
      const mockFilters = {
        category: '',
        expiry: '',
        location: '',
        quantity: '',
        searchText: '',
        showAdvanced: false,
      };

      vi.mocked(mockServices.filters.getCurrentFilters).mockReturnValue(mockFilters);
      vi.mocked(mockServices.filters.filterItems).mockReturnValue(mockInventoryItems);
      vi.mocked(mockServices.filters.sortItems).mockReturnValue(mockInventoryItems);

      const mockSortSelect = document.createElement('select');
      mockSortSelect.value = 'name';
      vi.mocked(mockRenderRoot.querySelector).mockReturnValue(mockSortSelect);
    });

    it('should return early if config is missing', () => {
      renderingCoordinator.render(
        undefined as any,
        mockHass,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      expect(mockLifecycleManager.getServices).not.toHaveBeenCalled();
    });

    it('should return early if hass is missing', () => {
      renderingCoordinator.render(
        mockConfig,
        undefined as any,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      expect(mockLifecycleManager.getServices).not.toHaveBeenCalled();
    });

    it('should return early if renderRoot is missing', () => {
      const coordinatorWithoutRoot = new RenderingCoordinator(
        mockLifecycleManager,
        undefined as any,
      );

      coordinatorWithoutRoot.render(
        mockConfig,
        mockHass,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      expect(mockLifecycleManager.getServices).not.toHaveBeenCalled();
    });

    it('should render error if entity not found', () => {
      const configWithMissingEntity = {
        ...mockConfig,
        entity: 'sensor.nonexistent',
      };

      const renderErrorSpy = vi.spyOn(renderingCoordinator, 'renderError');

      renderingCoordinator.render(
        configWithMissingEntity,
        mockHass,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      expect(renderErrorSpy).toHaveBeenCalledWith(
        'Entity sensor.nonexistent not found. Please check your configuration.',
      );
    });

    it('should render error if services not available', () => {
      vi.mocked(mockLifecycleManager.getServices).mockReturnValue(undefined);
      const renderErrorSpy = vi.spyOn(renderingCoordinator, 'renderError');

      renderingCoordinator.render(
        mockConfig,
        mockHass,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      expect(renderErrorSpy).toHaveBeenCalledWith('Failed to initialize card components');
    });

    it('should successfully render card with all components', () => {
      renderingCoordinator.render(
        mockConfig,
        mockHass,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      const entityState = mockHass.states[mockConfig.entity];

      expect(mockValidateItemsCallback).toHaveBeenCalledWith(mockInventoryItems);
      expect(mockServices.filters.getCurrentFilters).toHaveBeenCalledWith(mockConfig.entity);
      expect(mockServices.filters.filterItems).toHaveBeenCalled();
      expect(mockServices.filters.sortItems).toHaveBeenCalled();
      expect(mockServices.renderer.renderCard).toHaveBeenCalledWith(
        entityState,
        mockConfig.entity,
        mockInventoryItems,
        expect.any(Object),
        'name',
        mockTodoLists,
        mockTranslations,
        mockConfig,
      );
      expect(mockServices.eventHandler.setupEventListeners).toHaveBeenCalled();
      expect(mockServices.filters.updateFilterIndicators).toHaveBeenCalled();
      expect(mockServices.state.trackUserInteraction).toHaveBeenCalledWith(mockRenderRoot);
    });

    it('should use default sort method when element not found', () => {
      vi.mocked(mockRenderRoot.querySelector).mockReturnValue(null);

      renderingCoordinator.render(
        mockConfig,
        mockHass,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      expect(mockServices.renderer.renderCard).toHaveBeenCalledWith(
        expect.any(Object),
        mockConfig.entity,
        mockInventoryItems,
        expect.any(Object),
        DEFAULTS.SORT_METHOD,
        mockTodoLists,
        mockTranslations,
        mockConfig,
      );
    });

    it('should handle empty items array', () => {
      const entityWithoutItems = createMockHassEntity('sensor.test_inventory', {
        attributes: {},
      });
      mockHass.states[mockConfig.entity] = entityWithoutItems;

      renderingCoordinator.render(
        mockConfig,
        mockHass,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      expect(mockValidateItemsCallback).toHaveBeenCalledWith([]);
    });

    it('should handle render errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const renderErrorSpy = vi.spyOn(renderingCoordinator, 'renderError');

      vi.mocked(mockServices.filters.getCurrentFilters).mockImplementation(() => {
        throw new Error('Filter error');
      });

      renderingCoordinator.render(
        mockConfig,
        mockHass,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error rendering card:', expect.any(Error));
      expect(renderErrorSpy).toHaveBeenCalledWith('An error occurred while rendering the card');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateItemsOnly', () => {
    it('should return early if renderRoot is missing', () => {
      const coordinatorWithoutRoot = new RenderingCoordinator(mockLifecycleManager, null as any);

      coordinatorWithoutRoot.updateItemsOnly(
        mockInventoryItems,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      expect(mockRenderRoot.querySelector).not.toHaveBeenCalled();
    });

    it('should return early if items container not found', () => {
      vi.mocked(mockRenderRoot.querySelector).mockReturnValue(null);

      renderingCoordinator.updateItemsOnly(
        mockInventoryItems,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      expect(mockRenderRoot.querySelector).toHaveBeenCalledWith('.items-container');
    });

    it('should successfully update items container', async () => {
      const mockContainer = document.createElement('div');
      vi.mocked(mockRenderRoot.querySelector).mockReturnValue(mockContainer);

      const { createItemsList } = await import('../../src/templates/itemList');

      renderingCoordinator.updateItemsOnly(
        mockInventoryItems,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      // Wait for the dynamic import to resolve
      await vi.waitFor(() => {
        expect(createItemsList).toHaveBeenCalledWith(
          mockInventoryItems,
          'name',
          mockTodoLists,
          mockTranslations,
          undefined,
        );
      });

      expect(mockContainer.innerHTML).toBe('<div>mocked items list</div>');
    });

    it('should handle dynamic import errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockContainer = document.createElement('div');
      vi.mocked(mockRenderRoot.querySelector).mockReturnValue(mockContainer);

      // Mock failed import
      vi.doMock('../../src/templates/itemList', () => {
        throw new Error('Import failed');
      });

      renderingCoordinator.updateItemsOnly(
        mockInventoryItems,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading templates:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('debouncedRender', () => {
    it('should set timeout for render callback', () => {
      const mockCallback = vi.fn();

      renderingCoordinator.debouncedRender(mockCallback);

      expect(renderingCoordinator['updateTimeout']).not.toBe(null);

      vi.advanceTimersByTime(100);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should clear existing timeout before setting new one', () => {
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();

      renderingCoordinator.debouncedRender(mockCallback1);
      const firstTimeout = renderingCoordinator['updateTimeout'];

      renderingCoordinator.debouncedRender(mockCallback2);
      const secondTimeout = renderingCoordinator['updateTimeout'];

      expect(firstTimeout).not.toBe(secondTimeout);

      vi.advanceTimersByTime(100);

      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalled();
    });
  });

  describe('refreshAfterSave', () => {
    it('should call render callback after 50ms', () => {
      const mockCallback = vi.fn();

      renderingCoordinator.refreshAfterSave(mockCallback);

      expect(mockCallback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('renderError', () => {
    it('should return early if renderRoot is missing', () => {
      const coordinatorWithoutRoot = new RenderingCoordinator(mockLifecycleManager, null as any);

      coordinatorWithoutRoot.renderError('Test error');

      expect(mockLifecycleManager.getServices).not.toHaveBeenCalled();
    });

    it('should use renderer service when available', () => {
      renderingCoordinator.renderError('Test error message');

      expect(mockServices.renderer.renderError).toHaveBeenCalledWith('Test error message');
    });

    it('should render error directly when renderer service not available', () => {
      vi.mocked(mockLifecycleManager.getServices).mockReturnValue(undefined);

      renderingCoordinator.renderError('Test error message');

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Test error message');
      expect((mockRenderRoot as any).innerHTML).toContain('Test error message');
      expect((mockRenderRoot as any).innerHTML).toContain('ha-card');
      expect((mockRenderRoot as any).innerHTML).toContain('error-message');
    });

    it('should render error directly when renderer not in services', () => {
      const servicesWithoutRenderer = {
        ...mockServices,
        renderer: undefined,
      };
      vi.mocked(mockLifecycleManager.getServices).mockReturnValue(servicesWithoutRenderer);

      renderingCoordinator.renderError('Test error message');

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Test error message');
      expect((mockRenderRoot as any).innerHTML).toContain('Test error message');
    });

    it('should sanitize error message in direct render', () => {
      vi.mocked(mockLifecycleManager.getServices).mockReturnValue(undefined);
      vi.mocked(Utilities.sanitizeHtml).mockReturnValue('&lt;script&gt;sanitized&lt;/script&gt;');

      renderingCoordinator.renderError('<script>malicious</script>');

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('<script>malicious</script>');
      expect((mockRenderRoot as any).innerHTML).toContain('&lt;script&gt;sanitized&lt;/script&gt;');
    });
  });

  describe('cleanup', () => {
    it('should clear timeout when it exists', () => {
      const mockCallback = vi.fn();
      renderingCoordinator.debouncedRender(mockCallback);

      expect(renderingCoordinator['updateTimeout']).not.toBe(undefined);

      renderingCoordinator.cleanup();

      expect(renderingCoordinator['updateTimeout']).toBe(undefined);

      vi.advanceTimersByTime(100);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle cleanup when no timeout exists', () => {
      expect(renderingCoordinator['updateTimeout']).toBe(undefined);

      expect(() => renderingCoordinator.cleanup()).not.toThrow();

      expect(renderingCoordinator['updateTimeout']).toBe(undefined);
    });

    it('should clear timeout multiple times safely', () => {
      const mockCallback = vi.fn();
      renderingCoordinator.debouncedRender(mockCallback);

      renderingCoordinator.cleanup();
      renderingCoordinator.cleanup();

      expect(renderingCoordinator['updateTimeout']).toBe(undefined);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing entity attributes gracefully', () => {
      const mockFilters = {
        category: '',
        expiry: '',
        location: '',
        quantity: '',
        searchText: '',
        showAdvanced: false,
      };

      vi.mocked(mockServices.filters.getCurrentFilters).mockReturnValue(mockFilters);

      const entityWithoutAttributes = createMockHassEntity('sensor.test_inventory', {});
      delete (entityWithoutAttributes as any).attributes;

      mockHass.states[mockConfig.entity] = entityWithoutAttributes;

      renderingCoordinator.render(
        mockConfig,
        mockHass,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      expect(mockValidateItemsCallback).toHaveBeenCalledWith([]);
    });

    it('should handle service method failures gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const renderErrorSpy = vi.spyOn(renderingCoordinator, 'renderError');

      vi.mocked(mockServices.renderer.renderCard).mockImplementation(() => {
        throw new Error('Render failed');
      });

      renderingCoordinator.render(
        mockConfig,
        mockHass,
        mockTodoLists,
        mockTranslations,
        mockValidateItemsCallback,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error rendering card:', expect.any(Error));
      expect(renderErrorSpy).toHaveBeenCalledWith('An error occurred while rendering the card');

      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed todo lists', () => {
      const malformedTodoLists = undefined as any;

      expect(() => {
        renderingCoordinator.render(
          mockConfig,
          mockHass,
          malformedTodoLists,
          mockTranslations,
          mockValidateItemsCallback,
        );
      }).not.toThrow();
    });
  });
});
