import { Utilities } from '../utils/utilities';
import { styles } from '../styles/styles';
import { HassEntity, InventoryItem } from '../types/homeAssistant';
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
  ): void {
    const inventoryName = Utilities.getInventoryName(state, entityId);
    const description = Utilities.getInventoryDescription(state);
    const allItems: readonly InventoryItem[] = state?.attributes?.items || [];
    const categories = [
      ...new Set(
        allItems.map((item) => item.category).filter((category): category is string => !!category),
      ),
    ].sort();
    const locations = [
      ...new Set(
        allItems.map((item) => item.location).filter((location): location is string => !!location),
      ),
    ].sort();

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
