import { DEFAULT_INVENTORY_NAME, DEFAULTS } from './constants';
import { HassEntity, HomeAssistant, InventoryItem } from '../types/homeAssistant';
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

export const Utilities = {
  /**
   * Gets a user-friendly inventory name from entity state
   * @param state - The entity state
   * @param entityId - The entity ID
   * @returns A user-friendly inventory name
   */
  getInventoryName(state: HassEntity | undefined, entityId: string): string {
    // Check for friendly_name, but make sure it's not just whitespace
    if (state?.attributes?.friendly_name?.trim()) {
      return state.attributes.friendly_name;
    }

    const nameParts = entityId.split('.');
    if (nameParts.length > 1) {
      // Use the last part for multiple dots (e.g., "multiple.dots.here" → "here")
      const entityName = nameParts.at(-1);
      const words = entityName
        ?.split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .filter((word) => word.toLowerCase() !== 'inventory');

      const result = words?.join(' ').trim();
      return result || DEFAULT_INVENTORY_NAME;
    }

    return DEFAULT_INVENTORY_NAME;
  },

  getInventoryDescription(state: HassEntity | undefined): string | undefined {
    if (state?.attributes?.description) {
      return state.attributes.description;
    }
    return undefined;
  },

  /**
   * Gets the inventory ID from entity state
   * @param hass - Home Assistant instance
   * @param entityId - The entity ID
   * @returns The inventory ID
   */
  getInventoryId(hass: HomeAssistant, entityId: string): string {
    const state = hass.states[entityId];
    if (state?.attributes?.inventory_id) {
      return state.attributes.inventory_id;
    }

    if (state?.attributes?.unique_id) {
      const uniqueId = state.attributes.unique_id;
      if (typeof uniqueId === 'string' && uniqueId.startsWith('inventory_')) {
        return uniqueId.slice(10);
      }
    }

    const parts = entityId.split('.');
    return parts.length > 1 ? parts[1] : entityId;
  },
  /**
   * Preserves input values from form elements
   * @param shadowRoot - The shadow root containing the elements
   * @param elementIds - Array of element IDs to preserve
   * @returns Object with preserved values
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
   * @param shadowRoot - The shadow root containing the elements
   * @param values - Object with values to restore
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

  /**
   * Formats a date string to localized format
   * @param dateString - ISO date string
   * @returns Formatted date string
   */
  formatDate(dateString: string | undefined): string {
    if (!dateString) {
      return '';
    }

    try {
      let date: Date;

      if (/^\d+$/.test(dateString.trim())) {
        date = new Date(Number.parseInt(dateString.trim()));
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
        const [year, month, day] = dateString.trim().split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateString);
      }

      if (Number.isNaN(date.getTime())) {
        return dateString;
      }

      // Use a consistent timezone (UTC) for testing
      return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
    } catch (error) {
      console.warn(`Error formatting date "${dateString}":`, error);
      return dateString;
    }
  },

  /**
   * Checks if a date is in the past
   * @param dateString - ISO date string
   * @returns True if the date is expired
   */
  isExpired(dateString: string | undefined): boolean {
    if (!dateString) {
      return false;
    }

    try {
      const inputDate = new Date(dateString);
      if (Number.isNaN(inputDate.getTime())) {
        return false;
      }

      const now = new Date();

      // Compare date strings in YYYY-MM-DD format to avoid timezone issues
      const inputDateString = inputDate.toISOString().split('T')[0];
      const nowDateString = now.toISOString().split('T')[0];

      return inputDateString < nowDateString;
    } catch {
      return false;
    }
  },

  /**
   * Checks if a date is within the next week
   * @param dateString - ISO date string
   * @returns True if the date is expiring soon
   */
  isExpiringSoon(expiryDate: string, threshold: number = 7): boolean {
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
  },

  /**
   * Creates a debounced function
   * @param func - Function to debounce
   * @param wait - Wait time in milliseconds
   * @returns Debounced function
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
   * Validates raw form data before processing
   * @param formData - Raw form data from inputs
   * @returns Validation result with field-specific errors
   */
  validateRawFormData(formData: RawFormData): ValidationResult {
    const errors: ValidationError[] = [];

    if (!formData.name?.trim()) {
      errors.push({ field: 'name', message: 'Item name is required' });
    }

    if (formData.quantity?.trim()) {
      const quantityNumber = Number.parseFloat(formData.quantity);
      if (Number.isNaN(quantityNumber)) {
        errors.push({ field: 'quantity', message: 'Quantity must be a valid number' });
      } else if (quantityNumber < 0) {
        errors.push({ field: 'quantity', message: 'Quantity cannot be negative' });
      }
    }

    if (formData.autoAddEnabled) {
      if (formData.autoAddToListQuantity?.trim()) {
        const thresholdNumber = Number.parseFloat(formData.autoAddToListQuantity);
        if (Number.isNaN(thresholdNumber)) {
          errors.push({
            field: 'autoAddToListQuantity',
            message: 'Quantity threshold must be a valid number',
          });
        } else if (thresholdNumber < 0) {
          errors.push({
            field: 'autoAddToListQuantity',
            message: 'Quantity cannot be negative',
          });
        }
      } else {
        errors.push({
          field: 'autoAddToListQuantity',
          message: 'Quantity threshold is required when auto-add is enabled',
        });
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
      const alertDays = Number.parseFloat(formData.expiryAlertDays);
      if (Number.isNaN(alertDays)) {
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
  },

  /**
   * Converts raw form data to ItemData after validation passes
   * @param formData - Raw form data
   * @returns Converted ItemData
   */
  // TODO: this has a lot in common with sanitizeItemData, combine them
  convertRawFormDataToItemData(formData: RawFormData): ItemData {
    return {
      name: formData.name?.trim() || '',
      quantity: Math.max(0, Utilities.parseNumber(formData.quantity, DEFAULTS.QUANTITY)),
      autoAddEnabled: Boolean(formData.autoAddEnabled),
      autoAddIdToDescriptionEnabled: Boolean(formData.autoAddIdToDescriptionEnabled),
      autoAddToListQuantity: Math.max(
        0,
        Utilities.parseNumber(formData.autoAddToListQuantity, DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY),
      ),
      todoList: formData.todoList?.trim() || DEFAULTS.TODO_LIST,
      expiryDate: formData.expiryDate?.trim() || DEFAULTS.EXPIRY_DATE,
      expiryAlertDays: Math.max(
        0,
        Utilities.parseNumber(formData.expiryAlertDays, DEFAULTS.EXPIRY_ALERT_DAYS),
      ),
      category: formData.category?.trim() || DEFAULTS.CATEGORY,
      desiredQuantity: Math.max(
        0,
        Utilities.parseNumber(formData.desiredQuantity, DEFAULTS.DESIRED_QUANTITY),
      ),
      location: formData.location?.trim() || DEFAULTS.LOCATION,
      unit: formData.unit?.trim() || DEFAULTS.UNIT,
      description: formData.description?.trim() || DEFAULTS.DESCRIPTION,
      barcode: formData.barcode?.trim() || DEFAULTS.BARCODE,
      price: Math.max(0, Utilities.parseNumber(formData.price, DEFAULTS.PRICE)),
      todoQuantityPlacement:
        formData.todoQuantityPlacement?.trim() || DEFAULTS.TODO_QUANTITY_PLACEMENT,
    };
  },

  parseNumber: (value: string | number | undefined, defaultValue: number): number => {
    if ((typeof value === 'string' && !value?.trim()) || value === undefined) {
      return defaultValue;
    }

    const parsed = typeof value === 'string' ? Number(value.trim()) : Number(value);

    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      return defaultValue;
    }

    return parsed;
  },

  /**
   * Checks if a string is a valid date
   * @param dateString - Date string to validate
   * @returns True if the date is valid
   */
  isValidDate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return !Number.isNaN(date.getTime());
    } catch {
      return false;
    }
  },

  /**
   * Sanitizes HTML string to prevent XSS
   * @param str - String to sanitize
   * @returns Sanitized HTML string
   */
  sanitizeHtml(string_: string): string {
    const div = document.createElement('div');
    div.textContent = string_;
    return div.innerHTML;
  },

  /**
   * Groups items by their category
   * @param items - Array of inventory items
   * @returns Object with items grouped by category
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
   * @param items - Array of inventory items
   * @returns Object with items grouped by location
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

  /**
   * Sanitizes item data to ensure valid values
   * @param itemData - Item data to sanitize
   * @returns Sanitized item data
   */
  sanitizeItemData(itemData: ItemData): SanitizedItemData {
    const data = {
      autoAddEnabled: Boolean(itemData.autoAddEnabled),
      autoAddIdToDescriptionEnabled: Boolean(itemData.autoAddIdToDescriptionEnabled),
      autoAddToListQuantity: Math.max(
        0,
        Utilities.parseNumber(itemData.autoAddToListQuantity, DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY),
      ),
      barcode: this.sanitizeString(itemData.barcode, 100),
      category: this.sanitizeString(itemData.category, 50),
      description: this.sanitizeString(itemData.description, 500),
      desiredQuantity: Math.max(
        0,
        Utilities.parseNumber(itemData.desiredQuantity, DEFAULTS.DESIRED_QUANTITY),
      ),
      expiryAlertDays: Math.max(
        0,
        Utilities.parseNumber(itemData.expiryAlertDays, DEFAULTS.EXPIRY_ALERT_DAYS),
      ),
      expiryDate: itemData.expiryDate || DEFAULTS.EXPIRY_DATE,
      name: this.sanitizeString(itemData.name, 100),
      quantity: Math.max(
        0,
        Math.min(999_999, Utilities.parseNumber(itemData.quantity, DEFAULTS.QUANTITY)),
      ),
      todoList: this.sanitizeString(itemData.todoList, 100),
      todoQuantityPlacement: this.sanitizeString(
        itemData.todoQuantityPlacement || DEFAULTS.TODO_QUANTITY_PLACEMENT,
        20,
      ),
      price: Math.max(0, Utilities.parseNumber(itemData.price, DEFAULTS.PRICE)),
      unit: this.sanitizeString(itemData.unit, 20),
      location: this.sanitizeString(itemData.location, 50),
    };
    return data;
  },

  /**
   * Sanitizes a string by trimming and limiting length
   * @param str - String to sanitize
   * @param maxLength - Maximum allowed length
   * @returns Sanitized string
   */
  sanitizeString(string_: string | undefined, maxLength: number): string {
    if (!string_ || typeof string_ !== 'string') {
      return '';
    }
    return string_.trim().slice(0, Math.max(0, maxLength)).trim();
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
   * Validates and normalizes inventory items from Home Assistant state
   * @param items - Raw items array from entity attributes
   * @returns Array of validated InventoryItem objects
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
   * Extracts and formats todo lists from Home Assistant states
   * @param hass - Home Assistant instance
   * @returns Array of todo list objects with id and name
   */
  extractTodoLists(hass: HomeAssistant): Array<{ id: string; name: string }> {
    return Object.keys(hass.states)
      .filter((entityId) => entityId.startsWith('todo.'))
      .map((entityId) => ({
        id: entityId,
        name: hass.states[entityId].attributes?.friendly_name || entityId.split('.')[1],
      }));
  },

  /**
   * Finds inventory entities from Home Assistant states
   * @param hass - Home Assistant instance
   * @returns Array of inventory entity IDs, sorted
   */
  findInventoryEntities(hass: HomeAssistant): string[] {
    return Object.keys(hass?.states || {})
      .filter((entityId) => {
        if (!entityId.startsWith('sensor.')) {
          return false;
        }

        const hasInventoryInName = entityId.includes('inventory');
        const hasItemsAttribute = hass?.states[entityId]?.attributes?.items !== undefined;

        return hasInventoryInName && hasItemsAttribute;
      })
      .sort();
  },

  /**
   * Creates entity options for combo box from entity IDs
   * @param hass - Home Assistant instance
   * @param entityIds - Array of entity IDs
   * @returns Array of option objects with value and label
   */
  createEntityOptions(hass: HomeAssistant, entityIds: string[]) {
    return entityIds.map((entity) => ({
      value: entity,
      label: hass.states[entity]?.attributes?.friendly_name || entity,
    }));
  },
};
