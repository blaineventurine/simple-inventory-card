import { valueFormatter } from '@/utils/currency';
import { RowOptions } from '@/types/rowOptions';
import { CardContext } from '@/types/cardContext';
import { InventoryConfig, InventoryItem } from '../types/inventory';
import { DEFAULTS } from '../utils/constants';
import { createItemsList } from '../templates/itemList';
import { getLayout } from './layout';
import { LifecycleManager } from './lifecycleManager';
import { TranslationManager } from './translationManager';
import { Renderer } from './renderer';
import { hydrateImages } from './imageLoader';
import { forgetDetachedSheets } from './modals/modalUIManager';

export class RenderingCoordinator {
  private lifecycleManager: LifecycleManager;
  private renderRoot: ShadowRoot;

  constructor(lifecycleManager: LifecycleManager, renderRoot: ShadowRoot) {
    this.lifecycleManager = lifecycleManager;
    this.renderRoot = renderRoot;
  }

  /** Full render of the card from `context`. */
  render(
    context: CardContext,
    todoLists: Array<{ id: string; name: string }>,
    validateItemsCallback: (items: InventoryItem[]) => InventoryItem[],
  ): void {
    const { config, hass, translations, items } = context;
    if (!config || !hass || !this.renderRoot) {
      return;
    }

    try {
      const entityId = config.entity;
      const state = hass.states[entityId];

      if (!state) {
        const errorMessage = TranslationManager.localize(
          translations,
          'errors.entity_not_found',
          { entity: entityId },
          `Entity ${entityId} not found. Please check your configuration.`,
        );
        this.renderError(errorMessage, config);
        return;
      }

      const services = this.lifecycleManager.getServices();

      if (!services) {
        const errorMessage = TranslationManager.localize(
          translations,
          'errors.initialization_failed',
          undefined,
          'Failed to initialize card components',
        );
        this.renderError(errorMessage, config);
        return;
      }

      const { filters, renderer, eventHandler, state: stateService, detailView } = services;
      const rowOptions = this.rowOptions(context);

      const currentFilters = filters.getCurrentFilters(entityId);
      const sortMethod = currentFilters.sortMethod || DEFAULTS.SORT_METHOD;
      const allItems = validateItemsCallback(items);
      const filteredItems = filters.filterItems(allItems, currentFilters);
      const sortedItems = filters.sortItems(filteredItems, sortMethod, translations);

      renderer.renderCard(
        state,
        entityId,
        sortedItems,
        allItems,
        currentFilters,
        sortMethod,
        todoLists,
        translations,
        config,
        rowOptions,
        context.capabilities.itemIcons,
      );
      // The card element carries its layout, so a host can size itself (the panel widens tiles).
      this.renderRoot.host.setAttribute('layout', rowOptions.layout ?? 'list');
      // The list or the item page, whichever the card shows (the page renders from the store).
      detailView.render();
      if (rowOptions.images) {
        hydrateImages(this.renderRoot, rowOptions.images);
      }
      this.releaseReplacedUi();

      eventHandler.setupEventListeners();

      filters.updateFilterIndicators(currentFilters, translations);
      stateService.trackUserInteraction(this.renderRoot);
    } catch (error) {
      console.error('Error rendering card:', error);
      const errorMessage = TranslationManager.localize(
        translations,
        'errors.render_error',
        undefined,
        'An error occurred while rendering the card',
      );
      this.renderError(errorMessage, config);
    }
  }

  /** Re-lists the rows only (live filtering), leaving the rest of the card as it is. */
  updateItemsOnly(
    context: CardContext,
    items: InventoryItem[],
    sortMethod: string,
    todoLists: Array<{ id: string; name: string }>,
  ): void {
    if (!this.renderRoot) {
      return;
    }

    const itemsContainer = this.renderRoot.querySelector('.items-container');
    if (!itemsContainer) {
      return;
    }

    const rowOptions = this.rowOptions(context);
    // The layout may have been switched by another card for the inventory (see `getLayout`).
    this.renderRoot.host.setAttribute('layout', rowOptions.layout ?? 'list');
    itemsContainer.innerHTML = createItemsList(
      items,
      sortMethod,
      todoLists,
      context.translations || {},
      context.config,
      rowOptions,
    );
    if (rowOptions.images) {
      hydrateImages(itemsContainer, rowOptions.images);
    }
    // The re-listed rows come with their restock/move forms closed.
    this.lifecycleManager.getServices()?.eventHandler.rowsReplaced();
  }

  /**
   * The row options of a render: the context's capabilities plus the open details panels and the
   * inventory's layout.
   */
  private rowOptions({ capabilities, config, hass }: CardContext): RowOptions {
    const services = this.lifecycleManager.getServices();
    const images = capabilities.itemImages ? services?.imageLoader : undefined;
    return {
      batches: capabilities.batches,
      expanded: services?.state.expandedBatchItems ?? new Set<string>(),
      transfers: capabilities.transfers,
      layout: getLayout(config.entity, config),
      formatValue: valueFormatter(hass.language, hass.config.currency),
      ...(images ? { images, tileImages: capabilities.tileImages } : {}),
    };
  }

  /** Replaces the card with an error message (through the card's renderer, or a fresh one before
   * the services exist). */
  renderError(message: string, config: InventoryConfig): void {
    if (!this.renderRoot) {
      return;
    }
    const renderer = this.lifecycleManager.getServices()?.renderer ?? new Renderer(this.renderRoot);
    renderer.renderError(message);
    this.renderRoot.host.setAttribute('layout', getLayout(config.entity, config));
    this.releaseReplacedUi();
  }

  /** The replaced card took its open sheets, forms and scan panel along: release their holds. */
  private releaseReplacedUi(): void {
    forgetDetachedSheets(this.renderRoot);
    this.lifecycleManager.getServices()?.eventHandler.cardReplaced();
  }
}
