import packageJson from '../../package.json';

import { ConfigEditor } from './configEditor';
import { HomeAssistant, InventoryConfig, InventoryItem } from '@/types/homeAssistant';
import { LifecycleManager } from '../services/lifecycleManager';
import { Services } from '../services/services';
import { LitElement } from 'lit-element';
import { RenderingCoordinator } from '../services/renderingCoordinator';
import { Utilities } from '../utils/utilities';
import { InventoryResolver } from '../utils/inventoryResolver';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';

let cardDescription = 'A card to manage your inventories';

class SimpleInventoryCard extends LitElement {
  private _config: InventoryConfig | undefined = undefined;
  private _hass: HomeAssistant | undefined = undefined;
  private _todoLists: Array<{ id: string; name: string }> = [];
  private _translations: TranslationData = {};
  private _items: InventoryItem[] = [];
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

    if (!oldHass) {
      this._loadTranslations().then(() => {
        this._updateTodoLists();
        this._fetchItems();
      });
      return;
    }

    if (
      oldHass &&
      (oldHass.language !== hass.language || oldHass.selectedLanguage !== hass.selectedLanguage)
    ) {
      this._loadTranslations().then(() => {
        this._updateTodoLists();
        this.render();
      });
      return;
    }

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
        const scanPanel = this.shadowRoot?.getElementById('scan-panel') as HTMLElement | null;
        if (scanPanel && scanPanel.style.display !== 'none') {
          return;
        }
        if (services.state.userInteracting) {
          services.state.debouncedRender();
        } else {
          this._fetchItems();
        }
      }
    }
  }

  render(): void {
    if (!this._config || !this._hass || !this.renderRoot) {
      return;
    }

    if (!this._translations || Object.keys(this._translations).length === 0) {
      return;
    }

    if (!this.lifecycleManager.isReady()) {
      const services = this.lifecycleManager.initialize(
        this._hass,
        this._config,
        () => {
          this._fetchItems();
        },
        () => this._refreshAfterSave(),
        (items, sortMethod) => this._updateItemsOnly(items, sortMethod),
        () => ({
          hass: this._hass!,
          config: this._config!,
          translations: this._translations,
          items: this._items,
        }),
        this._translations,
      );

      if (!services) {
        this.renderingCoordinator.renderError('Failed to initialize card components');
        return;
      }
    }

    this.renderingCoordinator.render(
      this._config,
      this._hass,
      this._todoLists,
      this._translations,
      this._items,
      (items: InventoryItem[]) => Utilities.validateInventoryItems(items),
    );
  }

  private async _loadTranslations(): Promise<void> {
    const language = this._hass?.language || this._hass?.selectedLanguage || 'en';

    try {
      this._translations = await TranslationManager.loadTranslations(language);
    } catch (error) {
      console.warn('Failed to load translations:', error);
      this._translations = {};
    }
  }

  public localize(key: string, params?: Record<string, any>, fallback?: string): string {
    return TranslationManager.localize(this._translations, key, params, fallback);
  }

  private _refreshAfterSave(): void {
    this.renderingCoordinator.refreshAfterSave(() => {
      this._fetchItems();
    });
  }

  private async _fetchItems(): Promise<void> {
    if (!this._hass || !this._config) return;
    const inventoryId = InventoryResolver.getInventoryId(this._hass, this._config.entity);
    if (!inventoryId) return;
    try {
      const svc = this.lifecycleManager.getServices()?.services ?? new Services(this._hass);
      this._items = await svc.getItems(inventoryId);
    } catch (error) {
      console.warn('Failed to fetch inventory items:', error);
    }
    this.render();
  }

  private _updateItemsOnly(items: InventoryItem[], sortMethod: string): void {
    this.renderingCoordinator.updateItemsOnly(
      items,
      sortMethod,
      this._todoLists,
      this._translations,
      this._config,
    );
  }

  private _updateTodoLists(): void {
    if (!this._hass) {
      return;
    }
    this._todoLists = InventoryResolver.extractTodoLists(this._hass);
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

async function loadCardDescription(): Promise<void> {
  try {
    const language = document.documentElement.lang || navigator.language.substring(0, 2) || 'en';
    const translations = await TranslationManager.loadTranslations(language);

    const translatedDescription = TranslationManager.localize(
      translations,
      'card.description',
      undefined,
      cardDescription,
    );

    if (translatedDescription !== cardDescription) {
      cardDescription = translatedDescription;

      const existingCard = window.customCards?.find(
        (card) => card.type === 'simple-inventory-card',
      );
      if (existingCard) {
        existingCard.description = cardDescription;
      }
    }
  } catch (error) {
    console.warn('Failed to load card description translation:', error);
  }
}

loadCardDescription();

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
  description: cardDescription,
  preview: true,
  documentationURL: 'https://github.com/blaineventurine/simple-inventory-card',
};

const existingCard = window.customCards.find((card) => card.type === 'simple-inventory-card');
if (!existingCard) {
  window.customCards.push(cardConfig);
}

globalThis.setTimeout(() => {
  const event = new Event('custom_card_update', {
    bubbles: true,
    cancelable: false,
  });
  document.dispatchEvent(event);
}, 2000);

console.info(
  `%c Simple Inventory Card %c ${packageJson.version}`,
  'color: steelblue; background: black; font-weight: bold;',
);
