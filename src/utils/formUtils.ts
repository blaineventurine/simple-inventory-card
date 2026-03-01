import { DEFAULTS } from './constants';
import { ItemData, SanitizedItemData, RawFormData } from '../types/inventoryItem';
import { ValidationError } from '../types/validationError';
import { DateUtils } from './dateUtils';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const FormUtils = {
  parseNumber(value: string | number | undefined, defaultValue: number): number {
    if ((typeof value === 'string' && !value?.trim()) || value === undefined) {
      return defaultValue;
    }

    const parsed = typeof value === 'string' ? Number(value.trim()) : Number(value);

    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      return defaultValue;
    }

    return parsed;
  },

  sanitizeString(string_: string | undefined, maxLength: number): string {
    if (!string_ || typeof string_ !== 'string') {
      return '';
    }
    return string_.trim().slice(0, Math.max(0, maxLength)).trim();
  },

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

    if (formData.expiryDate?.trim() && !DateUtils.isValidDate(formData.expiryDate)) {
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

  convertRawFormDataToItemData(formData: RawFormData): ItemData {
    return {
      name: formData.name?.trim() || '',
      quantity: Math.max(0, FormUtils.parseNumber(formData.quantity, DEFAULTS.QUANTITY)),
      autoAddEnabled: Boolean(formData.autoAddEnabled),
      autoAddIdToDescriptionEnabled: Boolean(formData.autoAddIdToDescriptionEnabled),
      autoAddToListQuantity: Math.max(
        0,
        FormUtils.parseNumber(formData.autoAddToListQuantity, DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY),
      ),
      todoList: formData.todoList?.trim() || DEFAULTS.TODO_LIST,
      expiryDate: formData.expiryDate?.trim() || DEFAULTS.EXPIRY_DATE,
      expiryAlertDays: Math.max(
        0,
        FormUtils.parseNumber(formData.expiryAlertDays, DEFAULTS.EXPIRY_ALERT_DAYS),
      ),
      category: formData.category?.trim() || DEFAULTS.CATEGORY,
      desiredQuantity: Math.max(
        0,
        FormUtils.parseNumber(formData.desiredQuantity, DEFAULTS.DESIRED_QUANTITY),
      ),
      location: formData.location?.trim() || DEFAULTS.LOCATION,
      unit: formData.unit?.trim() || DEFAULTS.UNIT,
      description: formData.description?.trim() || DEFAULTS.DESCRIPTION,
      barcode: formData.barcode?.trim() || DEFAULTS.BARCODE,
      price: Math.max(0, FormUtils.parseNumber(formData.price, DEFAULTS.PRICE)),
      todoQuantityPlacement:
        formData.todoQuantityPlacement?.trim() || DEFAULTS.TODO_QUANTITY_PLACEMENT,
    };
  },

  sanitizeItemData(itemData: ItemData): SanitizedItemData {
    return {
      autoAddEnabled: Boolean(itemData.autoAddEnabled),
      autoAddIdToDescriptionEnabled: Boolean(itemData.autoAddIdToDescriptionEnabled),
      autoAddToListQuantity: Math.max(
        0,
        FormUtils.parseNumber(itemData.autoAddToListQuantity, DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY),
      ),
      barcode: FormUtils.sanitizeString(itemData.barcode, 100),
      category: FormUtils.sanitizeString(itemData.category, 50),
      description: FormUtils.sanitizeString(itemData.description, 500),
      desiredQuantity: Math.max(
        0,
        FormUtils.parseNumber(itemData.desiredQuantity, DEFAULTS.DESIRED_QUANTITY),
      ),
      expiryAlertDays: Math.max(
        0,
        FormUtils.parseNumber(itemData.expiryAlertDays, DEFAULTS.EXPIRY_ALERT_DAYS),
      ),
      expiryDate: itemData.expiryDate || DEFAULTS.EXPIRY_DATE,
      name: FormUtils.sanitizeString(itemData.name, 100),
      quantity: Math.max(
        0,
        Math.min(999_999, FormUtils.parseNumber(itemData.quantity, DEFAULTS.QUANTITY)),
      ),
      todoList: FormUtils.sanitizeString(itemData.todoList, 100),
      todoQuantityPlacement: FormUtils.sanitizeString(
        itemData.todoQuantityPlacement || DEFAULTS.TODO_QUANTITY_PLACEMENT,
        20,
      ),
      price: Math.max(0, FormUtils.parseNumber(itemData.price, DEFAULTS.PRICE)),
      unit: FormUtils.sanitizeString(itemData.unit, 20),
      location: FormUtils.sanitizeString(itemData.location, 50),
    };
  },
};
