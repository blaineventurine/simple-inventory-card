import { TranslationData } from '@/types/translatableComponent';
import { HomeAssistant, InventoryConfig, InventoryItem } from '../types/homeAssistant';
import { DEFAULTS } from '../utils/constants';
import { Utilities } from '../utils/utilities';
import { LifecycleManager } from './lifecycleManager';
import { TranslationManager } from './translationManager';

export class RenderingCoordinator {
  private lifecycleManager: LifecycleManager;
  private renderRoot: ShadowRoot;
  private updateTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

  constructor(lifecycleManager: LifecycleManager, renderRoot: ShadowRoot) {
    this.lifecycleManager = lifecycleManager;
    this.renderRoot = renderRoot;
  }

  render(
    config: InventoryConfig,
    hass: HomeAssistant,
    todoLists: Array<{ id: string; name: string }>,
    translations: TranslationData,
    validateItemsCallback: (items: InventoryItem[]) => InventoryItem[],
  ): void {
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
        this.renderError(errorMessage);
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
        this.renderError(errorMessage);
        return;
      }

      const { filters, renderer, eventHandler, state: stateService } = services;

      const currentFilters = filters.getCurrentFilters(entityId);
      const sortMethod = currentFilters.sortMethod || DEFAULTS.SORT_METHOD;
      const allItems = validateItemsCallback(state.attributes?.items || []);
      const filteredItems = filters.filterItems(allItems, currentFilters);
      const sortedItems = filters.sortItems(filteredItems, sortMethod, translations);

      renderer.renderCard(
        state,
        entityId,
        sortedItems,
        currentFilters,
        sortMethod,
        todoLists,
        translations,
        config,
      );

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
      this.renderError(errorMessage);
    }
  }

  updateItemsOnly(
    items: InventoryItem[],
    sortMethod: string,
    todoLists: Array<{ id: string; name: string }>,
    translations: TranslationData,
    config?: InventoryConfig,
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
        itemsContainer.innerHTML = createItemsList(
          items,
          sortMethod,
          todoLists,
          translations || {},
          config,
        );
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

  renderError(message: string, translations?: TranslationData): void {
    if (!this.renderRoot) {
      return;
    }

    const services = this.lifecycleManager.getServices();
    if (services?.renderer) {
      services.renderer.renderError(message);
    } else {
      const errorLabel = translations
        ? TranslationManager.localize(translations, 'common.error', undefined, 'Error')
        : 'Error';
      (this.renderRoot as unknown as HTMLElement).innerHTML = `
        <ha-card>
          <div class="card-content">
            <div class="error-message" style="color: var(--error-color); padding: 16px; text-align: center;">
              <p><strong>${errorLabel}:</strong> ${Utilities.sanitizeHtml(message)}</p>
            </div>
          </div>
        </ha-card>
      `;
    }
  }

  cleanup(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = undefined;
    }
  }
}
