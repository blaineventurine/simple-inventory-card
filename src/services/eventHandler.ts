import { ELEMENTS, ACTIONS, DEFAULTS, CSS_CLASSES, FILTER_VALUES } from '../utils/constants';
import { HomeAssistant, InventoryConfig, InventoryItem } from '@/types/homeAssistant';
import { Services } from './services';
import { Modals } from './modals';
import { Filters } from './filters';
import { Utilities } from '../utils/utilities';
import { InventoryResolver } from '../utils/inventoryResolver';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';
import { initializeMultiSelect } from './multiSelect';
import { ScanHandler } from './scanHandler';
import { BarcodeProductHandler } from './barcodeProductHandler';
import { HistoryHandler } from './historyHandler';
import { ImportExportHandler } from './importExportHandler';

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

  private scanHandler: ScanHandler;
  private barcodeProductHandler: BarcodeProductHandler;
  private historyHandler: HistoryHandler;
  private importExportHandler: ImportExportHandler;

  constructor(
    renderRoot: ShadowRoot,
    services: Services,
    modals: Modals,
    filters: Filters,
    config: InventoryConfig,
    hass: HomeAssistant,
    renderCallback: () => void,
    updateItemsCallback: (items: InventoryItem[], sortMethod: string) => void,
    private getFreshState: () => {
      hass: HomeAssistant;
      config: InventoryConfig;
      items: InventoryItem[];
    },
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

    this.scanHandler = new ScanHandler(
      renderRoot,
      () => this.hass,
      () => this.config,
      () => this.translations,
      services,
      renderCallback,
    );

    this.barcodeProductHandler = new BarcodeProductHandler(
      renderRoot,
      () => this.translations,
      services,
    );

    this.historyHandler = new HistoryHandler(
      renderRoot,
      () => this.hass,
      () => this.config,
      () => this.translations,
      services,
    );

    this.importExportHandler = new ImportExportHandler(
      () => this.hass,
      () => this.config,
      () => this.translations,
      services,
      renderCallback,
    );
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

    const button = (target.closest?.('button') ?? target) as HTMLElement;
    const buttonId = button.id;
    if (buttonId && button.tagName === 'BUTTON') {
      switch (buttonId) {
        case ELEMENTS.OPEN_ADD_MODAL: {
          event.preventDefault();
          event.stopPropagation();
          const locations = this.getUniqueLocations();
          const categories = this.getUniqueCategories();
          this.modals.openAddModal(this.translations, locations, categories, (barcode: string) =>
            this.barcodeProductHandler.handleBarcodeProductLookup(barcode),
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
          await this.importExportHandler.handleExport();
          break;
        }
        case ELEMENTS.IMPORT_INVENTORY: {
          event.preventDefault();
          event.stopPropagation();
          this.closeOverflowMenu();
          await this.importExportHandler.handleImport();
          break;
        }
        case ELEMENTS.HEADER_EXPIRED_BADGE: {
          event.preventDefault();
          event.stopPropagation();
          this.applyExpiryBadgeFilter(FILTER_VALUES.EXPIRY.EXPIRED);
          break;
        }
        case ELEMENTS.HEADER_EXPIRING_BADGE: {
          event.preventDefault();
          event.stopPropagation();
          this.applyExpiryBadgeFilter(FILTER_VALUES.EXPIRY.SOON);
          break;
        }
        case ELEMENTS.HEADER_SCAN_BTN: {
          event.preventDefault();
          event.stopPropagation();
          await this.scanHandler.showScanPanel();
          break;
        }
        case ELEMENTS.SCAN_CLOSE: {
          event.preventDefault();
          event.stopPropagation();
          this.scanHandler.hideScanPanel();
          break;
        }
        case ELEMENTS.SCAN_GO_BTN: {
          event.preventDefault();
          event.stopPropagation();
          await this.scanHandler.handleScanGo();
          break;
        }
        case ELEMENTS.SCAN_ADD_BTN: {
          event.preventDefault();
          event.stopPropagation();
          await this.handleScanAddItem();
          break;
        }
        case ELEMENTS.SCAN_CANCEL_BTN: {
          event.preventDefault();
          event.stopPropagation();
          this.scanHandler.hideScanPanel();
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

      const allItems = Utilities.validateInventoryItems(this.getFreshState().items);
      const filteredItems = this.filters.filterItems(allItems, filters);
      const sortedItems = this.filters.sortItems(filteredItems, 'name', this.translations);
      this.updateItemsCallback(sortedItems, 'name');
      this.filters.updateFilterIndicators(filters, this.translations);
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

    const allItems = Utilities.validateInventoryItems(this.getFreshState().items);
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
      const inventoryId = InventoryResolver.getInventoryId(this.hass, this.config.entity);

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
          await this.historyHandler.showItemHistory(itemName);
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

  private applyExpiryBadgeFilter(value: string): void {
    try {
      const filters = this.filters.getCurrentFilters(this.config.entity);
      // Toggle: if this filter is already the sole selection, clear it; otherwise apply it.
      const alreadyActive = filters.expiry.length === 1 && filters.expiry[0] === value;
      filters.expiry = alreadyActive ? [] : [value];
      this.filters.saveFilters(this.config.entity, filters);
      this.applyFiltersWithoutRender();
      setTimeout(() => {
        this.filters.updateFilterIndicators(filters, this.translations);
      }, 50);
    } catch (error) {
      console.error('Error applying expiry badge filter:', error);
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
    const items = this.getFreshState().items;
    const locations = new Set<string>();
    items.forEach((item) => {
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
    const items = this.getFreshState().items;
    const categories = new Set<string>();
    items.forEach((item) => {
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
    const filters = this.filters.getCurrentFilters(this.config.entity);
    const sortMethodElement = this.renderRoot.querySelector(
      `#${ELEMENTS.SORT_METHOD}`,
    ) as HTMLSelectElement | null;
    const sortMethod = sortMethodElement?.value || filters.sortMethod || DEFAULTS.SORT_METHOD;

    const allItems = Utilities.validateInventoryItems(this.getFreshState().items);
    const filteredItems = this.filters.filterItems(allItems, filters);
    const sortedItems = this.filters.sortItems(filteredItems, sortMethod, this.translations);

    this.updateItemsCallback(sortedItems, sortMethod);
  }

  private async handleEditModalHistory(): Promise<void> {
    const itemName = this.modals.getCurrentEditingItem();
    if (!itemName) return;
    this.modals.closeEditModal();
    await this.historyHandler.showItemHistory(itemName);
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
      const inventoryId = InventoryResolver.getInventoryId(this.hass, this.config.entity);
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

  private async handleScanAddItem(): Promise<void> {
    const barcode = this.scanHandler.getScannedBarcode();
    this.scanHandler.hideScanPanel();

    const locations = this.getUniqueLocations();
    const categories = this.getUniqueCategories();
    this.modals.openAddModal(this.translations, locations, categories, (bc: string) =>
      this.barcodeProductHandler.handleBarcodeProductLookup(bc),
    );

    if (barcode) {
      setTimeout(() => {
        const hiddenInput = this.renderRoot.getElementById(
          `add-${ELEMENTS.BARCODE}`,
        ) as HTMLInputElement | null;
        const chipsContainer = this.renderRoot.getElementById(
          'add-barcode-chips',
        ) as HTMLElement | null;

        if (hiddenInput) {
          hiddenInput.value = barcode;

          if (chipsContainer) {
            const chip = document.createElement('span');
            chip.className = 'barcode-chip';
            chip.textContent = barcode;
            chipsContainer.innerHTML = '';
            chipsContainer.appendChild(chip);
          }

          this.barcodeProductHandler.handleBarcodeProductLookup(barcode);
        }
      }, 0);
    }
  }
}
