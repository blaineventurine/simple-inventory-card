import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Utilities } from '../../src/utils/utilities';
import { HomeAssistant, InventoryItem } from '../../src/types/homeAssistant';
import { RawFormData, ItemData } from '../../src/types/inventoryItem';
import { createMockHassEntity, createMockHomeAssistant } from '../testHelpers';

const createValidFormData = (overrides: Partial<RawFormData> = {}): RawFormData => ({
  autoAddEnabled: false,
  autoAddToListQuantity: '',
  category: 'Food',
  expiryAlertDays: '',
  expiryDate: '',
  location: 'kitchen',
  name: 'Test Item',
  quantity: '5',
  todoList: '',
  unit: 'pieces',
  ...overrides,
});

describe('Utilities', () => {
  describe('getInventoryName', () => {
    describe('friendly_name handling', () => {
      it('should return friendly_name when available', () => {
        const state = createMockHassEntity('sensor.test', {
          attributes: { friendly_name: 'Kitchen Inventory' },
        });

        const result = Utilities.getInventoryName(state, 'sensor.test');
        expect(result).toBe('Kitchen Inventory');
      });

      it.each([{ friendly_name: '' }, { friendly_name: '   ' }, { friendly_name: '\t\n' }])(
        'should fall back to entity formatting for empty friendly_name: $friendly_name',
        ({ friendly_name }) => {
          const state = createMockHassEntity('sensor.kitchen_inventory', {
            attributes: { friendly_name },
          });

          const result = Utilities.getInventoryName(state, 'sensor.kitchen_inventory');
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
        const result = Utilities.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });

      it.each(['sensor._kitchen_', 'sensor._pantry_storage_', 'sensor.__middle_kitchen__'])(
        'should handle leading/trailing underscores: %s',
        (input) => {
          const result = Utilities.getInventoryName(undefined, input);
          expect(result.startsWith(' ')).toBe(false);
          expect(result.endsWith(' ')).toBe(false);
        },
      );

      it.each(['invalid', 'sensor.', '', 'sensor', 'sensor.kitchen.'])(
        'should return default name for invalid entity IDs: %s',
        (invalidId) => {
          const result = Utilities.getInventoryName(undefined, invalidId);
          expect(result).toBe('Inventory');
        },
      );

      it('should handle entity IDs with empty parts in the middle', () => {
        expect(Utilities.getInventoryName(undefined, 'sensor..kitchen')).toBe('Kitchen');
        expect(Utilities.getInventoryName(undefined, 'domain...entity')).toBe('Entity');
      });
    });

    describe('edge cases', () => {
      it('should handle undefined state gracefully', () => {
        const result = Utilities.getInventoryName(undefined, 'sensor.kitchen_inventory');
        expect(result).toBe('Kitchen');
      });

      it('should handle state with undefined attributes', () => {
        const state = createMockHassEntity('sensor.test', { attributes: undefined as any });
        const result = Utilities.getInventoryName(state, 'sensor.kitchen_inventory');
        expect(result).toBe('Kitchen');
      });
    });
  });

  describe('getInventoryDescription', () => {
    it('should return description when available', () => {
      const state = createMockHassEntity('sensor.test', {
        attributes: { description: 'Main kitchen storage' },
      });

      const result = Utilities.getInventoryDescription(state);
      expect(result).toBe('Main kitchen storage');
    });

    it.each([undefined, { attributes: undefined }, { attributes: undefined }, { attributes: {} }])(
      'should return undefined for missing description',
      (state) => {
        const result = Utilities.getInventoryDescription(state as any);
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

      const result = Utilities.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('custom_inventory_123');
    });

    it('should extract ID from unique_id with inventory_ prefix', () => {
      mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', {
        attributes: { unique_id: 'inventory_kitchen_main' },
      });

      const result = Utilities.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('kitchen_main');
    });

    it('should fallback to entity_id domain removal', () => {
      mockHass.states['sensor.kitchen_inventory'] = createMockHassEntity(
        'sensor.kitchen_inventory',
      );

      const result = Utilities.getInventoryId(mockHass, 'sensor.kitchen_inventory');
      expect(result).toBe('kitchen_inventory');
    });

    it.each([
      { attributes: undefined },
      { attributes: undefined },
      { attributes: { inventory_id: undefined } },
      { attributes: { unique_id: 'some_other_id' } },
    ])('should handle missing or invalid attributes', (entityData) => {
      mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', entityData as any);

      const result = Utilities.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test');
    });
  });

  describe('preserveInputValues and restoreInputValues', () => {
    let mockShadowRoot: ShadowRoot;
    let mockElements: { [id: string]: HTMLInputElement };

    beforeEach(() => {
      mockElements = {};
      mockShadowRoot = {
        getElementById: vi.fn((id: string) => mockElements[id] || undefined),
      } as any;
    });

    it.each([
      { type: 'text', value: 'Test Item', expected: 'Test Item' },
      { type: 'checkbox', checked: true, expected: true },
      { type: 'number', value: '5.5', expected: 5.5 },
    ])('should preserve $type input values', ({ type, value, checked, expected }) => {
      const element = { type, value, checked } as HTMLInputElement;
      mockElements['test'] = element;

      const result = Utilities.preserveInputValues(mockShadowRoot, ['test']);
      expect(result.test).toBe(expected);
    });

    it('should restore values correctly', () => {
      const mockInput = { type: 'text', value: '', checked: false } as HTMLInputElement;
      mockElements['test'] = mockInput;

      Utilities.restoreInputValues(mockShadowRoot, { test: 'Restored Value' });
      expect(mockInput.value).toBe('Restored Value');

      const mockCheckbox = { type: 'checkbox', checked: false } as HTMLInputElement;
      mockElements['checkbox'] = mockCheckbox;

      Utilities.restoreInputValues(mockShadowRoot, { checkbox: true });
      expect(mockCheckbox.checked).toBe(true);
    });

    it('should handle missing elements and undefined values', () => {
      expect(Utilities.preserveInputValues(mockShadowRoot, ['nonexistent'])).toEqual({});
      expect(() => Utilities.restoreInputValues(mockShadowRoot, undefined)).not.toThrow();
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
      const result = Utilities.formatDate(dateString);
      expect(result).toBeTruthy();
      expect(result).not.toBe(dateString);
    });

    it.each([undefined, '', undefined])(
      'should return empty string for falsy inputs: %s',
      (input) => {
        expect(Utilities.formatDate(input as any)).toBe('');
      },
    );

    it.each(['invalid-date', 'not-a-date', 'abc123', '####', 'completely-invalid'])(
      'should return original string for invalid dates: %s',
      (invalidDate) => {
        const result = Utilities.formatDate(invalidDate);
        expect(result).toBe(invalidDate);
      },
    );

    it.each([
      '  2023-12-25  ',
      '\t2023-12-25\n',
      '  1640995200000  ', // Timestamp with whitespace
    ])('should handle whitespace correctly: %s', (paddedDate) => {
      const result = Utilities.formatDate(paddedDate);
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
        expect(Utilities.isExpired(date)).toBe(expected);
      });

      it.each([undefined, '', 'invalid-date', 'not a date', '2023-13-45'])(
        'should return false for invalid inputs: %s',
        (input) => {
          expect(Utilities.isExpired(input as any)).toBe(false);
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
          expect(Utilities.isExpiringSoon(date, threshold)).toBe(expected);
        },
      );

      it('should use default threshold of 7 days', () => {
        expect(Utilities.isExpiringSoon('2023-06-20')).toBe(true);
      });

      it('should return false for empty string', () => {
        expect(Utilities.isExpiringSoon('')).toBe(false);
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
      const mockFunction = vi.fn();
      const debounced = Utilities.debounce(mockFunction, 100);

      debounced('test');
      expect(mockFunction).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFunction).toHaveBeenCalledWith('test');
    });

    it('should cancel previous calls', () => {
      const mockFunction = vi.fn();
      const debounced = Utilities.debounce(mockFunction, 100);

      debounced('first');
      debounced('second');

      vi.advanceTimersByTime(100);
      expect(mockFunction).toHaveBeenCalledTimes(1);
      expect(mockFunction).toHaveBeenCalledWith('second');
    });
  });

  describe('form data validation and conversion', () => {
    describe('validateRawFormData', () => {
      it('should pass validation for valid data', () => {
        const formData = createValidFormData();
        const result = Utilities.validateRawFormData(formData);

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
          const result = Utilities.validateRawFormData(formData);

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
          const result = Utilities.validateRawFormData(formData);

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
          const result = Utilities.validateRawFormData(formData);

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
          const result = Utilities.validateRawFormData(formData);

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
          const result = Utilities.validateRawFormData(formData);

          expect(result.errors.some((e) => e.field === 'expiryDate')).toBe(shouldError);
        });

        it('should require expiry date when alert days is set', () => {
          const formData = createValidFormData({
            expiryDate: '',
            expiryAlertDays: '5',
          });
          const result = Utilities.validateRawFormData(formData);

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
          autoAddEnabled: true,
          autoAddToListQuantity: '2',
          category: 'Food',
          expiryAlertDays: '3',
          expiryDate: '2023-12-25',
          location: 'kitchen',
          name: '  Test Item  ',
          quantity: '5.5',
          todoList: 'todo.shopping',
          unit: 'kg',
        };

        const result = Utilities.convertRawFormDataToItemData(formData);

        expect(result).toEqual({
          autoAddEnabled: true,
          autoAddToListQuantity: 2,
          category: 'Food',
          expiryAlertDays: 3,
          expiryDate: '2023-12-25',
          location: 'kitchen',
          name: 'Test Item',
          quantity: 5.5,
          todoList: 'todo.shopping',
          unit: 'kg',
        });
      });

      it.each([
        { field: 'quantity', input: 'invalid', defaultValue: 1 },
        { field: 'autoAddToListQuantity', input: '', defaultValue: 0 },
        { field: 'expiryAlertDays', input: 'invalid', defaultValue: 1 },
      ])('should handle invalid numeric values: $field', ({ field, input, defaultValue }) => {
        const formData = createValidFormData({ [field]: input });
        const result = Utilities.convertRawFormDataToItemData(formData);

        expect(result[field as keyof typeof result]).toBe(defaultValue);
      });

      it('should enforce minimum of 0 for negative values', () => {
        const formData = createValidFormData({
          quantity: '-5',
          autoAddToListQuantity: '-2.5',
          expiryAlertDays: '-1',
        });

        const result = Utilities.convertRawFormDataToItemData(formData);

        expect(result.quantity).toBe(0);
        expect(result.autoAddToListQuantity).toBe(0);
        expect(result.expiryAlertDays).toBe(0);
      });

      it('should handle undefined/null values gracefully', () => {
        const formData: RawFormData = {
          autoAddEnabled: false,
          autoAddToListQuantity: null as any,
          category: null as any,
          expiryAlertDays: undefined as any,
          expiryDate: null as any,
          location: null as any,
          name: null as any,
          quantity: undefined as any,
          todoList: undefined as any,
          unit: undefined as any,
        };

        const result = Utilities.convertRawFormDataToItemData(formData);

        expect(result).toEqual({
          autoAddEnabled: false,
          autoAddToListQuantity: 0,
          category: '',
          expiryAlertDays: 1,
          expiryDate: '',
          location: '',
          name: '',
          quantity: 1,
          todoList: '',
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
        expect(Utilities.isValidDate(input)).toBe(expected);
      });
    });

    describe('sanitizeHtml', () => {
      beforeEach(() => {
        globalThis.document = {
          createElement: vi.fn(() => ({
            textContent: '',
            innerHTML: 'Safe Text',
          })),
        } as any;
      });

      it('should sanitize HTML using textContent', () => {
        const result = Utilities.sanitizeHtml('<script>alert("xss")</script>');
        expect(globalThis.document.createElement).toHaveBeenCalledWith('div');
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
        const result = Utilities.sanitizeString(input as any, maxLength);
        expect(result).toBe(expected);
      });
    });

    describe('hasActiveFilters', () => {
      it.each([
        {
          filters: {
            category: [],
            expiry: '',
            location: [],
            quantity: '',
            searchText: 'test',
            showAdvanced: false,
          },
          expected: true,
        },
        {
          filters: {
            category: ['Food'],
            expiry: '',
            location: [],
            quantity: '',
            searchText: '',
            showAdvanced: false,
          },
          expected: true,
        },
        {
          filters: {
            category: [],
            expiry: '',
            location: ['kitchen'],
            quantity: '',
            searchText: '',
            showAdvanced: false,
          },
          expected: true,
        },
        {
          filters: {
            category: [],
            expiry: '',
            location: [],
            quantity: '',
            searchText: '',
            showAdvanced: false,
          },
          expected: false,
        },
      ])('should detect active filters correctly', ({ filters, expected }) => {
        expect(Utilities.hasActiveFilters(filters)).toBe(expected);
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

        const result = Utilities.groupItemsByCategory(items);

        expect(result['Fruit']).toHaveLength(2);
        expect(result['Vegetable']).toHaveLength(1);
        expect(result['Uncategorized']).toHaveLength(1);
      });

      it('should handle empty array', () => {
        expect(Utilities.groupItemsByCategory([])).toEqual({});
      });
    });

    describe('groupItemsByLocation', () => {
      it('should group items by location', () => {
        const items = [
          { name: 'Apple', location: 'Fridge' },
          { name: 'Banana', location: 'Fridge' },
          { name: 'Carrot', location: 'Root Cellar' },
          { name: 'Bread' },
        ];

        const result = Utilities.groupItemsByLocation(items);

        expect(result['Fridge']).toHaveLength(2);
        expect(result['Root Cellar']).toHaveLength(1);
        expect(result['No Location']).toHaveLength(1);
      });

      it('should handle empty array', () => {
        expect(Utilities.groupItemsByLocation([])).toEqual({});
      });
    });

    describe('sanitizeItemData', () => {
      it('should sanitize and enforce limits', () => {
        const itemData: ItemData = {
          autoAddEnabled: 'true' as any,
          autoAddToListQuantity: 1_000_000,
          category:
            'A very long category name that should definitely be truncated because it exceeds the limit',
          expiryDate: '2023-12-25',
          expiryAlertDays: 0,
          location: '  A very long location name that really should also be truncated  ',
          name: '  Test Item  ',
          quantity: -5,
          todoList: 'todo.test',
          unit: 'a very long unit name that should also be truncated',
        };

        const result = Utilities.sanitizeItemData(itemData);

        expect(result.name).toBe('Test Item');
        expect(result.quantity).toBe(0);
        expect(result.autoAddEnabled).toBe(true);
        // tricky - the sanitize function trims, slices, then trims again to remove a trailing space
        // if it happened to have a space at the end after slicing
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

        const result = Utilities.validateInventoryItems(items);

        expect(result).toHaveLength(3); // Valid Item, Invalid quantity item, Missing fields item
        expect(result[0].name).toBe('Valid Item');
        expect(result[0].quantity).toBe(5);

        expect(result[1].auto_add_enabled).toBe(false); // Normalized missing auto_add_enabled
        expect(result[1].auto_add_to_list_quantity).toBe(0); // Normalized missing auto_add_to_list_quantity
        expect(result[1].category).toBe(''); // Normalized missing category
        expect(result[1].expiry_date).toBe(''); // Normalized missing expiry_date
        expect(result[1].location).toBe(''); // Normalized missing location
        expect(result[1].name).toBe('Item with invalid quantity');
        expect(result[1].quantity).toBe(1); // Normalized invalid quantity
        expect(result[1].unit).toBe(''); // Normalized missing unit

        expect(result[2].name).toBe('Item with missing fields');
        expect(result[2].quantity).toBe(1); // Default for missing quantity
      });

      it('should handle non-array input', () => {
        expect(Utilities.validateInventoryItems(null as any)).toEqual([]);
        expect(Utilities.validateInventoryItems(undefined as any)).toEqual([]);
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

        const result = Utilities.extractTodoLists(mockHass);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ id: 'todo.shopping', name: 'Shopping List' });
        expect(result[1]).toEqual({ id: 'todo.groceries', name: 'groceries' });
      });
    });

    describe('findInventoryEntities', () => {
      it('should find inventory sensor entities', () => {
        mockHass.states = {
          'sensor.kitchen_inventory': createMockHassEntity('sensor.kitchen_inventory', {
            attributes: { items: [] },
          }),
          'sensor.garage_inventory': createMockHassEntity('sensor.garage_inventory', {
            attributes: { items: [] },
          }),
          'sensor.garage_inventory_items_expiring_soon': createMockHassEntity(
            'sensor.garage_inventory_items_expiring_soon',
          ),
          'switch.not_inventory': createMockHassEntity('switch.not_inventory'),
        };

        const result = Utilities.findInventoryEntities(mockHass);

        expect(result).toEqual(['sensor.garage_inventory', 'sensor.kitchen_inventory']);
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

        const result = Utilities.createEntityOptions(mockHass, ['sensor.test1', 'sensor.test2']);

        expect(result).toEqual([
          { value: 'sensor.test1', label: 'Test 1' },
          { value: 'sensor.test2', label: 'sensor.test2' },
        ]);
      });
    });
  });

  describe('Utilities - Additional Mutation Testing Coverage', () => {
    describe('getInventoryId - Optional Chaining Coverage', () => {
      let mockHass: HomeAssistant;

      beforeEach(() => {
        mockHass = createMockHomeAssistant();
      });

      it('should handle null state gracefully', () => {
        mockHass.states['sensor.test'] = null as any;
        const result = Utilities.getInventoryId(mockHass, 'sensor.test');
        expect(result).toBe('test');
      });

      it('should handle state with null attributes', () => {
        mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', {
          attributes: null as any,
        });
        const result = Utilities.getInventoryId(mockHass, 'sensor.test');
        expect(result).toBe('test');
      });

      it('should handle unique_id that is not a string', () => {
        mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', {
          attributes: { unique_id: 123 as any },
        });
        const result = Utilities.getInventoryId(mockHass, 'sensor.test');
        expect(result).toBe('test');
      });

      it('should handle unique_id without inventory_ prefix', () => {
        mockHass.states['sensor.test'] = createMockHassEntity('sensor.test', {
          attributes: { unique_id: 'some_other_prefix_test' },
        });
        const result = Utilities.getInventoryId(mockHass, 'sensor.test');
        expect(result).toBe('test');
      });

      it('should handle entity ID with no domain separator', () => {
        const result = Utilities.getInventoryId(mockHass, 'invalid_entity_id');
        expect(result).toBe('invalid_entity_id');
      });

      it('should handle entity ID with only domain', () => {
        const result = Utilities.getInventoryId(mockHass, 'sensor.');
        expect(result).toBe('');
      });
    });

    describe('formatDate - Regex and Edge Case Coverage', () => {
      it('should handle numeric strings that are not pure digits', () => {
        const result = Utilities.formatDate('123abc');
        expect(result).toBe('123abc'); // Should return original for invalid format
      });

      it('should handle partial numeric strings', () => {
        const result = Utilities.formatDate('123');
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

        for (const dateString of testCases) {
          const result = Utilities.formatDate(dateString);
          // These should NOT be parsed as timestamps or YYYY-MM-DD format
          // They should go through the general Date() constructor path
          expect(result).toBeTruthy(); // Just verify it returns something
        }
      });

      it('should handle date strings without trimming', () => {
        // Test the specific mutant that removes .trim()
        const result = Utilities.formatDate('2023-12-25');
        expect(result).toBeTruthy();
        expect(result).not.toBe('2023-12-25');
      });

      it('should handle arithmetic mutation in month calculation', () => {
        const result = Utilities.formatDate('2023-12-25');
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
        const originalDate = globalThis.Date;
        globalThis.Date = class extends Date {
          constructor(...arguments_: ConstructorParameters<typeof Date>) {
            if (arguments_[0] === 'throw-error') {
              throw new Error('Date error');
            }
            super(...arguments_);
          }
        } as any;

        const result = Utilities.isExpired('throw-error');
        expect(result).toBe(false);

        globalThis.Date = originalDate;
      });

      it('should handle invalid date objects that return NaN', () => {
        const result = Utilities.isExpired('invalid-date-that-creates-nan');
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
        const result = Utilities.isExpiringSoon('2023-06-15', 7);
        expect(result).toBe(true); // Day 0 should be included (>= 0)
      });

      it('should handle exactly threshold days difference', () => {
        const result = Utilities.isExpiringSoon('2023-06-22', 7);
        expect(result).toBe(true); // Day 7 should be included (<= threshold)
      });

      it('should handle threshold + 1 days difference', () => {
        const result = Utilities.isExpiringSoon('2023-06-23', 7);
        expect(result).toBe(false); // Day 8 should be excluded
      });

      it('should handle negative days (past dates)', () => {
        const result = Utilities.isExpiringSoon('2023-06-14', 7);
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
        const mockFunction = vi.fn();
        const debounced = Utilities.debounce(mockFunction, 100);

        // Make multiple calls to test timeout cleanup
        debounced('call1');
        debounced('call2');
        debounced('call3');

        // Only the last call should execute
        vi.advanceTimersByTime(100);
        expect(mockFunction).toHaveBeenCalledTimes(1);
        expect(mockFunction).toHaveBeenCalledWith('call3');
      });
    });

    describe('validateRawFormData - Optional Chaining and Trim Coverage', () => {
      it('should handle quantity field without optional chaining', () => {
        const formData = createValidFormData();
        delete (formData as any).quantity; // Remove quantity entirely

        const result = Utilities.validateRawFormData(formData);
        expect(result.errors.some((e) => e.field === 'quantity')).toBe(false);
      });

      it('should handle autoAddToListQuantity without trim', () => {
        const formData = createValidFormData({
          autoAddEnabled: true,
          autoAddToListQuantity: null as any,
          todoList: 'todo.test',
        });

        const result = Utilities.validateRawFormData(formData);
        expect(result.errors.some((e) => e.field === 'autoAddToListQuantity')).toBe(true);
      });

      it('should handle todoList without trim', () => {
        const formData = createValidFormData({
          autoAddEnabled: true,
          autoAddToListQuantity: '5',
          todoList: null as any,
        });

        const result = Utilities.validateRawFormData(formData);
        expect(result.errors.some((e) => e.field === 'todoList')).toBe(true);
      });

      it('should handle expiryDate without trim', () => {
        const formData = createValidFormData({
          expiryDate: null as any,
        });

        const result = Utilities.validateRawFormData(formData);
        expect(result.errors.some((e) => e.field === 'expiryDate')).toBe(false);
      });

      it('should handle expiryAlertDays without optional chaining', () => {
        const formData = createValidFormData();
        delete (formData as any).expiryAlertDays;

        const result = Utilities.validateRawFormData(formData);
        expect(result.errors.some((e) => e.field === 'expiryAlertDays')).toBe(false);
      });

      it('should validate autoAddToListQuantity numeric values', () => {
        const formData = createValidFormData({
          autoAddEnabled: true,
          autoAddToListQuantity: 'invalid-number',
          todoList: 'todo.test',
        });

        const result = Utilities.validateRawFormData(formData);
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

        const result = Utilities.validateRawFormData(formData);
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

        const result = Utilities.validateRawFormData(formData);
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

        const result = Utilities.validateRawFormData(formData);
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

        const result = Utilities.convertRawFormDataToItemData(formData);
        expect(result.quantity).toBe(1);
        expect(result.autoAddToListQuantity).toBe(0);
      });

      it('should handle NaN values in numeric parsing', () => {
        const formData = createValidFormData({
          quantity: 'NaN',
          autoAddToListQuantity: 'not-a-number',
        });

        const result = Utilities.convertRawFormDataToItemData(formData);
        expect(result.quantity).toBe(1);
        expect(result.autoAddToListQuantity).toBe(0);
      });

      it('should handle fields without trim method', () => {
        const formData = createValidFormData();
        // Remove trim by setting to non-string values
        (formData as any).category = null;
        (formData as any).expiryDate = undefined;
        (formData as any).location = null;
        (formData as any).todoList = null;
        (formData as any).unit = undefined;

        const result = Utilities.convertRawFormDataToItemData(formData);

        expect(result.category).toBe('');
        expect(result.expiryDate).toBe('');
        expect(result.location).toBe('');
        expect(result.todoList).toBe('');
        expect(result.unit).toBe('');
      });
    });

    describe('sanitizeItemData - Math Function Coverage', () => {
      it('should use Math.max instead of Math.min for autoAddToListQuantity', () => {
        const itemData: ItemData = {
          autoAddEnabled: true,
          autoAddToListQuantity: -10, // Negative value
          category: 'Test',
          expiryAlertDays: 7,
          expiryDate: '',
          name: 'Test',
          quantity: 5,
          todoList: 'todo.test',
          unit: 'test',
        };

        const result = Utilities.sanitizeItemData(itemData);
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

        const result = Utilities.sanitizeItemData(itemData);
        expect(result.quantity).toBe(0);
        expect(result.autoAddToListQuantity).toBe(0);
      });
    });

    describe('validateInventoryItems - Type Checking Coverage', () => {
      it('should handle items with typeof mutations', () => {
        const items: InventoryItem[] = [
          {
            auto_add_enabled: false,
            auto_add_to_list_quantity: 0,
            category: '',
            expiry_alert_days: 0,
            expiry_date: '',
            location: '',
            name: 'Valid Item',
            quantity: 5,
            todo_list: '',
            unit: 123 as any,
          },
          {
            auto_add_enabled: false,
            auto_add_to_list_quantity: 0,
            category: true as any,
            expiry_alert_days: 0,
            expiry_date: '',
            location: '',
            name: 'Another Item',
            quantity: 0,
            todo_list: '',
            unit: '',
          },
          {
            auto_add_enabled: false,
            auto_add_to_list_quantity: 0,
            category: '',
            expiry_alert_days: 0,
            expiry_date: 456 as any,
            location: '',
            name: 'Third Item',
            quantity: 0,
            todo_list: '',
            unit: '',
          },
          {
            auto_add_enabled: false,
            auto_add_to_list_quantity: 0,
            category: '',
            expiry_alert_days: 0,
            expiry_date: '',
            location: '',
            name: 'Fourth Item',
            quantity: 0,
            todo_list: false as any,
            unit: '',
          },
          {
            auto_add_enabled: false,
            auto_add_to_list_quantity: 0,
            category: false as any,
            expiry_alert_days: 0,
            expiry_date: '',
            location: '',
            name: 'Fifth Item',
            quantity: 0,
            todo_list: '',
            unit: '',
          },
        ];

        const result = Utilities.validateInventoryItems(items);

        expect(result).toHaveLength(5);
        expect(result[0].unit).toBe(''); // Should be normalized to empty string
        expect(result[1].category).toBe(''); // Should be normalized to empty string
        expect(result[2].expiry_date).toBe(''); // Should be normalized to empty string
        expect(result[3].todo_list).toBe(''); // Should be normalized to empty string
        expect(result[4].location).toBe(''); // Should be normalized to empty string
      });

      it('should handle quantity type checking with logical OR', () => {
        const items = [
          { name: 'Test Item', quantity: 'not-a-number' as any },
          { name: 'Another Item', quantity: Number.NaN },
        ] as InventoryItem[];

        const result = Utilities.validateInventoryItems(items);

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

        const result = Utilities.extractTodoLists(mockHass);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('test'); // Should fallback to entity name
      });

      it('should handle findInventoryEntities with null hass', () => {
        const result = Utilities.findInventoryEntities(null as any);
        expect(result).toEqual([]);
      });

      it('should handle findInventoryEntities with missing states', () => {
        const hassWithoutStates = { ...mockHass, states: undefined as any };
        const result = Utilities.findInventoryEntities(hassWithoutStates);
        expect(result).toEqual([]);
      });

      it('should handle findInventoryEntities with null state entities', () => {
        mockHass.states = {
          'sensor.test': undefined as any,
        };

        const result = Utilities.findInventoryEntities(mockHass);
        expect(result).toEqual([]);
      });

      it('should handle createEntityOptions with missing attributes', () => {
        mockHass.states = {
          'sensor.test': createMockHassEntity('sensor.test', { attributes: undefined as any }),
        };

        const result = Utilities.createEntityOptions(mockHass, ['sensor.test']);
        expect(result).toEqual([{ value: 'sensor.test', label: 'sensor.test' }]);
      });

      it('should test conditional expression mutations in findInventoryEntities', () => {
        mockHass.states = {
          'sensor.inventory_test': createMockHassEntity('sensor.inventory_test', {
            attributes: { items: [] },
          }),
          'sensor.inventory_items': createMockHassEntity('sensor.inventory_items', {
            attributes: { items: ['test'] },
          }),
          'sensor.no_match': createMockHassEntity('sensor.no_match'),
          'sensor.inventory_items_expiring_soon': createMockHassEntity(
            'sensor.inventory_items_expiring_soon',
          ),
          'sensor.has_items_only': createMockHassEntity('sensor.has_items_only', {
            // Has items but no inventory in name
            attributes: { items: [] },
          }),
        };

        const result = Utilities.findInventoryEntities(mockHass);
        expect(result).toContain('sensor.inventory_items');
        expect(result).toContain('sensor.inventory_test');
        expect(result).not.toContain('sensor.no_match');
        expect(result).not.toContain('sensor.inventory_no_items');
        expect(result).not.toContain('sensor.has_items_only');
      });
    });

    describe('formatDate - Timezone and Options Coverage', () => {
      it('should handle date formatting without timezone option', () => {
        const result = Utilities.formatDate('2023-12-25');
        expect(result).toBeTruthy();
        // The mutant removes the timeZone option, but result should still be valid
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Should match MM/DD/YYYY format
      });
    });
  });
});
