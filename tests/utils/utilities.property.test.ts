import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Utilities } from '../../src/utils/utilities';
import { createMockHassEntity } from '../testHelpers';
import type { RawFormData, ItemData } from '../../src/types/inventoryItem';
import type { InventoryItem } from '../../src/types/homeAssistant';

describe('Utilities - Property-Based Tests', () => {
  describe('formatDate properties', () => {
    it('should never throw exceptions for any string input', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 100 }), // Reasonable max length
          (dateString) => {
            expect(() => Utilities.formatDate(dateString)).not.toThrow();
          },
        ),
      );
    });

    it('should always return a string', () => {
      fc.assert(
        fc.property(fc.oneof(fc.string(), fc.constant(undefined), fc.constant('')), (input) => {
          const result = Utilities.formatDate(input);
          expect(typeof result).toBe('string');
        }),
      );
    });

    it('should return empty string for falsy inputs', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(undefined), fc.constant(''), fc.constant(null)),
          (input) => {
            const result = Utilities.formatDate(input as any);
            expect(result).toBe('');
          },
        ),
      );
    });

    it('should handle valid ISO dates consistently', () => {
      fc.assert(
        fc.property(
          fc
            .date({ min: new Date('1900-01-01'), max: new Date('2100-12-31') })
            .filter((date) => !isNaN(date.getTime())), // Add this filter
          (date) => {
            const isoString = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const result = Utilities.formatDate(isoString);

            expect(result).toBeTruthy();
            expect(result).not.toBe(isoString); // Should be formatted
            expect(typeof result).toBe('string');
          },
        ),
      );
    });

    it('should preserve invalid date strings', () => {
      fc.assert(
        fc.property(
          fc
            .string()
            .filter(
              (s) =>
                s.trim() !== '' &&
                isNaN(Date.parse(s)) &&
                !/^\d+$/.test(s.trim()) &&
                !/^\d{4}-\d{2}-\d{2}$/.test(s.trim()),
            ),
          (invalidDate) => {
            const result = Utilities.formatDate(invalidDate);
            expect(result).toBe(invalidDate);
          },
        ),
      );
    });
  });

  describe('sanitizeString properties', () => {
    it('should never exceed maxLength', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 200 }),
          fc.integer({ min: 0, max: 100 }),
          (str, maxLength) => {
            const result = Utilities.sanitizeString(str, maxLength);
            expect(result.length).toBeLessThanOrEqual(maxLength);
          },
        ),
      );
    });

    it('should never have leading/trailing whitespace', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 100 }),
          fc.integer({ min: 1, max: 50 }),
          (str, maxLength) => {
            const result = Utilities.sanitizeString(str, maxLength);
            if (result.length > 0) {
              expect(result).toBe(result.trim());
            }
          },
        ),
      );
    });

    it('should handle non-string inputs gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.constant(undefined), fc.integer(), fc.boolean()),
          fc.integer({ min: 1, max: 50 }),
          (input, maxLength) => {
            const result = Utilities.sanitizeString(input as any, maxLength);
            expect(result).toBe('');
          },
        ),
      );
    });

    it('should be idempotent for valid strings', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 30 }).map((s) => s.trim()),
          fc.integer({ min: 50, max: 100 }),
          (str, maxLength) => {
            const result1 = Utilities.sanitizeString(str, maxLength);
            const result2 = Utilities.sanitizeString(result1, maxLength);
            expect(result1).toBe(result2);
          },
        ),
      );
    });
  });

  describe('getInventoryName properties', () => {
    it('should always return a non-empty string', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (entityId) => {
          const result = Utilities.getInventoryName(undefined, entityId);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        }),
      );
    });

    it('should prefer friendly_name when available and non-empty', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }),
          (friendlyName, entityId) => {
            const state = createMockHassEntity(entityId, {
              attributes: { friendly_name: friendlyName },
            });

            const result = Utilities.getInventoryName(state, entityId);
            expect(result).toBe(friendlyName);
          },
        ),
      );
    });

    it('should fallback to entity formatting when friendly_name is empty/whitespace', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(''), fc.constant('   '), fc.constant('\t\n')),
          fc.string({ minLength: 3 }).filter((id) => id.includes('.')),
          (emptyName, entityId) => {
            const state = createMockHassEntity(entityId, {
              attributes: { friendly_name: emptyName },
            });

            const result = Utilities.getInventoryName(state, entityId);
            expect(result).not.toBe(emptyName.trim());
            expect(result.length).toBeGreaterThan(0);
          },
        ),
      );
    });

    it('should handle entity IDs with various dot patterns', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          (parts) => {
            const entityId = parts.join('.');
            const result = Utilities.getInventoryName(undefined, entityId);

            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
          },
        ),
      );
    });

    it('should handle states with null or undefined attributes', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (entityId) => {
          const state = createMockHassEntity(entityId, { attributes: null as any });
          const result = Utilities.getInventoryName(state, entityId);

          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        }),
      );
    });
  });

  describe('validateInventoryItems properties', () => {
    const arbitraryInventoryItem = fc.record({
      name: fc.oneof(fc.string({ minLength: 1 }), fc.constant(null), fc.constant(undefined)),
      quantity: fc.oneof(fc.float(), fc.string(), fc.constant(null), fc.constant(undefined)),
      unit: fc.oneof(fc.string(), fc.integer(), fc.constant(null), fc.constant(undefined)),
      category: fc.oneof(fc.string(), fc.boolean(), fc.constant(null)),
      expiry_date: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
      expiry_alert_days: fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
      todo_list: fc.oneof(fc.string(), fc.boolean(), fc.constant(null)),
      auto_add_enabled: fc.oneof(fc.boolean(), fc.string(), fc.integer()),
      auto_add_to_list_quantity: fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
    });

    it('should never return more items than input', () => {
      fc.assert(
        fc.property(fc.array(arbitraryInventoryItem, { maxLength: 20 }), (items) => {
          const result = Utilities.validateInventoryItems(items as InventoryItem[]);
          expect(result.length).toBeLessThanOrEqual(items.length);
        }),
      );
    });

    it('should ensure all output items have valid string names', () => {
      fc.assert(
        fc.property(fc.array(arbitraryInventoryItem, { maxLength: 10 }), (items) => {
          const result = Utilities.validateInventoryItems(items as InventoryItem[]);
          result.forEach((item) => {
            expect(typeof item.name).toBe('string');
            expect(item.name.length).toBeGreaterThan(0);
          });
        }),
      );
    });

    it('should ensure all numeric fields are numbers', () => {
      fc.assert(
        fc.property(fc.array(arbitraryInventoryItem, { maxLength: 10 }), (items) => {
          const result = Utilities.validateInventoryItems(items as InventoryItem[]);
          result.forEach((item) => {
            expect(typeof item.quantity).toBe('number');
            expect(typeof item.expiry_alert_days).toBe('number');
            expect(typeof item.auto_add_to_list_quantity).toBe('number');
            expect(item.quantity).toBeGreaterThanOrEqual(0);
            expect(item.expiry_alert_days).toBeGreaterThanOrEqual(0);
            expect(item.auto_add_to_list_quantity).toBeGreaterThanOrEqual(0);
          });
        }),
      );
    });

    it('should ensure all string fields are strings', () => {
      fc.assert(
        fc.property(fc.array(arbitraryInventoryItem, { maxLength: 10 }), (items) => {
          const result = Utilities.validateInventoryItems(items as InventoryItem[]);
          result.forEach((item) => {
            expect(typeof item.unit).toBe('string');
            expect(typeof item.category).toBe('string');
            expect(typeof item.expiry_date).toBe('string');
            expect(typeof item.todo_list).toBe('string');
          });
        }),
      );
    });

    it('should handle non-array input gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.constant(undefined), fc.string(), fc.integer()),
          (input) => {
            const result = Utilities.validateInventoryItems(input as any);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual([]);
          },
        ),
      );
    });
  });

  describe('convertRawFormDataToItemData properties', () => {
    const arbitraryRawFormData = fc.record({
      name: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
      quantity: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
      autoAddEnabled: fc.oneof(fc.boolean(), fc.string(), fc.integer()),
      autoAddToListQuantity: fc.oneof(fc.string(), fc.constant(null)),
      todoList: fc.oneof(fc.string(), fc.constant(null)),
      expiryDate: fc.oneof(fc.string(), fc.constant(null)),
      expiryAlertDays: fc.oneof(fc.string(), fc.constant(null)),
      category: fc.oneof(fc.string(), fc.constant(null)),
      unit: fc.oneof(fc.string(), fc.constant(null)),
    });

    it('should always produce non-negative numeric values', () => {
      fc.assert(
        fc.property(arbitraryRawFormData, (formData) => {
          const result = Utilities.convertRawFormDataToItemData(formData as RawFormData);
          expect(result.quantity).toBeGreaterThanOrEqual(0);
          expect(result.autoAddToListQuantity).toBeGreaterThanOrEqual(0);
          expect(result.expiryAlertDays).toBeGreaterThanOrEqual(0);
        }),
      );
    });

    it('should always produce valid string fields', () => {
      fc.assert(
        fc.property(arbitraryRawFormData, (formData) => {
          const result = Utilities.convertRawFormDataToItemData(formData as RawFormData);
          expect(typeof result.name).toBe('string');
          expect(typeof result.todoList).toBe('string');
          expect(typeof result.expiryDate).toBe('string');
          expect(typeof result.category).toBe('string');
          expect(typeof result.unit).toBe('string');
        }),
      );
    });

    it('should preserve boolean autoAddEnabled correctly', () => {
      fc.assert(
        fc.property(arbitraryRawFormData, (formData) => {
          const result = Utilities.convertRawFormDataToItemData(formData as RawFormData);
          expect(typeof result.autoAddEnabled).toBe('boolean');
        }),
      );
    });

    it('should handle Infinity and NaN gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.constant('Test'),
            quantity: fc.oneof(
              fc.constant('Infinity'),
              fc.constant('-Infinity'),
              fc.constant('NaN'),
            ),
            autoAddEnabled: fc.constant(false),
            autoAddToListQuantity: fc.oneof(fc.constant('Infinity'), fc.constant('NaN')),
            expiryAlertDays: fc.oneof(fc.constant('Infinity'), fc.constant('NaN')),
            todoList: fc.constant(''),
            expiryDate: fc.constant(''),
            category: fc.constant(''),
            unit: fc.constant(''),
          }),
          (formData) => {
            const result = Utilities.convertRawFormDataToItemData(formData as RawFormData);
            expect(Number.isFinite(result.quantity)).toBe(true);
            expect(Number.isFinite(result.autoAddToListQuantity)).toBe(true);
            expect(Number.isFinite(result.expiryAlertDays)).toBe(true);
          },
        ),
      );
    });
  });

  describe('sanitizeItemData properties', () => {
    const arbitraryItemData = fc.record({
      name: fc.string({ maxLength: 200 }),
      quantity: fc.oneof(fc.float(), fc.constant(-100), fc.constant(1000000)),
      autoAddEnabled: fc.anything(),
      autoAddToListQuantity: fc.oneof(fc.float(), fc.constant(-50), fc.constant(2000000)),
      category: fc.string({ maxLength: 200 }),
      unit: fc.string({ maxLength: 100 }),
      todoList: fc.string({ maxLength: 200 }),
      expiryDate: fc.string(),
      expiryAlertDays: fc.oneof(fc.integer(), fc.constant(0), fc.constant(-10)),
    });

    it('should enforce field length limits', () => {
      fc.assert(
        fc.property(arbitraryItemData, (itemData) => {
          const result = Utilities.sanitizeItemData(itemData as ItemData);
          expect(result.name.length).toBeLessThanOrEqual(100);
          expect(result.category.length).toBeLessThanOrEqual(50);
          expect(result.unit.length).toBeLessThanOrEqual(20);
          expect(result.todoList.length).toBeLessThanOrEqual(100);
        }),
      );
    });

    it('should enforce numeric constraints', () => {
      fc.assert(
        fc.property(arbitraryItemData, (itemData) => {
          const result = Utilities.sanitizeItemData(itemData as ItemData);
          expect(result.quantity).toBeGreaterThanOrEqual(0);
          expect(result.quantity).toBeLessThanOrEqual(999_999);
          expect(result.autoAddToListQuantity).toBeGreaterThanOrEqual(0);
          expect(result.expiryAlertDays).toBeGreaterThanOrEqual(0);
        }),
      );
    });

    it('should ensure boolean type for autoAddEnabled', () => {
      fc.assert(
        fc.property(arbitraryItemData, (itemData) => {
          const result = Utilities.sanitizeItemData(itemData as ItemData);
          expect(typeof result.autoAddEnabled).toBe('boolean');
        }),
      );
    });
  });
});
