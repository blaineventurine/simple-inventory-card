import { Services } from '../services/services';
import { Modals } from '../services/modals';
import { Filters } from '../services/filters';
import { Renderer } from '../services/renderer';
import { State } from '../services/state';
import { Utils } from '../utils/utils';
import { ELEMENTS, ACTIONS, DEFAULTS, MESSAGES, CSS_CLASSES } from '../utils/constants';
import { HomeAssistant, InventoryItem, InventoryConfig } from '../types/home-assistant';
import { ConfigEditor } from './configEditor';
import { LitElement } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';
import packageJson from '../../package.json';

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
  private services: Services | null = null;
  private modals: Modals | null = null;
  private filters: Filters | null = null;
  private renderer: Renderer | null = null;
  private state: State | null = null;
  private _config: InventoryConfig | null = null;
  private _hass: HomeAssistant | null = null;
  private _todoLists: Array<{ id: string; name: string }> = [];
  private _isInitialized = false;
  private _eventListenersSetup = false;
  private _updateTimeout: ReturnType<typeof setTimeout> | null = null;
  private static _globalEventListenersSetup = false;
  private static _currentInstance: SimpleInventoryCard | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    if (SimpleInventoryCard._currentInstance && SimpleInventoryCard._currentInstance !== this) {
      SimpleInventoryCard._currentInstance._cleanupEventListeners();
    }

    SimpleInventoryCard._currentInstance = this;
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
    if (entityId && this.state && this.state.hasRealEntityChange(hass, entityId)) {
      if (this.state.userInteracting) {
        this.state.debouncedRender();
      } else {
        this.render();
      }
    }
  }

  render(): void {
    if (!this._config || !this._hass || !this.shadowRoot) {
      return;
    }

    try {
      const entityId = this._config.entity;
      const state = this._hass.states[entityId];

      if (!state) {
        this._renderError(`Entity ${entityId} not found. Please check your configuration.`);
        return;
      }

      if (!this._initializeModules()) {
        this._renderError('Failed to initialize card components');
        return;
      }

      if (!this.filters || !this.renderer) {
        this._renderError('Card components not properly initialized');
        return;
      }

      const filters = this.filters.getCurrentFilters(entityId);
      const sortMethodElement = this.shadowRoot.getElementById(
        ELEMENTS.SORT_METHOD
      ) as HTMLSelectElement | null;
      const sortMethod = sortMethodElement?.value || DEFAULTS.SORT_METHOD;

      const allItems = this._validateItems(state.attributes?.items || []);
      const filteredItems = this.filters.filterItems(allItems, filters);
      const sortedItems = this.filters.sortItems(filteredItems, sortMethod);

      this.renderer.renderCard(state, entityId, sortedItems, filters, sortMethod, this._todoLists);
      this._setupEventListeners();
      this.filters.updateFilterIndicators(filters);
      this._trackUserInteraction();
    } catch (error) {
      console.error('Error rendering card:', error);
      this._renderError('An error occurred while rendering the card');
    }
  }

  private _initializeModules(): boolean {
    if (this._isInitialized) {
      return true;
    }

    if (!this._hass || !this._config || !this.shadowRoot) {
      return false;
    }

    try {
      this.services = new Services(this._hass);
      this.filters = new Filters(this.shadowRoot);
      this.renderer = new Renderer(this.shadowRoot);
      this.state = new State();
      this.state.setRenderCallback(() => this.render());

      const getInventoryId = (entityId: string) => Utils.getInventoryId(this._hass!, entityId);
      this.modals = new Modals(this.shadowRoot, this.services, getInventoryId, () =>
        this._refreshAfterSave()
      );

      this._isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize modules:', error);
      return false;
    }
  }

  private _refreshAfterSave(): void {
    setTimeout(() => {
      if (this._hass && this._config) {
        this.render();
      }
    }, 50);
  }

  private _updateTodoLists(): void {
    if (!this._hass) {
      return;
    }

    this._todoLists = Object.keys(this._hass.states)
      .filter((entityId) => entityId.startsWith('todo.'))
      .map((entityId) => ({
        id: entityId,
        name: this._hass!.states[entityId].attributes?.friendly_name || entityId.split('.')[1],
      }));
  }

  private _updateItemsOnly(items: InventoryItem[], sortMethod: string): void {
    if (!this.shadowRoot) return;

    const itemsContainer = this.shadowRoot.querySelector('.items-container');
    if (!itemsContainer) {
      return;
    }

    import('../templates/itemList.ts')
      .then(({ createItemsList }) => {
        itemsContainer.innerHTML = createItemsList(items, sortMethod, this._todoLists);
      })
      .catch((error) => {
        console.error('Error loading templates:', error);
      });
  }

  private _validateItems(items: any[]): InventoryItem[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.filter((item): item is InventoryItem => {
      if (!item || typeof item !== 'object' || !item.name || typeof item.name !== 'string') {
        return false;
      }

      item.quantity =
        typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
      item.unit = typeof item.unit === 'string' ? item.unit : '';
      item.category = typeof item.category === 'string' ? item.category : '';
      item.expiry_date = typeof item.expiry_date === 'string' ? item.expiry_date : '';
      item.todo_list = typeof item.todo_list === 'string' ? item.todo_list : '';
      item.auto_add_enabled = Boolean(item.auto_add_enabled);
      item.threshold = typeof item.threshold === 'number' ? item.threshold : 0;

      return true;
    });
  }

  private _cleanupEventListeners(): void {
    if (this.shadowRoot && this._boundClickHandler) {
      this.shadowRoot.removeEventListener('click', this._boundClickHandler);
      this.shadowRoot.removeEventListener('change', this._boundChangeHandler);
    }
    SimpleInventoryCard._globalEventListenersSetup = false;
  }

  private _setupEventListeners(): void {
    if (SimpleInventoryCard._globalEventListenersSetup || !this.shadowRoot) {
      return;
    }

    this._boundClickHandler = this._handleClick.bind(this);
    this._boundChangeHandler = this._handleChange.bind(this);
    this.shadowRoot.addEventListener('click', this._boundClickHandler);
    this.shadowRoot.addEventListener('change', this._boundChangeHandler);

    if (this._config && this.filters) {
      this.filters.setupSearchInput(this._config.entity, () => this._handleSearchChange());
    }

    SimpleInventoryCard._globalEventListenersSetup = true;
  }

  private _trackUserInteraction(): void {
    if (this.state && this.shadowRoot) {
      this.state.trackUserInteraction(this.shadowRoot);
    }
  }

  private _handleSearchChange(): void {
    if (!this._config || !this._hass || !this.filters) {
      return;
    }

    const entityId = this._config.entity;
    const state = this._hass.states[entityId];
    if (!state) {
      return;
    }

    const filters = this.filters.getCurrentFilters(entityId);
    const sortMethodElement = this.shadowRoot?.getElementById(
      ELEMENTS.SORT_METHOD
    ) as HTMLSelectElement | null;
    const sortMethod = sortMethodElement?.value || DEFAULTS.SORT_METHOD;

    const allItems = this._validateItems(state.attributes?.items || []);
    const filteredItems = this.filters.filterItems(allItems, filters);
    const sortedItems = this.filters.sortItems(filteredItems, sortMethod);

    // Update only the items container, not the whole card
    this._updateItemsOnly(sortedItems, sortMethod);
    this.filters.updateFilterIndicators(filters);
  }

  private async _handleClick(e: Event): Promise<void> {
    const target = e.target as HTMLElement;

    if (target.tagName === 'BUTTON' && target.hasAttribute('data-processing')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (target.dataset.action && target.dataset.name) {
      e.preventDefault();
      e.stopPropagation();
      await this._handleItemAction(target, target.dataset.action, target.dataset.name);
      return;
    }

    // Handle modal clicks first (let modals handle their own logic)
    if (this.modals?.handleModalClick(e as MouseEvent)) {
      return; // Don't prevent default - let modals handle it
    }

    const buttonId = target.id;
    if (buttonId && target.tagName === 'BUTTON') {
      switch (buttonId) {
        case ELEMENTS.OPEN_ADD_MODAL:
          e.preventDefault();
          e.stopPropagation();
          this.modals?.openAddModal();
          break;
        case ELEMENTS.ADD_ITEM_BTN:
          e.preventDefault();
          e.stopPropagation();
          await this._handleAddItem();
          break;
        case ELEMENTS.ADVANCED_SEARCH_TOGGLE:
          e.preventDefault();
          e.stopPropagation();
          this._toggleAdvancedFilters();
          break;
        case ELEMENTS.CLEAR_FILTERS:
          e.preventDefault();
          e.stopPropagation();
          this._clearFilters();
          break;
        default:
          // Don't prevent default for buttons we don't handle
          return;
      }
      return;
    }

    if (target.tagName === 'BUTTON') {
      if (target.classList.contains(CSS_CLASSES.SAVE_BTN)) {
        e.preventDefault();
        e.stopPropagation();
        if (target.closest(`#${ELEMENTS.EDIT_MODAL}`)) {
          await this._handleSaveEdits();
        }
        return;
      }

      if (target.classList.contains(CSS_CLASSES.CANCEL_BTN)) {
        e.preventDefault();
        e.stopPropagation();
        if (target.closest(`#${ELEMENTS.ADD_MODAL}`)) {
          this.modals?.closeAddModal();
        } else if (target.closest(`#${ELEMENTS.EDIT_MODAL}`)) {
          this.modals?.closeEditModal();
        }
        return;
      }
    }
  }

  private _handleChange(e: Event): void {
    const target = e.target as HTMLElement;

    if (
      target instanceof HTMLSelectElement &&
      (target.id === ELEMENTS.FILTER_CATEGORY ||
        target.id === ELEMENTS.FILTER_QUANTITY ||
        target.id === ELEMENTS.FILTER_EXPIRY)
    ) {
      this._autoApplyFilter(target);
      return;
    }

    if (target.id === ELEMENTS.SORT_METHOD) {
      this._debouncedRender();
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      target.type === 'checkbox' &&
      (target.id.includes('auto') || target.id.includes('AUTO_ADD'))
    ) {
      setTimeout(() => {
        const controls = target.parentElement?.querySelector('.auto-add-controls') as HTMLElement;
        if (controls) {
          controls.style.display = target.checked ? 'block' : 'none';
        }
      }, 0);
    }
  }

  private _autoApplyFilter(selectElement: HTMLSelectElement): void {
    if (!this._config || !this.filters) return;

    try {
      const filters = this.filters.getCurrentFilters(this._config.entity);

      switch (selectElement.id) {
        case ELEMENTS.FILTER_CATEGORY:
          filters.category = selectElement.value;
          break;
        case ELEMENTS.FILTER_QUANTITY:
          filters.quantity = selectElement.value;
          break;
        case ELEMENTS.FILTER_EXPIRY:
          filters.expiry = selectElement.value;
          break;
      }

      this.filters.saveFilters(this._config.entity, filters);
      this.render();
    } catch (error) {
      console.error('Error auto-applying filter:', error);
    }
  }

  private _debouncedRender(): void {
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }
    this._updateTimeout = setTimeout(() => this.render(), 100);
  }

  private async _handleAddItem(): Promise<void> {
    if (!this._config || !this.modals) return;

    const success = await this.modals.addItem(this._config);
    if (success) {
      this.modals.closeAddModal();
    }
  }

  private async _handleSaveEdits(): Promise<void> {
    if (!this._config || !this.modals) return;

    const success = await this.modals.saveEditModal(this._config);
    if (success) {
      this.modals.closeEditModal();
    }
  }

  private async _handleItemAction(
    button: HTMLElement,
    action: string,
    itemName: string
  ): Promise<void> {
    if (!this._config || !this._hass || !this.services) {
      console.warn('Missing required dependencies for item action');
      return;
    }

    if (button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true') {
      return;
    }

    button.setAttribute('data-processing', 'true');
    button.setAttribute('disabled', 'true');
    button.style.opacity = '0.6';
    button.style.pointerEvents = 'none';

    try {
      const inventoryId = Utils.getInventoryId(this._hass, this._config.entity);

      switch (action) {
        case ACTIONS.INCREMENT:
          await this.services.incrementItem(inventoryId, itemName);
          break;
        case ACTIONS.DECREMENT:
          await this.services.decrementItem(inventoryId, itemName);
          break;
        case ACTIONS.REMOVE:
          if (confirm(MESSAGES.CONFIRM_REMOVE(itemName))) {
            await this.services.removeItem(inventoryId, itemName);
          }
          break;
        case ACTIONS.OPEN_EDIT_MODAL:
          this.modals?.openEditModal(itemName, this._hass, this._config);
          break;
        default:
          console.warn(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error performing ${action} on ${itemName}:`, error);
    } finally {
      setTimeout(() => {
        button.removeAttribute('data-processing');
        button.removeAttribute('disabled');
        button.style.opacity = '1';
        button.style.pointerEvents = 'auto';
      }, 200);
    }
  }

  private _toggleAdvancedFilters(): void {
    if (!this._config || !this.filters) return;

    try {
      const entityId = this._config.entity;
      const filters = this.filters.getCurrentFilters(entityId);

      filters.showAdvanced = !filters.showAdvanced;

      this.filters.saveFilters(entityId, filters);
      this.render();
    } catch (error) {
      console.error('Error toggling advanced filters:', error);
    }
  }

  private _clearFilters(): void {
    if (!this._config || !this.filters || !this.shadowRoot) return;

    try {
      this.filters.clearFilters(this._config.entity);

      const searchInput = this.shadowRoot.getElementById(
        ELEMENTS.SEARCH_INPUT
      ) as HTMLInputElement | null;
      if (searchInput) {
        searchInput.value = '';
      }

      this.render();
    } catch (error) {
      console.error('Error clearing filters:', error);
      alert('Error clearing filters. Please try again.');
    }
  }

  private _renderError(message: string): void {
    if (!this.shadowRoot) return;

    if (this.renderer) {
      this.renderer.renderError(message);
    } else {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="card-content">
            <div class="error-message" style="color: var(--error-color); padding: 16px; text-align: center;">
              <p><strong>Error:</strong> ${Utils.sanitizeHtml(message)}</p>
            </div>
          </div>
        </ha-card>
      `;
    }
  }

  getCardSize(): number {
    return 4;
  }

  disconnectedCallback(): void {
    this._cleanupEventListeners();
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }

    if (this.state) {
      this.state.cleanup();
    }

    if (this.modals) {
      this.modals.destroy();
    }

    if (this._eventListenersSetup && this.shadowRoot) {
      this.shadowRoot.removeEventListener('click', this._handleClick);
      this.shadowRoot.removeEventListener('change', this._handleChange);
      this._eventListenersSetup = false;
    }
  }

  static getConfigElement(): HTMLElement {
    return document.createElement('simple-inventory-config-editor');
  }

  static getStubConfig(): InventoryConfig | {} {
    return {};
  }
}

export { SimpleInventoryCard };

if (!customElements.get('simple-inventory-card')) {
  // @ts-ignore - LitElement does extend HTMLElement at runtime
  customElements.define('simple-inventory-card', SimpleInventoryCard);
}

if (!customElements.get('simple-inventory-config-editor')) {
  // IMPORTANT: This name must match what's returned by getConfigElement()
  // @ts-ignore
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
  'color: steelblue; background: black; font-weight: bold;'
);
