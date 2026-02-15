import { Utilities } from '../utils/utilities';
import { styles } from '../styles/styles';
import { HassEntity, InventoryConfig, InventoryItem } from '../types/homeAssistant';
import { FilterState } from '../types/filterState';
import { TodoList } from '../types/todoList';
import { generateCardHTML } from '../templates/inventoryCard';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';

export class Renderer {
  constructor(private readonly shadowRoot: ShadowRoot) {}

  renderCard(
    state: HassEntity,
    entityId: string,
    items: InventoryItem[],
    filters: FilterState,
    sortMethod: string,
    todoLists: TodoList[],
    translations: TranslationData,
    config?: InventoryConfig,
  ): void {
    const inventoryName = Utilities.getInventoryName(state, entityId);
    const description = Utilities.getInventoryDescription(state);
    const allItems: readonly InventoryItem[] = state?.attributes?.items || [];
    const categorySet = new Set<string>();
    allItems.forEach((item) => {
      if (Array.isArray(item.categories) && item.categories.length > 0) {
        item.categories.forEach((c) => {
          if (c?.trim()) categorySet.add(c.trim());
        });
      } else if (item.category?.trim()) {
        categorySet.add(item.category.trim());
      }
    });
    const categories = [...categorySet].sort();

    const locationSet = new Set<string>();
    allItems.forEach((item) => {
      if (Array.isArray(item.locations) && item.locations.length > 0) {
        item.locations.forEach((loc) => {
          if (loc?.trim()) locationSet.add(loc.trim());
        });
      } else if (item.location?.trim()) {
        locationSet.add(item.location.trim());
      }
    });
    const locations = [...locationSet].sort();

    this.shadowRoot.innerHTML = generateCardHTML(
      inventoryName,
      items,
      filters,
      sortMethod,
      categories,
      locations,
      todoLists,
      allItems,
      description,
      translations,
      config,
    );
  }

  renderError(message: string, translations?: TranslationData): void {
    const errorLabel = translations
      ? TranslationManager.localize(translations, 'common.error', undefined, 'Error')
      : 'Error';

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card>
        <div class="card-content">
          <div class="error-message" style="color: var(--error-color); padding: 16px; text-align: center;">
            <p><strong>${errorLabel}:</strong> ${Utilities.sanitizeHtml(message)}</p>
          </div>
        </div>
      </ha-card>
    `;
  }

  renderLoading(translations?: TranslationData): void {
    const loadingMessage = translations
      ? TranslationManager.localize(translations, 'common.loading', undefined, 'Loading...')
      : 'Loading...';

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card>
        <div class="card-content">
          <div class="loading-container" style="padding: 16px; text-align: center;">
            <p>${loadingMessage}</p>
          </div>
        </div>
      </ha-card>
    `;
  }
}
