import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { LifecycleManager } from '../../src/services/lifecycleManager';
import { RenderingCoordinator } from '../../src/services/renderingCoordinator';
import { Services } from '../../src/services/services';
import { TranslationManager } from '../../src/services/translationManager';
import { Utilities } from '../../src/utils/utilities';
import { InventoryResolver } from '../../src/utils/inventoryResolver';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryConfig } from '../../src/types/inventory';
import { createMockHomeAssistant, createMockHassEntity } from '../testHelpers';
import { BackendInfo } from '../../src/types/backendInfo';
import { HoldKind } from '../../src/services/inventoryStore';
import { CardContext, NO_CAPABILITIES } from '../../src/types/cardContext';

vi.mock('../../src/services/lifecycleManager');
vi.mock('../../src/services/renderingCoordinator');
vi.mock('../../src/services/translationManager');
vi.mock('../../src/utils/utilities');
vi.mock('../../src/utils/inventoryResolver');
vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    shadowRoot: any;
    constructor() {
      const root = document.createElement('div');
      (root as any).getElementById = (id: string) => root.querySelector(`#${id}`);
      this.shadowRoot = root;
    }
    attachShadow() {
      return this.shadowRoot;
    }
    connectedCallback(): void {}
    disconnectedCallback(): void {}
  },
  css: vi.fn((strings: TemplateStringsArray) => ({
    cssText: strings.join(''),
    toString: () => strings.join(''),
  })),
}));

describe('SimpleInventoryCard', () => {
  let card: SimpleInventoryCard;
  let mockLifecycleManager: any;
  let mockRenderingCoordinator: any;
  let mockShadowRoot: ShadowRoot;
  let mockTranslations: any;

  beforeEach(() => {
    mockLifecycleManager = {
      initialize: vi.fn(),
      getServices: vi.fn(),
      isReady: vi.fn(),
      cleanup: vi.fn(),
    };

    mockRenderingCoordinator = {
      render: vi.fn(),
    };

    mockTranslations = {
      items: {
        no_items: 'No items in inventory',
      },
    };

    vi.mocked(LifecycleManager).mockImplementation(function () {
      return mockLifecycleManager;
    });
    vi.mocked(RenderingCoordinator).mockImplementation(function () {
      return mockRenderingCoordinator;
    });
    vi.mocked(TranslationManager.loadTranslations).mockResolvedValue(mockTranslations);
    vi.mocked(InventoryResolver.extractTodoLists).mockReturnValue([
      { id: 'todo.shopping', name: 'Shopping List' },
    ]);
    vi.mocked(Utilities.validateInventoryItems).mockReturnValue([]);

    card = new SimpleInventoryCard();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /** Counts the store's renders (the card's paint is its subscriber). */
  function renderCount(): Mock<() => void> {
    const rendered = vi.fn<() => void>();
    card['_store'].subscribe(rendered);
    return rendered;
  }

  describe('Construction', () => {
    it('should initialize lifecycle and rendering managers', () => {
      expect(LifecycleManager).toHaveBeenCalledWith(card.shadowRoot);
      expect(RenderingCoordinator).toHaveBeenCalledWith(mockLifecycleManager, card.shadowRoot);
    });
  });

  describe('Configuration Management', () => {
    it('should require entity in config', () => {
      expect(() => card.setConfig({} as InventoryConfig)).toThrow('Entity is required');
      expect(() => card.setConfig({ entity: '' } as InventoryConfig)).toThrow('Entity is required');
      expect(() => card.setConfig({ entity: null } as any)).toThrow('Entity is required');
    });

    it('should accept valid config', () => {
      const config = { entity: 'sensor.inventory' } as InventoryConfig;

      expect(() => card.setConfig(config)).not.toThrow();
      expect((card as any)._config).toBe(config);
    });
  });

  describe('Home Assistant Integration', () => {
    let mockHass: HomeAssistant;
    let config: InventoryConfig;

    beforeEach(() => {
      config = { entity: 'sensor.inventory' } as InventoryConfig;
      card.setConfig(config);

      mockHass = createMockHomeAssistant({
        'sensor.inventory': createMockHassEntity('sensor.inventory', {
          state: 'active',
          attributes: {
            items: [],
            friendly_name: 'Test Inventory',
          },
        }),
        'todo.shopping': createMockHassEntity('todo.shopping', {
          state: 'active',
          attributes: {
            friendly_name: 'Shopping List',
          },
        }),
      });

      const mockServices = {
        state: {
          hasRealEntityChange: vi.fn(),
          userInteracting: false,
        },
        // The store fetches through its own Services.
        services: {
          getItems: vi.spyOn(Services.prototype, 'getItems').mockResolvedValue([]),
        },
      };
      mockLifecycleManager.getServices.mockReturnValue(mockServices);
      vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('test-inventory-id');
    });

    it('should render on first hass assignment', async () => {
      const renderSpy = renderCount();

      card.hass = mockHass;
      await vi.waitFor(() => expect(TranslationManager.loadTranslations).toHaveBeenCalled());

      expect(TranslationManager.loadTranslations).toHaveBeenCalledWith('en');
      await vi.waitFor(() => expect(renderSpy).toHaveBeenCalled());
    });

    it('reads the updated hass through the context and handles entity changes', async () => {
      card.hass = mockHass;
      await vi.waitFor(() => expect(TranslationManager.loadTranslations).toHaveBeenCalled());
      vi.clearAllMocks();
      vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('test-inventory-id');

      const mockState = mockLifecycleManager.getServices().state;
      mockState.hasRealEntityChange.mockReturnValue(true);
      mockState.userInteracting = false;

      const renderSpy = renderCount();

      const updatedHass = { ...mockHass, updated: true } as any;
      card.hass = updatedHass;

      expect(card['_getContext']().hass).toBe(updatedHass);
      await vi.waitFor(() => expect(renderSpy).toHaveBeenCalled());
    });

    it('should use debounced render when user is interacting', async () => {
      vi.useFakeTimers();
      const services = mockLifecycleManager.getServices();
      card.hass = mockHass;
      await vi.waitFor(() => expect(services.services.getItems).toHaveBeenCalled());
      services.services.getItems.mockClear();

      services.state.hasRealEntityChange.mockReturnValue(true);
      services.state.userInteracting = true;

      const renderSpy = renderCount();

      // Update hass
      card.hass = { ...mockHass, updated: true } as any;

      expect(services.services.getItems).not.toHaveBeenCalled();
      expect(renderSpy).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(100);
      expect(services.services.getItems).toHaveBeenCalledTimes(1);
    });

    /** The hold acquirer the card handed its services. */
    function hold(kind: HoldKind, reason: string): () => void {
      return mockLifecycleManager.initialize.mock.lastCall[1].hold(kind, reason);
    }

    it('defers full refreshes while the edit modal is open and runs one when it closes', async () => {
      vi.useFakeTimers();
      const services = mockLifecycleManager.getServices();
      mockLifecycleManager.initialize.mockReturnValue(services);
      Object.defineProperty(card, 'renderRoot', { value: card.shadowRoot });
      card.hass = mockHass;
      await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalled());

      const closeEditModal = hold('page', 'edit sheet');
      services.state.hasRealEntityChange.mockReturnValue(true);
      services.services.getItems.mockClear();
      mockRenderingCoordinator.render.mockClear();

      card.hass = { ...mockHass } as HomeAssistant;
      card.render(); // e.g. the re-render after a late get_info answer
      await Promise.resolve();
      expect(services.services.getItems).not.toHaveBeenCalled();
      expect(mockRenderingCoordinator.render).not.toHaveBeenCalled();

      closeEditModal();
      await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalledTimes(1));
      expect(services.services.getItems).toHaveBeenCalledTimes(1);

      closeEditModal();
      await vi.advanceTimersByTimeAsync(50);
      expect(services.services.getItems).toHaveBeenCalledTimes(1);
    });

    it('defers full renders while the import result sheet is open', async () => {
      const services = mockLifecycleManager.getServices();
      mockLifecycleManager.initialize.mockReturnValue(services);
      Object.defineProperty(card, 'renderRoot', { value: card.shadowRoot });
      card.hass = mockHass;
      await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalled());

      const closeImportSheet = hold('page', 'import result sheet');
      services.state.hasRealEntityChange.mockReturnValue(true);
      services.services.getItems.mockClear();
      mockRenderingCoordinator.render.mockClear();

      card.hass = { ...mockHass } as HomeAssistant; // the import's own entity update
      card.render();
      await Promise.resolve();
      expect(services.services.getItems).not.toHaveBeenCalled();
      expect(mockRenderingCoordinator.render).not.toHaveBeenCalled();

      closeImportSheet();
      card.render();
      expect(mockRenderingCoordinator.render).toHaveBeenCalledTimes(1);
    });

    describe('background refreshes while an inline form or the history sheet is open', () => {
      interface MockServices {
        state: { hasRealEntityChange: Mock; userInteracting: boolean };
        services: { getItems: Mock };
      }

      let services: MockServices;

      beforeEach(async () => {
        vi.useFakeTimers();
        services = mockLifecycleManager.getServices();
        mockLifecycleManager.initialize.mockReturnValue(services);
        Object.defineProperty(card, 'renderRoot', { value: card.shadowRoot });
        card.hass = mockHass;
        await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalled());
        services.state.hasRealEntityChange.mockReturnValue(true);
        services.services.getItems.mockClear();
        mockRenderingCoordinator.render.mockClear();
      });

      it.each(['restock form', 'move form', 'history sheet'])(
        'defers an entity-change refresh while a %s is open and runs it once on close',
        async (reason) => {
          const close = hold('background', reason);

          card.hass = { ...mockHass } as HomeAssistant;
          await Promise.resolve();
          expect(services.services.getItems).not.toHaveBeenCalled();
          expect(mockRenderingCoordinator.render).not.toHaveBeenCalled();

          close();
          await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalledTimes(1));
          expect(services.services.getItems).toHaveBeenCalledTimes(1);

          close();
          await vi.advanceTimersByTimeAsync(50);
          expect(services.services.getItems).toHaveBeenCalledTimes(1);
        },
      );

      it('keeps deferring while a second inline form is still open', async () => {
        const closeRestock = hold('background', 'restock form');
        const closeMove = hold('background', 'move form');
        card.hass = { ...mockHass } as HomeAssistant;

        closeRestock();
        await vi.advanceTimersByTimeAsync(50);
        expect(services.services.getItems).not.toHaveBeenCalled();

        closeMove();
        await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalledTimes(1));
        expect(services.services.getItems).toHaveBeenCalledTimes(1);
      });

      it('defers the debounced refresh while the user is typing in an open form', async () => {
        hold('background', 'restock form');
        services.state.userInteracting = true;

        card.hass = { ...mockHass } as HomeAssistant;

        expect(vi.getTimerCount()).toBe(0);
        await vi.advanceTimersByTimeAsync(100);
        expect(services.services.getItems).not.toHaveBeenCalled();
      });

      it('defers the re-render after a language change while the history sheet is open', async () => {
        hold('background', 'history sheet');

        card.hass = { ...mockHass, language: 'fr' } as HomeAssistant;
        await vi.waitFor(() =>
          expect(TranslationManager.loadTranslations).toHaveBeenCalledWith('fr'),
        );
        await Promise.resolve();

        expect(mockRenderingCoordinator.render).not.toHaveBeenCalled();
      });

      it('does not defer a user-initiated render and drops the pending refresh it satisfies', async () => {
        const close = hold('background', 'restock form');
        card.hass = { ...mockHass } as HomeAssistant; // deferred: a refresh is now pending
        await Promise.resolve();
        expect(services.services.getItems).not.toHaveBeenCalled();

        const renderCallback = mockLifecycleManager.initialize.mock.lastCall[1].render;
        renderCallback(); // a sort change, ± on another item, or a submit's own refresh
        await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalledTimes(1));
        expect(services.services.getItems).toHaveBeenCalledTimes(1);

        close();
        await vi.advanceTimersByTimeAsync(50);
        expect(services.services.getItems).toHaveBeenCalledTimes(1);
      });

      it('releases holds that outlived a full render, with a warning', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        warn.mockClear();
        hold('background', 'restock form'); // a holder that forgot its release

        mockLifecycleManager.initialize.mock.lastCall[1].render();
        await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalledTimes(1));

        expect(card['_store'].holds()).toEqual([]);
        expect(warn).toHaveBeenCalledWith(
          'Simple Inventory: holds outlived a full render; releasing them:',
          [{ kind: 'background', reason: 'restock form' }],
        );
      });

      it('leaves an already scheduled refresh in place when the UI closes', async () => {
        const close = hold('background', 'restock form');
        hold('background', 'move form'); // still open
        card.hass = { ...mockHass } as HomeAssistant; // deferred: a refresh is now pending
        mockLifecycleManager.initialize.mock.lastCall[1].refreshAfterSave(); // e.g. a save's refresh

        close();
        // The save's own refresh ran: a background one replacing it would wait for the move form.
        await vi.advanceTimersByTimeAsync(50);
        expect(services.services.getItems).toHaveBeenCalledTimes(1);

        // The held refresh counts as covered: a later close schedules nothing.
        close();
        expect(vi.getTimerCount()).toBe(0);
      });
    });

    it('should extract todo lists from hass states', async () => {
      // Set up extractTodoLists to be called and return value
      vi.mocked(InventoryResolver.extractTodoLists).mockReturnValue([
        { id: 'todo.shopping', name: 'Shopping List' },
      ]);

      card.hass = mockHass;
      await vi.waitFor(() => expect(TranslationManager.loadTranslations).toHaveBeenCalled());

      // Wait for any async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Check if extractTodoLists was called during the hass setter
      expect(InventoryResolver.extractTodoLists).toHaveBeenCalledWith(mockHass);
      expect((card as any)._todoLists).toEqual([{ id: 'todo.shopping', name: 'Shopping List' }]);
    });

    it('should load translations with correct language', async () => {
      const hassWithLanguage = {
        ...mockHass,
        language: 'fr',
      };

      card.hass = hassWithLanguage;
      await vi.waitFor(() => expect(TranslationManager.loadTranslations).toHaveBeenCalled());

      expect(TranslationManager.loadTranslations).toHaveBeenCalledWith('fr');
    });

    describe('backend compatibility handshake', () => {
      beforeEach(() => {
        vi.mocked(TranslationManager.localize).mockImplementation(
          (_translations, _key, params, fallback) =>
            (fallback ?? '').replace(/\{(\w+)\}/g, (_m, name) => String(params?.[name] ?? '')),
        );
        // The real renderer rebuilds the whole card on every render.
        mockRenderingCoordinator.render.mockImplementation(() => {
          if (card.shadowRoot) {
            card.shadowRoot.innerHTML = '<ha-card><div class="card-body">items</div></ha-card>';
          }
        });
        mockLifecycleManager.isReady.mockReturnValue(true);
        // The LitElement mock has no renderRoot; render() needs one (as in the real element).
        Object.defineProperty(card, 'renderRoot', { value: card.shadowRoot });
        vi.mocked(Utilities.sanitizeHtml).mockImplementation((value: string) => value);
      });

      it('asks the backend for get_info once across repeated hass updates', async () => {
        mockHass.callWS = vi
          .fn()
          .mockResolvedValue({ version: '0.7.0', api_version: 2, features: ['batches'] });

        card.hass = mockHass;
        await vi.waitFor(() => expect(card.capabilities.batches).toBe(true));
        card.hass = { ...mockHass };
        card.hass = { ...mockHass };

        const getInfoCalls = vi
          .mocked(mockHass.callWS)
          .mock.calls.filter(([msg]) => msg.type === 'simple_inventory/get_info');
        expect(getInfoCalls).toHaveLength(1);
        expect(card.shadowRoot?.querySelector('#compat-banner')).toBeNull();
      });

      it('shows a persistent banner above the card when get_info is unknown (backend < 0.7.0)', async () => {
        mockHass.callWS = vi.fn().mockImplementation(async (msg: { type: string }) => {
          if (msg.type === 'simple_inventory/get_info') {
            throw { code: 'unknown_command', message: 'Unknown command.' };
          }
          return { items: [] };
        });

        card.hass = mockHass;
        await vi.waitFor(() =>
          expect(card.shadowRoot?.querySelector('ha-card > #compat-banner')).not.toBeNull(),
        );
        expect(card.shadowRoot?.querySelector('#compat-banner')?.textContent).toContain(
          'update to 0.7.0 or newer',
        );

        // A later full re-render rebuilds the card; the banner must come back.
        card.render();
        expect(card.shadowRoot?.querySelector('ha-card')?.firstElementChild?.id).toBe(
          'compat-banner',
        );
        expect(card.shadowRoot?.querySelector('.card-body')).not.toBeNull();
      });

      it('shows the banner naming the version when api_version is too low', async () => {
        mockHass.callWS = vi
          .fn()
          .mockImplementation(async (msg: { type: string }) =>
            msg.type === 'simple_inventory/get_info'
              ? { version: '0.6.9', api_version: 1, features: [] }
              : { items: [] },
          );

        card.hass = mockHass;

        await vi.waitFor(() =>
          expect(card.shadowRoot?.querySelector('#compat-banner')?.textContent).toContain(
            'integration 0.6.9 is too old',
          ),
        );
      });

      it('re-renders with batch UI when get_info reports batches after the first render', async () => {
        let resolveInfo: (info: BackendInfo) => void = () => {};
        // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
        const info = new Promise<BackendInfo>((resolve) => {
          resolveInfo = resolve;
        });
        mockHass.callWS = vi
          .fn()
          .mockImplementation((msg: { type: string }) =>
            msg.type === 'simple_inventory/get_info' ? info : Promise.resolve({ items: [] }),
          );

        card.hass = mockHass;
        await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalled());
        expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.batches).toBe(false);
        const rendersBeforeInfo = mockRenderingCoordinator.render.mock.calls.length;

        resolveInfo({ version: '0.8.0', api_version: 3, features: ['batches'] });

        await vi.waitFor(() =>
          expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.batches).toBe(true),
        );
        await Promise.resolve();
        expect(mockRenderingCoordinator.render).toHaveBeenCalledTimes(rendersBeforeInfo + 1);
        expect(card.shadowRoot?.querySelector('#compat-banner')).toBeNull();
      });

      it('does not render early when get_info reports batches before the first render', async () => {
        mockLifecycleManager.isReady.mockReturnValue(false);
        mockLifecycleManager.getServices.mockReturnValue(undefined);
        // Items never arrive, so the card has not rendered yet when get_info answers.
        vi.mocked(Services.prototype.getItems).mockReturnValue(new Promise(() => {}));
        mockHass.callWS = vi
          .fn()
          .mockImplementation((msg: { type: string }) =>
            msg.type === 'simple_inventory/get_info'
              ? Promise.resolve({ version: '0.8.0', api_version: 3, features: ['batches'] })
              : new Promise(() => {}),
          );
        const renderSpy = renderCount();

        card.hass = mockHass;
        await vi.waitFor(() => expect(card.capabilities.batches).toBe(true));

        expect(renderSpy).not.toHaveBeenCalled();
        expect(mockRenderingCoordinator.render).not.toHaveBeenCalled();
      });

      it('keeps batch UI off for an integration without the batches feature (0.7.x)', async () => {
        mockHass.callWS = vi
          .fn()
          .mockImplementation(async (msg: { type: string }) =>
            msg.type === 'simple_inventory/get_info'
              ? { version: '0.7.0', api_version: 2, features: [] }
              : { items: [] },
          );

        card.hass = mockHass;
        await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalled());
        card.render();

        expect(card.capabilities.batches).toBe(false);
        expect(
          mockRenderingCoordinator.render.mock.calls.every(
            (call: [CardContext]) => call[0].capabilities.batches === false,
          ),
        ).toBe(true);
        expect(card.shadowRoot?.querySelector('#compat-banner')).toBeNull();
      });

      it('passes the transfers feature to the renderer when get_info reports it (0.9.0)', async () => {
        mockHass.callWS = vi
          .fn()
          .mockImplementation(async (msg: { type: string }) =>
            msg.type === 'simple_inventory/get_info'
              ? { version: '0.9.0', api_version: 3, features: ['batches', 'transfers'] }
              : { items: [] },
          );

        card.hass = mockHass;

        await vi.waitFor(() =>
          expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.transfers).toBe(
            true,
          ),
        );
        expect(card.capabilities.transfers).toBe(true);
      });

      it('keeps Move… off for an integration with batches but without transfers (0.8.x)', async () => {
        mockHass.callWS = vi
          .fn()
          .mockImplementation(async (msg: { type: string }) =>
            msg.type === 'simple_inventory/get_info'
              ? { version: '0.8.0', api_version: 3, features: ['batches'] }
              : { items: [] },
          );

        card.hass = mockHass;

        await vi.waitFor(() =>
          expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.batches).toBe(true),
        );
        expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.transfers).toBe(false);
      });

      it('passes the item_icons feature to the renderer when get_info reports it (0.10.0)', async () => {
        mockHass.callWS = vi.fn().mockImplementation(async (msg: { type: string }) =>
          msg.type === 'simple_inventory/get_info'
            ? {
                version: '0.10.0',
                api_version: 3,
                features: ['batches', 'transfers', 'item_icons'],
              }
            : { items: [] },
        );

        card.hass = mockHass;

        await vi.waitFor(() =>
          expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.itemIcons).toBe(
            true,
          ),
        );
        expect(card.capabilities.itemIcons).toBe(true);
      });

      it('passes the item_images feature to full and list-only renders (0.11.0)', async () => {
        mockHass.callWS = vi.fn().mockImplementation(async (msg: { type: string }) =>
          msg.type === 'simple_inventory/get_info'
            ? {
                version: '0.11.0',
                api_version: 3,
                features: ['batches', 'transfers', 'item_icons', 'item_images'],
              }
            : { items: [] },
        );
        mockRenderingCoordinator.updateItemsOnly = vi.fn();

        card.hass = mockHass;

        await vi.waitFor(() =>
          expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.itemImages).toBe(
            true,
          ),
        );
        (card as any)._updateItemsOnly([], 'name');
        expect(
          mockRenderingCoordinator.updateItemsOnly.mock.lastCall[0].capabilities.itemImages,
        ).toBe(true);
      });

      it('keeps photos off for an integration without item_images (0.10.x)', async () => {
        mockHass.callWS = vi.fn().mockImplementation(async (msg: { type: string }) =>
          msg.type === 'simple_inventory/get_info'
            ? {
                version: '0.10.0',
                api_version: 3,
                features: ['batches', 'transfers', 'item_icons'],
              }
            : { items: [] },
        );

        card.hass = mockHass;

        await vi.waitFor(() =>
          expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.itemIcons).toBe(
            true,
          ),
        );
        expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.itemImages).toBe(
          false,
        );
      });

      it('keeps the icon field off for an integration without item_icons (0.9.x)', async () => {
        mockHass.callWS = vi
          .fn()
          .mockImplementation(async (msg: { type: string }) =>
            msg.type === 'simple_inventory/get_info'
              ? { version: '0.9.0', api_version: 3, features: ['batches', 'transfers'] }
              : { items: [] },
          );

        card.hass = mockHass;

        await vi.waitFor(() =>
          expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.transfers).toBe(
            true,
          ),
        );
        expect(mockRenderingCoordinator.render.mock.lastCall[0].capabilities.itemIcons).toBe(false);
      });
    });
  });

  describe('Rendering Coordination', () => {
    beforeEach(async () => {
      const config = { entity: 'sensor.inventory' } as InventoryConfig;
      const mockHass = { states: {}, language: 'en' } as HomeAssistant;
      const mockServices = {
        addItem: vi.fn(),
        updateItem: vi.fn(),
      } as any;
      mockLifecycleManager.isReady.mockReturnValue(true);
      mockLifecycleManager.getServices.mockReturnValue(mockServices);

      // Test double: a detached div offers the DOM API (querySelector, dispatchEvent) the card uses.
      mockShadowRoot = document.createElement('div') as unknown as ShadowRoot;
      card.setConfig(config);
      card.hass = mockHass;
      await vi.waitFor(() => expect(TranslationManager.loadTranslations).toHaveBeenCalled());

      Object.defineProperty(card, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });
      Object.defineProperty(card, 'renderRoot', {
        value: mockShadowRoot,
        writable: true,
      });
    });

    it('should delegate rendering to RenderingCoordinator', () => {
      card.render();

      expect(mockRenderingCoordinator.render).toHaveBeenCalledWith(
        {
          config: (card as any)._config,
          hass: card['_store'].hass,
          translations: mockTranslations,
          items: card['_store'].items, // cached items array
          capabilities: NO_CAPABILITIES, // no get_info answer
        },
        (card as any)._todoLists,
        expect.any(Function), // validateInventoryItems callback
      );
    });

    it('should pass Utilities.validateInventoryItems as callback', () => {
      card.render();

      const renderCall = mockRenderingCoordinator.render.mock.calls[0];
      const validateCallback = renderCall[2];

      // Test the callback delegates to Utilities
      const testItems = [{ name: 'test' }];
      validateCallback(testItems);

      expect(Utilities.validateInventoryItems).toHaveBeenCalledWith(testItems);
    });

    it('should not render if translations are not loaded', () => {
      // Create a fresh card instance without loading translations
      const freshCard = new SimpleInventoryCard();
      const config = { entity: 'sensor.inventory' } as InventoryConfig;
      freshCard.setConfig(config);
      // No hass yet, so no translations were loaded.

      // Clear any previous calls
      mockRenderingCoordinator.render.mockClear();

      freshCard.render();

      expect(mockRenderingCoordinator.render).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle Management', () => {
    it('should return correct card size', () => {
      expect(card.getCardSize()).toBe(4);
    });

    it('pauses when detached and resumes, catching up on a skipped render, when re-attached', async () => {
      vi.useFakeTimers();
      const getItems = vi.spyOn(Services.prototype, 'getItems').mockResolvedValue([]);
      const services = {
        state: { hasRealEntityChange: vi.fn(), userInteracting: false },
        services: { getItems },
      };
      mockLifecycleManager.getServices.mockReturnValue(services);
      mockLifecycleManager.initialize.mockReturnValue(services);
      mockLifecycleManager.pause = vi.fn();
      mockLifecycleManager.resume = vi.fn();
      vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('test-inventory-id');
      Object.defineProperty(card, 'renderRoot', { value: card.shadowRoot });
      card.setConfig({ entity: 'sensor.inventory' } as InventoryConfig);
      card.connectedCallback(); // the first attach changes nothing
      expect(mockLifecycleManager.resume).not.toHaveBeenCalled();
      card.hass = createMockHomeAssistant({
        'sensor.inventory': createMockHassEntity('sensor.inventory'),
      });
      await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalledTimes(1));
      expect(getItems).toHaveBeenCalledTimes(1);

      mockLifecycleManager.initialize.mock.lastCall[1].refreshAfterSave(); // a save's refresh
      card.disconnectedCallback();
      expect(mockLifecycleManager.pause).toHaveBeenCalledTimes(1);
      // The timers are released: the save's refresh does not run while detached.
      await vi.advanceTimersByTimeAsync(50);
      expect(getItems).toHaveBeenCalledTimes(1);
      expect(mockLifecycleManager.cleanup).not.toHaveBeenCalled();
      card.render(); // e.g. a language change or a late get_info answer while detached
      expect(mockRenderingCoordinator.render).toHaveBeenCalledTimes(1);

      card.connectedCallback();
      expect(mockLifecycleManager.resume).toHaveBeenCalledTimes(1);
      await vi.waitFor(() => expect(mockRenderingCoordinator.render).toHaveBeenCalledTimes(2));
      expect(getItems).toHaveBeenCalledTimes(2);
    });

    it('re-attaches without a refresh when nothing was missed', () => {
      mockLifecycleManager.pause = vi.fn();
      mockLifecycleManager.resume = vi.fn();
      const render = renderCount();

      card.disconnectedCallback();
      card.connectedCallback();

      expect(mockLifecycleManager.resume).toHaveBeenCalledTimes(1);
      expect(render).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing dependencies gracefully', () => {
      expect(() => card.render()).not.toThrow();
    });

    it('should handle hass updates without config', () => {
      const mockHass = createMockHomeAssistant();

      expect(() => {
        card.hass = mockHass;
      }).not.toThrow();

      expect(mockLifecycleManager.getServices).not.toHaveBeenCalled();
    });

    it('should handle translation loading errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(TranslationManager.loadTranslations).mockRejectedValueOnce(
        new Error('Translation error'),
      );

      const errorCard = new SimpleInventoryCard();
      const config = { entity: 'sensor.inventory' } as InventoryConfig;
      errorCard.setConfig(config);

      const mockHass = createMockHomeAssistant();
      errorCard.hass = mockHass;

      // Wait for the promise to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check if error was logged (it might be caught silently)
      if (consoleErrorSpy.mock.calls.length === 0) {
        // If no console.error, the error might be handled silently
        // The implementation sets translations to an empty object on error
        expect(errorCard['_store'].translations).toEqual({});
      } else {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load translations:',
          expect.any(Error),
        );
      }

      consoleErrorSpy.mockRestore();
    });

    it('shows a hass-notification when loading items fails', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(TranslationManager.localize).mockImplementation(
        (_translations, _key, _params, fallback) => fallback ?? '',
      );
      vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('test-inventory-id');
      vi.spyOn(Services.prototype, 'getItems').mockRejectedValue(new Error('ws down'));
      const listener = vi.fn();
      card.shadowRoot?.addEventListener('hass-notification', listener);

      card.setConfig({ entity: 'sensor.test_inventory' } as InventoryConfig);
      card.hass = createMockHomeAssistant({
        'sensor.test_inventory': createMockHassEntity('sensor.test_inventory', {
          attributes: { inventory_id: 'test-inventory-id' },
        }),
      });

      await vi.waitFor(() => expect(listener).toHaveBeenCalled());
      expect((listener.mock.calls[0][0] as CustomEvent).detail.message).toBe(
        'Failed to load inventory items: ws down',
      );
    });
  });

  describe('Static Methods', () => {
    it('should provide config element', () => {
      const configElement = SimpleInventoryCard.getConfigElement();
      expect(configElement.tagName.toLowerCase()).toBe('simple-inventory-config-editor');
    });

    it('should provide stub config', () => {
      const stubConfig = SimpleInventoryCard.getStubConfig();
      expect(stubConfig).toEqual({});
    });
  });
});
