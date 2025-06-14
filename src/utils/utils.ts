import { DEFAULT_INVENTORY_NAME } from './constants';
import { HassEntity, HomeAssistant } from '../types/home-assistant';
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
    if (state?.attributes?.friendly_name) {
      return state.attributes.friendly_name;
    }

    const nameParts = entityId.split('.');
    if (nameParts.length > 1) {
      return nameParts[1]
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(/Inventory$/, ''); // Remove "Inventory" suffix if present
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
      if (uniqueId?.startsWith('inventory_')) {
        return uniqueId.substring(10);
      }
    }

    // Fallback: use the entity_id without the domain
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
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString();
    } catch (e) {
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
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return false;
      }

      const today = this.getStartOfDay(new Date());
      return date < today;
    } catch (e) {
      return false;
    }
  }

  /**
   * Checks if a date is within the next week
   * @param dateString - ISO date string
   * @returns True if the date is expiring soon
   */
  static isExpiringSoon(expiryDate: string, threshold: number = 7): boolean {
    if (!expiryDate) return false;

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
    wait: number
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
  static convertRawFormDataToItemData(formData: RawFormData): ItemData {
    return {
      name: formData.name?.trim() || '',
      quantity: formData.quantity?.trim() ? Math.max(0, parseFloat(formData.quantity) || 0) : 0,
      autoAddEnabled: Boolean(formData.autoAddEnabled),
      autoAddToListQuantity: formData.autoAddToListQuantity?.trim()
        ? Math.max(0, parseFloat(formData.autoAddToListQuantity) || 0)
        : 0,
      todoList: formData.todoList?.trim() || '',
      expiryDate: formData.expiryDate?.trim() || '',
      expiryAlertDays: formData.expiryAlertDays?.trim()
        ? Math.max(1, parseFloat(formData.expiryAlertDays) || 7)
        : 7,
      category: formData.category?.trim() || '',
      unit: formData.unit?.trim() || '',
    };
  }

  /**
   * Validates item data for required fields and formats (legacy method - use validateRawFormData instead)
   * @param itemData - The item data to validate
   * @returns Validation result with errors if any
   */
  static validateItemData(itemData: ItemData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!itemData.name?.trim()) {
      errors.push('Item name is required');
    }

    if (itemData.quantity !== undefined && (isNaN(itemData.quantity) || itemData.quantity < 0)) {
      errors.push('Quantity must be a non-negative number');
    }

    if (
      itemData.autoAddToListQuantity !== undefined &&
      (isNaN(itemData.autoAddToListQuantity) || itemData.autoAddToListQuantity < 0)
    ) {
      errors.push('Threshold must be a non-negative number');
    }

    if (itemData.expiryDate && !this.isValidDate(itemData.expiryDate)) {
      errors.push('Invalid expiry date format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if a string is a valid date
   * @param dateString - Date string to validate
   * @returns True if the date is valid
   */
  static isValidDate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch (e) {
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
    items: readonly T[]
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
    return {
      autoAddEnabled: Boolean(itemData.autoAddEnabled),
      autoAddToListQuantity: Math.max(0, Number(itemData.autoAddToListQuantity) || 0),
      category: this.sanitizeString(itemData.category, 50),
      expiryAlertDays: itemData.expiryAlertDays || 7,
      expiryDate: itemData.expiryDate || '',
      name: this.sanitizeString(itemData.name, 100),
      quantity: Math.max(0, Math.min(999999, Number(itemData.quantity) || 0)),
      todoList: this.sanitizeString(itemData.todoList, 100),
      unit: this.sanitizeString(itemData.unit, 20),
    };
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
   * Gets the start of day for a date
   * @param date - Date to adjust
   * @returns Date set to start of day
   */
  private static getStartOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }

  /**
   * Adds days to a date
   * @param date - Base date
   * @param days - Number of days to add
   * @returns New date with days added
   */
  private static addDaysToDate(date: Date, days: number): Date {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + days);
    return newDate;
  }
}
