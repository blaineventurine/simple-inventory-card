import { DEFAULTS } from './constants';
import { InventoryItem } from '../types/homeAssistant';
import { FilterState } from '../types/filterState';

interface InputValues {
  [id: string]: string | boolean | number;
}

export const Utilities = {
  /**
   * Sanitizes HTML string to prevent XSS
   */
  sanitizeHtml(string_: string): string {
    const div = document.createElement('div');
    div.textContent = string_;
    return div.innerHTML;
  },

  /**
   * Creates a debounced function
   */
  debounce<T extends (...arguments_: any[]) => any>(
    function_: T,
    wait: number,
  ): (...arguments_: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined = undefined;

    return function executedFunction(...arguments_: Parameters<T>): void {
      const later = () => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        function_(...arguments_);
      };

      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Validates and normalizes inventory items from Home Assistant state
   */
  validateInventoryItems(items: InventoryItem[]): InventoryItem[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.filter((item): item is InventoryItem => {
      if (!item || typeof item !== 'object' || !item.name || typeof item.name !== 'string') {
        return false;
      }

      item.quantity =
        typeof item.quantity === 'number' && !Number.isNaN(item.quantity) && item.quantity >= 0
          ? item.quantity
          : DEFAULTS.QUANTITY;
      item.unit = typeof item.unit === 'string' ? item.unit : DEFAULTS.UNIT;
      item.category = typeof item.category === 'string' ? item.category : DEFAULTS.CATEGORY;
      item.location = typeof item.location === 'string' ? item.location : DEFAULTS.LOCATION;
      item.expiry_date =
        typeof item.expiry_date === 'string' ? item.expiry_date : DEFAULTS.EXPIRY_DATE;
      item.expiry_alert_days =
        typeof item.expiry_alert_days === 'number' &&
        !Number.isNaN(item.expiry_alert_days) &&
        item.expiry_alert_days >= 0
          ? item.expiry_alert_days
          : DEFAULTS.EXPIRY_ALERT_DAYS;
      item.todo_list = typeof item.todo_list === 'string' ? item.todo_list : DEFAULTS.TODO_LIST;
      item.auto_add_enabled = Boolean(item.auto_add_enabled);
      item.auto_add_to_list_quantity =
        typeof item.auto_add_to_list_quantity === 'number' &&
        !Number.isNaN(item.auto_add_to_list_quantity) &&
        item.auto_add_to_list_quantity >= 0
          ? item.auto_add_to_list_quantity
          : DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY;
      item.auto_add_id_to_description_enabled = Boolean(item.auto_add_id_to_description_enabled);
      item.description =
        typeof item.description === 'string' ? item.description : DEFAULTS.DESCRIPTION;
      item.desired_quantity =
        typeof item.desired_quantity === 'number' &&
        !Number.isNaN(item.desired_quantity) &&
        item.desired_quantity >= 0
          ? item.desired_quantity
          : DEFAULTS.DESIRED_QUANTITY;
      item.todo_quantity_placement =
        typeof item.todo_quantity_placement === 'string'
          ? item.todo_quantity_placement
          : DEFAULTS.TODO_QUANTITY_PLACEMENT;
      return true;
    });
  },

  /**
   * Groups items by their category
   */
  groupItemsByCategory<T extends { category?: string }>(items: readonly T[]): Record<string, T[]> {
    return items.reduce<Record<string, T[]>>((groups, item) => {
      const category = item.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {});
  },

  /**
   * Groups items by their location
   */
  groupItemsByLocation<T extends { location?: string }>(items: readonly T[]): Record<string, T[]> {
    return items.reduce<Record<string, T[]>>((groups, item) => {
      const location = item.location || 'No Location';
      if (!groups[location]) {
        groups[location] = [];
      }
      groups[location].push(item);
      return groups;
    }, {});
  },

  hasActiveFilters(filters: FilterState): boolean {
    return Boolean(
      filters.searchText ||
      (filters.category && filters.category.length > 0) ||
      (filters.location && filters.location.length > 0) ||
      (filters.quantity && filters.quantity.length > 0) ||
      (filters.expiry && filters.expiry.length > 0),
    );
  },

  /**
   * Preserves input values from form elements
   */
  preserveInputValues(shadowRoot: ShadowRoot, elementIds: string[]): InputValues {
    const values: InputValues = {};

    for (const id of elementIds) {
      const element = shadowRoot.getElementById(id) as HTMLInputElement | undefined;
      if (element) {
        if (element.type === 'checkbox') {
          values[id] = element.checked;
        } else if (element.type === 'number') {
          values[id] = Number.parseFloat(element.value) || 0;
        } else {
          values[id] = element.value;
        }
      }
    }

    return values;
  },

  /**
   * Restores input values to form elements
   */
  restoreInputValues(shadowRoot: ShadowRoot, values: InputValues | undefined): void {
    if (!values) {
      return;
    }

    for (const [id, value] of Object.entries(values)) {
      const element = shadowRoot.getElementById(id) as HTMLInputElement | undefined;
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = Boolean(value);
        } else {
          element.value = String(value);
        }
      }
    }
  },
};
