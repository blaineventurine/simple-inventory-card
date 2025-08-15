import { ELEMENTS } from '../utils/constants';
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
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';

export function generateCardHTML(
  inventoryName: string,
  items: InventoryItem[],
  filters: FilterState,
  sortMethod: string,
  categories: string[],
  todoLists: TodoList[],
  allItems: readonly InventoryItem[],
  description: string | undefined,
  translations: TranslationData,
): string {
  return `
    <style>${styles}</style>
    <ha-card>
      ${createInventoryHeader(inventoryName, allItems as InventoryItem[], translations, description)}

      <div class="controls-row">
        <div class="sorting-controls">
          ${createSortOptions(sortMethod, translations)}
        </div>
        <button id="${ELEMENTS.OPEN_ADD_MODAL}" class="add-new-btn">
          + ${TranslationManager.localize(translations, 'modal.add_item', undefined, 'Add Item')}
        </button>
      </div>

      <div class="search-controls">
        ${createSearchAndFilters(filters, categories, translations)}
      </div>

      ${createActiveFiltersDisplay(filters, translations)}

      <div class="items-container">
        ${
          items.length > 0
            ? createItemsList(items, sortMethod, todoLists, translations)
            : `<div class="empty-state">${TranslationManager.localize(translations, 'items.no_items', undefined, 'No items in inventory')}</div>`
        }
      </div>

      ${createAddModal(todoLists, translations)}
      ${createEditModal(todoLists, translations)}
    </ha-card>
  `;
}
