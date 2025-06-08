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
  private boundClickHandler: ((e: Event) => void) | null = null;
  private boundChangeHandler: ((e: Event) => void) | null = null;
  private _config: InventoryConfig | null = null;
  private _hass: HomeAssistant | null = null;
  private _todoLists: Array<{ id: string; name: string }> = [];
  private _isInitialized = false;
  private _renderTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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

    // Always render on first load
    if (!oldHass) {
      this.render();
      return;
    }

    // Check if our entity actually changed
    const entityId = this._config?.entity;
    if (entityId && this.state && this.state.hasRealEntityChange(hass, entityId)) {
      // If user is interacting, delay the render
      if (this.state.userInteracting) {
        this.state.debouncedRender();
      } else {
        this.render();
      }
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

      // Set up the render callback for state management
      this.state.setRenderCallback(() => this.render());

      const getInventoryId = (entityId: string) => Utils.getInventoryId(this._hass!, entityId);
      this.modals = new Modals(this.shadowRoot, this.services, getInventoryId);

      this._isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize modules:', error);
      return false;
    }
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

      // Track user interaction for state management
      this._trackUserInteraction();
    } catch (error) {
      console.error('Error rendering card:', error);
      this._renderError('An error occurred while rendering the card');
    }
  }

  private _updateItemsOnly(items: InventoryItem[], sortMethod: string): void {
    if (!this.shadowRoot) return;

    const itemsContainer = this.shadowRoot.querySelector('.items-container');
    if (!itemsContainer) {
      return;
    }

    // Use the templates function to create items list HTML
    // This needs to be imported from templates.ts
    import('../templates')
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

      // Ensure valid data types
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

  private _setupEventListeners(): void {
    if (!this.shadowRoot) return;

    if (this.boundClickHandler) {
      this.shadowRoot.removeEventListener('click', this.boundClickHandler);
    }
    if (this.boundChangeHandler) {
      this.shadowRoot.removeEventListener('change', this.boundChangeHandler);
    }

    this.boundClickHandler = this._handleClick.bind(this);
    this.boundChangeHandler = this._handleChange.bind(this);

    this.shadowRoot.addEventListener('click', this.boundClickHandler);
    this.shadowRoot.addEventListener('change', this.boundChangeHandler);

    if (this._config && this.filters) {
      this.filters.setupSearchInput(this._config.entity, () => this._handleSearchChange());
    }

    this._setupEnterKeySupport();
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

  private _setupEnterKeySupport(): void {
    if (!this.shadowRoot) return;

    const addModal = this.shadowRoot.getElementById(ELEMENTS.ADD_MODAL);
    if (addModal) {
      const inputs = addModal.querySelectorAll('input:not([type="checkbox"])');
      inputs.forEach((input: HTMLInputElement) => {
        input.addEventListener('keypress', ((e: Event) => {
          const keyEvent = e as KeyboardEvent;
          if (keyEvent.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const nameInput = this.shadowRoot?.getElementById(
              ELEMENTS.ITEM_NAME
            ) as HTMLInputElement | null;
            const name = nameInput?.value?.trim();
            if (name) {
              this._handleAddItem();
            }
          }
        }) as EventListener);
      });
    }

    const settingsModal = this.shadowRoot.getElementById(ELEMENTS.SETTINGS_MODAL);
    if (settingsModal) {
      const inputs = settingsModal.querySelectorAll('input:not([type="checkbox"])');
      inputs.forEach((input: HTMLInputElement) => {
        input.addEventListener('keypress', (e: Event) => {
          const keyEvent = e as KeyboardEvent;
          if (keyEvent.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            this._handleSaveSettings();
          }
        });
      });
    }
  }

  private _handleClick(e: Event): void {
    const target = e.target as HTMLElement;

    // Let modals handle their clicks first
    if (this.modals) {
      const modalHandled = this.modals.handleModalClick(e as MouseEvent);
      if (modalHandled) {
        return;
      }
    }

    // Use more specific selectors for buttons to prevent overlap
    if (target.dataset.action) {
      e.preventDefault();
      e.stopPropagation();
      this._handleItemAction(target);
      return;
    }

    // Handle specific button IDs
    if (target.id === ELEMENTS.OPEN_ADD_MODAL) {
      e.preventDefault();
      e.stopPropagation();
      this.modals?.openAddModal();
      return;
    }

    if (target.id === ELEMENTS.ADVANCED_SEARCH_TOGGLE) {
      e.preventDefault();
      e.stopPropagation();
      this._toggleAdvancedFilters();
      return;
    }

    if (target.id === ELEMENTS.APPLY_FILTERS) {
      e.preventDefault();
      e.stopPropagation();
      this._applyFilters();
      return;
    }

    if (target.id === ELEMENTS.CLEAR_FILTERS) {
      e.preventDefault();
      e.stopPropagation();
      this._clearFilters();
      return;
    }

    // Handle other button types
    if (target.id === ELEMENTS.ADD_ITEM_BTN) {
      e.preventDefault();
      e.stopPropagation();
      this._handleAddItem();
      return;
    }

    // Handle class-based buttons
    if (target.classList.contains(CSS_CLASSES.SAVE_BTN)) {
      e.preventDefault();
      e.stopPropagation();
      if (target.closest(`#${ELEMENTS.SETTINGS_MODAL}`)) {
        this._handleSaveSettings();
      }
      return;
    }

    if (target.classList.contains(CSS_CLASSES.CANCEL_BTN)) {
      e.preventDefault();
      e.stopPropagation();
      if (target.closest(`#${ELEMENTS.ADD_MODAL}`)) {
        this.modals?.closeAddModal();
      } else if (target.closest(`#${ELEMENTS.SETTINGS_MODAL}`)) {
        this.modals?.closeSettingsModal();
      }
      return;
    }
  }

  private _handleChange(e: Event): void {
    const target = e.target as HTMLElement;
    if (target.id === ELEMENTS.SORT_METHOD) {
      this.render();
      return;
    }
  }

  private async _handleAddItem(): Promise<void> {
    if (!this._config || !this.modals) return;

    const success = await this.modals.addItem(this._config);
    if (success) {
      this.modals.closeAddModal();
    }
  }

  private async _handleSaveSettings(): Promise<void> {
    if (!this._config || !this.modals) return;

    const success = await this.modals.saveSettingsModal(this._config);
    if (success) {
      this.modals.closeSettingsModal();
    }
  }

  private async _handleItemAction(target: HTMLElement): Promise<void> {
    const isDisabled =
      target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true';

    if (isDisabled || !this._config || !this._hass || !this.services) {
      return;
    }

    const action = target.dataset.action;
    const itemName = target.dataset.name;

    if (!action || !itemName) {
      return;
    }

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

      case ACTIONS.OPEN_SETTINGS:
        this.modals?.openSettingsModal(itemName, this._hass, this._config);
        break;
    }
  }

  private _toggleAdvancedFilters(): void {
    if (!this._config || !this.filters) {
      console.log('Missing config or filters:', {
        config: !!this._config,
        filters: !!this.filters,
      });
      return;
    }

    try {
      const filters = this.filters.getCurrentFilters(this._config.entity);
      filters.showAdvanced = !filters.showAdvanced;
      this.filters.saveFilters(this._config.entity, filters);
      this.render();
    } catch (error) {
      console.error('Error toggling advanced filters:', error);
    }
  }

  private _applyFilters(): void {
    if (!this._config || !this.filters || !this.shadowRoot) return;

    try {
      const filters = this.filters.getCurrentFilters(this._config.entity);
      const categoryElement = this.shadowRoot.getElementById(
        ELEMENTS.FILTER_CATEGORY
      ) as HTMLSelectElement | null;
      const quantityElement = this.shadowRoot.getElementById(
        ELEMENTS.FILTER_QUANTITY
      ) as HTMLSelectElement | null;
      const expiryElement = this.shadowRoot.getElementById(
        ELEMENTS.FILTER_EXPIRY
      ) as HTMLSelectElement | null;

      if (categoryElement) {
        filters.category = categoryElement.value;
      }
      if (quantityElement) {
        filters.quantity = quantityElement.value;
      }
      if (expiryElement) {
        filters.expiry = expiryElement.value;
      }

      this.filters.saveFilters(this._config.entity, filters);
      this.render();
    } catch (error) {
      console.error('Error applying filters:', error);
      alert('Error applying filters. Please try again.');
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
      // Fallback if renderer isn't initialized
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
    if (this._renderTimeout) {
      clearTimeout(this._renderTimeout);
    }

    if (this.state) {
      this.state.cleanup();
    }

    if (this.modals) {
      this.modals.destroy();
    }

    if (this.boundClickHandler && this.shadowRoot) {
      this.shadowRoot.removeEventListener('click', this.boundClickHandler);
    }
    if (this.boundChangeHandler && this.shadowRoot) {
      this.shadowRoot.removeEventListener('change', this.boundChangeHandler);
    }
  }

  static getConfigElement(): HTMLElement {
    return document.createElement('simple-inventory-config-editor');
  }

  static getStubConfig(): InventoryConfig {
    return {
      entity: '',
      type: 'simple-inventory-card',
    };
  }
}

export { SimpleInventoryCard };

if (!customElements.get('simple-inventory-card')) {
  // @ts-ignore - LitElement does extend HTMLElement at runtime
  customElements.define('simple-inventory-card', SimpleInventoryCard);
  console.log('✅ Simple Inventory Card element defined');
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
  `%c STATUS-CARD %c ${packageJson.version} `,
  'color: steelblue; background: black; font-weight: bold;'
);
