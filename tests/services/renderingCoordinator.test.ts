import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenderingCoordinator } from '../../src/services/renderingCoordinator';
import { LifecycleManager } from '../../src/services/lifecycleManager';
import { Utilities } from '../../src/utils/utilities';
import { DEFAULTS } from '../../src/utils/constants';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryConfig, InventoryItem } from '../../src/types/inventory';
import { TranslationData } from '@/types/translatableComponent';
import { createMockHomeAssistant, createMockHassEntity } from '../testHelpers';
import { ImageLoader } from '../../src/services/imageLoader';
import { Capabilities, CardContext, NO_CAPABILITIES } from '../../src/types/cardContext';

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

  const context = (
    overrides: Partial<CardContext> = {},
    capabilities: Partial<Capabilities> = {},
  ): CardContext => ({
    hass: mockHass,
    config: mockConfig,
    translations: mockTranslations,
    items: mockInventoryItems,
    capabilities: { ...NO_CAPABILITIES, ...capabilities },
    ...overrides,
  });

  beforeEach(() => {
    mockRenderRoot = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
      innerHTML: '',
      host: document.createElement('div'),
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
        cardReplaced: vi.fn(),
        rowsReplaced: vi.fn(),
      },
      state: {
        trackUserInteraction: vi.fn(),
        expandedBatchItems: new Set<string>(),
      },
      detailView: {
        render: vi.fn(),
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
    });
  });

  describe('render', () => {
    it('passes the batches flag and the expanded rows to the renderer', () => {
      mockServices.state.expandedBatchItems.add('Test Item');

      renderingCoordinator.render(
        context({}, { batches: true }),
        mockTodoLists,
        mockValidateItemsCallback,
      );

      expect(mockServices.renderer.renderCard).toHaveBeenCalledWith(
        expect.any(Object),
        mockConfig.entity,
        mockInventoryItems,
        mockInventoryItems,
        expect.any(Object),
        'name',
        mockTodoLists,
        mockTranslations,
        mockConfig,
        {
          batches: true,
          expanded: new Set(['Test Item']),
          transfers: false,
          layout: 'list',
          formatValue: expect.any(Function),
        },
        false,
      );
    });

    it('passes the image loader to the renderer and loads the rendered images (item_images)', () => {
      const imageLoader = new ImageLoader(vi.fn<(path: string) => Promise<Blob>>());
      mockServices.imageLoader = imageLoader;
      vi.mocked(mockRenderRoot.querySelectorAll).mockReturnValue(
        document.createDocumentFragment().querySelectorAll('img'),
      );

      renderingCoordinator.render(
        context({}, { batches: true, itemImages: true }),
        mockTodoLists,
        mockValidateItemsCallback,
      );

      expect(mockServices.renderer.renderCard).toHaveBeenCalledWith(
        expect.any(Object),
        mockConfig.entity,
        mockInventoryItems,
        mockInventoryItems,
        expect.any(Object),
        'name',
        mockTodoLists,
        mockTranslations,
        mockConfig,
        {
          batches: true,
          expanded: mockServices.state.expandedBatchItems,
          transfers: false,
          layout: 'list',
          images: imageLoader,
          tileImages: false,
          formatValue: expect.any(Function),
        },
        false,
      );
      expect(mockRenderRoot.querySelectorAll).toHaveBeenCalledWith('img[data-image-path]');
      expect(mockServices.renderer.renderError).not.toHaveBeenCalled();
    });

    it('passes no image loader without item_images', () => {
      mockServices.imageLoader = new ImageLoader(vi.fn<(path: string) => Promise<Blob>>());

      renderingCoordinator.render(
        context({}, { batches: true }),
        mockTodoLists,
        mockValidateItemsCallback,
      );

      expect(vi.mocked(mockServices.renderer.renderCard).mock.calls[0][9]).not.toHaveProperty(
        'images',
      );
      expect(mockRenderRoot.querySelectorAll).not.toHaveBeenCalled();
    });

    it('passes tile_images along with the image loader', () => {
      mockServices.imageLoader = new ImageLoader(vi.fn<(path: string) => Promise<Blob>>());
      vi.mocked(mockRenderRoot.querySelectorAll).mockReturnValue(
        document.createDocumentFragment().querySelectorAll('img'),
      );

      renderingCoordinator.render(
        context({}, { itemImages: true, tileImages: true }),
        mockTodoLists,
        mockValidateItemsCallback,
      );

      expect(vi.mocked(mockServices.renderer.renderCard).mock.calls[0][9]).toHaveProperty(
        'tileImages',
        true,
      );
    });

    it('passes the transfers flag to the renderer', () => {
      renderingCoordinator.render(
        context({}, { batches: true, transfers: true }),
        mockTodoLists,
        mockValidateItemsCallback,
      );

      expect(mockServices.renderer.renderCard).toHaveBeenCalledWith(
        expect.any(Object),
        mockConfig.entity,
        mockInventoryItems,
        mockInventoryItems,
        expect.any(Object),
        'name',
        mockTodoLists,
        mockTranslations,
        mockConfig,
        {
          batches: true,
          expanded: mockServices.state.expandedBatchItems,
          transfers: true,
          layout: 'list',
          formatValue: expect.any(Function),
        },
        false,
      );
    });

    it('passes the item icons flag to the renderer', () => {
      renderingCoordinator.render(
        context({}, { batches: true, transfers: true, itemIcons: true }),
        mockTodoLists,
        mockValidateItemsCallback,
      );

      expect(mockServices.renderer.renderCard).toHaveBeenLastCalledWith(
        expect.any(Object),
        mockConfig.entity,
        mockInventoryItems,
        mockInventoryItems,
        expect.any(Object),
        'name',
        mockTodoLists,
        mockTranslations,
        mockConfig,
        {
          batches: true,
          expanded: mockServices.state.expandedBatchItems,
          transfers: true,
          layout: 'list',
          formatValue: expect.any(Function),
        },
        true,
      );
    });

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
    });

    it('should return early if config is missing', () => {
      renderingCoordinator.render(
        context({ config: undefined as any, items: [] }),
        mockTodoLists,
        mockValidateItemsCallback,
      );

      expect(mockLifecycleManager.getServices).not.toHaveBeenCalled();
    });

    it('should return early if hass is missing', () => {
      renderingCoordinator.render(
        context({ hass: undefined as any, items: [] }),
        mockTodoLists,
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
        context({ items: [] }),
        mockTodoLists,
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
        context({ config: configWithMissingEntity, items: [] }),
        mockTodoLists,
        mockValidateItemsCallback,
      );

      expect(renderErrorSpy).toHaveBeenCalledWith(
        'Entity sensor.nonexistent not found. Please check your configuration.',
        configWithMissingEntity,
      );
    });

    it('should render error if services not available', () => {
      vi.mocked(mockLifecycleManager.getServices).mockReturnValue(undefined);
      const renderErrorSpy = vi.spyOn(renderingCoordinator, 'renderError');

      renderingCoordinator.render(context({ items: [] }), mockTodoLists, mockValidateItemsCallback);

      expect(renderErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize card components',
        mockConfig,
      );
    });

    it('should successfully render card with all components', () => {
      renderingCoordinator.render(context(), mockTodoLists, mockValidateItemsCallback);

      const entityState = mockHass.states[mockConfig.entity];

      expect(mockValidateItemsCallback).toHaveBeenCalledWith(mockInventoryItems);
      expect(mockServices.filters.getCurrentFilters).toHaveBeenCalledWith(mockConfig.entity);
      expect(mockServices.filters.filterItems).toHaveBeenCalled();
      expect(mockServices.filters.sortItems).toHaveBeenCalled();
      expect(mockServices.renderer.renderCard).toHaveBeenCalledWith(
        entityState,
        mockConfig.entity,
        mockInventoryItems,
        mockInventoryItems,
        expect.any(Object),
        'name',
        mockTodoLists,
        mockTranslations,
        mockConfig,
        {
          batches: false,
          expanded: mockServices.state.expandedBatchItems,
          transfers: false,
          layout: 'list',
          formatValue: expect.any(Function),
        },
        false,
      );
      expect(mockServices.eventHandler.setupEventListeners).toHaveBeenCalled();
      // The replaced card's open forms and scan panel release their holds.
      expect(mockServices.eventHandler.cardReplaced).toHaveBeenCalled();
      expect(mockServices.filters.updateFilterIndicators).toHaveBeenCalled();
      expect(mockServices.state.trackUserInteraction).toHaveBeenCalledWith(mockRenderRoot);
    });

    it('should use default sort method when filters have no sortMethod', () => {
      // sortMethod comes from currentFilters.sortMethod; if absent, falls back to DEFAULTS.SORT_METHOD
      renderingCoordinator.render(context({ items: [] }), mockTodoLists, mockValidateItemsCallback);

      expect(mockServices.renderer.renderCard).toHaveBeenCalledWith(
        expect.any(Object),
        mockConfig.entity,
        mockInventoryItems,
        [],
        expect.any(Object),
        DEFAULTS.SORT_METHOD,
        mockTodoLists,
        mockTranslations,
        mockConfig,
        {
          batches: false,
          expanded: mockServices.state.expandedBatchItems,
          transfers: false,
          layout: 'list',
          formatValue: expect.any(Function),
        },
        false,
      );
    });

    it('passes the filtered list for the rows and every item for header and filter options', () => {
      const visible = [mockInventoryItems[0]];
      const allItems = [...mockInventoryItems, { ...mockInventoryItems[0], name: 'Hidden' }];
      vi.mocked(mockServices.filters.filterItems).mockReturnValue(visible);
      vi.mocked(mockServices.filters.sortItems).mockImplementation(
        (items: InventoryItem[]) => items,
      );

      renderingCoordinator.render(
        context({ items: allItems }),
        mockTodoLists,
        mockValidateItemsCallback,
      );

      const call = vi.mocked(mockServices.renderer.renderCard).mock.lastCall;
      expect(call?.[2]).toEqual(visible);
      expect(call?.[3]).toEqual(allItems);
    });

    it('should handle empty items array', () => {
      const entityWithoutItems = createMockHassEntity('sensor.test_inventory', {
        attributes: {},
      });
      mockHass.states[mockConfig.entity] = entityWithoutItems;

      renderingCoordinator.render(context({ items: [] }), mockTodoLists, mockValidateItemsCallback);

      expect(mockValidateItemsCallback).toHaveBeenCalledWith([]);
    });

    it('should handle render errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const renderErrorSpy = vi.spyOn(renderingCoordinator, 'renderError');

      vi.mocked(mockServices.filters.getCurrentFilters).mockImplementation(() => {
        throw new Error('Filter error');
      });

      renderingCoordinator.render(context({ items: [] }), mockTodoLists, mockValidateItemsCallback);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error rendering card:', expect.any(Error));
      expect(renderErrorSpy).toHaveBeenCalledWith(
        'An error occurred while rendering the card',
        mockConfig,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateItemsOnly', () => {
    it('renders rows with the row options when batches are enabled', async () => {
      const mockContainer = document.createElement('div');
      vi.mocked(mockRenderRoot.querySelector).mockReturnValue(mockContainer);
      const { createItemsList } = await import('../../src/templates/itemList');
      mockServices.state.expandedBatchItems.add('Test Item');

      renderingCoordinator.updateItemsOnly(
        context({}, { batches: true }),
        mockInventoryItems,
        'name',
        mockTodoLists,
      );

      await vi.waitFor(() => {
        expect(createItemsList).toHaveBeenCalledWith(
          mockInventoryItems,
          'name',
          mockTodoLists,
          mockTranslations,
          mockConfig,
          {
            batches: true,
            expanded: new Set(['Test Item']),
            transfers: false,
            layout: 'list',
            formatValue: expect.any(Function),
          },
        );
      });
      // The re-listed rows' forms are gone: their holds are released.
      expect(mockServices.eventHandler.rowsReplaced).toHaveBeenCalled();
    });

    it('renders rows with the transfers flag', async () => {
      const mockContainer = document.createElement('div');
      vi.mocked(mockRenderRoot.querySelector).mockReturnValue(mockContainer);
      const { createItemsList } = await import('../../src/templates/itemList');

      renderingCoordinator.updateItemsOnly(
        context({}, { batches: true, transfers: true }),
        mockInventoryItems,
        'name',
        mockTodoLists,
      );

      await vi.waitFor(() => {
        expect(createItemsList).toHaveBeenCalledWith(
          mockInventoryItems,
          'name',
          mockTodoLists,
          mockTranslations,
          mockConfig,
          {
            batches: true,
            expanded: mockServices.state.expandedBatchItems,
            transfers: true,
            layout: 'list',
            formatValue: expect.any(Function),
          },
        );
      });
    });

    it('renders rows with the image loader and loads their images (item_images)', async () => {
      const mockContainer = document.createElement('div');
      vi.mocked(mockRenderRoot.querySelector).mockReturnValue(mockContainer);
      const { createItemsList } = await import('../../src/templates/itemList');
      vi.mocked(createItemsList).mockReturnValueOnce(
        '<img alt="" data-image-path="/api/simple_inventory/image/a?thumb=1&amp;v=1">',
      );
      const fetchBlob = vi.fn<(path: string) => Promise<Blob>>(() =>
        Promise.reject(new Error('offline')),
      );
      const imageLoader = new ImageLoader(fetchBlob);
      mockServices.imageLoader = imageLoader;

      renderingCoordinator.updateItemsOnly(
        context({}, { batches: true, itemImages: true }),
        mockInventoryItems,
        'name',
        mockTodoLists,
      );

      await vi.waitFor(() => {
        expect(createItemsList).toHaveBeenCalledWith(
          mockInventoryItems,
          'name',
          mockTodoLists,
          mockTranslations,
          mockConfig,
          {
            batches: true,
            expanded: mockServices.state.expandedBatchItems,
            transfers: false,
            layout: 'list',
            images: imageLoader,
            tileImages: false,
            formatValue: expect.any(Function),
          },
        );
        expect(fetchBlob).toHaveBeenCalledWith('/api/simple_inventory/image/a?thumb=1&v=1');
      });
    });

    it('should return early if renderRoot is missing', () => {
      const coordinatorWithoutRoot = new RenderingCoordinator(mockLifecycleManager, null as any);

      coordinatorWithoutRoot.updateItemsOnly(context(), mockInventoryItems, 'name', mockTodoLists);

      expect(mockRenderRoot.querySelector).not.toHaveBeenCalled();
    });

    it('should return early if items container not found', () => {
      vi.mocked(mockRenderRoot.querySelector).mockReturnValue(null);

      renderingCoordinator.updateItemsOnly(context(), mockInventoryItems, 'name', mockTodoLists);

      expect(mockRenderRoot.querySelector).toHaveBeenCalledWith('.items-container');
    });

    it('should successfully update items container', async () => {
      const mockContainer = document.createElement('div');
      vi.mocked(mockRenderRoot.querySelector).mockReturnValue(mockContainer);

      const { createItemsList } = await import('../../src/templates/itemList');

      renderingCoordinator.updateItemsOnly(context(), mockInventoryItems, 'name', mockTodoLists);

      // Wait for the dynamic import to resolve
      await vi.waitFor(() => {
        expect(createItemsList).toHaveBeenCalledWith(
          mockInventoryItems,
          'name',
          mockTodoLists,
          mockTranslations,
          mockConfig,
          {
            batches: false,
            expanded: mockServices.state.expandedBatchItems,
            transfers: false,
            layout: 'list',
            formatValue: expect.any(Function),
          },
        );
      });

      expect(mockContainer.innerHTML).toBe('<div>mocked items list</div>');
    });
  });

  describe('renderError', () => {
    it('should return early if renderRoot is missing', () => {
      const coordinatorWithoutRoot = new RenderingCoordinator(mockLifecycleManager, null as any);

      coordinatorWithoutRoot.renderError('Test error', mockConfig);

      expect(mockLifecycleManager.getServices).not.toHaveBeenCalled();
    });

    it('should use renderer service when available', () => {
      renderingCoordinator.renderError('Test error message', mockConfig);

      expect(mockServices.renderer.renderError).toHaveBeenCalledWith('Test error message');
      expect(mockServices.eventHandler.cardReplaced).toHaveBeenCalled();
    });

    it('mirrors the resolved layout on the host', () => {
      renderingCoordinator.renderError('Test error message', { ...mockConfig, layout: 'tiles' });

      expect(mockRenderRoot.host.getAttribute('layout')).toBe('tiles');
    });

    it('should render error directly when renderer service not available', () => {
      vi.mocked(mockLifecycleManager.getServices).mockReturnValue(undefined);

      renderingCoordinator.renderError('Test error message', mockConfig);

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

      renderingCoordinator.renderError('Test error message', mockConfig);

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Test error message');
      expect((mockRenderRoot as any).innerHTML).toContain('Test error message');
    });

    it('should sanitize error message in direct render', () => {
      vi.mocked(mockLifecycleManager.getServices).mockReturnValue(undefined);
      vi.mocked(Utilities.sanitizeHtml).mockReturnValue('&lt;script&gt;sanitized&lt;/script&gt;');

      renderingCoordinator.renderError('<script>malicious</script>', mockConfig);

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('<script>malicious</script>');
      expect((mockRenderRoot as any).innerHTML).toContain('&lt;script&gt;sanitized&lt;/script&gt;');
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

      renderingCoordinator.render(context({ items: [] }), mockTodoLists, mockValidateItemsCallback);

      expect(mockValidateItemsCallback).toHaveBeenCalledWith([]);
    });

    it('should handle service method failures gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const renderErrorSpy = vi.spyOn(renderingCoordinator, 'renderError');

      vi.mocked(mockServices.renderer.renderCard).mockImplementation(() => {
        throw new Error('Render failed');
      });

      renderingCoordinator.render(context({ items: [] }), mockTodoLists, mockValidateItemsCallback);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error rendering card:', expect.any(Error));
      expect(renderErrorSpy).toHaveBeenCalledWith(
        'An error occurred while rendering the card',
        mockConfig,
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed todo lists', () => {
      const malformedTodoLists = undefined as any;

      expect(() => {
        renderingCoordinator.render(
          context({ items: [] }),
          malformedTodoLists,
          mockValidateItemsCallback,
        );
      }).not.toThrow();
    });
  });
});
