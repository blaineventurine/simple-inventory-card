import { ACTIONS, ELEMENTS } from '../utils/constants';
import { Utilities } from '../utils/utilities';
import { createInventoryHeader } from '../templates/inventoryHeader';
import { createScanPanel } from '../templates/scanPanel';
import { createFilterPanel, createSearchRow } from '../templates/searchAndFilters';
import { createAddModal, createEditModal } from '../templates/modalTemplates';
import { createEmptyState, createItemsList } from '../templates/itemList';
import { createSortOptions } from '../templates/sortOptions';
import { createActiveFiltersDisplay } from '../templates/filters';
import { InventoryConfig, InventoryItem, Layout } from '@/types/inventory';
import { FilterState } from '@/types/filterState';
import { TodoList } from '@/types/todoList';
import { styles } from '../styles/styles';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { RowOptions } from '@/types/rowOptions';
import { batchLocationOptions } from './modalPartials/batchFields';
import { iconButton } from './primitives';
import { layoutToggleView } from '@/services/layout';

interface ToolbarParts {
  showSearch: boolean;
  showSort: boolean;
  showAddButton: boolean;
  filtersActive: boolean;
  layout: Layout;
}

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
  rowOptions?: RowOptions,
  itemIconsEnabled = false,
): string {
  const showHeader = config?.show_header !== false;
  const batchesEnabled = rowOptions?.batches === true;
  const itemImagesEnabled = rowOptions?.images !== undefined;
  const filtersActive = Utilities.hasActiveFilters(filters);
  const toolbar = createToolbar(filters, sortMethod, categories, locations, translations, {
    showSearch: config?.show_search !== false,
    showSort: config?.show_sort !== false,
    showAddButton: config?.show_add_button !== false,
    filtersActive,
    layout: rowOptions?.layout ?? 'list',
  });

  // The list view (header to items) and the item page swap; the sheets serve both.
  return `
    <style>${styles}</style>
    <ha-card>
      <div class="si-list">
        ${showHeader ? createInventoryHeader(inventoryName, allItems as InventoryItem[], translations, description) : ''}
        ${createScanPanel(translations, batchesEnabled)}
        ${toolbar}

        <div class="items-container">
          ${
            items.length > 0
              ? createItemsList(items, sortMethod, todoLists, translations, config, rowOptions)
              : createEmptyState(filtersActive ? 'no_results' : 'empty', translations)
          }
        </div>
      </div>
      <section class="si-detail" hidden></section>

      ${createAddModal(todoLists, translations, categories, locations, batchesEnabled, itemIconsEnabled, itemImagesEnabled)}
      ${createEditModal(todoLists, translations, categories, locations, batchesEnabled, itemIconsEnabled, itemImagesEnabled)}
      ${batchesEnabled ? batchLocationOptions(locations) : ''}
    </ha-card>
  `;
}

/**
 * Row 1: search pill + filter button + add button. Row 2: horizontally scrolling chips (sort chip,
 * active filters), hidden while it would be empty. Then the collapsible filter panel.
 */
function createToolbar(
  filters: FilterState,
  sortMethod: string,
  categories: string[],
  locations: string[],
  translations: TranslationData,
  parts: ToolbarParts,
): string {
  const { showSearch, showSort, showAddButton, filtersActive, layout } = parts;
  if (!showSearch && !showSort && !showAddButton) {
    return '';
  }

  const mainRow =
    showSearch || showAddButton
      ? `<div class="si-toolbar__row">
        ${showSearch ? createSearchRow(filters, translations) : ''}
        ${
          showAddButton
            ? iconButton({
                icon: 'mdi:plus',
                label: TranslationManager.localize(
                  translations,
                  'modal.add_item',
                  undefined,
                  'Add Item',
                ),
                className: 'si-add-btn si-tint si-tone-primary',
                attrs: { id: ELEMENTS.OPEN_ADD_MODAL, 'data-action': ACTIONS.OPEN_ADD_MODAL },
              })
            : ''
        }
      </div>`
      : '';
  const chipRow =
    showSort || showSearch
      ? `<div class="si-chip-row"${showSort || filtersActive ? '' : ' hidden'}>
        ${showSort ? createSortOptions(sortMethod, translations) : ''}
        ${showSort ? layoutToggle(layout, translations) : ''}
        ${showSearch ? createActiveFiltersDisplay(filters, translations) : ''}
      </div>`
      : '';

  return `<div class="si-toolbar">
      ${mainRow}
      ${chipRow}
      ${showSearch ? createFilterPanel(filters, categories, locations, translations) : ''}
    </div>`;
}

/**
 * Toolbar toggle between rows and tiles: constant label, `aria-pressed` in tile mode; icon and
 * tooltip name the layout it switches to.
 */
function layoutToggle(layout: Layout, translations: TranslationData): string {
  const { icon, label, title } = layoutToggleView(layout, translations);
  return iconButton({
    icon,
    label,
    title,
    className: 'si-layout-toggle',
    attrs: { 'data-action': ACTIONS.TOGGLE_LAYOUT, 'aria-pressed': String(layout === 'tiles') },
  });
}
