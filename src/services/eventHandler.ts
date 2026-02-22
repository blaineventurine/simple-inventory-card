import { ELEMENTS, ACTIONS, DEFAULTS, CSS_CLASSES } from '../utils/constants';
import { HomeAssistant, InventoryConfig, InventoryItem } from '../types/homeAssistant';
import { Services } from './services';
import { Modals } from './modals';
import { Filters } from './filters';
import { Utilities } from '../utils/utilities';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';
import { initializeMultiSelect } from './multiSelect';
import {
  createHistoryAndConsumptionView,
  createHistoryContent,
  createConsumptionView,
  createConsumptionLoading,
} from '../templates/historyView';
import { ItemConsumptionRates } from '../types/consumptionRates';
import { startScanner, stopScanner } from './barcodeScanner';

export class EventHandler {
  private renderRoot: ShadowRoot;
  private services: Services;
  private modals: Modals;
  private filters: Filters;
  private config: InventoryConfig;
  private hass: HomeAssistant;
  private renderCallback: () => void;
  private updateItemsCallback: (items: InventoryItem[], sortMethod: string) => void;
  private translations: TranslationData;

  private boundClickHandler: EventListener | undefined = undefined;
  private boundChangeHandler: EventListener | undefined = undefined;

  private eventListenersSetup = false;
  private scannedBarcode: string | null = null;

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
    translations: TranslationData,
  ) {
    this.renderRoot = renderRoot;
    this.services = services;
    this.modals = modals;
    this.filters = filters;
    this.config = config;
    this.hass = hass;
    this.renderCallback = renderCallback;
    this.updateItemsCallback = updateItemsCallback;
    this.translations = translations;
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

    const filters = this.filters.getCurrentFilters(this.config.entity);
    if (filters.showAdvanced) {
      this.initializeMultiSelects();
    }
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
          const locations = this.getUniqueLocations();
          const categories = this.getUniqueCategories();
          this.modals.openAddModal(this.translations, locations, categories, (barcode: string) =>
            this.handleBarcodeProductLookup(barcode),
          );
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
        case ELEMENTS.EDIT_HISTORY_BTN: {
          event.preventDefault();
          event.stopPropagation();
          await this.handleEditModalHistory();
          break;
        }
        case ELEMENTS.EDIT_DELETE_BTN: {
          event.preventDefault();
          event.stopPropagation();
          await this.handleEditModalDelete();
          break;
        }
        case ELEMENTS.OVERFLOW_MENU_BTN: {
          event.preventDefault();
          event.stopPropagation();
          this.toggleOverflowMenu();
          break;
        }
        case ELEMENTS.EXPORT_INVENTORY: {
          event.preventDefault();
          event.stopPropagation();
          this.closeOverflowMenu();
          await this.handleExport();
          break;
        }
        case ELEMENTS.IMPORT_INVENTORY: {
          event.preventDefault();
          event.stopPropagation();
          this.closeOverflowMenu();
          await this.handleImport();
          break;
        }
        case ELEMENTS.HEADER_SCAN_BTN: {
          event.preventDefault();
          event.stopPropagation();
          await this.showScanPanel();
          break;
        }
        case ELEMENTS.SCAN_CLOSE: {
          event.preventDefault();
          event.stopPropagation();
          this.hideScanPanel();
          break;
        }
        case ELEMENTS.SCAN_GO_BTN: {
          event.preventDefault();
          event.stopPropagation();
          await this.handleScanGo();
          break;
        }
        case ELEMENTS.SCAN_CANCEL_BTN: {
          event.preventDefault();
          event.stopPropagation();
          this.hideScanPanel();
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
        const sortedItems = this.filters.sortItems(filteredItems, 'name', this.translations);
        this.updateItemsCallback(sortedItems, 'name');
        this.filters.updateFilterIndicators(filters, this.translations);
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
    const sortedItems = this.filters.sortItems(filteredItems, sortMethod, this.translations);

    this.updateItemsCallback(sortedItems, sortMethod);
    this.filters.updateFilterIndicators(filters, this.translations);
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
          const confirmMessage = TranslationManager.localize(
            this.translations,
            'actions.confirm_remove',
            { name: itemName },
            `Remove ${itemName} from inventory?`,
          );
          if (confirm(confirmMessage)) {
            await this.services.removeItem(inventoryId, itemName);
            this.renderCallback();
          }
          break;
        }
        case ACTIONS.OPEN_EDIT_MODAL: {
          const freshState = this.getFreshState();
          const locations = this.getUniqueLocations();
          const categories = this.getUniqueCategories();
          this.modals.openEditModal(
            itemName,
            () => freshState,
            this.translations,
            locations,
            categories,
          );
          break;
        }
        case ACTIONS.VIEW_HISTORY: {
          await this.showItemHistory(itemName);
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

  private toggleAdvancedFilters(): void {
    try {
      const filters = this.filters.getCurrentFilters(this.config.entity);
      filters.showAdvanced = !filters.showAdvanced;
      this.filters.saveFilters(this.config.entity, filters);
      this.renderCallback();
      if (filters.showAdvanced) {
        this.initializeMultiSelects();
      }
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
      const filters = this.filters.getCurrentFilters(this.config.entity);
      setTimeout(() => {
        this.filters.updateFilterIndicators(filters, this.translations);
        if (filters.showAdvanced) {
          this.initializeMultiSelects();
        }
      }, 50);
    } catch (error) {
      console.error('Error clearing filters:', error);
      const errorMessage = TranslationManager.localize(
        this.translations,
        'errors.clear_filters_error',
        undefined,
        'Error clearing filters. Please try again.',
      );
      alert(errorMessage);
    }
  }

  private getUniqueLocations(): string[] {
    const state = this.hass.states[this.config.entity];
    if (!state?.attributes?.items) return [];

    const locations = new Set<string>();
    Object.values(state.attributes.items).forEach((item: any) => {
      if (Array.isArray(item.locations)) {
        item.locations.forEach((loc: string) => {
          const name = loc?.trim();
          if (name) locations.add(name);
        });
      } else if (item.location?.trim()) {
        locations.add(item.location.trim());
      }
    });
    return Array.from(locations).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }

  private getUniqueCategories(): string[] {
    const state = this.hass.states[this.config.entity];
    if (!state?.attributes?.items) return [];

    const categories = new Set<string>();
    Object.values(state.attributes.items).forEach((item: any) => {
      if (Array.isArray(item.categories)) {
        item.categories.forEach((cat: string) => {
          const trimmed = cat?.trim();
          if (trimmed) categories.add(trimmed);
        });
      } else if (item.category?.trim()) {
        categories.add(item.category.trim());
      }
    });
    return Array.from(categories).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }

  private initializeMultiSelects(): void {
    const filters = this.filters.getCurrentFilters(this.config.entity);
    const categories = this.getUniqueCategories();
    const locations = this.getUniqueLocations();

    setTimeout(() => {
      initializeMultiSelect({
        id: ELEMENTS.FILTER_CATEGORY,
        options: categories,
        selected: filters.category,
        placeholder: TranslationManager.localize(
          this.translations,
          'filters.all_categories',
          undefined,
          'All Categories',
        ),
        shadowRoot: this.renderRoot,
        onChange: (selected) => {
          const filters = this.filters.getCurrentFilters(this.config.entity);
          filters.category = selected;
          this.filters.saveFilters(this.config.entity, filters);
          this.filters.updateFilterIndicators(filters, this.translations);
          this.applyFiltersWithoutRender();
        },
      });

      initializeMultiSelect({
        id: ELEMENTS.FILTER_LOCATION,
        options: locations,
        selected: filters.location,
        placeholder: TranslationManager.localize(
          this.translations,
          'filters.all_locations',
          undefined,
          'All Locations',
        ),
        shadowRoot: this.renderRoot,
        onChange: (selected) => {
          const filters = this.filters.getCurrentFilters(this.config.entity);
          filters.location = selected;
          this.filters.saveFilters(this.config.entity, filters);
          this.filters.updateFilterIndicators(filters, this.translations);
          this.applyFiltersWithoutRender();
        },
      });

      initializeMultiSelect({
        id: ELEMENTS.FILTER_EXPIRY,
        options: ['none', 'expired', 'soon', 'future'],
        selected: filters.expiry,
        placeholder: TranslationManager.localize(
          this.translations,
          'filters.all_items',
          undefined,
          'All Items',
        ),
        labels: {
          none: TranslationManager.localize(
            this.translations,
            'filters.no_expiry',
            undefined,
            'No Expiry',
          ),
          expired: TranslationManager.localize(
            this.translations,
            'filters.expired',
            undefined,
            'Expired',
          ),
          soon: TranslationManager.localize(
            this.translations,
            'filters.expiring_soon',
            undefined,
            'Expiring Soon',
          ),
          future: TranslationManager.localize(
            this.translations,
            'filters.future',
            undefined,
            'Future',
          ),
        },
        shadowRoot: this.renderRoot,
        onChange: (selected) => {
          const filters = this.filters.getCurrentFilters(this.config.entity);
          filters.expiry = selected;
          this.filters.saveFilters(this.config.entity, filters);
          this.filters.updateFilterIndicators(filters, this.translations);
          this.applyFiltersWithoutRender();
        },
      });

      initializeMultiSelect({
        id: ELEMENTS.FILTER_QUANTITY,
        options: ['zero', 'nonzero'],
        selected: filters.quantity,
        placeholder: TranslationManager.localize(
          this.translations,
          'filters.all_quantities',
          undefined,
          'All Quantities',
        ),
        labels: {
          zero: TranslationManager.localize(this.translations, 'filters.zero', undefined, 'Zero'),
          nonzero: TranslationManager.localize(
            this.translations,
            'filters.non_zero',
            undefined,
            'Non-zero',
          ),
        },
        shadowRoot: this.renderRoot,
        onChange: (selected) => {
          const filters = this.filters.getCurrentFilters(this.config.entity);
          filters.quantity = selected;
          this.filters.saveFilters(this.config.entity, filters);
          this.filters.updateFilterIndicators(filters, this.translations);
          this.applyFiltersWithoutRender();
        },
      });
    }, 0);
  }

  private applyFiltersWithoutRender(): void {
    const state = this.hass.states[this.config.entity];
    if (!state) return;

    const filters = this.filters.getCurrentFilters(this.config.entity);
    const sortMethodElement = this.renderRoot.querySelector(
      `#${ELEMENTS.SORT_METHOD}`,
    ) as HTMLSelectElement | null;
    const sortMethod = sortMethodElement?.value || filters.sortMethod || DEFAULTS.SORT_METHOD;

    const allItems = Utilities.validateInventoryItems(state.attributes?.items || []);
    const filteredItems = this.filters.filterItems(allItems, filters);
    const sortedItems = this.filters.sortItems(filteredItems, sortMethod, this.translations);

    this.updateItemsCallback(sortedItems, sortMethod);
  }

  private async showItemHistory(itemName: string): Promise<void> {
    try {
      const inventoryId = Utilities.getInventoryId(this.hass, this.config.entity);
      const events = await this.services.getHistory(inventoryId, {
        itemName,
        limit: 50,
      });
      const html = createHistoryAndConsumptionView(events, itemName, this.translations);
      this.showHistoryModal(html, events, itemName, inventoryId);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }

  private showHistoryModal(
    content: string,
    cachedEvents: import('../types/historyEvent').HistoryEvent[],
    itemName: string,
    inventoryId: string,
  ): void {
    let modal = this.renderRoot.getElementById(ELEMENTS.HISTORY_MODAL);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = ELEMENTS.HISTORY_MODAL;
      modal.className = 'modal';
      this.renderRoot.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="modal-content">
        ${content}
        <div class="modal-actions">
          <button class="cancel-btn" id="close-history-modal">Close</button>
        </div>
      </div>
    `;
    modal.classList.add(CSS_CLASSES.SHOW);

    const closeBtn = modal.querySelector('#close-history-modal');
    closeBtn?.addEventListener('click', () => {
      modal!.classList.remove(CSS_CLASSES.SHOW);
    });

    const cachedRates = new Map<string, ItemConsumptionRates>();
    let activeWindow: number | null = null;

    const historyTab = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_HISTORY}`);
    const consumptionTab = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_CONSUMPTION}`);
    const tabContent = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_CONTENT}`);

    if (!historyTab || !consumptionTab || !tabContent) return;

    const setActiveTab = (tab: 'history' | 'consumption') => {
      historyTab.classList.toggle('active', tab === 'history');
      consumptionTab.classList.toggle('active', tab === 'consumption');
    };

    historyTab.addEventListener('click', () => {
      setActiveTab('history');
      tabContent.innerHTML = createHistoryContent(cachedEvents);
    });

    consumptionTab.addEventListener('click', () => {
      setActiveTab('consumption');
      this.loadConsumptionTab(
        tabContent as HTMLElement,
        inventoryId,
        itemName,
        activeWindow,
        cachedRates,
        (w) => {
          activeWindow = w;
        },
      );
    });
  }

  private async loadConsumptionTab(
    container: HTMLElement,
    inventoryId: string,
    itemName: string,
    activeWindow: number | null,
    cachedRates: Map<string, ItemConsumptionRates>,
    setActiveWindow: (w: number | null) => void,
  ): Promise<void> {
    const cacheKey = activeWindow !== null ? String(activeWindow) : 'all';

    if (cachedRates.has(cacheKey)) {
      this.renderConsumptionContent(
        container,
        cachedRates.get(cacheKey)!,
        activeWindow,
        inventoryId,
        itemName,
        cachedRates,
        setActiveWindow,
      );
      return;
    }

    container.innerHTML = createConsumptionLoading(this.translations);

    try {
      const rates = await this.services.getItemConsumptionRates(
        inventoryId,
        itemName,
        activeWindow,
      );
      cachedRates.set(cacheKey, rates);
      this.renderConsumptionContent(
        container,
        rates,
        activeWindow,
        inventoryId,
        itemName,
        cachedRates,
        setActiveWindow,
      );
    } catch (error) {
      console.error('Error fetching consumption rates:', error);
      const errorMsg = TranslationManager.localize(
        this.translations,
        'analytics.load_error',
        undefined,
        'Failed to load consumption data.',
      );
      container.innerHTML = `<p class="consumption-empty">${Utilities.sanitizeHtml(errorMsg)}</p>`;
    }
  }

  private renderConsumptionContent(
    container: HTMLElement,
    rates: ItemConsumptionRates,
    activeWindow: number | null,
    inventoryId: string,
    itemName: string,
    cachedRates: Map<string, ItemConsumptionRates>,
    setActiveWindow: (w: number | null) => void,
  ): void {
    container.innerHTML = createConsumptionView(rates, activeWindow, this.translations);

    container.querySelectorAll('.window-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const value = (pill as HTMLElement).dataset.window;
        const newWindow = value === 'all' ? null : Number(value);
        setActiveWindow(newWindow);
        this.loadConsumptionTab(
          container,
          inventoryId,
          itemName,
          newWindow,
          cachedRates,
          setActiveWindow,
        );
      });
    });
  }

  private async handleEditModalHistory(): Promise<void> {
    const itemName = this.modals.getCurrentEditingItem();
    if (!itemName) return;
    this.modals.closeEditModal();
    await this.showItemHistory(itemName);
  }

  private async handleEditModalDelete(): Promise<void> {
    const itemName = this.modals.getCurrentEditingItem();
    if (!itemName) return;
    const confirmMessage = TranslationManager.localize(
      this.translations,
      'actions.confirm_remove',
      { name: itemName },
      `Remove ${itemName} from inventory?`,
    );
    if (confirm(confirmMessage)) {
      const inventoryId = Utilities.getInventoryId(this.hass, this.config.entity);
      await this.services.removeItem(inventoryId, itemName);
      this.modals.closeEditModal();
      this.renderCallback();
    }
  }

  private toggleOverflowMenu(): void {
    const menu = this.renderRoot.getElementById(ELEMENTS.OVERFLOW_MENU);
    if (!menu) return;
    const isVisible = menu.style.display !== 'none';
    menu.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      // Close on next outside click
      setTimeout(() => {
        const closeHandler = (e: Event) => {
          if (!menu.contains(e.target as Node)) {
            menu.style.display = 'none';
            this.renderRoot.removeEventListener('click', closeHandler);
          }
        };
        this.renderRoot.addEventListener('click', closeHandler);
      }, 0);
    }
  }

  private closeOverflowMenu(): void {
    const menu = this.renderRoot.getElementById(ELEMENTS.OVERFLOW_MENU);
    if (menu) {
      menu.style.display = 'none';
    }
  }

  private handleBarcodeProductLookup(barcode: string): void {
    this.services
      .lookupBarcodeProduct(barcode)
      .then((result) => {
        if (!result.found || !result.product) return;
        const product = result.product;
        this.autoFillIfEmpty('add-name', product.name);
        // Combine brand and description for the description field
        const descParts: string[] = [];
        if (product.brand) descParts.push(product.brand);
        if (product.description) descParts.push(product.description);
        if (descParts.length > 0) {
          this.autoFillIfEmpty('add-description', descParts.join(' - '));
        }
        if (product.category) {
          this.autoFillIfEmpty('add-category', product.category);
        }
        if (product.unit) {
          this.autoFillIfEmpty('add-unit', product.unit);
        }
      })
      .catch(() => {
        // Silent failure — user can fill fields manually
      });
  }

  private autoFillIfEmpty(elementId: string, value: string | undefined): void {
    if (!value) return;
    const el = this.renderRoot.getElementById(elementId) as HTMLInputElement | null;
    if (el && !el.value.trim()) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async handleExport(): Promise<void> {
    try {
      const inventoryId = Utilities.getInventoryId(this.hass, this.config.entity);
      const result = await this.services.exportInventory(inventoryId, 'json');
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_${inventoryId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting inventory:', error);
    }
  }

  private async showScanPanel(): Promise<void> {
    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    if (!panel) return;

    panel.style.display = 'block';
    const viewportContainer = this.renderRoot.getElementById(`${ELEMENTS.SCAN_VIEWPORT}-container`);
    const viewport = this.renderRoot.getElementById(ELEMENTS.SCAN_VIEWPORT);
    const actionBar = this.renderRoot.getElementById(ELEMENTS.SCAN_ACTION_BAR);
    const errorEl = this.renderRoot.getElementById('scan-panel-error');
    const loadingEl = this.renderRoot.getElementById('scan-panel-loading');

    if (viewportContainer) viewportContainer.style.display = 'block';
    if (actionBar) actionBar.style.display = 'none';
    if (loadingEl) loadingEl.style.display = 'flex';
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }

    if (viewport) {
      const error = await startScanner(viewport, (code: string) => {
        this.handleScanDetected(code);
      });
      if (loadingEl) loadingEl.style.display = 'none';
      if (error) {
        this.hideScanPanel();
        const msgKey =
          error === 'permission_denied'
            ? 'modal.camera_permission_denied'
            : 'modal.camera_not_available';
        const fallback =
          error === 'permission_denied' ? 'Camera access denied' : 'Camera not available';
        alert(TranslationManager.localize(this.translations, msgKey, undefined, fallback));
      }
    }
  }

  private hideScanPanel(): void {
    stopScanner();
    this.scannedBarcode = null;
    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    if (panel) panel.style.display = 'none';
  }

  private handleScanDetected(barcode: string): void {
    stopScanner();
    this.scannedBarcode = barcode;

    const viewportContainer = this.renderRoot.getElementById(`${ELEMENTS.SCAN_VIEWPORT}-container`);
    const actionBar = this.renderRoot.getElementById(ELEMENTS.SCAN_ACTION_BAR);
    const label = this.renderRoot.getElementById('scan-barcode-label');
    const errorEl = this.renderRoot.getElementById('scan-panel-error');
    const amountInput = this.renderRoot.getElementById(
      ELEMENTS.SCAN_AMOUNT_INPUT,
    ) as HTMLInputElement | null;
    const actionSelect = this.renderRoot.getElementById(
      ELEMENTS.SCAN_ACTION_SELECT,
    ) as HTMLSelectElement | null;

    if (viewportContainer) viewportContainer.style.display = 'none';
    if (label) label.textContent = barcode;
    if (actionBar) actionBar.style.display = 'flex';
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
    if (amountInput) amountInput.value = '1';
    if (actionSelect) actionSelect.value = 'increment';
  }

  private async handleScanGo(): Promise<void> {
    if (!this.scannedBarcode) return;

    const actionSelect = this.renderRoot.getElementById(
      ELEMENTS.SCAN_ACTION_SELECT,
    ) as HTMLSelectElement | null;
    const amountInput = this.renderRoot.getElementById(
      ELEMENTS.SCAN_AMOUNT_INPUT,
    ) as HTMLInputElement | null;

    const action = (actionSelect?.value || 'increment') as 'increment' | 'decrement';
    const amount = parseFloat(amountInput?.value || '1') || 1;

    const inventoryId = Utilities.getInventoryId(this.hass, this.config.entity);
    const result = await this.services.scanBarcode(
      inventoryId,
      this.scannedBarcode,
      action,
      amount,
    );

    if (result.success) {
      this.hideScanPanel();
      this.renderCallback();
    } else {
      const errorEl = this.renderRoot.getElementById('scan-panel-error');
      if (errorEl) {
        errorEl.textContent = TranslationManager.localize(
          this.translations,
          'scanner.barcode_not_found',
          undefined,
          'No item found for this barcode',
        );
        errorEl.style.display = 'block';
      }
    }
  }

  async handleImport(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const inventoryId = Utilities.getInventoryId(this.hass, this.config.entity);
        const isCSV = file.name.endsWith('.csv');
        const format = isCSV ? 'csv' : 'json';
        const data = isCSV ? text : JSON.parse(text);
        const result = await this.services.importInventory(inventoryId, data, format, 'skip');

        const message = TranslationManager.localize(
          this.translations,
          'actions.import_result',
          { added: result.added, updated: result.updated, skipped: result.skipped },
          `Import complete: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped`,
        );
        alert(message);
        this.renderCallback();
      } catch (error) {
        console.error('Error importing inventory:', error);
        alert('Import failed. Please check the file format.');
      }
    });
    input.click();
  }
}
