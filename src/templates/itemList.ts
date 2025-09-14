import { CSS_CLASSES } from '../utils/constants';
import { InventoryItem } from '../types/homeAssistant';
import { TodoList } from '../types/todoList';
import { Utilities } from '../utils/utilities';
import { createItemRowTemplate } from './itemRow';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';

export function createItemsList(
  items: InventoryItem[],
  sortMethod: string,
  todoLists: TodoList[],
  translations: TranslationData,
): string {
  if (items.length === 0) {
    const noItemsMessage = TranslationManager.localize(
      translations,
      'items.no_items',
      undefined,
      'No items in inventory',
    );
    return `<div class="no-items">${noItemsMessage}</div>`;
  }

  if (sortMethod === 'category') {
    return createItemsByCategory(items, todoLists, translations);
  }

  if (sortMethod === 'location') {
    return createItemsByLocation(items, todoLists, translations);
  }

  return items.map((item) => createItemRowTemplate(item, todoLists, translations)).join('');
}

export function createItemsByCategory(
  items: InventoryItem[],
  todoLists: TodoList[],
  translations: TranslationData,
): string {
  const grouped = Utilities.groupItemsByCategory(items);
  const sortedCategories = Object.keys(grouped).sort();

  return sortedCategories
    .map(
      (category) => `
        <div class="${CSS_CLASSES.CATEGORY_GROUP}">
          <div class="${CSS_CLASSES.CATEGORY_HEADER}">${category}</div>
          ${grouped[category].map((item) => createItemRowTemplate(item, todoLists, translations)).join('')}
        </div>
      `,
    )
    .join('');
}

export function createItemsByLocation(
  items: InventoryItem[],
  todoLists: TodoList[],
  translations: TranslationData,
): string {
  const grouped = Utilities.groupItemsByLocation(items);
  const sortedLocations = Object.keys(grouped).sort();
  return sortedLocations
    .map(
      (location) => `
        <div class="${CSS_CLASSES.CATEGORY_GROUP}">
          <div class="${CSS_CLASSES.CATEGORY_HEADER}">${location}</div>
          ${grouped[location].map((item) => createItemRowTemplate(item, todoLists, translations)).join('')}
        </div>
`,
    )
    .join('');
}
