import { ItemData, RawFormData } from '../types/inventoryItem';
import { ITEM_FORM_FIELDS, collectItemForm } from './itemFormFields';
import { ValidationError } from '../types/validationError';
import { DateUtils } from './dateUtils';
import { TranslationData } from '../types/translatableComponent';
import { TranslationManager } from '../services/translationManager';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const FormUtils = {
  parseNumber(value: unknown, defaultValue: number): number {
    if ((typeof value === 'string' && !value?.trim()) || value === undefined) {
      return defaultValue;
    }

    const parsed = typeof value === 'string' ? Number(value.trim()) : Number(value);

    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      return defaultValue;
    }

    return parsed;
  },

  sanitizeString(string_: unknown, maxLength: number): string {
    if (!string_ || typeof string_ !== 'string') {
      return '';
    }
    return string_.trim().slice(0, Math.max(0, maxLength)).trim();
  },

  validateRawFormData(formData: RawFormData, translations: TranslationData): ValidationResult {
    const errors: ValidationError[] = [];
    const localize = (key: string, fallback: string): string =>
      TranslationManager.localize(translations, key, undefined, fallback);

    if (!formData.name?.trim()) {
      errors.push({
        field: 'name',
        message: localize('modal.validation_name_required', 'Item name is required'),
      });
    }

    if (formData.quantity?.trim()) {
      const quantityNumber = Number.parseFloat(formData.quantity);
      if (Number.isNaN(quantityNumber)) {
        errors.push({
          field: 'quantity',
          message: localize('modal.validation_quantity_invalid', 'Quantity must be a valid number'),
        });
      } else if (quantityNumber < 0) {
        errors.push({
          field: 'quantity',
          message: localize('modal.validation_quantity_negative', 'Quantity cannot be negative'),
        });
      }
    }

    if (formData.autoAddEnabled) {
      if (formData.autoAddToListQuantity?.trim()) {
        const thresholdNumber = Number.parseFloat(formData.autoAddToListQuantity);
        if (Number.isNaN(thresholdNumber)) {
          errors.push({
            field: 'autoAddToListQuantity',
            message: localize(
              'modal.validation_threshold_invalid',
              'Quantity threshold must be a valid number',
            ),
          });
        } else if (thresholdNumber < 0) {
          errors.push({
            field: 'autoAddToListQuantity',
            message: localize('modal.validation_quantity_negative', 'Quantity cannot be negative'),
          });
        }
      } else {
        errors.push({
          field: 'autoAddToListQuantity',
          message: localize(
            'modal.validation_threshold_required',
            'Quantity threshold is required when auto-add is enabled',
          ),
        });
      }

      if (!formData.todoList?.trim()) {
        errors.push({
          field: 'todoList',
          message: localize(
            'modal.validation_todo_list_required',
            'Todo list selection is required when auto-add is enabled',
          ),
        });
      }
    }

    if (formData.expiryDate?.trim() && !DateUtils.isValidDate(formData.expiryDate)) {
      errors.push({
        field: 'expiryDate',
        message: localize('modal.validation_expiry_date_invalid', 'Invalid expiry date format'),
      });
    }

    if (formData.expiryAlertDays?.trim()) {
      const alertDays = Number.parseFloat(formData.expiryAlertDays);
      if (Number.isNaN(alertDays)) {
        errors.push({
          field: 'expiryAlertDays',
          message: localize(
            'modal.validation_expiry_alert_invalid',
            'Expiry alert days must be a valid number',
          ),
        });
      } else if (alertDays < 0) {
        errors.push({
          field: 'expiryAlertDays',
          message: localize(
            'modal.validation_expiry_alert_negative',
            'Expiry alert days cannot be negative',
          ),
        });
      }
    }

    const hasExpiryDate = formData.expiryDate?.trim();
    const hasThreshold = formData.expiryAlertDays?.trim();

    if (hasThreshold && !hasExpiryDate) {
      errors.push({
        field: 'expiryAlertDays',
        message: localize(
          'modal.validation_expiry_threshold_requires_date',
          'Expiry threshold requires an expiry date to be set',
        ),
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /** Form strings → item values, by each `ITEM_FORM_FIELDS` row's value rule. */
  convertRawFormDataToItemData(formData: RawFormData): ItemData {
    return collectItemForm<ItemData>((key) => {
      const { value: rule, send } = ITEM_FORM_FIELDS[key];
      const raw: unknown = formData[key];
      if (send === 'whenPresent' && raw === undefined) {
        return undefined;
      }
      switch (rule.type) {
        case 'boolean':
          return Boolean(raw);
        case 'number':
          return Math.max(0, FormUtils.parseNumber(raw, rule.fallback));
        case 'string':
          return (typeof raw === 'string' && raw.trim()) || rule.fallback;
      }
    });
  },

  /**
   * The service boundary: re-clamps every value and caps string lengths, by each
   * `ITEM_FORM_FIELDS` row's value rule. Missing values fall back to the defaults.
   */
  sanitizeItemData(itemData: Partial<ItemData>): ItemData {
    return collectItemForm<ItemData>((key) => {
      const { value: rule, send } = ITEM_FORM_FIELDS[key];
      const value: unknown = itemData[key];
      if (send === 'whenPresent' && value === undefined) {
        return undefined;
      }
      switch (rule.type) {
        case 'boolean':
          return Boolean(value);
        case 'number': {
          const parsed = FormUtils.parseNumber(value, rule.fallback);
          return Math.max(0, rule.max === undefined ? parsed : Math.min(rule.max, parsed));
        }
        case 'string':
          return rule.maxLength === undefined
            ? value || rule.fallback
            : FormUtils.sanitizeString(value || rule.fallback, rule.maxLength);
      }
    });
  },
};
