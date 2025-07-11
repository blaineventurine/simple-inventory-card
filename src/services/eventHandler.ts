import { ELEMENTS, ACTIONS, DEFAULTS, MESSAGES, CSS_CLASSES } from '../utils/constants';
import { HomeAssistant, InventoryConfig, InventoryItem } from '../types/homeAssistant';
import { Services } from './services';
import { Modals } from './modals';
import { Filters } from './filters';
import { Utilities } from '../utils/utilities';

export class EventHandler {
  private renderRoot: ShadowRoot;
  private services: Services;
  private modals: Modals;
  private filters: Filters;
  private config: InventoryConfig;
  private hass: HomeAssistant;
  private renderCallback: () => void;
  private updateItemsCallback: (items: InventoryItem[], sortMethod: string) => void;

  private boundClickHandler: EventListener | undefined = undefined;
  private boundChangeHandler: EventListener | undefined = undefined;

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
    private getFreshState: () => { hass: HomeAssistant; config: InventoryConfig },
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

    const actualClickHandler = (event: Event) => {
      this.handleClick(event).catch((error) => {
        console.error('Error in handleClick:', error);
      });
    };

    const actualChangeHandler = (event: Event) => {
      this.handleChange(event);
    };

    this.renderRoot.addEventListener('click', actualClickHandler);
    this.renderRoot.addEventListener('change', actualChangeHandler);

    this.filters.setupSearchInput(this.config.entity, () => this.handleSearchChange());
    this.eventListenersSetup = true;
  }

  cleanupEventListeners(): void {
    if (this.boundClickHandler) {
      this.renderRoot.removeEventListener('click', this.boundClickHandler as EventListener);
    }
    if (this.boundChangeHandler) {
      this.renderRoot.removeEventListener('change', this.boundChangeHandler as EventListener);
    }
    this.eventListenersSetup = false;
  }

  updateDependencies(config: InventoryConfig, hass: HomeAssistant): void {
    this.config = config;
    this.hass = hass;
  }

  private async handleClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' && target.hasAttribute('data-processing')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (target.dataset.action && target.dataset.name) {
      event.preventDefault();
      event.stopPropagation();
      await this.handleItemAction(target, target.dataset.action, target.dataset.name);
      return;
    }

    // Handle modal clicks first (let modals handle their own logic)
    if (this.modals.handleModalClick(event as MouseEvent)) {
      return; // Don't prevent default - let modals handle it
    }

    const buttonId = target.id;
    if (buttonId && target.tagName === 'BUTTON') {
      switch (buttonId) {
        case ELEMENTS.OPEN_ADD_MODAL: {
          event.preventDefault();
          event.stopPropagation();
          this.modals.openAddModal();
          break;
        }
        case ELEMENTS.ADD_ITEM_BTN: {
          event.preventDefault();
          event.stopPropagation();
          await this.handleAddItem();
          break;
        }
        case ELEMENTS.ADVANCED_SEARCH_TOGGLE: {
          event.preventDefault();
          event.stopPropagation();
          this.toggleAdvancedFilters();
          break;
        }
        case ELEMENTS.CLEAR_FILTERS: {
          event.preventDefault();
          event.stopPropagation();
          this.clearFilters();
          break;
        }
        default: {
          return;
        }
      }
      return;
    }

    if (target.tagName === 'BUTTON') {
      if (target.classList.contains(CSS_CLASSES.SAVE_BTN)) {
        event.preventDefault();
        event.stopPropagation();
        if (target.closest(`#${ELEMENTS.EDIT_MODAL}`)) {
          await this.handleSaveEdits();
        }
        return;
      }

      if (target.classList.contains(CSS_CLASSES.CANCEL_BTN)) {
        event.preventDefault();
        event.stopPropagation();
        if (target.closest(`#${ELEMENTS.ADD_MODAL}`)) {
          this.modals.closeAddModal();
        } else if (target.closest(`#${ELEMENTS.EDIT_MODAL}`)) {
          this.modals.closeEditModal();
        }
        return;
      }
    }
  }

  private handleChange(event: Event): void {
    const target = event.target as HTMLElement;

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
      const filters = this.filters.getCurrentFilters(this.config.entity);
      filters.sortMethod = (target as HTMLSelectElement).value;
      this.filters.saveFilters(this.config.entity, filters);
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

    if (target.id === ELEMENTS.SEARCH_INPUT && target instanceof HTMLInputElement) {
      const filters = this.filters.getCurrentFilters(this.config.entity);
      filters.searchText = target.value;
      this.filters.saveFilters(this.config.entity, filters);

      const state = this.hass.states[this.config.entity];
      if (state) {
        const allItems = Utilities.validateInventoryItems(state.attributes?.items || []);
        const filteredItems = this.filters.filterItems(allItems, filters);
        const sortedItems = this.filters.sortItems(filteredItems, 'name');
        this.updateItemsCallback(sortedItems, 'name');
        this.filters.updateFilterIndicators(filters);
      }
      return;
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

    const allItems = Utilities.validateInventoryItems(state.attributes?.items || []);
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
      const inventoryId = Utilities.getInventoryId(this.hass, this.config.entity);

      switch (action) {
        case ACTIONS.INCREMENT: {
          await this.services.incrementItem(inventoryId, itemName);
          this.renderCallback();
          break;
        }
        case ACTIONS.DECREMENT: {
          await this.services.decrementItem(inventoryId, itemName);
          this.renderCallback();
          break;
        }
        case ACTIONS.REMOVE: {
          if (confirm(MESSAGES.CONFIRM_REMOVE(itemName))) {
            await this.services.removeItem(inventoryId, itemName);
            this.renderCallback();
          }
          break;
        }
        case ACTIONS.OPEN_EDIT_MODAL: {
          const freshState = this.getFreshState();
          this.modals.openEditModal(itemName, () => freshState);
          break;
        }
        default: {
          console.warn(`Unknown action: ${action}`);
        }
      }
    } catch (error) {
      console.error(`Error performing ${action} on ${itemName}:`, error);
    } finally {
      setTimeout(() => {
        button.setAttribute('data-processing', 'true');
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
        case ELEMENTS.FILTER_CATEGORY: {
          filters.category = selectElement.value;
          break;
        }
        case ELEMENTS.FILTER_QUANTITY: {
          filters.quantity = selectElement.value;
          break;
        }
        case ELEMENTS.FILTER_EXPIRY: {
          filters.expiry = selectElement.value;
          break;
        }
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
