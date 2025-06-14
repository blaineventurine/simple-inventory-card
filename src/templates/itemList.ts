import { CSS_CLASSES, MESSAGES } from '../utils/constants';
import { InventoryItem } from '../types/home-assistant';
import { TodoList } from '../types/todoList';
import { Utils } from '../utils/utils';
import { createItemRowTemplate } from './itemRow';

export function createItemsList(
  items: InventoryItem[],
  sortMethod: string,
  todoLists: TodoList[]
): string {
  if (items.length === 0) {
    return `<div class="no-items">${MESSAGES.NO_ITEMS}</div>`;
  }

  if (sortMethod === 'category') {
    return createItemsByCategory(items, todoLists);
  }

  return items.map((item) => createItemRowTemplate(item, todoLists)).join('');
}

export function createItemsByCategory(items: InventoryItem[], todoLists: TodoList[]): string {
  const grouped = Utils.groupItemsByCategory(items);
  const sortedCategories = Object.keys(grouped).sort();

  return sortedCategories
    .map(
      (category) => `
        <div class="${CSS_CLASSES.CATEGORY_GROUP}">
          <div class="${CSS_CLASSES.CATEGORY_HEADER}">${category}</div>
          ${grouped[category].map((item) => createItemRowTemplate(item, todoLists)).join('')}
        </div>
      `
    )
    .join('');
}
