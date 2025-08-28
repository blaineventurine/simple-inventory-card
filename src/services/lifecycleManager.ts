import { Services } from './services';
import { Modals } from './modals';
import { Filters } from './filters';
import { Renderer } from './renderer';
import { State } from './state';
import { EventHandler } from './eventHandler';
import { HomeAssistant, InventoryConfig, InventoryItem } from '../types/homeAssistant';
import { Utilities } from '../utils/utilities';
import { TranslationData } from '@/types/translatableComponent';

interface InitializedServices {
  services: Services;
  modals: Modals;
  filters: Filters;
  renderer: Renderer;
  state: State;
  eventHandler: EventHandler;
}

export class LifecycleManager {
  private renderRoot: ShadowRoot;
  private isInitialized = false;
  private services: InitializedServices | undefined;

  constructor(renderRoot: ShadowRoot) {
    this.renderRoot = renderRoot;
  }

  initialize(
    hass: HomeAssistant,
    config: InventoryConfig,
    renderCallback: () => void,
    refreshCallback: () => void,
    updateItemsCallback: (items: InventoryItem[], sortMethod: string) => void,
    getFreshState: () => { hass: HomeAssistant; config: InventoryConfig },
    translations: TranslationData,
  ): InitializedServices | undefined {
    if (this.isInitialized && this.services) {
      return this.services;
    }

    if (!hass || !config || !this.renderRoot) {
      return undefined;
    }

    try {
      const services = new Services(hass);
      const filters = new Filters(this.renderRoot);
      const renderer = new Renderer(this.renderRoot);
      const state = new State();

      state.setRenderCallback(renderCallback);

      const getInventoryId = (entityId: string) => Utilities.getInventoryId(hass, entityId);
      const modals = new Modals(this.renderRoot, services, getInventoryId, refreshCallback);

      const eventHandler = new EventHandler(
        this.renderRoot,
        services,
        modals,
        filters,
        config,
        hass,
        renderCallback,
        updateItemsCallback,
        getFreshState,
        translations,
      );

      this.services = {
        services,
        modals,
        filters,
        renderer,
        state,
        eventHandler,
      };

      this.isInitialized = true;
      return this.services;
    } catch (error) {
      console.error('Failed to initialize modules:', error);
      return undefined;
    }
  }

  updateDependencies(hass: HomeAssistant, config: InventoryConfig): void {
    if (this.services && this.isInitialized) {
      this.services.eventHandler.updateDependencies(config, hass);
    }
  }

  getServices(): InitializedServices | undefined {
    return this.isInitialized ? this.services : undefined;
  }

  isReady(): boolean {
    return this.isInitialized && this.services !== undefined;
  }

  cleanup(): void {
    if (this.services) {
      this.services.eventHandler?.cleanupEventListeners();
      this.services.state?.cleanup();
      this.services.modals?.destroy();
    }

    this.services = undefined;
    this.isInitialized = false;
  }
}
