import packageJson from '../../package.json';

import { ConfigEditor } from './configEditor';
import { HomeAssistant, InventoryConfig, InventoryItem } from '../types/home-assistant';
import { LifecycleManager } from '../services/lifecycleManager';
import { LitElement } from 'lit-element';
import { RenderingCoordinator } from '../services/renderingCoordinator';
import { Utils } from '../utils/utils';

declare global {
  interface Window {
    customCards: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}

class SimpleInventoryCard extends LitElement {
  private _config: InventoryConfig | null = null;
  private _hass: HomeAssistant | null = null;
  private _todoLists: Array<{ id: string; name: string }> = [];
  private lifecycleManager: LifecycleManager;
  private renderingCoordinator: RenderingCoordinator;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.lifecycleManager = new LifecycleManager(this.shadowRoot!);
    this.renderingCoordinator = new RenderingCoordinator(this.lifecycleManager, this.shadowRoot!);
  }

  setConfig(config: InventoryConfig): void {
    if (!config.entity) {
      throw new Error('Entity is required');
    }
    this._config = config;
  }

  /**
   * Updates the card when Home Assistant state changes
   * @param hass - The Home Assistant instance
   */
  set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;
    this._updateTodoLists();

    if (!oldHass) {
      this.render();
      return;
    }

    const entityId = this._config?.entity;
    if (entityId) {
      this.lifecycleManager.updateDependencies(this._hass, this._config!);

      const services = this.lifecycleManager.getServices();
      if (services && services.state.hasRealEntityChange(hass, entityId)) {
        if (services.state.userInteracting) {
          services.state.debouncedRender();
        } else {
          this.render();
        }
      }
    }
  }

  render(): void {
    if (!this._config || !this._hass || !this.renderRoot) {
      return;
    }

    if (!this.lifecycleManager.isReady()) {
      const services = this.lifecycleManager.initialize(
        this._hass,
        this._config,
        () => this.render(),
        () => this._refreshAfterSave(),
        (items, sortMethod) => this._updateItemsOnly(items, sortMethod),
        () => ({ hass: this._hass!, config: this._config! }),
      );

      if (!services) {
        this.renderingCoordinator.renderError('Failed to initialize card components');
        return;
      }
    }

    this.renderingCoordinator.render(this._config, this._hass, this._todoLists, (items) =>
      Utils.validateInventoryItems(items),
    );
  }

  private _refreshAfterSave(): void {
    this.renderingCoordinator.refreshAfterSave(() => this.render());
  }

  private _updateItemsOnly(items: InventoryItem[], sortMethod: string): void {
    this.renderingCoordinator.updateItemsOnly(items, sortMethod, this._todoLists);
  }

  private _updateTodoLists(): void {
    if (!this._hass) {
      return;
    }
    this._todoLists = Utils.extractTodoLists(this._hass);
  }

  getCardSize(): number {
    return 4;
  }

  static getConfigElement(): HTMLElement {
    return document.createElement('simple-inventory-config-editor');
  }

  static getStubConfig(): InventoryConfig | object {
    return {};
  }
}

export { SimpleInventoryCard };

if (!customElements.get('simple-inventory-card')) {
  customElements.define('simple-inventory-card', SimpleInventoryCard);
}

if (!customElements.get('simple-inventory-config-editor')) {
  // IMPORTANT: This name must match what's returned by getConfigElement()
  customElements.define('simple-inventory-config-editor', ConfigEditor);
}

window.customCards = window.customCards || [];
const cardConfig = {
  type: 'simple-inventory-card',
  name: 'Simple Inventory Card',
  description: 'A card to manage your inventories',
  preview: true,
  documentationURL: 'https://github.com/blaineventurine/simple-inventory-card',
};

const existingCard = window.customCards.find((card) => card.type === 'simple-inventory-card');
if (!existingCard) {
  window.customCards.push(cardConfig);
}

window.setTimeout(() => {
  const event = new Event('custom_card_update', {
    bubbles: true,
    cancelable: false,
  });
  document.dispatchEvent(event);
}, 2000);

console.info(
  `%c Simple Inventory Card %c ${packageJson.version} `,
  'color: steelblue; background: black; font-weight: bold;',
);
