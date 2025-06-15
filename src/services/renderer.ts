import { MESSAGES } from '../utils/constants';
import { Utils } from '../utils/utils';
import { styles } from '../styles/styles';
import { HassEntity, InventoryItem } from '../types/home-assistant';
import { FilterState } from '../types/filterState';
import { TodoList } from '../types/todoList';
import { generateCardHTML } from '../templates/inventoryCard';

export class Renderer {
  constructor(private readonly shadowRoot: ShadowRoot) {}

  renderCard(
    state: HassEntity,
    entityId: string,
    items: InventoryItem[],
    filters: FilterState,
    sortMethod: string,
    todoLists: TodoList[]
  ): void {
    const inventoryName = Utils.getInventoryName(state, entityId);
    const description = Utils.getInventoryDescription(state);
    const allItems: readonly InventoryItem[] = state?.attributes?.items || [];
    const categories = [
      ...new Set(
        allItems.map((item) => item.category).filter((category): category is string => !!category)
      ),
    ].sort();

    this.shadowRoot.innerHTML = generateCardHTML(
      inventoryName,
      items,
      filters,
      sortMethod,
      categories,
      todoLists,
      allItems,
      description
    );
  }

  renderError(message: string): void {
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card>
        <div class="card-content">
          <div class="error-message" style="color: var(--error-color); padding: 16px; text-align: center;">
            <p><strong>Error:</strong> ${Utils.sanitizeHtml(message)}</p>
          </div>
        </div>
      </ha-card>
    `;
  }

  renderLoading(): void {
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card>
        <div class="card-content">
          <div class="loading-container" style="padding: 16px; text-align: center;">
            <p>${MESSAGES.LOADING}</p>
          </div>
        </div>
      </ha-card>
    `;
  }
}
