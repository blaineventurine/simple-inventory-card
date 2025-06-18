import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Utils } from '../../src/utils/utils';
import { HomeAssistant } from '../../src/types/home-assistant';
import { RawFormData, ItemData } from '../../src/types/inventoryItem';
import { createMockHassEntity, createMockHomeAssistant } from '../testHelpers';

const createValidFormData = (overrides: Partial<RawFormData> = {}): RawFormData => ({
  name: 'Test Item',
  quantity: '5',
  autoAddEnabled: false,
  autoAddToListQuantity: '',
  todoList: '',
  expiryDate: '',
  expiryAlertDays: '',
  category: 'Food',
  unit: 'pieces',
  ...overrides,
});

describe('Utils', () => {
  describe('getInventoryName', () => {
    describe('friendly_name handling', () => {
      it('should return friendly_name when available', () => {
        const state = createMockHassEntity('sensor.test', {
          attributes: { friendly_name: 'Kitchen Inventory' },
        });

        const result = Utils.getInventoryName(state, 'sensor.test');
        expect(result).toBe('Kitchen Inventory');
      });

      it.each([{ friendly_name: '' }, { friendly_name: '   ' }, { friendly_name: '\t\n' }])(
        'should fall back to entity formatting for empty friendly_name: $friendly_name',
        ({ friendly_name }) => {
          const state = createMockHassEntity('sensor.kitchen_inventory', {
            attributes: { friendly_name },
          });

          const result = Utils.getInventoryName(state, 'sensor.kitchen_inventory');
          expect(result).toBe('Kitchen');
        },
      );
    });

    describe('entity ID formatting', () => {
      it.each([
        { input: 'sensor.kitchen_pantry', expected: 'Kitchen Pantry' },
        { input: 'sensor.main_storage_room', expected: 'Main Storage Room' },
        {
          input: 'sensor.upstairs_guest_bedroom_closet',
          expected: 'Upstairs Guest Bedroom Closet',
        },
        { input: 'sensor.pantry_inventory', expected: 'Pantry' },
        { input: 'sensor.garage_inventory', expected: 'Garage' },
        { input: 'sensor.kitchen_1_inventory', expected: 'Kitchen 1' },
        { input: 'sensor.storage_room_2_inventory', expected: 'Storage Room 2' },
      ])('should format entity ID correctly: $input → $expected', ({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });

      it.each(['sensor._kitchen_', 'sensor._pantry_storage_', 'sensor.__middle_kitchen__'])(
        'should handle leading/trailing underscores: %s',
        (input) => {
          const result = Utils.getInventoryName(undefined, input);
          expect(result.startsWith(' ')).toBe(false);
          expect(result.endsWith(' ')).toBe(false);
        },
      );

      it.each(['invalid', 'sensor.', '', 'sensor', 'sensor.kitchen.'])(
        'should return default name for invalid entity IDs: %s',
        (invalidId) => {
          const result = Utils.getInventoryName(undefined, invalidId);
          expect(result).toBe('Inventory');
        },
      );

      it('should handle entity IDs with empty parts in the middle', () => {
        expect(Utils.getInventoryName(undefined, 'sensor..kitchen')).toBe('Kitchen');
        expect(Utils.getInventoryName(undefined, 'domain...entity')).toBe('Entity');
      });
    });

    describe('edge cases', () => {
      it('should handle undefined state gracefully', () => {
        const result = Utils.getInventoryName(undefined, 'sensor.kitchen_inventory');
        expect(result).toBe('Kitchen');
      });

      it('should handle state with undefined attributes', () => {
        const state = createMockHassEntity('sensor.test', { attributes: undefined as any });
        const result = Utils.getInventoryName(state, 'sensor.kitchen_inventory');
        expect(result).toBe('Kitchen');
      });
    });
  });

  describe('getInventoryDescription', () => {
    it('should return description when available', () => {
      const state = createMockHassEntity('sensor.test', {
        attributes: { description: 'Main kitchen storage' },
      });

      const result = Utils.getInventoryDescription(state);
      expect(result).toBe('Main kitchen storage');
    });

    it.each([undefined, { attributes: undefined }, { attributes: null }, { attributes: {} }])(
      'should return undefined for missing description',
      (state) => {
        const result = Utils.getInventoryDescription(state as any);
        expect(result).toBeUndefined();
      },
    );
  });

  describe('getInventoryId', () => {
    let mockHass: HomeAssistant;

    beforeEach(() => {
      mockHass = createMockHomeAssistant();
    });

    it('should return inventory_id from attributes when available', () => {
      mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', {
        attributes: { inventory_id: 'custom_inventory_123' },
      });

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('custom_inventory_123');
    });

    it('should extract ID from unique_id with inventory_ prefix', () => {
      mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', {
        attributes: { unique_id: 'inventory_kitchen_main' },
      });

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('kitchen_main');
    });

    it('should fallback to entity_id domain removal', () => {
      mockHass.states['sensor.kitchen_inventory'] = createMockHassEntity(
        'sensor.kitchen_inventory',
      );

      const result = Utils.getInventoryId(mockHass, 'sensor.kitchen_inventory');
      expect(result).toBe('kitchen_inventory');
    });

    it.each([
      { attributes: null },
      { attributes: undefined },
      { attributes: { inventory_id: null } },
      { attributes: { unique_id: 'some_other_id' } },
    ])('should handle missing or invalid attributes', (entityData) => {
      mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', entityData as any);

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test');
    });
  });

  describe('preserveInputValues and restoreInputValues', () => {
    let mockShadowRoot: ShadowRoot;
    let mockElements: { [id: string]: HTMLInputElement };

    beforeEach(() => {
      mockElements = {};
      mockShadowRoot = {
        getElementById: vi.fn((id: string) => mockElements[id] || null),
      } as any;
    });

    it.each([
      { type: 'text', value: 'Test Item', expected: 'Test Item' },
      { type: 'checkbox', checked: true, expected: true },
      { type: 'number', value: '5.5', expected: 5.5 },
    ])('should preserve $type input values', ({ type, value, checked, expected }) => {
      const element = { type, value, checked } as HTMLInputElement;
      mockElements['test'] = element;

      const result = Utils.preserveInputValues(mockShadowRoot, ['test']);
      expect(result.test).toBe(expected);
    });

    it('should restore values correctly', () => {
      const mockInput = { type: 'text', value: '', checked: false } as HTMLInputElement;
      mockElements['test'] = mockInput;

      Utils.restoreInputValues(mockShadowRoot, { test: 'Restored Value' });
      expect(mockInput.value).toBe('Restored Value');

      const mockCheckbox = { type: 'checkbox', checked: false } as HTMLInputElement;
      mockElements['checkbox'] = mockCheckbox;

      Utils.restoreInputValues(mockShadowRoot, { checkbox: true });
      expect(mockCheckbox.checked).toBe(true);
    });

    it('should handle missing elements and null values', () => {
      expect(Utils.preserveInputValues(mockShadowRoot, ['nonexistent'])).toEqual({});
      expect(() => Utils.restoreInputValues(mockShadowRoot, null)).not.toThrow();
    });
  });

  describe('formatDate', () => {
    it.each([
      '2023-12-25',
      '2023-01-01',
      '2024-02-29', // Leap year
      '2023-12-25T15:30:00Z',
      '2023-12-25T00:00:00.000Z',
    ])('should format valid date strings: %s', (dateString) => {
      const result = Utils.formatDate(dateString);
      expect(result).toBeTruthy();
      expect(result).not.toBe(dateString);
    });

    it.each([undefined, '', null])('should return empty string for falsy inputs: %s', (input) => {
      expect(Utils.formatDate(input as any)).toBe('');
    });

    it.each(['invalid-date', 'not-a-date', 'abc123', '####', 'completely-invalid'])(
      'should return original string for invalid dates: %s',
      (invalidDate) => {
        const result = Utils.formatDate(invalidDate);
        expect(result).toBe(invalidDate);
      },
    );

    it.each([
      '  2023-12-25  ',
      '\t2023-12-25\n',
      '  1640995200000  ', // Timestamp with whitespace
    ])('should handle whitespace correctly: %s', (paddedDate) => {
      const result = Utils.formatDate(paddedDate);
      expect(result).toBeTruthy();
      expect(result).not.toBe(paddedDate);
    });
  });

  describe('date validation functions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('isExpired', () => {
      it.each([
        { date: '2023-06-14', expected: true, description: 'past date' },
        { date: '2023-06-15', expected: false, description: 'today' },
        { date: '2023-06-16', expected: false, description: 'future date' },
      ])('should correctly identify expired dates: $description', ({ date, expected }) => {
        expect(Utils.isExpired(date)).toBe(expected);
      });

      it.each([undefined, '', 'invalid-date', 'not a date', '2023-13-45'])(
        'should return false for invalid inputs: %s',
        (input) => {
          expect(Utils.isExpired(input as any)).toBe(false);
        },
      );
    });

    describe('isExpiringSoon', () => {
      it.each([
        { date: '2023-06-20', threshold: 7, expected: true },
        { date: '2023-06-25', threshold: 7, expected: false },
        { date: '2023-06-10', threshold: 7, expected: false },
      ])(
        'should detect expiring dates: $date with threshold $threshold → $expected',
        ({ date, threshold, expected }) => {
          expect(Utils.isExpiringSoon(date, threshold)).toBe(expected);
        },
      );

      it('should use default threshold of 7 days', () => {
        expect(Utils.isExpiringSoon('2023-06-20')).toBe(true);
      });

      it('should return false for empty string', () => {
        expect(Utils.isExpiringSoon('')).toBe(false);
      });
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should delay function execution', () => {
      const mockFn = vi.fn();
      const debounced = Utils.debounce(mockFn, 100);

      debounced('test');
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should cancel previous calls', () => {
      const mockFn = vi.fn();
      const debounced = Utils.debounce(mockFn, 100);

      debounced('first');
      debounced('second');

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('second');
    });
  });

  describe('form data validation and conversion', () => {
    describe('validateRawFormData', () => {
      it('should pass validation for valid data', () => {
        const formData = createValidFormData();
        const result = Utils.validateRawFormData(formData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      describe('name validation', () => {
        it.each([
          { name: '', description: 'empty string' },
          { name: '   ', description: 'whitespace only' },
          { name: undefined, description: 'undefined' },
          { name: null, description: 'null' },
        ])('should fail for invalid name: $description', ({ name }) => {
          const formData = createValidFormData({ name: name as any });
          const result = Utils.validateRawFormData(formData);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContainEqual({ field: 'name', message: 'Item name is required' });
        });
      });

      describe('quantity validation', () => {
        it.each([
          { quantity: 'invalid', errorType: 'number' },
          { quantity: '-5', errorType: 'negative' },
          { quantity: '0', shouldError: false },
          { quantity: '5', shouldError: false },
          { quantity: '', shouldError: false },
        ])('should validate quantity: $quantity', ({ quantity, errorType, shouldError }) => {
          const formData = createValidFormData({ quantity });
          const result = Utils.validateRawFormData(formData);

          if (shouldError === false) {
            expect(result.errors.some((e) => e.field === 'quantity')).toBe(false);
          } else {
            expect(
              result.errors.some((e) => e.field === 'quantity' && e.message.includes(errorType!)),
            ).toBe(true);
          }
        });
      });

      describe('auto-add validation', () => {
        it('should require autoAddToListQuantity and todoList when autoAdd enabled', () => {
          const formData = createValidFormData({
            autoAddEnabled: true,
            autoAddToListQuantity: '',
            todoList: '',
          });
          const result = Utils.validateRawFormData(formData);

          expect(result.isValid).toBe(false);
          expect(result.errors).toHaveLength(2);
          expect(result.errors.some((e) => e.field === 'autoAddToListQuantity')).toBe(true);
          expect(result.errors.some((e) => e.field === 'todoList')).toBe(true);
        });

        it('should not validate auto-add fields when disabled', () => {
          const formData = createValidFormData({
            autoAddEnabled: false,
            todoList: undefined as any,
          });
          const result = Utils.validateRawFormData(formData);

          expect(result.errors.some((e) => e.field === 'todoList')).toBe(false);
          expect(result.isValid).toBe(true);
        });
      });

      describe('expiry validation', () => {
        it.each([
          { expiryDate: 'invalid-date', shouldError: true },
          { expiryDate: '2023-12-25', shouldError: false },
          { expiryDate: '', shouldError: false },
        ])('should validate expiry date format: $expiryDate', ({ expiryDate, shouldError }) => {
          const formData = createValidFormData({ expiryDate });
          const result = Utils.validateRawFormData(formData);

          expect(result.errors.some((e) => e.field === 'expiryDate')).toBe(shouldError);
        });

        it('should require expiry date when alert days is set', () => {
          const formData = createValidFormData({
            expiryDate: '',
            expiryAlertDays: '5',
          });
          const result = Utils.validateRawFormData(formData);

          expect(
            result.errors.some(
              (e) => e.field === 'expiryAlertDays' && e.message.includes('requires an expiry date'),
            ),
          ).toBe(true);
        });
      });
    });

    describe('convertRawFormDataToItemData', () => {
      it('should convert valid form data correctly', () => {
        const formData: RawFormData = {
          name: '  Test Item  ',
          quantity: '5.5',
          autoAddEnabled: true,
          autoAddToListQuantity: '2',
          todoList: 'todo.shopping',
          expiryDate: '2023-12-25',
          expiryAlertDays: '3',
          category: 'Food',
          unit: 'kg',
        };

        const result = Utils.convertRawFormDataToItemData(formData);

        expect(result).toEqual({
          name: 'Test Item',
          quantity: 5.5,
          autoAddEnabled: true,
          autoAddToListQuantity: 2,
          todoList: 'todo.shopping',
          expiryDate: '2023-12-25',
          expiryAlertDays: 3,
          category: 'Food',
          unit: 'kg',
        });
      });

      it.each([
        { field: 'quantity', input: 'invalid', defaultValue: 0 },
        { field: 'autoAddToListQuantity', input: '', defaultValue: 0 },
        { field: 'expiryAlertDays', input: 'invalid', defaultValue: 7 },
      ])('should handle invalid numeric values: $field', ({ field, input, defaultValue }) => {
        const formData = createValidFormData({ [field]: input });
        const result = Utils.convertRawFormDataToItemData(formData);

        expect(result[field as keyof typeof result]).toBe(defaultValue);
      });

      it('should enforce minimum of 0 for negative values', () => {
        const formData = createValidFormData({
          quantity: '-5',
          autoAddToListQuantity: '-2.5',
          expiryAlertDays: '-1',
        });

        const result = Utils.convertRawFormDataToItemData(formData);

        expect(result.quantity).toBe(0);
        expect(result.autoAddToListQuantity).toBe(0);
        expect(result.expiryAlertDays).toBe(0);
      });

      it('should handle undefined/null values gracefully', () => {
        const formData: RawFormData = {
          name: null as any,
          quantity: undefined as any,
          autoAddEnabled: false,
          autoAddToListQuantity: null as any,
          todoList: undefined as any,
          expiryDate: null as any,
          expiryAlertDays: undefined as any,
          category: null as any,
          unit: undefined as any,
        };

        const result = Utils.convertRawFormDataToItemData(formData);

        expect(result).toEqual({
          name: '',
          quantity: 0,
          autoAddEnabled: false,
          autoAddToListQuantity: 0,
          todoList: '',
          expiryDate: '',
          expiryAlertDays: 7,
          category: '',
          unit: '',
        });
      });
    });
  });

  describe('utility functions', () => {
    describe('isValidDate', () => {
      it.each([
        { input: '2023-12-25', expected: true },
        { input: '12/25/2023', expected: true },
        { input: 'invalid-date', expected: false },
        { input: '', expected: false },
      ])('should validate dates correctly: $input → $expected', ({ input, expected }) => {
        expect(Utils.isValidDate(input)).toBe(expected);
      });
    });

    describe('sanitizeHtml', () => {
      beforeEach(() => {
        global.document = {
          createElement: vi.fn(() => ({
            textContent: '',
            innerHTML: 'Safe Text',
          })),
        } as any;
      });

      it('should sanitize HTML using textContent', () => {
        const result = Utils.sanitizeHtml('<script>alert("xss")</script>');
        expect(global.document.createElement).toHaveBeenCalledWith('div');
        expect(result).toBe('Safe Text');
      });
    });

    describe('sanitizeString', () => {
      it.each([
        { input: '  hello world  ', maxLength: 5, expected: 'hello' },
        { input: undefined, maxLength: 10, expected: '' },
        { input: 123, maxLength: 10, expected: '' },
        { input: 'short', maxLength: 10, expected: 'short' },
      ])('should sanitize strings: $input → $expected', ({ input, maxLength, expected }) => {
        const result = Utils.sanitizeString(input as any, maxLength);
        expect(result).toBe(expected);
      });
    });

    describe('hasActiveFilters', () => {
      it.each([
        {
          filters: {
            searchText: 'test',
            category: '',
            quantity: '',
            expiry: '',
            showAdvanced: false,
          },
          expected: true,
        },
        {
          filters: {
            searchText: '',
            category: 'Food',
            quantity: '',
            expiry: '',
            showAdvanced: false,
          },
          expected: true,
        },
        {
          filters: { searchText: '', category: '', quantity: '', expiry: '', showAdvanced: false },
          expected: false,
        },
      ])('should detect active filters correctly', ({ filters, expected }) => {
        expect(Utils.hasActiveFilters(filters)).toBe(expected);
      });
    });

    describe('groupItemsByCategory', () => {
      it('should group items by category', () => {
        const items = [
          { name: 'Apple', category: 'Fruit' },
          { name: 'Banana', category: 'Fruit' },
          { name: 'Carrot', category: 'Vegetable' },
          { name: 'Bread' },
        ];

        const result = Utils.groupItemsByCategory(items);

        expect(result['Fruit']).toHaveLength(2);
        expect(result['Vegetable']).toHaveLength(1);
        expect(result['Uncategorized']).toHaveLength(1);
      });

      it('should handle empty array', () => {
        expect(Utils.groupItemsByCategory([])).toEqual({});
      });
    });

    describe('sanitizeItemData', () => {
      it('should sanitize and enforce limits', () => {
        const itemData: ItemData = {
          name: '  Test Item  ',
          quantity: -5,
          autoAddEnabled: 'true' as any,
          autoAddToListQuantity: 1000000,
          category:
            'Very long category name that should definitely be truncated because it exceeds the limit',
          unit: 'a very long unit name that should also be truncated',
          todoList: 'todo.test',
          expiryDate: '2023-12-25',
          expiryAlertDays: 0,
        };

        const result = Utils.sanitizeItemData(itemData);

        expect(result.name).toBe('Test Item');
        expect(result.quantity).toBe(0);
        expect(result.autoAddEnabled).toBe(true);
        expect(result.category).toHaveLength(50);
        expect(result.unit).toHaveLength(20);
        expect(result.expiryAlertDays).toBe(7);
      });
    });
  });

  describe('Home Assistant integration functions', () => {
    let mockHass: HomeAssistant;

    beforeEach(() => {
      mockHass = createMockHomeAssistant();
    });

    describe('validateInventoryItems', () => {
      it('should validate and normalize inventory items', () => {
        const items = [
          { name: 'Valid Item', quantity: 5 },
          { name: 'Item with invalid quantity', quantity: 'invalid' },
          { invalidItem: 'no name' },
          null,
        ];

        const result = Utils.validateInventoryItems(items);

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Valid Item');
        expect(result[1].quantity).toBe(0); // Normalized invalid quantity
      });

      it('should handle non-array input', () => {
        expect(Utils.validateInventoryItems(null as any)).toEqual([]);
        expect(Utils.validateInventoryItems(undefined as any)).toEqual([]);
      });
    });

    describe('extractTodoLists', () => {
      it('should extract todo list entities', () => {
        mockHass.states = {
          'todo.shopping': createMockHassEntity('todo.shopping', {
            attributes: { friendly_name: 'Shopping List' },
          }),
          'todo.groceries': createMockHassEntity('todo.groceries'),
          'sensor.not_todo': createMockHassEntity('sensor.not_todo'),
        };

        const result = Utils.extractTodoLists(mockHass);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ id: 'todo.shopping', name: 'Shopping List' });
        expect(result[1]).toEqual({ id: 'todo.groceries', name: 'groceries' });
      });
    });

    describe('findInventoryEntities', () => {
      it('should find inventory sensor entities', () => {
        mockHass.states = {
          'sensor.kitchen_inventory': createMockHassEntity('sensor.kitchen_inventory'),
          'sensor.garage_tools': createMockHassEntity('sensor.garage_tools', {
            attributes: { items: [] },
          }),
          'switch.not_inventory': createMockHassEntity('switch.not_inventory'),
        };

        const result = Utils.findInventoryEntities(mockHass);

        expect(result).toEqual(['sensor.garage_tools', 'sensor.kitchen_inventory']);
      });
    });

    describe('createEntityOptions', () => {
      it('should create options with friendly names', () => {
        mockHass.states = {
          'sensor.test1': createMockHassEntity('sensor.test1', {
            attributes: { friendly_name: 'Test 1' },
          }),
          'sensor.test2': createMockHassEntity('sensor.test2'),
        };

        const result = Utils.createEntityOptions(mockHass, ['sensor.test1', 'sensor.test2']);

        expect(result).toEqual([
          { value: 'sensor.test1', label: 'Test 1' },
          { value: 'sensor.test2', label: 'sensor.test2' },
        ]);
      });
    });
  });
});
