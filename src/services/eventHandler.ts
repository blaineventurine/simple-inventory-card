import { ELEMENTS, ACTIONS, DEFAULTS, MESSAGES, CSS_CLASSES } from '../utils/constants';
import { HomeAssistant, InventoryConfig, InventoryItem } from '../types/home-assistant';
import { Services } from './services';
import { Modals } from './modals';
import { Filters } from './filters';
import { Utils } from '../utils/utils';

export class EventHandler {
  private renderRoot: ShadowRoot;
  private services: Services;
  private modals: Modals;
  private filters: Filters;
  private config: InventoryConfig;
  private hass: HomeAssistant;
  private renderCallback: () => void;
  private updateItemsCallback: (items: InventoryItem[], sortMethod: string) => void;

  private boundClickHandler: ((e: Event) => Promise<void>) | null = null;
  private boundChangeHandler: ((e: Event) => void) | null = null;
  private eventListenersSetup = false;

  constructor(
    renderRoot: ShadowRoot,
    services: Services,
    modals: Modals,
    filters: Filters,
    config: InventoryConfig,
    hass: HomeAssistant,
    renderCallback: () => void,
    updateItemsCallback: (items: InventoryItem[], sortMethod: string) => void,
  ) {
    this.renderRoot = renderRoot;
    this.services = services;
    this.modals = modals;
    this.filters = filters;
    this.config = config;
    this.hass = hass;
    this.renderCallback = renderCallback;
    this.updateItemsCallback = updateItemsCallback;
  }

  setupEventListeners(): void {
    if (this.eventListenersSetup) {
      return;
    }

    this.boundClickHandler = this.handleClick.bind(this);
    this.boundChangeHandler = this.handleChange.bind(this);
    this.renderRoot.addEventListener('click', this.boundClickHandler);
    this.renderRoot.addEventListener('change', this.boundChangeHandler);

    this.filters.setupSearchInput(this.config.entity, () => this.handleSearchChange());
    this.eventListenersSetup = true;
  }

  cleanupEventListeners(): void {
    if (this.boundClickHandler) {
      this.renderRoot.removeEventListener('click', this.boundClickHandler);
      this.renderRoot.removeEventListener('change', this.boundChangeHandler!);
    }
    this.eventListenersSetup = false;
  }

  updateDependencies(config: InventoryConfig, hass: HomeAssistant): void {
    this.config = config;
    this.hass = hass;
  }

  private async handleClick(e: Event): Promise<void> {
    const target = e.target as HTMLElement;

    if (target.tagName === 'BUTTON' && target.hasAttribute('data-processing')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (target.dataset.action && target.dataset.name) {
      e.preventDefault();
      e.stopPropagation();
      await this.handleItemAction(target, target.dataset.action, target.dataset.name);
      return;
    }

    // Handle modal clicks first (let modals handle their own logic)
    if (this.modals.handleModalClick(e as MouseEvent)) {
      return; // Don't prevent default - let modals handle it
    }

    const buttonId = target.id;
    if (buttonId && target.tagName === 'BUTTON') {
      switch (buttonId) {
        case ELEMENTS.OPEN_ADD_MODAL:
          e.preventDefault();
          e.stopPropagation();
          this.modals.openAddModal();
          break;
        case ELEMENTS.ADD_ITEM_BTN:
          e.preventDefault();
          e.stopPropagation();
          await this.handleAddItem();
          break;
        case ELEMENTS.ADVANCED_SEARCH_TOGGLE:
          e.preventDefault();
          e.stopPropagation();
          this.toggleAdvancedFilters();
          break;
        case ELEMENTS.CLEAR_FILTERS:
          e.preventDefault();
          e.stopPropagation();
          this.clearFilters();
          break;
        default:
          return;
      }
      return;
    }

    if (target.tagName === 'BUTTON') {
      if (target.classList.contains(CSS_CLASSES.SAVE_BTN)) {
        e.preventDefault();
        e.stopPropagation();
        if (target.closest(`#${ELEMENTS.EDIT_MODAL}`)) {
          await this.handleSaveEdits();
        }
        return;
      }

      if (target.classList.contains(CSS_CLASSES.CANCEL_BTN)) {
        e.preventDefault();
        e.stopPropagation();
        if (target.closest(`#${ELEMENTS.ADD_MODAL}`)) {
          this.modals.closeAddModal();
        } else if (target.closest(`#${ELEMENTS.EDIT_MODAL}`)) {
          this.modals.closeEditModal();
        }
        return;
      }
    }
  }

  private handleChange(e: Event): void {
    const target = e.target as HTMLElement;

    if (
      target instanceof HTMLSelectElement &&
      (target.id === ELEMENTS.FILTER_CATEGORY ||
        target.id === ELEMENTS.FILTER_QUANTITY ||
        target.id === ELEMENTS.FILTER_EXPIRY)
    ) {
      this.autoApplyFilter(target);
      return;
    }

    if (target.id === ELEMENTS.SORT_METHOD) {
      this.renderCallback();
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

  private handleSearchChange(): void {
    const state = this.hass.states[this.config.entity];
    if (!state) return;

    const filters = this.filters.getCurrentFilters(this.config.entity);
    const sortMethodElement = this.renderRoot.querySelector(
      ELEMENTS.SORT_METHOD,
    ) as HTMLSelectElement | null;
    const sortMethod = sortMethodElement?.value || DEFAULTS.SORT_METHOD;

    const allItems = Utils.validateInventoryItems(state.attributes?.items || []);
    const filteredItems = this.filters.filterItems(allItems, filters);
    const sortedItems = this.filters.sortItems(filteredItems, sortMethod);

    this.updateItemsCallback(sortedItems, sortMethod);
    this.filters.updateFilterIndicators(filters);
  }

  private async handleItemAction(
    button: HTMLElement,
    action: string,
    itemName: string,
  ): Promise<void> {
    if (button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true') {
      return;
    }

    button.setAttribute('data-processing', 'true');
    button.setAttribute('disabled', 'true');
    button.style.opacity = '0.6';
    button.style.pointerEvents = 'none';

    try {
      const inventoryId = Utils.getInventoryId(this.hass, this.config.entity);

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
          this.modals.openEditModal(itemName, this.hass, this.config);
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

  private async handleAddItem(): Promise<void> {
    const success = await this.modals.addItem(this.config);
    if (success) {
      this.modals.closeAddModal();
    }
  }

  private async handleSaveEdits(): Promise<void> {
    const success = await this.modals.saveEditModal(this.config);
    if (success) {
      this.modals.closeEditModal();
    }
  }

  private autoApplyFilter(selectElement: HTMLSelectElement): void {
    try {
      const filters = this.filters.getCurrentFilters(this.config.entity);

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

      this.filters.saveFilters(this.config.entity, filters);
      this.renderCallback();
    } catch (error) {
      console.error('Error auto-applying filter:', error);
    }
  }

  private toggleAdvancedFilters(): void {
    try {
      const filters = this.filters.getCurrentFilters(this.config.entity);
      filters.showAdvanced = !filters.showAdvanced;
      this.filters.saveFilters(this.config.entity, filters);
      this.renderCallback();
    } catch (error) {
      console.error('Error toggling advanced filters:', error);
    }
  }

  private clearFilters(): void {
    try {
      this.filters.clearFilters(this.config.entity);

      const searchInput = this.renderRoot.querySelector(
        ELEMENTS.SEARCH_INPUT,
      ) as HTMLInputElement | null;
      if (searchInput) {
        searchInput.value = '';
      }

      this.renderCallback();
    } catch (error) {
      console.error('Error clearing filters:', error);
      alert('Error clearing filters. Please try again.');
    }
  }
}
