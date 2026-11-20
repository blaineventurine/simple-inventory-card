import { ELEMENTS, ACTIONS, DEFAULTS, ITEM_EVENTS } from '../utils/constants';
import { InventoryItem } from '@/types/inventory';
import { Services } from './services';
import { Modals } from './modals';
import { Filters } from './filters';
import { Utilities } from '../utils/utilities';
import { InventoryResolver } from '../utils/inventoryResolver';
import { TranslationManager } from './translationManager';
import { ScanHandler } from './scanHandler';
import { BarcodeProductHandler } from './barcodeProductHandler';
import { HistoryHandler } from './historyHandler';
import { ImportExportHandler } from './importExportHandler';
import { State } from './state';
import type { AcquireHold } from './inventoryStore';
import { ImageLoader } from './imageLoader';
import { withBusy } from '../utils/busy';
import { ImageViewer } from './imageViewer';
import { ItemActions } from './itemActions';
import { ItemRowActions } from './itemRowActions';
import { ItemImageField } from './modals/itemImageField';
import { itemOptions } from '../utils/itemOptions';
import { GetCardContext } from '@/types/cardContext';
import { ActionGroup, ActionHandler, ActionRegistry } from './actionRegistry';
import { layoutToggleView, saveLayout } from './layout';

type HeaderAction = (typeof ACTIONS)[
  | 'OPEN_ADD_MODAL'
  | 'TOGGLE_OVERFLOW_MENU'
  | 'EXPORT_INVENTORY'
  | 'IMPORT_INVENTORY'
  | 'FILTER_EXPIRY'
  | 'TOGGLE_ADVANCED_FILTERS'
  | 'CLEAR_FILTERS'
  | 'REMOVE_FILTER'
  | 'TOGGLE_FILTER_DROPDOWN'
  | 'TOGGLE_LAYOUT'
  | 'DETAIL_BACK'
  | 'OPEN_ITEM'];
type ScanAction = (typeof ACTIONS)[
  'OPEN_SCAN' | 'CLOSE_SCAN' | 'SCAN_CHOOSE_PHOTO' | 'SCAN_GO' | 'SCAN_ADD_ITEM'];
type SheetAction = (typeof ACTIONS)[
  | 'CLOSE_ADD_MODAL'
  | 'CLOSE_EDIT_MODAL'
  | 'ADD_ITEM'
  | 'ADD_AS_BATCH'
  | 'SAVE_EDIT'
  | 'EDIT_HISTORY'
  | 'EDIT_DELETE'];
type BatchEditorAction = (typeof ACTIONS)[
  'ADD_BATCH_ROW' | 'DISCARD_BATCH_ROW' | 'TOGGLE_BATCH_REMOVED'];

const MULTI_SELECT_FILTER_KEYS: Record<string, 'category' | 'location' | 'expiry' | 'quantity'> = {
  [`${ELEMENTS.FILTER_CATEGORY}-dropdown`]: 'category',
  [`${ELEMENTS.FILTER_LOCATION}-dropdown`]: 'location',
  [`${ELEMENTS.FILTER_EXPIRY}-dropdown`]: 'expiry',
  [`${ELEMENTS.FILTER_QUANTITY}-dropdown`]: 'quantity',
};

/** What the `EventHandler` works with, built by the `LifecycleManager`. */
export interface EventHandlerDeps {
  renderRoot: ShadowRoot;
  services: Services;
  modals: Modals;
  filters: Filters;
  state: State;
  /** The card's current state; read at the moment of use. */
  getContext: GetCardContext;
  /** Re-fetches the items and renders (the user's own actions: sort change, ±, submit). */
  renderCallback: () => void;
  /** Re-lists the rows only (live filtering). */
  updateItemsCallback: (items: InventoryItem[], sortMethod: string) => void;
  /** Holds renders while the restock/move forms and the scan panel are open. */
  hold?: AcquireHold | undefined;
  /** Loads the full image of a details panel when it opens (`item_images`). */
  imageLoader?: ImageLoader;
  /** Gets the add sheet's product photo offer from barcode lookups (`item_images`). */
  imageField?: ItemImageField;
  /** Shows a details-panel photo full screen (`item_images`). */
  imageViewer?: ImageViewer;
}

export class EventHandler {
  private renderRoot: ShadowRoot;
  private services: Services;
  private modals: Modals;
  private filters: Filters;
  private readonly getContext: GetCardContext;
  private renderCallback: () => void;
  private updateItemsCallback: (items: InventoryItem[], sortMethod: string) => void;
  /** `data-action` → handler; see `actionRegistry.ts`. */
  private readonly actions: Readonly<Record<string, ActionHandler | undefined>>;

  private boundClickHandler: EventListener | undefined = undefined;
  private boundChangeHandler: EventListener | undefined = undefined;
  private boundKeydownHandler: EventListener | undefined = undefined;
  private boundInputHandler: EventListener | undefined = undefined;

  private eventListenersSetup = false;

  private scanHandler: ScanHandler;
  private barcodeProductHandler: BarcodeProductHandler;
  /** The history sheet's and the item page's History/Consumption view. */
  readonly historyHandler: HistoryHandler;
  private importExportHandler: ImportExportHandler;
  private readonly itemRows: ItemRowActions;
  /** The item actions the rows run; also the card's public `openItem`. */
  readonly itemActions: ItemActions;

  constructor(deps: EventHandlerDeps) {
    const { renderRoot, services, getContext, renderCallback, hold, imageField } = deps;
    this.renderRoot = renderRoot;
    this.services = services;
    this.modals = deps.modals;
    this.filters = deps.filters;
    this.getContext = getContext;
    this.renderCallback = renderCallback;
    this.updateItemsCallback = deps.updateItemsCallback;

    this.scanHandler = new ScanHandler(renderRoot, getContext, services, renderCallback, hold);

    this.barcodeProductHandler = new BarcodeProductHandler(
      renderRoot,
      () => getContext().translations,
      services,
      imageField
        ? (barcode, imageUrl) => {
            imageField.offerProductPhoto(barcode, imageUrl);
          }
        : undefined,
    );

    this.historyHandler = new HistoryHandler(renderRoot, getContext, services);

    this.importExportHandler = new ImportExportHandler(
      renderRoot,
      getContext,
      services,
      renderCallback,
    );

    this.itemActions = new ItemActions({
      getContext,
      services,
      refresh: renderCallback,
      modals: deps.modals,
      historyHandler: this.historyHandler,
      imageViewer: deps.imageViewer,
    });
    const itemRows = new ItemRowActions({
      getContext,
      state: deps.state,
      itemActions: this.itemActions,
      hold,
      imageLoader: deps.imageLoader,
    });
    this.itemRows = itemRows;
    const registry: ActionRegistry = {
      ...itemRows.handlers(),
      ...this.headerActions(),
      ...this.scanActions(),
      ...this.sheetActions(),
      ...this.batchEditorActions(),
    };
    this.actions = registry;
  }

  setupEventListeners(): void {
    if (this.eventListenersSetup) {
      return;
    }

    this.boundClickHandler = (event: Event) => {
      this.handleClick(event).catch((error) => {
        console.error('Error in handleClick:', error);
      });
    };

    this.boundChangeHandler = (event: Event) => {
      this.handleChange(event);
    };

    this.boundKeydownHandler = (event: Event) => {
      this.handleKeydown(event).catch((error) => {
        console.error('Error in handleKeydown:', error);
      });
    };

    // Delegated: full renders replace the search box, the shadow root stays.
    this.boundInputHandler = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.id === ELEMENTS.SEARCH_INPUT) {
        this.filters.scheduleSearch(this.getContext().config.entity, target.value, () =>
          this.handleSearchChange(),
        );
      }
    };

    this.renderRoot.addEventListener('click', this.boundClickHandler);
    this.renderRoot.addEventListener('change', this.boundChangeHandler);
    this.renderRoot.addEventListener('keydown', this.boundKeydownHandler);
    this.renderRoot.addEventListener('input', this.boundInputHandler);

    this.eventListenersSetup = true;
  }

  cleanupEventListeners(): void {
    if (this.boundClickHandler) {
      this.renderRoot.removeEventListener('click', this.boundClickHandler);
      this.boundClickHandler = undefined;
    }
    if (this.boundChangeHandler) {
      this.renderRoot.removeEventListener('change', this.boundChangeHandler);
      this.boundChangeHandler = undefined;
    }
    if (this.boundKeydownHandler) {
      this.renderRoot.removeEventListener('keydown', this.boundKeydownHandler);
      this.boundKeydownHandler = undefined;
    }
    if (this.boundInputHandler) {
      this.renderRoot.removeEventListener('input', this.boundInputHandler);
      this.boundInputHandler = undefined;
    }
    this.eventListenersSetup = false;
  }

  /** The rows were re-listed: their open forms are gone, and so are their holds. */
  rowsReplaced(): void {
    this.itemRows.rowsReplaced();
  }

  /** A full render replaced the card: the rows' forms and the scan panel lose their holds. */
  cardReplaced(): void {
    this.itemRows.rowsReplaced();
    this.scanHandler.panelReplaced();
  }

  /** Card re-attached: the header scan panel restarts a camera the pause stopped. */
  resumeScanning(): void {
    this.scanHandler.resumeScanning();
  }

  private async handleClick(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest('button')?.hasAttribute('data-processing')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Sheet chrome first: backdrop, ✕ and the edit ⋮ menu.
    if (this.modals.handleModalClick(event as MouseEvent)) {
      return;
    }

    const control = target.closest<HTMLElement>('[data-action]');
    const action = control?.dataset.action;
    // Filter dropdowns close on a click anywhere outside them; their trigger toggles its own.
    if (action !== ACTIONS.TOGGLE_FILTER_DROPDOWN && !target.closest('.multi-select-dropdown')) {
      this.closeAllMultiSelectDropdowns();
    }
    if (!control || !action) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    await this.dispatch(control, action, event);
  }

  private async dispatch(control: HTMLElement, action: string, event: Event): Promise<void> {
    const handler = Object.hasOwn(this.actions, action) ? this.actions[action] : undefined;
    if (!handler) {
      console.warn(`Unknown action: ${action}`);
      return;
    }
    await handler(control, event);
  }

  private handleChange(event: Event): void {
    const target = event.target as HTMLElement;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      const dropdown = target.closest?.('.multi-select-dropdown') as HTMLElement | null;
      if (dropdown) {
        this.handleFilterMultiSelectChange(dropdown);
        return;
      }
    }

    if (target.id === ELEMENTS.SCAN_ACTION_SELECT) {
      this.scanHandler.syncBatchFieldsVisibility();
      return;
    }

    if (target.id === ELEMENTS.SORT_METHOD) {
      const filters = this.filters.getCurrentFilters(this.getContext().config.entity);
      filters.sortMethod = (target as HTMLSelectElement).value;
      this.filters.saveFilters(this.getContext().config.entity, filters);
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
          controls.hidden = !target.checked;
        }
      }, 0);
    }

    if (target.id === ELEMENTS.SEARCH_INPUT && target instanceof HTMLInputElement) {
      const filters = this.filters.getCurrentFilters(this.getContext().config.entity);
      filters.searchText = target.value;
      this.filters.saveFilters(this.getContext().config.entity, filters);

      this.applyFiltersWithoutRender();
      this.filters.updateFilterIndicators(filters, this.getContext().translations);
      return;
    }
  }

  private async handleKeydown(event: Event): Promise<void> {
    const keyboardEvent = event as KeyboardEvent;
    const target = keyboardEvent.target;

    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') {
      return;
    }
    // Real buttons fire a click on Enter/Space themselves; only role="button" needs this.
    if (
      !(target instanceof HTMLElement) ||
      target.getAttribute('role') !== 'button' ||
      !target.dataset.action
    ) {
      return;
    }

    keyboardEvent.preventDefault();
    await this.dispatch(target, target.dataset.action, event);
  }

  private handleSearchChange(): void {
    const { hass, config } = this.getContext();
    const state = hass.states[config.entity];
    if (!state) return;

    this.applyFiltersWithoutRender();
    this.filters.updateFilterIndicators(
      this.filters.getCurrentFilters(this.getContext().config.entity),
      this.getContext().translations,
    );
  }

  private headerActions(): ActionGroup<HeaderAction> {
    return {
      [ACTIONS.OPEN_ADD_MODAL]: () => this.openAddModal(),
      [ACTIONS.TOGGLE_OVERFLOW_MENU]: () => this.toggleOverflowMenu(),
      [ACTIONS.EXPORT_INVENTORY]: async () => {
        this.closeOverflowMenu();
        await this.importExportHandler.handleExport();
      },
      [ACTIONS.IMPORT_INVENTORY]: async () => {
        this.closeOverflowMenu();
        await this.importExportHandler.handleImport();
      },
      [ACTIONS.FILTER_EXPIRY]: (control) => {
        if (control.dataset.expiry) {
          this.applyExpiryBadgeFilter(control.dataset.expiry);
        }
      },
      [ACTIONS.TOGGLE_ADVANCED_FILTERS]: () => this.toggleAdvancedFilters(),
      [ACTIONS.CLEAR_FILTERS]: () => this.clearFilters(),
      [ACTIONS.REMOVE_FILTER]: (control) => {
        if (control.dataset.filterRemove) {
          this.removeFilter(control.dataset.filterRemove);
        }
      },
      [ACTIONS.TOGGLE_FILTER_DROPDOWN]: (control) => this.toggleMultiSelectDropdown(control),
      [ACTIONS.TOGGLE_LAYOUT]: (control) => this.toggleLayout(control),
      [ACTIONS.DETAIL_BACK]: (control) => this.closeItemPage(control),
      [ACTIONS.OPEN_ITEM]: (control) => this.openItemPage(control),
    };
  }

  private scanActions(): ActionGroup<ScanAction> {
    return {
      [ACTIONS.OPEN_SCAN]: () => this.scanHandler.showScanPanel(),
      [ACTIONS.CLOSE_SCAN]: () => this.scanHandler.hideScanPanel(),
      [ACTIONS.SCAN_CHOOSE_PHOTO]: () => this.scanHandler.choosePhoto(),
      [ACTIONS.SCAN_GO]: () => this.scanHandler.handleScanGo(),
      [ACTIONS.SCAN_ADD_ITEM]: () => this.handleScanAddItem(),
    };
  }

  private sheetActions(): ActionGroup<SheetAction> {
    return {
      [ACTIONS.CLOSE_ADD_MODAL]: () => this.modals.closeAddModal(),
      [ACTIONS.CLOSE_EDIT_MODAL]: () => this.modals.closeEditModal(),
      [ACTIONS.ADD_ITEM]: (control) => withBusy(control, () => this.handleAddItem()),
      [ACTIONS.ADD_AS_BATCH]: async (control) => {
        control.setAttribute('data-processing', 'true');
        try {
          if (await this.modals.addItemAsBatch(this.getContext().config)) {
            this.modals.closeAddModal();
          }
        } finally {
          control.removeAttribute('data-processing');
        }
      },
      [ACTIONS.SAVE_EDIT]: (control) => withBusy(control, () => this.handleSaveEdits()),
      [ACTIONS.EDIT_HISTORY]: () => this.handleEditModalHistory(),
      [ACTIONS.EDIT_DELETE]: () => this.handleEditModalDelete(),
    };
  }

  private batchEditorActions(): ActionGroup<BatchEditorAction> {
    return {
      [ACTIONS.ADD_BATCH_ROW]: () => this.modals.addBatchRow(),
      [ACTIONS.DISCARD_BATCH_ROW]: (control) => {
        if (control.dataset.batchDiscard) {
          this.modals.discardBatchRow(control.dataset.batchDiscard);
        }
      },
      [ACTIONS.TOGGLE_BATCH_REMOVED]: (control) => {
        if (control.dataset.batchRemove) {
          this.modals.toggleBatchRemoved(control.dataset.batchRemove);
        }
      },
    };
  }

  private async handleAddItem(): Promise<void> {
    const success = await this.modals.addItem(this.getContext().config);
    if (success) {
      this.modals.closeAddModal();
    }
  }

  private async handleSaveEdits(): Promise<void> {
    const success = await this.modals.saveEditModal(this.getContext().config);
    if (success) {
      this.modals.closeEditModal();
    }
  }

  private applyExpiryBadgeFilter(value: string): void {
    try {
      const filters = this.filters.getCurrentFilters(this.getContext().config.entity);
      // Toggle: if this filter is already the sole selection, clear it; otherwise apply it.
      const alreadyActive = filters.expiry.length === 1 && filters.expiry[0] === value;
      filters.expiry = alreadyActive ? [] : [value];
      this.filters.saveFilters(this.getContext().config.entity, filters);
      this.applyFiltersWithoutRender();
      setTimeout(() => {
        this.filters.updateFilterIndicators(filters, this.getContext().translations);
      }, 50);
    } catch (error) {
      console.error('Error applying expiry badge filter:', error);
    }
  }

  private toggleAdvancedFilters(): void {
    try {
      const filters = this.filters.getCurrentFilters(this.getContext().config.entity);
      filters.showAdvanced = !filters.showAdvanced;
      this.filters.saveFilters(this.getContext().config.entity, filters);
      this.renderCallback();
    } catch (error) {
      console.error('Error toggling advanced filters:', error);
    }
  }

  private clearFilters(): void {
    try {
      this.filters.clearFilters(this.getContext().config.entity);

      const searchInput = this.renderRoot.querySelector(
        `#${ELEMENTS.SEARCH_INPUT}`,
      ) as HTMLInputElement | null;
      if (searchInput) {
        searchInput.value = '';
      }

      this.renderCallback();
      const filters = this.filters.getCurrentFilters(this.getContext().config.entity);
      setTimeout(() => {
        this.filters.updateFilterIndicators(filters, this.getContext().translations);
      }, 50);
    } catch (error) {
      console.error('Error clearing filters:', error);
      const errorMessage = TranslationManager.localize(
        this.getContext().translations,
        'errors.clear_filters_error',
        undefined,
        'Error clearing filters. Please try again.',
      );
      alert(errorMessage);
    }
  }

  private removeFilter(key: string): void {
    const filters = this.filters.getCurrentFilters(this.getContext().config.entity);
    const multiSelectKey = Object.values(MULTI_SELECT_FILTER_KEYS).find(
      (filterKey) => filterKey === key,
    );
    if (multiSelectKey) {
      filters[multiSelectKey] = [];
    } else if (key === 'search') {
      filters.searchText = '';
    } else {
      return;
    }
    this.filters.saveFilters(this.getContext().config.entity, filters);
    this.renderCallback();
  }

  private toggleMultiSelectDropdown(trigger: HTMLElement): void {
    const dropdown = trigger.parentElement?.querySelector(
      '.multi-select-dropdown',
    ) as HTMLElement | null;
    if (!dropdown) {
      return;
    }
    const isOpen = !dropdown.hidden;
    this.closeAllMultiSelectDropdowns();
    dropdown.hidden = isOpen;
  }

  private closeAllMultiSelectDropdowns(): void {
    this.renderRoot.querySelectorAll('.multi-select-dropdown').forEach((dropdown) => {
      (dropdown as HTMLElement).hidden = true;
    });
  }

  private handleFilterMultiSelectChange(dropdown: HTMLElement): void {
    const filterKey = MULTI_SELECT_FILTER_KEYS[dropdown.id];
    if (!filterKey) {
      return;
    }
    const selected = Array.from(
      dropdown.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked'),
    ).map((checkbox) => checkbox.value);
    const filters = this.filters.getCurrentFilters(this.getContext().config.entity);
    filters[filterKey] = selected;
    this.filters.saveFilters(this.getContext().config.entity, filters);
    this.updateMultiSelectTriggerLabel(dropdown, selected.length);
    this.filters.updateFilterIndicators(filters, this.getContext().translations);
    this.applyFiltersWithoutRender();
  }

  private updateMultiSelectTriggerLabel(dropdown: HTMLElement, selectedCount: number): void {
    const label = dropdown.parentElement?.querySelector(
      '.multi-select-trigger .multi-select-label',
    ) as HTMLElement | null;
    if (!label) {
      return;
    }
    label.textContent =
      selectedCount > 0 ? `${selectedCount} selected` : (label.dataset.placeholder ?? '');
  }

  private applyFiltersWithoutRender(): void {
    const filters = this.filters.getCurrentFilters(this.getContext().config.entity);
    const sortMethodElement = this.renderRoot.querySelector(
      `#${ELEMENTS.SORT_METHOD}`,
    ) as HTMLSelectElement | null;
    const sortMethod = sortMethodElement?.value || filters.sortMethod || DEFAULTS.SORT_METHOD;

    const allItems = Utilities.validateInventoryItems(this.getContext().items);
    const filteredItems = this.filters.filterItems(allItems, filters);
    const sortedItems = this.filters.sortItems(
      filteredItems,
      sortMethod,
      this.getContext().translations,
    );

    this.updateItemsCallback(sortedItems, sortMethod);
  }

  /**
   * Switches to the other layout than the one this toggle shows (another card for the inventory
   * may have saved a different one meanwhile), saves it and re-lists the items in it (the
   * live-filtering path). Without items there is nothing to re-list, and re-listing would swap
   * the empty-inventory message for the no-results one. The toggle itself is updated in place,
   * so it keeps keyboard focus.
   */
  private toggleLayout(control: HTMLElement): void {
    const { config, translations, items } = this.getContext();
    const layout = control.getAttribute('aria-pressed') === 'true' ? 'list' : 'tiles';
    saveLayout(config.entity, layout);
    // Mirrored on the card element, as each render does (see `RenderingCoordinator.render`).
    this.renderRoot.host.setAttribute('layout', layout);
    const { icon, title } = layoutToggleView(layout, translations);
    control.setAttribute('aria-pressed', String(layout === 'tiles'));
    control.setAttribute('title', title);
    control.querySelector('ha-icon')?.setAttribute('icon', icon);
    if (items.length > 0) {
      this.applyFiltersWithoutRender();
    }
  }

  /**
   * The item page's back arrow: the panel that opened the page decides where back goes (the
   * event leaves the card's shadow root).
   */
  private closeItemPage(control: HTMLElement): void {
    const { hass, config } = this.getContext();
    control.dispatchEvent(
      new CustomEvent(ITEM_EVENTS.CLOSE, {
        bubbles: true,
        composed: true,
        detail: { inventory_id: InventoryResolver.getInventoryId(hass, config.entity) },
      }),
    );
  }

  /**
   * A tile tap: in the Inventory panel (`embedded`) the panel opens the item's page; on a
   * dashboard, or for an item without an id (older integrations), the edit sheet opens.
   */
  private openItemPage(control: HTMLElement): void {
    const { name, itemId } = control.dataset;
    if (!name) return;
    if (!itemId || !this.renderRoot.host.hasAttribute('embedded')) {
      this.itemActions.openEdit(name);
      return;
    }
    const { hass, config } = this.getContext();
    control.dispatchEvent(
      new CustomEvent(ITEM_EVENTS.OPEN, {
        bubbles: true,
        composed: true,
        detail: {
          inventory_id: InventoryResolver.getInventoryId(hass, config.entity),
          item_id: itemId,
        },
      }),
    );
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
      this.getContext().translations,
      'actions.confirm_remove',
      { name: itemName },
      `Remove ${itemName} from inventory?`,
    );
    if (confirm(confirmMessage)) {
      const { hass, config } = this.getContext();
      const inventoryId = InventoryResolver.getInventoryId(hass, config.entity);
      const result = await this.services.removeItem(inventoryId, itemName);
      if (!result.success) {
        this.modals.showError(result.error ?? '', false);
        return;
      }
      this.modals.closeEditModal();
      this.renderCallback();
    }
  }

  private toggleOverflowMenu(): void {
    const menu = this.renderRoot.getElementById(ELEMENTS.OVERFLOW_MENU);
    if (!menu) return;
    const isVisible = !menu.hidden;
    this.setOverflowMenuOpen(menu, !isVisible);
    if (!isVisible) {
      // Close on next outside click
      setTimeout(() => {
        const closeHandler = (e: Event) => {
          if (!menu.contains(e.target as Node)) {
            this.setOverflowMenuOpen(menu, false);
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
      this.setOverflowMenuOpen(menu, false);
    }
  }

  /** Shows or hides the overflow menu and mirrors the state on its trigger's aria-expanded. */
  private setOverflowMenuOpen(menu: HTMLElement, open: boolean): void {
    menu.hidden = !open;
    this.renderRoot
      .getElementById(ELEMENTS.OVERFLOW_MENU_BTN)
      ?.setAttribute('aria-expanded', String(open));
  }

  /** Opens the add sheet with the inventory's locations and categories and barcode lookups. */
  private openAddModal(): void {
    const { locations, categories } = itemOptions(this.getContext().items);
    this.modals.openAddModal(this.getContext().translations, locations, categories, (barcode) =>
      this.barcodeProductHandler.handleBarcodeProductLookup(barcode),
    );
  }

  private async handleScanAddItem(): Promise<void> {
    const barcode = this.scanHandler.getScannedBarcode();
    this.scanHandler.hideScanPanel();
    this.openAddModal();

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
