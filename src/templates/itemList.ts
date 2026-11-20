import { CSS_CLASSES } from '../utils/constants';
import { InventoryConfig, InventoryItem } from '../types/inventory';
import { TodoList } from '../types/todoList';
import { Utilities } from '../utils/utilities';
import { createItemRowTemplate } from './itemRow';
import { createItemTileTemplate } from './itemTile';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { RowOptions } from '@/types/rowOptions';
import { iconCircle } from './primitives';

/** Centred icon + one line: 'empty' = nothing in the inventory, 'no_results' = filters hide everything. */
export function createEmptyState(
  kind: 'empty' | 'no_results',
  translations: TranslationData,
): string {
  const icon = kind === 'empty' ? 'mdi:package-variant-closed' : 'mdi:filter-remove-outline';
  const text =
    kind === 'empty'
      ? TranslationManager.localize(
          translations,
          'items.no_items',
          undefined,
          'No items in inventory',
        )
      : TranslationManager.localize(
          translations,
          'items.no_results',
          undefined,
          'No items match your filters',
        );
  return `<div class="si-empty">${iconCircle(icon, 'disabled')}<p class="si-empty__text">${text}</p></div>`;
}

/** The items of one list or group: rows, or (layout `tiles`) one grid of tiles. */
function renderItems(
  items: InventoryItem[],
  todoLists: TodoList[],
  translations: TranslationData,
  config?: InventoryConfig,
  rowOptions?: RowOptions,
): string {
  if (rowOptions?.layout === 'tiles') {
    const tiles = items
      .map((item) => createItemTileTemplate(item, todoLists, translations, config, rowOptions))
      .join('');
    return `<div class="si-tiles">${tiles}</div>`;
  }
  return items
    .map((item) => createItemRowTemplate(item, todoLists, translations, config, rowOptions))
    .join('');
}

export function createItemsList(
  items: InventoryItem[],
  sortMethod: string,
  todoLists: TodoList[],
  translations: TranslationData,
  config?: InventoryConfig,
  rowOptions?: RowOptions,
): string {
  // Only reached after live filtering (full renders handle the empty inventory themselves).
  if (items.length === 0) {
    return createEmptyState('no_results', translations);
  }

  if (sortMethod === 'category') {
    return createItemsByCategory(items, todoLists, translations, config, rowOptions);
  }

  if (sortMethod === 'location') {
    return createItemsByLocation(items, todoLists, translations, config, rowOptions);
  }

  return renderItems(items, todoLists, translations, config, rowOptions);
}

export function createItemsByCategory(
  items: InventoryItem[],
  todoLists: TodoList[],
  translations: TranslationData,
  config?: InventoryConfig,
  rowOptions?: RowOptions,
): string {
  const grouped = Utilities.groupItemsByCategory(items);
  const sortedCategories = Object.keys(grouped).sort();

  return sortedCategories
    .map((category) => {
      const safeCategory = Utilities.sanitizeHtml(category);
      return `
        <div class="${CSS_CLASSES.CATEGORY_GROUP}">
          <div class="${CSS_CLASSES.CATEGORY_HEADER}"><span class="si-group__name">${safeCategory}</span><span class="si-group__count">${grouped[category].length}</span></div>
          ${renderItems(grouped[category], todoLists, translations, config, rowOptions)}
        </div>
      `;
    })
    .join('');
}

export function createItemsByLocation(
  items: InventoryItem[],
  todoLists: TodoList[],
  translations: TranslationData,
  config?: InventoryConfig,
  rowOptions?: RowOptions,
): string {
  const grouped = Utilities.groupItemsByLocation(items);
  const sortedLocations = Object.keys(grouped).sort();
  return sortedLocations
    .map((location) => {
      const safeLocation = Utilities.sanitizeHtml(location);
      return `
        <div class="${CSS_CLASSES.LOCATION_GROUP}">
          <div class="${CSS_CLASSES.LOCATION_HEADER}"><span class="si-group__name">${safeLocation}</span><span class="si-group__count">${grouped[location].length}</span></div>
          ${renderItems(grouped[location], todoLists, translations, config, rowOptions)}
        </div>
`;
    })
    .join('');
}
