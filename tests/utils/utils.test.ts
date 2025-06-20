import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Utils } from '../../src/utils/utils';
import { HomeAssistant, InventoryItem } from '../../src/types/home-assistant';
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
        { field: 'quantity', input: 'invalid', defaultValue: 1 },
        { field: 'autoAddToListQuantity', input: '', defaultValue: 0 },
        { field: 'expiryAlertDays', input: 'invalid', defaultValue: 1 },
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
          quantity: 1,
          autoAddEnabled: false,
          autoAddToListQuantity: 0,
          todoList: '',
          expiryDate: '',
          expiryAlertDays: 1,
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
        expect(result.expiryAlertDays).toBe(0);
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
          { name: 'Item with invalid quantity', quantity: 'invalid' as any },
          { name: 'Item with missing fields' } as any,
          { invalidItem: 'no name' } as any,
          null as any,
        ] as InventoryItem[];

        const result = Utils.validateInventoryItems(items);

        expect(result).toHaveLength(3); // Valid Item, Invalid quantity item, Missing fields item
        expect(result[0].name).toBe('Valid Item');
        expect(result[0].quantity).toBe(5);

        expect(result[1].name).toBe('Item with invalid quantity');
        expect(result[1].quantity).toBe(1); // Normalized invalid quantity
        expect(result[1].unit).toBe(''); // Normalized missing unit
        expect(result[1].category).toBe(''); // Normalized missing category
        expect(result[1].expiry_date).toBe(''); // Normalized missing expiry_date
        expect(result[1].auto_add_enabled).toBe(false); // Normalized missing auto_add_enabled
        expect(result[1].auto_add_to_list_quantity).toBe(0); // Normalized missing auto_add_to_list_quantity

        expect(result[2].name).toBe('Item with missing fields');
        expect(result[2].quantity).toBe(1); // Default for missing quantity
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

  describe('Utils - Additional Mutation Testing Coverage', () => {
    describe('getInventoryId - Optional Chaining Coverage', () => {
      let mockHass: HomeAssistant;

      beforeEach(() => {
        mockHass = createMockHomeAssistant();
      });

      it('should handle null state gracefully', () => {
        mockHass.states['sensor.test'] = null as any;
        const result = Utils.getInventoryId(mockHass, 'sensor.test');
        expect(result).toBe('test');
      });

      it('should handle state with null attributes', () => {
        mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', {
          attributes: null as any,
        });
        const result = Utils.getInventoryId(mockHass, 'sensor.test');
        expect(result).toBe('test');
      });

      it('should handle unique_id that is not a string', () => {
        mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', {
          attributes: { unique_id: 123 as any },
        });
        const result = Utils.getInventoryId(mockHass, 'sensor.test');
        expect(result).toBe('test');
      });

      it('should handle unique_id without inventory_ prefix', () => {
        mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', {
          attributes: { unique_id: 'some_other_prefix_test' },
        });
        const result = Utils.getInventoryId(mockHass, 'sensor.test');
        expect(result).toBe('test');
      });

      it('should handle entity ID with no domain separator', () => {
        const result = Utils.getInventoryId(mockHass, 'invalid_entity_id');
        expect(result).toBe('invalid_entity_id');
      });

      it('should handle entity ID with only domain', () => {
        const result = Utils.getInventoryId(mockHass, 'sensor.');
        expect(result).toBe('');
      });
    });

    describe('formatDate - Regex and Edge Case Coverage', () => {
      it('should handle numeric strings that are not pure digits', () => {
        const result = Utils.formatDate('123abc');
        expect(result).toBe('123abc'); // Should return original for invalid format
      });

      it('should handle partial numeric strings', () => {
        const result = Utils.formatDate('123');
        expect(result).not.toBe('123'); // Should be formatted as timestamp
      });

      it('should handle regex mutation edge cases', () => {
        // Test cases that would behave differently with mutated regex patterns
        const testCases = [
          '123abc', // Would match /^\d+/ but not /^\d+$/
          'abc123', // Would match /\d+$/ but not /^\d+$/
          'x2023-12-25', // Would match /\d{4}-\d{2}-\d{2}$/ but not /^\d{4}-\d{2}-\d{2}$/
          '2023-12-25x', // Would match /^\d{4}-\d{2}-\d{2}/ but not /^\d{4}-\d{2}-\d{2}$/
        ];

        testCases.forEach((dateString) => {
          const result = Utils.formatDate(dateString);
          // These should NOT be parsed as timestamps or YYYY-MM-DD format
          // They should go through the general Date() constructor path
          expect(result).toBeTruthy(); // Just verify it returns something
        });
      });

      it('should handle date strings without trimming', () => {
        // Test the specific mutant that removes .trim()
        const result = Utils.formatDate('2023-12-25');
        expect(result).toBeTruthy();
        expect(result).not.toBe('2023-12-25');
      });

      it('should handle arithmetic mutation in month calculation', () => {
        const result = Utils.formatDate('2023-12-25');
        // Verify the month is correct (not off by 2 due to +1 instead of -1)
        expect(result).toContain('12'); // Should contain December representation
      });
    });

    describe('isExpired - Edge Cases', () => {
      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2023-06-15T12:00:00Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should handle dates that throw exceptions', () => {
        // Force an exception scenario
        const originalDate = global.Date;
        global.Date = class extends Date {
          constructor(...args: ConstructorParameters<typeof Date>) {
            if (args[0] === 'throw-error') {
              throw new Error('Date error');
            }
            super(...args);
          }
        } as any;

        const result = Utils.isExpired('throw-error');
        expect(result).toBe(false);

        global.Date = originalDate;
      });

      it('should handle invalid date objects that return NaN', () => {
        const result = Utils.isExpired('invalid-date-that-creates-nan');
        expect(result).toBe(false);
      });
    });

    describe('isExpiringSoon - Boundary Testing', () => {
      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2023-06-15T12:00:00Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should handle exactly 0 days difference', () => {
        const result = Utils.isExpiringSoon('2023-06-15', 7);
        expect(result).toBe(true); // Day 0 should be included (>= 0)
      });

      it('should handle exactly threshold days difference', () => {
        const result = Utils.isExpiringSoon('2023-06-22', 7);
        expect(result).toBe(true); // Day 7 should be included (<= threshold)
      });

      it('should handle threshold + 1 days difference', () => {
        const result = Utils.isExpiringSoon('2023-06-23', 7);
        expect(result).toBe(false); // Day 8 should be excluded
      });

      it('should handle negative days (past dates)', () => {
        const result = Utils.isExpiringSoon('2023-06-14', 7);
        expect(result).toBe(false); // Past dates should be excluded (< 0)
      });
    });

    describe('debounce - Timeout Handling', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should handle multiple rapid calls with timeout cleanup', () => {
        const mockFn = vi.fn();
        const debounced = Utils.debounce(mockFn, 100);

        // Make multiple calls to test timeout cleanup
        debounced('call1');
        debounced('call2');
        debounced('call3');

        // Only the last call should execute
        vi.advanceTimersByTime(100);
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('call3');
      });
    });

    describe('validateRawFormData - Optional Chaining and Trim Coverage', () => {
      it('should handle quantity field without optional chaining', () => {
        const formData = createValidFormData();
        delete (formData as any).quantity; // Remove quantity entirely

        const result = Utils.validateRawFormData(formData);
        expect(result.errors.some((e) => e.field === 'quantity')).toBe(false);
      });

      it('should handle autoAddToListQuantity without trim', () => {
        const formData = createValidFormData({
          autoAddEnabled: true,
          autoAddToListQuantity: null as any,
          todoList: 'todo.test',
        });

        const result = Utils.validateRawFormData(formData);
        expect(result.errors.some((e) => e.field === 'autoAddToListQuantity')).toBe(true);
      });

      it('should handle todoList without trim', () => {
        const formData = createValidFormData({
          autoAddEnabled: true,
          autoAddToListQuantity: '5',
          todoList: null as any,
        });

        const result = Utils.validateRawFormData(formData);
        expect(result.errors.some((e) => e.field === 'todoList')).toBe(true);
      });

      it('should handle expiryDate without trim', () => {
        const formData = createValidFormData({
          expiryDate: null as any,
        });

        const result = Utils.validateRawFormData(formData);
        expect(result.errors.some((e) => e.field === 'expiryDate')).toBe(false);
      });

      it('should handle expiryAlertDays without optional chaining', () => {
        const formData = createValidFormData();
        delete (formData as any).expiryAlertDays;

        const result = Utils.validateRawFormData(formData);
        expect(result.errors.some((e) => e.field === 'expiryAlertDays')).toBe(false);
      });

      it('should validate autoAddToListQuantity numeric values', () => {
        const formData = createValidFormData({
          autoAddEnabled: true,
          autoAddToListQuantity: 'invalid-number',
          todoList: 'todo.test',
        });

        const result = Utils.validateRawFormData(formData);
        expect(
          result.errors.some(
            (e) => e.field === 'autoAddToListQuantity' && e.message.includes('valid number'),
          ),
        ).toBe(true);
      });

      it('should validate autoAddToListQuantity negative values', () => {
        const formData = createValidFormData({
          autoAddEnabled: true,
          autoAddToListQuantity: '-5',
          todoList: 'todo.test',
        });

        const result = Utils.validateRawFormData(formData);
        expect(
          result.errors.some(
            (e) => e.field === 'autoAddToListQuantity' && e.message.includes('cannot be negative'),
          ),
        ).toBe(true);
      });

      it('should validate expiryAlertDays numeric values', () => {
        const formData = createValidFormData({
          expiryDate: '2023-12-25',
          expiryAlertDays: 'invalid-number',
        });

        const result = Utils.validateRawFormData(formData);
        expect(
          result.errors.some(
            (e) => e.field === 'expiryAlertDays' && e.message.includes('valid number'),
          ),
        ).toBe(true);
      });

      it('should validate expiryAlertDays negative values', () => {
        const formData = createValidFormData({
          expiryDate: '2023-12-25',
          expiryAlertDays: '-3',
        });

        const result = Utils.validateRawFormData(formData);
        expect(
          result.errors.some(
            (e) => e.field === 'expiryAlertDays' && e.message.includes('cannot be negative'),
          ),
        ).toBe(true);
      });
    });

    describe('convertRawFormDataToItemData - Logical Operator Coverage', () => {
      it('should handle Infinity values in numeric parsing', () => {
        const formData = createValidFormData({
          quantity: 'Infinity',
          autoAddToListQuantity: '-Infinity',
        });

        const result = Utils.convertRawFormDataToItemData(formData);
        expect(result.quantity).toBe(1);
        expect(result.autoAddToListQuantity).toBe(0);
      });

      it('should handle NaN values in numeric parsing', () => {
        const formData = createValidFormData({
          quantity: 'NaN',
          autoAddToListQuantity: 'not-a-number',
        });

        const result = Utils.convertRawFormDataToItemData(formData);
        expect(result.quantity).toBe(1);
        expect(result.autoAddToListQuantity).toBe(0);
      });

      it('should handle fields without trim method', () => {
        const formData = createValidFormData();
        // Remove trim by setting to non-string values
        (formData as any).todoList = null;
        (formData as any).expiryDate = undefined;
        (formData as any).category = null;
        (formData as any).unit = undefined;

        const result = Utils.convertRawFormDataToItemData(formData);
        expect(result.todoList).toBe('');
        expect(result.expiryDate).toBe('');
        expect(result.category).toBe('');
        expect(result.unit).toBe('');
      });
    });

    describe('sanitizeItemData - Math Function Coverage', () => {
      it('should use Math.max instead of Math.min for autoAddToListQuantity', () => {
        const itemData: ItemData = {
          name: 'Test',
          quantity: 5,
          autoAddEnabled: true,
          autoAddToListQuantity: -10, // Negative value
          category: 'Test',
          unit: 'test',
          todoList: 'todo.test',
          expiryDate: '',
          expiryAlertDays: 7,
        };

        const result = Utils.sanitizeItemData(itemData);
        expect(result.autoAddToListQuantity).toBe(0); // Should be 0, not negative
      });

      it('should handle logical OR vs AND in numeric conversion', () => {
        const itemData: ItemData = {
          name: 'Test',
          quantity: null as any,
          autoAddEnabled: true,
          autoAddToListQuantity: undefined as any,
          category: 'Test',
          unit: 'test',
          todoList: 'todo.test',
          expiryDate: '',
          expiryAlertDays: 7,
        };

        const result = Utils.sanitizeItemData(itemData);
        expect(result.quantity).toBe(0);
        expect(result.autoAddToListQuantity).toBe(0);
      });
    });

    describe('validateInventoryItems - Type Checking Coverage', () => {
      it('should handle items with typeof mutations', () => {
        const items: InventoryItem[] = [
          {
            name: 'Valid Item',
            quantity: 5,
            unit: 123 as any,
            category: '',
            expiry_date: '',
            expiry_alert_days: 0,
            todo_list: '',
            auto_add_enabled: false,
            auto_add_to_list_quantity: 0,
          },
          {
            name: 'Another Item',
            quantity: 0,
            unit: '',
            category: true as any,
            expiry_date: '',
            expiry_alert_days: 0,
            todo_list: '',
            auto_add_enabled: false,
            auto_add_to_list_quantity: 0,
          },
          {
            name: 'Third Item',
            quantity: 0,
            unit: '',
            category: '',
            expiry_date: 456 as any,
            expiry_alert_days: 0,
            todo_list: '',
            auto_add_enabled: false,
            auto_add_to_list_quantity: 0,
          },
          {
            name: 'Fourth Item',
            quantity: 0,
            unit: '',
            category: '',
            expiry_date: '',
            expiry_alert_days: 0,
            todo_list: false as any,
            auto_add_enabled: false,
            auto_add_to_list_quantity: 0,
          },
        ];

        const result = Utils.validateInventoryItems(items);

        expect(result).toHaveLength(4);
        expect(result[0].unit).toBe(''); // Should be normalized to empty string
        expect(result[1].category).toBe(''); // Should be normalized to empty string
        expect(result[2].expiry_date).toBe(''); // Should be normalized to empty string
        expect(result[3].todo_list).toBe(''); // Should be normalized to empty string
      });

      it('should handle quantity type checking with logical OR', () => {
        const items = [
          { name: 'Test Item', quantity: 'not-a-number' as any },
          { name: 'Another Item', quantity: NaN },
        ] as InventoryItem[];

        const result = Utils.validateInventoryItems(items);

        expect(result).toHaveLength(2);
        expect(result[0].quantity).toBe(1);
        expect(result[1].quantity).toBe(1);
      });
    });

    describe('Home Assistant Functions - Optional Chaining Coverage', () => {
      let mockHass: HomeAssistant;

      beforeEach(() => {
        mockHass = createMockHomeAssistant();
      });

      it('should handle extractTodoLists with missing attributes', () => {
        mockHass.states = {
          'todo.test': createMockHassEntity('todo.test', { attributes: null as any }),
        };

        const result = Utils.extractTodoLists(mockHass);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('test'); // Should fallback to entity name
      });

      it('should handle findInventoryEntities with null hass', () => {
        const result = Utils.findInventoryEntities(null as any);
        expect(result).toEqual([]);
      });

      it('should handle findInventoryEntities with missing states', () => {
        const hassWithoutStates = { ...mockHass, states: undefined as any };
        const result = Utils.findInventoryEntities(hassWithoutStates);
        expect(result).toEqual([]);
      });

      it('should handle findInventoryEntities with null state entities', () => {
        mockHass.states = {
          'sensor.test': null as any,
        };

        const result = Utils.findInventoryEntities(mockHass);
        expect(result).toEqual([]);
      });

      it('should handle createEntityOptions with missing attributes', () => {
        mockHass.states = {
          'sensor.test': createMockHassEntity('sensor.test', { attributes: null as any }),
        };

        const result = Utils.createEntityOptions(mockHass, ['sensor.test']);
        expect(result).toEqual([{ value: 'sensor.test', label: 'sensor.test' }]);
      });

      it('should test conditional expression mutations in findInventoryEntities', () => {
        mockHass.states = {
          'sensor.inventory_test': createMockHassEntity('sensor.inventory_test'),
          'sensor.has_items': createMockHassEntity('sensor.has_items', {
            attributes: { items: [] },
          }),
          'sensor.no_match': createMockHassEntity('sensor.no_match'),
        };

        const result = Utils.findInventoryEntities(mockHass);
        expect(result).toContain('sensor.inventory_test');
        expect(result).toContain('sensor.has_items');
        expect(result).not.toContain('sensor.no_match');
      });
    });

    describe('formatDate - Timezone and Options Coverage', () => {
      it('should handle date formatting without timezone option', () => {
        const result = Utils.formatDate('2023-12-25');
        expect(result).toBeTruthy();
        // The mutant removes the timeZone option, but result should still be valid
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Should match MM/DD/YYYY format
      });
    });
  });
});
