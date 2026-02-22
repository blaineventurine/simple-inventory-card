import { ELEMENTS } from '../utils/constants';
import { createInventoryHeader } from '../templates/inventoryHeader';
import { createScanPanel } from '../templates/scanPanel';
import { createSearchAndFilters } from '../templates/searchAndFilters';
import { createAddModal, createEditModal } from '../templates/modalTemplates';
import { createItemsList } from '../templates/itemList';
import { createSortOptions } from '../templates/sortOptions';
import { createActiveFiltersDisplay } from '../templates/filters';
import { InventoryConfig, InventoryItem } from '../types/homeAssistant';
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
  locations: string[],
  todoLists: TodoList[],
  allItems: readonly InventoryItem[],
  description: string | undefined,
  translations: TranslationData,
  config?: InventoryConfig,
): string {
  const showHeader = config?.show_header !== false;
  const showSort = config?.show_sort !== false;
  const showAddButton = config?.show_add_button !== false;
  const showSearch = config?.show_search !== false;

  return `
    <style>${styles}</style>
    <ha-card>
      ${showHeader ? createInventoryHeader(inventoryName, allItems as InventoryItem[], translations, description) : ''}
      ${createScanPanel(translations)}

      ${
        showSort || showAddButton
          ? `<div class="controls-row">
        ${showSort ? `<div class="sorting-controls">${createSortOptions(sortMethod, translations)}</div>` : ''}
        ${showAddButton ? `<button id="${ELEMENTS.OPEN_ADD_MODAL}" class="add-new-btn">+ ${TranslationManager.localize(translations, 'modal.add_item', undefined, 'Add Item')}</button>` : ''}
      </div>`
          : ''
      }

      ${
        showSearch
          ? `<div class="search-controls">
        ${createSearchAndFilters(filters, categories, locations, translations)}
      </div>
      ${createActiveFiltersDisplay(filters, translations)}`
          : ''
      }

      <div class="items-container">
        ${
          items.length > 0
            ? createItemsList(items, sortMethod, todoLists, translations, config)
            : `<div class="empty-state">${TranslationManager.localize(translations, 'items.no_items', undefined, 'No items in inventory')}</div>`
        }
      </div>

      ${createAddModal(todoLists, translations, categories, locations)}
      ${createEditModal(todoLists, translations, categories, locations)}
    </ha-card>
  `;
}
