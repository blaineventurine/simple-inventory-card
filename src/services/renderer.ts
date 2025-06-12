import { ELEMENTS, MESSAGES } from '../utils/constants';
import {
  createSearchAndFilters,
  createSortOptions,
  createActiveFiltersDisplay,
  createItemsList,
} from '../templates';
import { createAddModal, createEditModal } from '../templates/modalTemplates';
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
      todoLists,
      allItems
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

  private getExpiringItemsCount(items: InventoryItem[]): number {
    return items.filter((item) => {
      if (!item.expiry_date || (item.quantity ?? 0) <= 0) return false;
      const threshold = item.expiry_alert_days || 7;
      return Utils.isExpiringSoon(item.expiry_date, threshold);
    }).length;
  }

  private getExpiredItemsCount(items: InventoryItem[]): number {
    return items.filter((item) => {
      if (!item.expiry_date || (item.quantity ?? 0) <= 0) return false;
      return Utils.isExpired(item.expiry_date);
    }).length;
  }

  private createInventoryHeader(inventoryName: string, allItems: InventoryItem[]): string {
    const expiringCount = this.getExpiringItemsCount(allItems);
    const expiredCount = this.getExpiredItemsCount(allItems);

    return `
      <div class="card-header">
        <h2 class="inventory-title">${Utils.sanitizeHtml(inventoryName)}</h2>
        ${
          expiredCount > 0 || expiringCount > 0
            ? `
          <div class="expiry-indicators">
            ${
              expiredCount > 0
                ? `
              <span class="expired-badge" title="${expiredCount} items expired">
                <ha-icon icon="mdi:calendar-remove"></ha-icon>
                ${expiredCount}
              </span>
            `
                : ''
            }
            ${
              expiringCount > 0
                ? `
              <span class="expiring-badge" title="${expiringCount} items expiring soon">
                <ha-icon icon="mdi:calendar-alert"></ha-icon>
                ${expiringCount}
              </span>
            `
                : ''
            }
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  private generateCardHTML(
    inventoryName: string,
    items: InventoryItem[],
    filters: FilterState,
    sortMethod: string,
    categories: string[],
    todoLists: TodoList[],
    allItems: readonly InventoryItem[]
  ): string {
    return `
      <style>${styles}</style>
      <ha-card>
        ${this.createInventoryHeader(inventoryName, allItems as InventoryItem[])}
        
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
        ${createEditModal(todoLists)}
      </ha-card>
    `;
  }
}
