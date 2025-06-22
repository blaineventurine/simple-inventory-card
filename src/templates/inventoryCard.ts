import { ELEMENTS, MESSAGES } from '../utils/constants';
import { createInventoryHeader } from '../templates/inventoryHeader';
import { createSearchAndFilters } from '../templates/searchAndFilters';
import { createAddModal, createEditModal } from '../templates/modalTemplates';
import { createItemsList } from '../templates/itemList';
import { createSortOptions } from '../templates/sortOptions';
import { createActiveFiltersDisplay } from '../templates/filters';
import { InventoryItem } from '../types/homeAssistant';
import { FilterState } from '../types/filterState';
import { TodoList } from '../types/todoList';
import { styles } from '../styles/styles';

export function generateCardHTML(
  inventoryName: string,
  items: InventoryItem[],
  filters: FilterState,
  sortMethod: string,
  categories: string[],
  todoLists: TodoList[],
  allItems: readonly InventoryItem[],
  description: string | undefined,
): string {
  return `
    <style>${styles}</style>
    <ha-card>
      ${createInventoryHeader(inventoryName, allItems as InventoryItem[], description)}
      
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
          items.length > 0
            ? createItemsList(items, sortMethod, todoLists)
            : `<div class="empty-state">${MESSAGES.NO_ITEMS}</div>`
        }
      </div>
      
      ${createAddModal(todoLists)}
      ${createEditModal(todoLists)}
    </ha-card>
  `;
}
