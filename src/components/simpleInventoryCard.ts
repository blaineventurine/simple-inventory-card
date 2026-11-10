import packageJson from '../../package.json';

import { ConfigEditor } from './configEditor';
import { HomeAssistant } from '@/types/homeAssistant';
import { InventoryConfig, InventoryItem } from '@/types/inventory';
import { LifecycleManager } from '../services/lifecycleManager';
import { InventoryStore } from '../services/inventoryStore';
import { showHassNotification } from '../utils/notify';
import { stopAllBarcodeScanners } from '../services/barcodeTagInput';
import { LitElement } from 'lit-element';
import { RenderingCoordinator } from '../services/renderingCoordinator';
import { Utilities } from '../utils/utilities';
import { InventoryResolver } from '../utils/inventoryResolver';
import { TranslationManager } from '@/services/translationManager';
import { createCompatibilityBanner } from '../utils/backendCompatibility';
import { Capabilities, CardContext } from '@/types/cardContext';

let cardDescription = 'A card to manage your inventories';

/**
 * The list view of one inventory: config, DOM and rendering. Its data, live updates and refresh
 * policy live in an `InventoryStore`; the card's sheets, forms, viewer and scanner hold its
 * renders while open (`InventoryStore.hold`), and release those holds when a render replaces
 * them. `State.hasRealEntityChange` stays in the card for now (a dashboard view would need it
 * in the store).
 */
class SimpleInventoryCard extends LitElement {
  private _config: InventoryConfig | undefined = undefined;
  private _todoLists: Array<{ id: string; name: string }> = [];
  private lifecycleManager: LifecycleManager;
  private renderingCoordinator: RenderingCoordinator;
  private readonly _store = new InventoryStore({
    showError: (message) => showHassNotification(this.shadowRoot ?? this, message),
    compatibilityChecked: () => this._applyCompatibilityBanner(),
  });
  /** The item `openItem` asked for, until the items are loaded and it opens (or is unknown). */
  private _pendingOpen: string | undefined = undefined;
  /** The item page `showItem` asked for, until the items are loaded and it shows. */
  private _pendingItemPage: string | undefined = undefined;

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    this.lifecycleManager = new LifecycleManager(shadowRoot);
    this.renderingCoordinator = new RenderingCoordinator(this.lifecycleManager, shadowRoot);
    this._store.subscribe(() => this._renderView());
  }

  /**
   * HA re-attaches the same element when the masonry view moves cards between columns (window
   * width, phone rotation, sidebar): the DOM, open sheets and forms included, is still intact,
   * so only the document listeners come back, plus a refresh missed while detached.
   */
  connectedCallback(): void {
    super.connectedCallback();
    this._store.resume(() => this.lifecycleManager.resume());
  }

  /**
   * Releases what outlives a detached card (document listeners, camera, timers); DOM, services
   * and state stay for a re-attach. A card left on another view is then garbage, not a leak.
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._store.pause();
    this.lifecycleManager.pause();
  }

  /** `hidden`: the Inventory panel hides the cards of inactive tabs (a dashboard never does). */
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'hidden'];
  }

  /**
   * A hidden card stays connected and live (its tab keeps its sheets and gets live updates) but
   * releases the camera, as on detach, and its item page stops refreshing its history; shown
   * again, a scanner that was showing its camera starts it again, and a history refresh missed
   * meanwhile runs.
   */
  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    super.attributeChangedCallback(name, oldValue, value);
    if (name !== 'hidden' || (oldValue === null) === (value === null)) {
      return;
    }
    const detailView = this.lifecycleManager.getServices()?.detailView;
    if (value !== null) {
      stopAllBarcodeScanners();
      detailView?.pause('hidden');
      return;
    }
    // Shown: the page waits for a re-attach too when it is also detached.
    detailView?.resume('hidden');
    if (this.isConnected) {
      this.lifecycleManager.resumeScanners();
    }
  }

  setConfig(config: InventoryConfig): void {
    if (!config.entity) {
      throw new Error('Entity is required');
    }
    this._config = config;
    this._store.setEntity(config.entity);
  }

  /**
   * Updates the card when Home Assistant state changes
   * @param hass - The Home Assistant instance
   */
  set hass(hass: HomeAssistant) {
    this._todoLists = InventoryResolver.extractTodoLists(hass);
    if (this._store.setHass(hass)) {
      return;
    }
    const entityId = this._config?.entity;
    const services = this.lifecycleManager.getServices();
    // Runs on every update to track the state, so a later fallback from live updates compares
    // against the latest one.
    if (entityId && services && services.state.hasRealEntityChange(hass, entityId)) {
      this._store.entityChanged(services.state.userInteracting);
    }
  }

  render(): void {
    this._store.render();
  }

  /** Paints the store's current data (the store decided a render may run now). */
  private _renderView(): void {
    if (!this._config || !this._store.hass || !this.renderRoot) {
      return;
    }

    if (!this.lifecycleManager.isReady()) {
      const services = this.lifecycleManager.initialize(() => this._getContext(), {
        render: () => {
          this._fetchItems();
        },
        refreshAfterSave: () => this._store.refreshAfterSave(),
        updateItems: (items, sortMethod) => this._updateItemsOnly(items, sortMethod),
        hold: (kind, reason) => this._store.hold(kind, reason),
      });

      if (!services) {
        this.renderingCoordinator.renderError('Failed to initialize card components', this._config);
        return;
      }
    }

    this.renderingCoordinator.render(
      this._getContext(),
      this._todoLists,
      (items: InventoryItem[]) => Utilities.validateInventoryItems(items),
    );
    // The render replaced every sheet, form and panel that could hold; a hold left now is a
    // holder that missed its release, and would silently keep background refreshes back.
    const outlived = this._store.holds();
    if (outlived.length > 0) {
      console.warn('Simple Inventory: holds outlived a full render; releasing them:', outlived);
      this._store.releaseHolds();
    }
    // Each full render rebuilds <ha-card>, so the banner must be re-applied.
    this._applyCompatibilityBanner();
    this._openPendingItem();
    this._showPendingItemPage();
  }

  /**
   * Shows the page of the item with id `id` in place of the list. Before the items' first load
   * the request waits for it; an unknown id shows the page's "no longer exists" state.
   */
  public showItem(id: string): void {
    this._pendingItemPage = id;
    this._showPendingItemPage();
  }

  /** Shows the list again, as it was left (search, filters, layout and scroll position). */
  public showList(): void {
    this._pendingItemPage = undefined;
    this.lifecycleManager.getServices()?.detailView.hide();
  }

  private _showPendingItemPage(): void {
    const id = this._pendingItemPage;
    const services = this.lifecycleManager.getServices();
    if (id === undefined || !this._store.loaded || !services) {
      return;
    }
    this._pendingItemPage = undefined;
    services.detailView.show(id);
  }

  /**
   * Opens an item's edit sheet as tapping its row does. Before the items' first load the
   * request waits for it (a later call replaces an earlier one); an unknown name does nothing.
   */
  public openItem(name: string): void {
    this._pendingOpen = name;
    this._openPendingItem();
  }

  private _openPendingItem(): void {
    const name = this._pendingOpen;
    const services = this.lifecycleManager.getServices();
    if (name === undefined || !this._store.loaded || !services) {
      return;
    }
    this._pendingOpen = undefined;
    if (this._store.items.some((item) => item.name === name)) {
      services.eventHandler.itemActions.openEdit(name);
    }
  }

  /** What the connected integration supports (from get_info). */
  public get capabilities(): Capabilities {
    return this._store.capabilities;
  }

  /** The card's current state, as the services read it. */
  private _getContext(): CardContext {
    // Both are set before the first render and never unset.
    const { hass, translations, items, capabilities } = this._store;
    const config = this._config;
    if (!hass || !config) {
      throw new Error('Simple Inventory card state read before hass and config were set');
    }
    return { hass, config, translations, items, capabilities };
  }

  private _applyCompatibilityBanner(): void {
    // Only an outdated backend shows a banner, and the status never changes after the check.
    const compatibility = this._store.compatibility;
    if (compatibility?.status !== 'outdated') return;
    const card = this.shadowRoot?.querySelector('ha-card');
    if (!card) return;
    card.querySelector('#compat-banner')?.remove();
    card.insertAdjacentHTML(
      'afterbegin',
      createCompatibilityBanner(compatibility, this._store.translations),
    );
  }

  public localize(key: string, params?: Record<string, unknown>, fallback?: string): string {
    return TranslationManager.localize(this._store.translations, key, params, fallback);
  }

  /** Fetches the items and re-renders (see `InventoryStore.fetch`). */
  private _fetchItems(background = false): Promise<void> {
    return this._store.fetch(background);
  }

  private _updateItemsOnly(items: InventoryItem[], sortMethod: string): void {
    this.renderingCoordinator.updateItemsOnly(
      this._getContext(),
      items,
      sortMethod,
      this._todoLists,
    );
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
