import { Services } from './services';
import { Modals } from './modals';
import { Filters } from './filters';
import { Renderer } from './renderer';
import { State } from './state';
import { EventHandler } from './eventHandler';
import { HomeAssistant, InventoryConfig, InventoryItem } from '../types/home-assistant';
import { Utils } from '../utils/utils';

interface InitializedServices {
  services: Services;
  modals: Modals;
  filters: Filters;
  renderer: Renderer;
  state: State;
  eventHandler: EventHandler;
}

export class LifecycleManager {
  private static currentInstance: LifecycleManager | null = null;

  private renderRoot: ShadowRoot;
  private isInitialized = false;
  private services: InitializedServices | null = null;

  constructor(renderRoot: ShadowRoot) {
    this.renderRoot = renderRoot;

    // Handle singleton pattern - cleanup previous instance
    if (LifecycleManager.currentInstance && LifecycleManager.currentInstance !== this) {
      LifecycleManager.currentInstance.cleanup();
    }
    LifecycleManager.currentInstance = this;
  }

  initialize(
    hass: HomeAssistant,
    config: InventoryConfig,
    renderCallback: () => void,
    refreshCallback: () => void,
    updateItemsCallback: (items: InventoryItem[], sortMethod: string) => void,
  ): InitializedServices | null {
    if (this.isInitialized && this.services) {
      return this.services;
    }

    if (!hass || !config || !this.renderRoot) {
      return null;
    }

    try {
      const services = new Services(hass);
      const filters = new Filters(this.renderRoot);
      const renderer = new Renderer(this.renderRoot);
      const state = new State();

      state.setRenderCallback(renderCallback);

      const getInventoryId = (entityId: string) => Utils.getInventoryId(hass, entityId);
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
      return null;
    }
  }

  updateDependencies(hass: HomeAssistant, config: InventoryConfig): void {
    if (this.services && this.isInitialized) {
      this.services.eventHandler.updateDependencies(config, hass);
    }
  }

  getServices(): InitializedServices | null {
    return this.isInitialized ? this.services : null;
  }

  isReady(): boolean {
    return this.isInitialized && this.services !== null;
  }

  cleanup(): void {
    if (this.services) {
      this.services.eventHandler?.cleanupEventListeners();
      this.services.state?.cleanup();
      this.services.modals?.destroy();
    }

    this.services = null;
    this.isInitialized = false;

    if (LifecycleManager.currentInstance === this) {
      LifecycleManager.currentInstance = null;
    }
  }
}
