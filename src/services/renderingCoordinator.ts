import { HomeAssistant, InventoryConfig, InventoryItem } from '../types/home-assistant';
import { DEFAULTS } from '../utils/constants';
import { Utils } from '../utils/utils';
import { LifecycleManager } from './lifecycleManager';

export class RenderingCoordinator {
  private lifecycleManager: LifecycleManager;
  private renderRoot: ShadowRoot;
  private updateTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(lifecycleManager: LifecycleManager, renderRoot: ShadowRoot) {
    this.lifecycleManager = lifecycleManager;
    this.renderRoot = renderRoot;
  }

  render(
    config: InventoryConfig,
    hass: HomeAssistant,
    todoLists: Array<{ id: string; name: string }>,
    validateItemsCallback: (items: InventoryItem[]) => InventoryItem[],
  ): void {
    if (!config || !hass || !this.renderRoot) {
      return;
    }

    try {
      const entityId = config.entity;
      const state = hass.states[entityId];

      if (!state) {
        this.renderError(`Entity ${entityId} not found. Please check your configuration.`);
        return;
      }

      const services = this.lifecycleManager.getServices();

      if (!services) {
        this.renderError('Failed to initialize card components');
        return;
      }

      const { filters, renderer, eventHandler, state: stateService } = services;

      const currentFilters = filters.getCurrentFilters(entityId);
      const sortMethod = currentFilters.sortMethod || DEFAULTS.SORT_METHOD;
      const allItems = validateItemsCallback(state.attributes?.items || []);
      const filteredItems = filters.filterItems(allItems, currentFilters);
      const sortedItems = filters.sortItems(filteredItems, sortMethod);

      renderer.renderCard(state, entityId, sortedItems, currentFilters, sortMethod, todoLists);

      eventHandler.setupEventListeners();

      filters.updateFilterIndicators(currentFilters);
      stateService.trackUserInteraction(this.renderRoot);
    } catch (error) {
      console.error('Error rendering card:', error);
      this.renderError('An error occurred while rendering the card');
    }
  }

  updateItemsOnly(
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

    import('../templates/itemList')
      .then(({ createItemsList }) => {
        itemsContainer.innerHTML = createItemsList(items, sortMethod, todoLists);
      })
      .catch((error) => {
        console.error('Error loading templates:', error);
      });
  }

  debouncedRender(renderCallback: () => void): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = setTimeout(() => renderCallback(), 100);
  }

  refreshAfterSave(renderCallback: () => void): void {
    setTimeout(() => renderCallback(), 50);
  }

  renderError(message: string): void {
    if (!this.renderRoot) {
      return;
    }

    const services = this.lifecycleManager.getServices();
    if (services?.renderer) {
      services.renderer.renderError(message);
    } else {
      (this.renderRoot as unknown as HTMLElement).innerHTML = `
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

  cleanup(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }
}
