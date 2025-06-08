import { ELEMENTS, MESSAGES } from '../utils/constants';
import {
  createSearchAndFilters,
  createSortOptions,
  createActiveFiltersDisplay,
  createItemsList,
  createAddModal,
  createSettingsModal,
} from '../templates';
import { Utils } from '../utils/utils';
import { styles } from '../styles/styles';
import { HassEntity, InventoryItem } from '../types/home-assistant';
import { FilterState } from '../types/filterState';
import { TodoList } from '../types/todoList';

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
    const allItems: readonly InventoryItem[] = state?.attributes?.items || [];

    // Extract unique categories and sort them alphabetically
    const categories = [
      ...new Set(
        allItems.map((item) => item.category).filter((category): category is string => !!category)
      ),
    ].sort();

    this.shadowRoot.innerHTML = this.generateCardHTML(
      inventoryName,
      items,
      filters,
      sortMethod,
      categories,
      todoLists
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

  private generateCardHTML(
    inventoryName: string,
    items: InventoryItem[],
    filters: FilterState,
    sortMethod: string,
    categories: string[],
    todoLists: TodoList[]
  ): string {
    return `
      <style>${styles}</style>
      <ha-card>
        <div class="card-header">
          <h2 class="inventory-title">${Utils.sanitizeHtml(inventoryName)}</h2>
        </div>
        
        <div class="controls-row">
          <div class="sorting-controls">
            ${createSortOptions(sortMethod)}
          </div>
          <button id="${ELEMENTS.OPEN_ADD_MODAL}" class="add-new-btn">+ Add Item</button>
        </div>
        
        <div class="search-controls">
          ${createSearchAndFilters(filters, categories)}
        </div>
        
        ${createActiveFiltersDisplay(filters)}
        
        <div class="items-container">
          ${
            items.length
              ? createItemsList(items, sortMethod, todoLists)
              : `<div class="empty-state">${MESSAGES.NO_ITEMS}</div>`
          }
        </div>
        
        ${createAddModal(todoLists)}
        ${createSettingsModal(todoLists)}
      </ha-card>
    `;
  }
}
