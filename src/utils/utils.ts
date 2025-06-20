import { DEFAULT_INVENTORY_NAME, DEFAULTS } from './constants';
import { HassEntity, HomeAssistant, InventoryItem } from '../types/home-assistant';
import { FilterState } from '../types/filterState';
import { ItemData, SanitizedItemData, RawFormData } from '../types/inventoryItem';
import { ValidationError } from '../types/validationError';

interface InputValues {
  [id: string]: string | boolean | number;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class Utils {
  /**
   * Gets a user-friendly inventory name from entity state
   * @param state - The entity state
   * @param entityId - The entity ID
   * @returns A user-friendly inventory name
   */
  static getInventoryName(state: HassEntity | undefined, entityId: string): string {
    // Check for friendly_name, but make sure it's not just whitespace
    if (state?.attributes?.friendly_name?.trim()) {
      return state.attributes.friendly_name;
    }

    const nameParts = entityId.split('.');
    if (nameParts.length > 1) {
      // Use the last part for multiple dots (e.g., "multiple.dots.here" → "here")
      const entityName = nameParts[nameParts.length - 1];
      const words = entityName
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .filter((word) => word.toLowerCase() !== 'inventory');

      const result = words.join(' ').trim();
      return result || DEFAULT_INVENTORY_NAME;
    }

    return DEFAULT_INVENTORY_NAME;
  }

  static getInventoryDescription(state: HassEntity | undefined): string | undefined {
    if (state?.attributes?.description) {
      return state.attributes.description;
    }
    return undefined;
  }

  /**
   * Gets the inventory ID from entity state
   * @param hass - Home Assistant instance
   * @param entityId - The entity ID
   * @returns The inventory ID
   */
  static getInventoryId(hass: HomeAssistant, entityId: string): string {
    const state = hass.states[entityId];
    if (state?.attributes?.inventory_id) {
      return state.attributes.inventory_id;
    }

    if (state?.attributes?.unique_id) {
      const uniqueId = state.attributes.unique_id;
      if (typeof uniqueId === 'string' && uniqueId.startsWith('inventory_')) {
        return uniqueId.substring(10);
      }
    }

    const parts = entityId.split('.');
    return parts.length > 1 ? parts[1] : entityId;
  }
  /**
   * Preserves input values from form elements
   * @param shadowRoot - The shadow root containing the elements
   * @param elementIds - Array of element IDs to preserve
   * @returns Object with preserved values
   */
  static preserveInputValues(shadowRoot: ShadowRoot, elementIds: string[]): InputValues {
    const values: InputValues = {};

    elementIds.forEach((id) => {
      const element = shadowRoot.getElementById(id) as HTMLInputElement | null;
      if (element) {
        if (element.type === 'checkbox') {
          values[id] = element.checked;
        } else if (element.type === 'number') {
          values[id] = parseFloat(element.value) || 0;
        } else {
          values[id] = element.value;
        }
      }
    });

    return values;
  }

  /**
   * Restores input values to form elements
   * @param shadowRoot - The shadow root containing the elements
   * @param values - Object with values to restore
   */
  static restoreInputValues(shadowRoot: ShadowRoot, values: InputValues | null): void {
    if (!values) {
      return;
    }

    Object.entries(values).forEach(([id, value]) => {
      const element = shadowRoot.getElementById(id) as HTMLInputElement | null;
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = Boolean(value);
        } else {
          element.value = String(value);
        }
      }
    });
  }

  /**
   * Formats a date string to localized format
   * @param dateString - ISO date string
   * @returns Formatted date string
   */
  static formatDate(dateString: string | undefined): string {
    if (!dateString) {
      return '';
    }

    try {
      let date: Date;

      if (/^\d+$/.test(dateString.trim())) {
        date = new Date(parseInt(dateString.trim()));
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
        const [year, month, day] = dateString.trim().split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        return dateString;
      }

      // Use a consistent timezone (UTC) for testing
      return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
    } catch (e) {
      console.warn(`Error formatting date "${dateString}":`, e);
      return dateString;
    }
  }

  /**
   * Checks if a date is in the past
   * @param dateString - ISO date string
   * @returns True if the date is expired
   */
  static isExpired(dateString: string | undefined): boolean {
    if (!dateString) {
      return false;
    }

    try {
      const inputDate = new Date(dateString);
      if (isNaN(inputDate.getTime())) {
        return false;
      }

      const now = new Date();

      // Compare date strings in YYYY-MM-DD format to avoid timezone issues
      const inputDateStr = inputDate.toISOString().split('T')[0];
      const nowDateStr = now.toISOString().split('T')[0];

      return inputDateStr < nowDateStr;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a date is within the next week
   * @param dateString - ISO date string
   * @returns True if the date is expiring soon
   */
  static isExpiringSoon(expiryDate: string, threshold: number = 7): boolean {
    if (!expiryDate) {
      return false;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiry = new Date(expiryDate);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays >= 0 && diffDays <= threshold;
    } catch {
      return false;
    }
  }

  /**
   * Creates a debounced function
   * @param func - Function to debounce
   * @param wait - Wait time in milliseconds
   * @returns Debounced function
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function executedFunction(...args: Parameters<T>): void {
      const later = () => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        func(...args);
      };

      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Validates raw form data before processing
   * @param formData - Raw form data from inputs
   * @returns Validation result with field-specific errors
   */
  static validateRawFormData(formData: RawFormData): ValidationResult {
    const errors: ValidationError[] = [];

    if (!formData.name?.trim()) {
      errors.push({ field: 'name', message: 'Item name is required' });
    }

    if (formData.quantity?.trim()) {
      const quantityNum = parseFloat(formData.quantity);
      if (isNaN(quantityNum)) {
        errors.push({ field: 'quantity', message: 'Quantity must be a valid number' });
      } else if (quantityNum < 0) {
        errors.push({ field: 'quantity', message: 'Quantity cannot be negative' });
      }
    }

    if (formData.autoAddEnabled) {
      if (!formData.autoAddToListQuantity?.trim()) {
        errors.push({
          field: 'autoAddToListQuantity',
          message: 'Quantity threshold is required when auto-add is enabled',
        });
      } else {
        const thresholdNum = parseFloat(formData.autoAddToListQuantity);
        if (isNaN(thresholdNum)) {
          errors.push({
            field: 'autoAddToListQuantity',
            message: 'Quantity threshold must be a valid number',
          });
        } else if (thresholdNum < 0) {
          errors.push({
            field: 'autoAddToListQuantity',
            message: 'Quantity cannot be negative',
          });
        }
      }

      if (!formData.todoList?.trim()) {
        errors.push({
          field: 'todoList',
          message: 'Todo list selection is required when auto-add is enabled',
        });
      }
    }

    if (formData.expiryDate?.trim() && !this.isValidDate(formData.expiryDate)) {
      errors.push({ field: 'expiryDate', message: 'Invalid expiry date format' });
    }

    if (formData.expiryAlertDays?.trim()) {
      const alertDays = parseFloat(formData.expiryAlertDays);
      if (isNaN(alertDays)) {
        errors.push({
          field: 'expiryAlertDays',
          message: 'Expiry alert days must be a valid number',
        });
      } else if (alertDays < 0) {
        errors.push({
          field: 'expiryAlertDays',
          message: 'Expiry alert days cannot be negative',
        });
      }
    }

    const hasExpiryDate = formData.expiryDate?.trim();
    const hasThreshold = formData.expiryAlertDays?.trim();

    if (hasThreshold && !hasExpiryDate) {
      errors.push({
        field: 'expiryAlertDays',
        message: 'Expiry threshold requires an expiry date to be set',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Converts raw form data to ItemData after validation passes
   * @param formData - Raw form data
   * @returns Converted ItemData
   */
  // TODO: this has a lot in common with sanitizeItemData, combine them
  static convertRawFormDataToItemData(formData: RawFormData): ItemData {
    return {
      name: formData.name?.trim() || '',
      quantity: Math.max(0, Utils.parseNumber(formData.quantity, DEFAULTS.QUANTITY)),
      autoAddEnabled: Boolean(formData.autoAddEnabled),
      autoAddToListQuantity: Math.max(
        0,
        Utils.parseNumber(formData.autoAddToListQuantity, DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY),
      ),
      todoList: formData.todoList?.trim() || DEFAULTS.TODO_LIST,
      expiryDate: formData.expiryDate?.trim() || DEFAULTS.EXPIRY_DATE,
      expiryAlertDays: Math.max(
        0,
        Utils.parseNumber(formData.expiryAlertDays, DEFAULTS.EXPIRY_ALERT_DAYS),
      ),
      category: formData.category?.trim() || DEFAULTS.CATEGORY,
      unit: formData.unit?.trim() || DEFAULTS.UNIT,
    };
  }

  static parseNumber = (value: string | number | undefined, defaultValue: number): number => {
    if ((typeof value === 'string' && !value?.trim()) || value === undefined) {
      return defaultValue;
    }

    const parsed = typeof value === 'string' ? Number(value.trim()) : Number(value);

    if (isNaN(parsed) || !isFinite(parsed)) {
      return defaultValue;
    }

    return parsed;
  };

  /**
   * Checks if a string is a valid date
   * @param dateString - Date string to validate
   * @returns True if the date is valid
   */
  static isValidDate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes HTML string to prevent XSS
   * @param str - String to sanitize
   * @returns Sanitized HTML string
   */
  static sanitizeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Groups items by their category
   * @param items - Array of inventory items
   * @returns Object with items grouped by category
   */
  static groupItemsByCategory<T extends { category?: string }>(
    items: readonly T[],
  ): Record<string, T[]> {
    return items.reduce<Record<string, T[]>>((groups, item) => {
      const category = item.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {});
  }

  /**
   * Sanitizes item data to ensure valid values
   * @param itemData - Item data to sanitize
   * @returns Sanitized item data
   */
  static sanitizeItemData(itemData: ItemData): SanitizedItemData {
    const data = {
      autoAddEnabled: Boolean(itemData.autoAddEnabled),
      autoAddToListQuantity: Math.max(
        0,
        Utils.parseNumber(itemData.autoAddToListQuantity, DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY),
      ),
      category: this.sanitizeString(itemData.category, 50),
      expiryAlertDays: Math.max(
        0,
        Utils.parseNumber(itemData.expiryAlertDays, DEFAULTS.EXPIRY_ALERT_DAYS),
      ),
      expiryDate: itemData.expiryDate || DEFAULTS.EXPIRY_DATE,
      name: this.sanitizeString(itemData.name, 100),
      quantity: Math.max(
        0,
        Math.min(999999, Utils.parseNumber(itemData.quantity, DEFAULTS.QUANTITY)),
      ),
      todoList: this.sanitizeString(itemData.todoList, 100),
      unit: this.sanitizeString(itemData.unit, 20),
    };
    return data;
  }

  /**
   * Sanitizes a string by trimming and limiting length
   * @param str - String to sanitize
   * @param maxLength - Maximum allowed length
   * @returns Sanitized string
   */
  static sanitizeString(str: string | undefined, maxLength: number): string {
    if (!str || typeof str !== 'string') {
      return '';
    }
    return str.trim().substring(0, maxLength);
  }

  static hasActiveFilters(filters: FilterState): boolean {
    return Boolean(filters.searchText || filters.category || filters.quantity || filters.expiry);
  }

  /**
   * Validates and normalizes inventory items from Home Assistant state
   * @param items - Raw items array from entity attributes
   * @returns Array of validated InventoryItem objects
   */
  static validateInventoryItems(items: InventoryItem[]): InventoryItem[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.filter((item): item is InventoryItem => {
      if (!item || typeof item !== 'object' || !item.name || typeof item.name !== 'string') {
        return false;
      }

      item.quantity =
        typeof item.quantity === 'number' && !isNaN(item.quantity) && item.quantity >= 0
          ? item.quantity
          : DEFAULTS.QUANTITY;
      item.unit = typeof item.unit === 'string' ? item.unit : DEFAULTS.UNIT;
      item.category = typeof item.category === 'string' ? item.category : DEFAULTS.CATEGORY;
      item.expiry_date =
        typeof item.expiry_date === 'string' ? item.expiry_date : DEFAULTS.EXPIRY_DATE;
      item.expiry_alert_days =
        typeof item.expiry_alert_days === 'number' &&
        !isNaN(item.expiry_alert_days) &&
        item.expiry_alert_days >= 0
          ? item.expiry_alert_days
          : DEFAULTS.EXPIRY_ALERT_DAYS;
      item.todo_list = typeof item.todo_list === 'string' ? item.todo_list : DEFAULTS.TODO_LIST;
      item.auto_add_enabled = Boolean(item.auto_add_enabled);
      item.auto_add_to_list_quantity =
        typeof item.auto_add_to_list_quantity === 'number' &&
        !isNaN(item.auto_add_to_list_quantity) &&
        item.auto_add_to_list_quantity >= 0
          ? item.auto_add_to_list_quantity
          : DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY;
      return true;
    });
  }

  /**
   * Extracts and formats todo lists from Home Assistant states
   * @param hass - Home Assistant instance
   * @returns Array of todo list objects with id and name
   */
  static extractTodoLists(hass: HomeAssistant): Array<{ id: string; name: string }> {
    return Object.keys(hass.states)
      .filter((entityId) => entityId.startsWith('todo.'))
      .map((entityId) => ({
        id: entityId,
        name: hass.states[entityId].attributes?.friendly_name || entityId.split('.')[1],
      }));
  }

  /**
   * Finds inventory entities from Home Assistant states
   * @param hass - Home Assistant instance
   * @returns Array of inventory entity IDs, sorted
   */
  static findInventoryEntities(hass: HomeAssistant): string[] {
    return Object.keys(hass?.states || {})
      .filter((entityId) => {
        // Check if it's a sensor entity
        if (!entityId.startsWith('sensor.')) {
          return false;
        }

        // Check if it has inventory in the name or has items attribute
        const hasInventoryInName = entityId.includes('inventory');
        const hasItemsAttribute = hass?.states[entityId]?.attributes?.items !== undefined;

        return hasInventoryInName || hasItemsAttribute;
      })
      .sort();
  }

  /**
   * Creates entity options for combo box from entity IDs
   * @param hass - Home Assistant instance
   * @param entityIds - Array of entity IDs
   * @returns Array of option objects with value and label
   */
  static createEntityOptions(hass: HomeAssistant, entityIds: string[]) {
    return entityIds.map((entity) => ({
      value: entity,
      label: hass.states[entity]?.attributes?.friendly_name || entity,
    }));
  }
}
