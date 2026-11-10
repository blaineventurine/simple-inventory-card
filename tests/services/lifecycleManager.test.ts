import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import {
  CardCallbacks,
  IMAGE_RELEASE_DELAY_MS,
  LifecycleManager,
} from '../../src/services/lifecycleManager';
import { CardContext, GetCardContext } from '../../src/types/cardContext';
import { Services } from '../../src/services/services';
import { Modals } from '../../src/services/modals';
import { Filters } from '../../src/services/filters';
import { Renderer } from '../../src/services/renderer';
import { State } from '../../src/services/state';
import { EventHandler } from '../../src/services/eventHandler';
import { ImageLoader } from '../../src/services/imageLoader';
import { ItemImageField } from '../../src/services/modals/itemImageField';
import { ImageViewer } from '../../src/services/imageViewer';
import { DetailView } from '../../src/services/detailView';
import { InventoryResolver } from '../../src/utils/inventoryResolver';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryConfig } from '../../src/types/inventory';
import { createMockHomeAssistant, must, createMockCardContext } from '../testHelpers';
import { AcquireHold } from '../../src/services/inventoryStore';
import { hideSheet, showSheet } from '../../src/services/modals/modalUIManager';
import { ELEMENTS } from '../../src/utils/constants';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/services');
vi.mock('../../src/services/modals');
vi.mock('../../src/services/filters');
vi.mock('../../src/services/renderer');
vi.mock('../../src/services/state');
vi.mock('../../src/services/eventHandler');
vi.mock('../../src/utils/inventoryResolver');

describe('LifecycleManager', () => {
  let lifecycleManager: LifecycleManager;
  let mockConfig: InventoryConfig;
  let mockGetContext: GetCardContext;
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

  const callbacks = (hold?: AcquireHold): CardCallbacks => ({
    render: mockRenderCallback,
    refreshAfterSave: mockRefreshCallback,
    updateItems: mockUpdateItemsCallback,
    ...(hold ? { hold } : {}),
  });

  beforeEach(() => {
    mockRenderRoot = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
      getElementById: vi.fn(() => null),
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
    mockGetContext = vi.fn((): CardContext =>
      createMockCardContext({ hass: mockHass, config: mockConfig, translations: mockTranslations }),
    );

    mockServices = {
      callService: vi.fn(),
    } as unknown as Services;

    mockModals = {
      destroy: vi.fn(),
    } as unknown as Modals;

    mockFilters = {} as unknown as Filters;
    mockRenderer = {} as unknown as Renderer;

    mockState = {
      cleanup: vi.fn(),
    } as unknown as State;

    mockEventHandler = {
      cleanupEventListeners: vi.fn(),
    } as unknown as EventHandler;

    vi.mocked(EventHandler).mockImplementation(function () {
      return mockEventHandler;
    });
    vi.mocked(Filters).mockImplementation(function () {
      return mockFilters;
    });
    vi.mocked(Modals).mockImplementation(function () {
      return mockModals;
    });
    vi.mocked(Renderer).mockImplementation(function () {
      return mockRenderer;
    });
    vi.mocked(Services).mockImplementation(function () {
      return mockServices;
    });
    vi.mocked(State).mockImplementation(function () {
      return mockState;
    });
    vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('test-inventory-id');

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
      const initialServices = lifecycleManager.initialize(mockGetContext, callbacks());

      // Initialize again
      const secondServices = lifecycleManager.initialize(mockGetContext, callbacks());

      expect(initialServices).toBe(secondServices);
      expect(vi.mocked(Services)).toHaveBeenCalledTimes(1);
    });

    it('should return null if hass is missing', () => {
      const result = lifecycleManager.initialize(
        () => createMockCardContext({ hass: null as unknown as HomeAssistant, config: mockConfig }),
        callbacks(),
      );

      expect(result).toBe(undefined);
      expect(lifecycleManager['isInitialized']).toBe(false);
    });

    it('should return null if config is missing', () => {
      const result = lifecycleManager.initialize(
        () => createMockCardContext({ hass: mockHass, config: null as unknown as InventoryConfig }),
        callbacks(),
      );

      expect(result).toBe(undefined);
      expect(lifecycleManager['isInitialized']).toBe(false);
    });

    it('should return null if renderRoot is missing', () => {
      const lifecycleManagerWithoutRoot = new LifecycleManager(null as any);

      const result = lifecycleManagerWithoutRoot.initialize(mockGetContext, callbacks());

      expect(result).toBe(undefined);
      expect(lifecycleManagerWithoutRoot['isInitialized']).toBe(false);
    });

    it('should create all services correctly', () => {
      const result = lifecycleManager.initialize(mockGetContext, callbacks());

      const [getHass] = vi.mocked(Services).mock.calls[0] ?? [];
      expect(getHass?.()).toBe(mockHass);
      expect(vi.mocked(Filters)).toHaveBeenCalledWith(mockRenderRoot);
      expect(vi.mocked(Renderer)).toHaveBeenCalledWith(mockRenderRoot);
      expect(vi.mocked(State)).toHaveBeenCalled();

      expect(result).toEqual({
        services: mockServices,
        modals: mockModals,
        filters: mockFilters,
        renderer: mockRenderer,
        state: mockState,
        eventHandler: mockEventHandler,
        imageLoader: expect.any(ImageLoader),
        imageViewer: expect.any(ImageViewer),
        detailView: expect.any(DetailView),
      });
    });

    it('creates an image loader that fetches through the services', async () => {
      const fetchImage = vi.fn<(path: string) => Promise<Blob>>(() =>
        Promise.reject(new Error('HTTP 404')),
      );
      Object.assign(mockServices, { fetchImage });

      const result = lifecycleManager.initialize(mockGetContext, callbacks());

      await expect(
        result?.imageLoader.load('/api/simple_inventory/image/abc?thumb=1&v=1'),
      ).rejects.toThrow('HTTP 404');
      expect(fetchImage).toHaveBeenCalledWith('/api/simple_inventory/image/abc?thumb=1&v=1');
    });

    it('should create modals with correct parameters', () => {
      lifecycleManager.initialize(mockGetContext, callbacks(vi.fn<AcquireHold>()));

      expect(vi.mocked(Modals)).toHaveBeenCalledWith(
        mockRenderRoot,
        mockServices,
        expect.any(Function),
        mockRefreshCallback,
        mockGetContext,
        expect.any(ItemImageField),
      );

      // Test the getInventoryId function passed to Modals
      const getInventoryIdFunction = vi.mocked(Modals).mock.calls[0][2];
      const testEntityId = 'sensor.test';
      getInventoryIdFunction(testEntityId);
      expect(InventoryResolver.getInventoryId).toHaveBeenCalledWith(mockHass, testEntityId);
    });

    it('should create event handler with correct parameters', () => {
      const hold = vi.fn<AcquireHold>();
      lifecycleManager.initialize(mockGetContext, callbacks(hold));

      expect(vi.mocked(EventHandler)).toHaveBeenCalledWith({
        renderRoot: mockRenderRoot,
        services: mockServices,
        modals: mockModals,
        filters: mockFilters,
        state: mockState,
        getContext: mockGetContext,
        renderCallback: mockRenderCallback,
        updateItemsCallback: mockUpdateItemsCallback,
        hold,
        imageLoader: expect.any(ImageLoader),
        imageField: expect.any(ItemImageField),
        imageViewer: expect.any(ImageViewer),
      });
    });

    it('shares one photo viewer between the rows and the sheets; it holds renders while open', () => {
      const hold = vi.fn<AcquireHold>();
      lifecycleManager.initialize(mockGetContext, callbacks(hold));

      const viewer = vi.mocked(EventHandler).mock.calls[0]?.[0].imageViewer;
      expect(viewer).toBeInstanceOf(ImageViewer);
      expect(viewer?.['hold']).toBe(hold);
      expect(vi.mocked(Modals).mock.calls[0]?.[5]?.['viewer']).toBe(viewer);
    });

    it('lets the sheets shown in its root hold renders', () => {
      const release = vi.fn<() => void>();
      const hold = vi.fn<AcquireHold>(() => release);
      lifecycleManager.initialize(mockGetContext, callbacks(hold));
      const sheet = document.createElement('div');
      sheet.id = ELEMENTS.EDIT_MODAL;

      showSheet(mockRenderRoot, sheet);
      expect(hold).toHaveBeenCalledWith('page', ELEMENTS.EDIT_MODAL);
      hideSheet(sheet);
      expect(release).toHaveBeenCalledTimes(1);
    });

    it('should set initialized state correctly', () => {
      const result = lifecycleManager.initialize(mockGetContext, callbacks());

      expect(lifecycleManager['isInitialized']).toBe(true);
      expect(lifecycleManager['services']).toBe(result);
    });

    it('should handle initialization errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(Services).mockImplementation(function () {
        throw new Error('Initialization failed');
      });

      const result = lifecycleManager.initialize(mockGetContext, callbacks());

      expect(result).toBe(undefined);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize modules:',
        expect.any(Error),
      );
      expect(lifecycleManager['isInitialized']).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getServices', () => {
    beforeEach(() => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
    });

    it('should return services when initialized', () => {
      const initializedServices = lifecycleManager.initialize(mockGetContext, callbacks());

      const result = lifecycleManager.getServices();

      expect(result).toBe(initializedServices);
    });

    it('should return null when not initialized', () => {
      const result = lifecycleManager.getServices();

      expect(result).toBe(undefined);
    });

    it('should return null after cleanup', () => {
      lifecycleManager.initialize(mockGetContext, callbacks());

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
      lifecycleManager.initialize(mockGetContext, callbacks());

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
      lifecycleManager.initialize(mockGetContext, callbacks());

      lifecycleManager.cleanup();

      expect(lifecycleManager.isReady()).toBe(false);
    });
  });

  describe('pause and resume', () => {
    beforeEach(() => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
    });

    it('drops and restores the document listeners and the scanner but keeps the services', () => {
      const resume = vi.fn();
      const cancelScheduledSearch = vi.fn();
      const resumeScanning = vi.fn();
      Object.assign(mockModals, { resume });
      Object.assign(mockFilters, { cancelScheduledSearch });
      Object.assign(mockEventHandler, { resumeScanning });
      const services = lifecycleManager.initialize(mockGetContext, callbacks());

      const pauseViewer = vi.spyOn(ImageViewer.prototype, 'pause');
      const resumeViewer = vi.spyOn(ImageViewer.prototype, 'resume');

      lifecycleManager.pause();
      expect(mockModals.destroy).toHaveBeenCalledTimes(1);
      expect(cancelScheduledSearch).toHaveBeenCalledTimes(1);
      expect(pauseViewer).toHaveBeenCalledTimes(1);
      expect(lifecycleManager.getServices()).toBe(services);

      lifecycleManager.resume();
      expect(resume).toHaveBeenCalledTimes(1);
      expect(resumeScanning).toHaveBeenCalledTimes(1);
      expect(resumeViewer).toHaveBeenCalledTimes(1);
      expect(lifecycleManager.getServices()).toBe(services);
    });

    it('does nothing before the services exist', () => {
      expect(() => {
        lifecycleManager.pause();
        lifecycleManager.resume();
      }).not.toThrow();
    });

    describe('item image blobs', () => {
      let releaseAll: MockInstance<() => void>;

      beforeEach(() => {
        vi.useFakeTimers();
        Object.assign(mockModals, { resume: vi.fn() });
        Object.assign(mockFilters, { cancelScheduledSearch: vi.fn() });
        Object.assign(mockEventHandler, { resumeScanning: vi.fn() });
        releaseAll = vi.spyOn(ImageLoader.prototype, 'releaseAll').mockImplementation(() => {});
        vi.mocked(mockRenderRoot.querySelectorAll).mockReturnValue(
          document.createDocumentFragment().querySelectorAll('img'),
        );
        lifecycleManager.initialize(mockGetContext, callbacks());
      });

      afterEach(() => {
        vi.useRealTimers();
        releaseAll.mockRestore();
      });

      it('releases them a minute after the card was detached', () => {
        lifecycleManager.pause();
        vi.advanceTimersByTime(IMAGE_RELEASE_DELAY_MS - 1);
        expect(releaseAll).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(releaseAll).toHaveBeenCalledTimes(1);
      });

      it('keeps them when the card comes back within the minute, without reloading', () => {
        lifecycleManager.pause();
        vi.advanceTimersByTime(IMAGE_RELEASE_DELAY_MS - 1);
        lifecycleManager.resume();
        vi.advanceTimersByTime(IMAGE_RELEASE_DELAY_MS);

        expect(releaseAll).not.toHaveBeenCalled();
        expect(mockRenderRoot.querySelectorAll).not.toHaveBeenCalled();
      });

      it('reloads the images on screen when the card comes back after the release', () => {
        lifecycleManager.pause();
        vi.advanceTimersByTime(IMAGE_RELEASE_DELAY_MS);
        lifecycleManager.resume();

        expect(mockRenderRoot.querySelectorAll).toHaveBeenCalledWith('img[data-image-path]');

        // Only once per release.
        lifecycleManager.pause();
        lifecycleManager.resume();
        expect(mockRenderRoot.querySelectorAll).toHaveBeenCalledTimes(1);
      });

      it('schedules a single release for repeated pauses', () => {
        lifecycleManager.pause();
        lifecycleManager.pause();
        vi.advanceTimersByTime(IMAGE_RELEASE_DELAY_MS);

        expect(releaseAll).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      lifecycleManager = new LifecycleManager(mockRenderRoot);
    });

    it('should cleanup all services when they exist', () => {
      lifecycleManager.initialize(mockGetContext, callbacks());

      lifecycleManager.cleanup();

      expect(mockEventHandler.cleanupEventListeners).toHaveBeenCalled();
      expect(mockState.cleanup).toHaveBeenCalled();
      expect(mockModals.destroy).toHaveBeenCalled();
    });

    it('should handle cleanup when services is null', () => {
      expect(() => lifecycleManager.cleanup()).not.toThrow();
    });

    it('should handle missing service methods gracefully', () => {
      lifecycleManager.initialize(mockGetContext, callbacks());

      // Remove some methods to test graceful handling
      must(lifecycleManager['services']).eventHandler = null as any;
      must(lifecycleManager['services']).state = null as any;
      must(lifecycleManager['services']).modals = null as any;

      expect(() => lifecycleManager.cleanup()).not.toThrow();
    });

    it('should reset instance state after cleanup', () => {
      lifecycleManager.initialize(mockGetContext, callbacks());

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
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(EventHandler).mockImplementation(function () {
        throw new Error('EventHandler failed');
      });

      const result = lifecycleManager.initialize(mockGetContext, callbacks());

      expect(result).toBe(undefined);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('initializes without the optional hold callback', () => {
      const result = lifecycleManager.initialize(mockGetContext, callbacks());

      expect(result).toBeDefined();
    });
  });
});
