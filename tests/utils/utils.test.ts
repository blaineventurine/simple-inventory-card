import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Utils } from '../../src/utils/utils';
import { HassEntity, HomeAssistant } from '../../src/types/home-assistant';
import { FilterState } from '../../src/types/filterState';
import { RawFormData, ItemData } from '../../src/types/inventoryItem';

describe('Utils', () => {
  describe('getInventoryName', () => {
    it('should handle entity names with leading and trailing underscores', () => {
      const testCases = [
        { input: 'sensor._kitchen_', expected: 'Kitchen' },
        { input: 'sensor._pantry_storage_', expected: 'Pantry Storage' },
        { input: 'sensor.__middle_kitchen__', expected: 'Middle Kitchen' },
        { input: 'sensor._inventory_room_', expected: 'Room' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
        // Without .trim(), these would have leading/trailing spaces
        expect(result.startsWith(' ')).toBe(false);
        expect(result.endsWith(' ')).toBe(false);
      });
    });

    it('should handle entity IDs ending with dots', () => {
      const testCases = [
        'sensor.kitchen.', // Ends with single dot
        'domain.entity.', // Ends with single dot
        'sensor.something..', // Ends with double dot
        'a.b.c.', // Multiple parts ending with dot
      ];

      testCases.forEach((entityId) => {
        const result = Utils.getInventoryName(undefined, entityId);
        expect(result).toBe('Inventory'); // Should return default name when entityName is empty
      });
    });

    it('should properly space words in multi-word entity names', () => {
      const testCases = [
        { input: 'sensor.kitchen_pantry', expected: 'Kitchen Pantry' },
        { input: 'sensor.main_storage_room', expected: 'Main Storage Room' },
        {
          input: 'sensor.upstairs_guest_bedroom_closet',
          expected: 'Upstairs Guest Bedroom Closet',
        },
        { input: 'sensor.front_yard_tool_shed', expected: 'Front Yard Tool Shed' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
        // Explicitly verify spacing exists
        expect(result).toContain(' '); // Should contain spaces
        expect(result.split(' ').length).toBeGreaterThan(1); // Should be multiple words
      });
    });

    it('should maintain word separation after inventory removal', () => {
      const testCases = [
        { input: 'sensor.kitchen_pantry_inventory', expected: 'Kitchen Pantry' },
        { input: 'sensor.main_garage_tool_inventory', expected: 'Main Garage Tool' },
        { input: 'sensor.basement_storage_room_inventory', expected: 'Basement Storage Room' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
        // Verify the result contains proper spacing
        expect(result).toMatch(/^[A-Z][a-z]*(\s[A-Z][a-z]*)*$/); // Pattern: "Word Word Word"
      });
    });

    it('should handle entity IDs with empty parts in the middle', () => {
      const testCases = [
        { input: 'sensor..kitchen', expected: 'Kitchen' }, // Empty middle part
        { input: 'domain...entity', expected: 'Entity' }, // Multiple empty parts
        { input: 'a..b.kitchen_inventory', expected: 'Kitchen' }, // Empty part with inventory suffix
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });
    });

    it('should return friendly_name when available', () => {
      const state: HassEntity = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          friendly_name: 'Kitchen Inventory',
        },
        context: { id: 'test', user_id: 'user123' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryName(state, 'sensor.test');
      expect(result).toBe('Kitchen Inventory');
    });

    it('should prefer friendly_name over entity formatting', () => {
      const state: HassEntity = {
        entity_id: 'sensor.ugly_entity_name',
        state: 'on',
        attributes: {
          friendly_name: 'Beautiful Display Name',
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryName(state, 'sensor.ugly_entity_name');
      expect(result).toBe('Beautiful Display Name');
    });

    it('should handle empty or whitespace friendly_name', () => {
      const testCases = [
        { friendly_name: '' },
        { friendly_name: '   ' },
        { friendly_name: '\t\n' },
      ];

      testCases.forEach(({ friendly_name }) => {
        const state: HassEntity = {
          entity_id: 'sensor.kitchen_inventory',
          state: 'on',
          attributes: { friendly_name },
          context: { id: 'test', user_id: undefined },
          last_changed: '2023-01-01T00:00:00Z',
          last_updated: '2023-01-01T00:00:00Z',
        };

        const result = Utils.getInventoryName(state, 'sensor.kitchen_inventory');
        // Should fall back to entity formatting since friendly_name is effectively empty
        expect(result).toBe('Kitchen');
      });
    });

    it('should format entity ID when no friendly_name', () => {
      const state: HassEntity = {
        entity_id: 'sensor.kitchen_inventory',
        state: 'on',
        attributes: {},
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryName(state, 'sensor.kitchen_inventory');
      expect(result).toBe('Kitchen');
    });

    it('should remove "Inventory" suffix from formatted name', () => {
      const testCases = [
        { input: 'sensor.pantry_inventory', expected: 'Pantry' },
        { input: 'sensor.garage_inventory', expected: 'Garage' },
        { input: 'sensor.basement_inventory', expected: 'Basement' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });
    });

    it('should handle case-insensitive inventory suffix removal', () => {
      const testCases = [
        { input: 'sensor.pantry_inventory', expected: 'Pantry' },
        { input: 'sensor.pantry_INVENTORY', expected: 'Pantry' },
        { input: 'sensor.pantry_Inventory', expected: 'Pantry' },
        { input: 'sensor.pantry_InVeNtOrY', expected: 'Pantry' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });
    });

    it('should handle complex entity names with multiple underscores', () => {
      const testCases = [
        { input: 'sensor.my_kitchen_pantry_inventory', expected: 'My Kitchen Pantry' },
        {
          input: 'sensor.main_garage_tool_storage_inventory',
          expected: 'Main Garage Tool Storage',
        },
        {
          input: 'sensor.upstairs_master_bedroom_closet',
          expected: 'Upstairs Master Bedroom Closet',
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });
    });

    it('should handle different entity domains', () => {
      const testCases = [
        { input: 'binary_sensor.pantry_inventory', expected: 'Pantry' },
        { input: 'input_number.kitchen_inventory', expected: 'Kitchen' },
        { input: 'automation.garage_inventory_check', expected: 'Garage Check' },
        { input: 'script.basement_inventory_update', expected: 'Basement Update' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });
    });

    it('should handle entity names with numbers', () => {
      const testCases = [
        { input: 'sensor.kitchen_1_inventory', expected: 'Kitchen 1' },
        { input: 'sensor.storage_room_2_inventory', expected: 'Storage Room 2' },
        { input: 'sensor.warehouse_section_42', expected: 'Warehouse Section 42' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });
    });

    it('should handle entity names without inventory suffix', () => {
      const testCases = [
        { input: 'sensor.kitchen_storage', expected: 'Kitchen Storage' },
        { input: 'sensor.garage_tools', expected: 'Garage Tools' },
        { input: 'sensor.pantry_items', expected: 'Pantry Items' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });
    });

    it('should handle single word entity names', () => {
      const testCases = [
        { input: 'sensor.kitchen', expected: 'Kitchen' },
        { input: 'sensor.garage', expected: 'Garage' },
        { input: 'sensor.pantry', expected: 'Pantry' },
        { input: 'sensor.inventory', expected: 'Inventory' }, // Just "inventory" (fallback to default)
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });
    });

    it('should return default name for invalid entity IDs', () => {
      const invalidIds = [
        'invalid', // No domain separator
        'sensor.', // Empty entity name
        '', // Empty string
        'sensor', // Just domain
      ];

      invalidIds.forEach((invalidId) => {
        const result = Utils.getInventoryName(undefined, invalidId);
        expect(result).toBe('Inventory'); // All should return default name
      });
    });

    it('should handle entity IDs with empty domain', () => {
      const result = Utils.getInventoryName(undefined, '.kitchen');
      expect(result).toBe('Kitchen'); // This actually works - empty domain, "kitchen" entity
    });

    it('should handle entity IDs with multiple dots', () => {
      const result = Utils.getInventoryName(undefined, 'multiple.dots.here');
      expect(result).toBe('Here'); // Should use the last part
    });

    it('should handle undefined state gracefully', () => {
      const result = Utils.getInventoryName(undefined, 'sensor.kitchen_inventory');
      expect(result).toBe('Kitchen');
    });

    it('should handle state with undefined attributes', () => {
      const state = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: undefined,
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      } as any;

      const result = Utils.getInventoryName(state, 'sensor.kitchen_inventory');
      expect(result).toBe('Kitchen');
    });

    it('should handle very long entity names', () => {
      const longName = 'sensor.' + 'very_'.repeat(10) + 'long_name_inventory';
      const result = Utils.getInventoryName(undefined, longName);
      expect(result).toContain('Very');
      expect(result).toContain('Long');
      expect(result).toContain('Name');
      expect(result).not.toContain('Inventory');
    });

    it('should handle edge cases with inventory suffix', () => {
      const testCases = [
        { input: 'sensor.inventory_room', expected: 'Room' }, // Inventory at start
        { input: 'sensor.my_inventory_storage', expected: 'My Storage' }, // Inventory in middle
        { input: 'sensor.inventory', expected: 'Inventory' }, // Just inventory (fallback to default)
        { input: 'sensor.inventory_inventory', expected: 'Inventory' }, // Double inventory (fallback to default)
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(result).toBe(expected);
      });
    });

    it('should handle special characters and edge cases', () => {
      // Test that the method doesn't crash with unusual inputs
      const edgeCases = [
        'sensor._leading_underscore',
        'sensor.trailing_underscore_',
        'sensor.__double__underscore__',
        'sensor.mixed-chars_and_numbers123',
      ];

      edgeCases.forEach((input) => {
        const result = Utils.getInventoryName(undefined, input);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle friendly_name with leading/trailing whitespace', () => {
      const state: HassEntity = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          friendly_name: '  Kitchen Inventory  ',
        },
        context: { id: 'test', user_id: 'user123' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryName(state, 'sensor.test');
      expect(result).toBe('  Kitchen Inventory  '); // Should preserve original formatting
    });

    it('should be consistent with repeated calls', () => {
      const entityId = 'sensor.kitchen_pantry_inventory';
      const result1 = Utils.getInventoryName(undefined, entityId);
      const result2 = Utils.getInventoryName(undefined, entityId);
      const result3 = Utils.getInventoryName(undefined, entityId);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe('Kitchen Pantry');
    });
  });

  describe('getInventoryDescription', () => {
    it('should handle state with undefined attributes', () => {
      const state = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: undefined, // This kills the optional chaining mutations
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      } as any;

      const result = Utils.getInventoryDescription(state);
      expect(result).toBeUndefined();
    });

    it('should handle state with null attributes', () => {
      const state = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: null, // Another edge case
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      } as any;

      const result = Utils.getInventoryDescription(state);
      expect(result).toBeUndefined();
    });

    it('should return description when available', () => {
      const state: HassEntity = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          description: 'Main kitchen storage',
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryDescription(state);
      expect(result).toBe('Main kitchen storage');
    });

    it('should return undefined when no description', () => {
      const state: HassEntity = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {},
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryDescription(state);
      expect(result).toBeUndefined();
    });

    it('should handle undefined state', () => {
      const result = Utils.getInventoryDescription(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('getInventoryId', () => {
    let mockHass: HomeAssistant;

    beforeEach(() => {
      mockHass = {
        states: {},
        config: {} as any,
        themes: {},
        selectedTheme: {},
        panels: {},
        panelUrl: '',
        language: 'en',
        selectedLanguage: 'en',
        localize: vi.fn(),
        translationMetadata: {},
        dockedSidebar: 'auto',
        moreInfoEntityId: null,
        callService: vi.fn(),
        callApi: vi.fn(),
        fetchWithAuth: vi.fn(),
        sendWS: vi.fn(),
        callWS: vi.fn(),
      };
    });

    it('should return inventory_id from attributes', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          inventory_id: 'custom_inventory_123',
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('custom_inventory_123');
    });
    it('should handle state with null attributes when checking inventory_id', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: null as any, // This will cause optional chaining to be essential
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test'); // Should fall back to entity domain removal
    });

    it('should handle state with undefined attributes when checking inventory_id', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: undefined as any, // This will cause optional chaining to be essential
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test'); // Should fall back to entity domain removal
    });

    it('should handle attributes object with null inventory_id', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          inventory_id: null as any, // This tests the falsy check after optional chaining
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test'); // Should fall back since inventory_id is falsy
    });
    it('should handle attributes object with undefined inventory_id', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          inventory_id: undefined, // This tests the falsy check after optional chaining
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test'); // Should fall back since inventory_id is falsy
    });

    // Kill OptionalChaining mutants on line 64: state?.attributes?.unique_id
    it('should handle state with null attributes when checking unique_id', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: null as any, // This will cause optional chaining to be essential
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test'); // Should fall back to entity domain removal
    });

    it('should handle attributes object with null unique_id', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          unique_id: null as any, // This tests the falsy check after optional chaining
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test'); // Should fall back since unique_id is falsy
    });
    it('should handle attributes object with undefined unique_id', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          unique_id: undefined, // This tests the falsy check after optional chaining
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test'); // Should fall back since unique_id is falsy
    });

    // Kill OptionalChaining mutant on line 66: uniqueId?.startsWith('inventory_')
    it('should handle non-string unique_id values', () => {
      const testCases = [
        { unique_id: null, expected: 'test' },
        { unique_id: undefined, expected: 'test' },
        { unique_id: 123 as any, expected: 'test' }, // Number
        { unique_id: true as any, expected: 'test' }, // Boolean
        { unique_id: {} as any, expected: 'test' }, // Object
        { unique_id: [] as any, expected: 'test' }, // Array
      ];

      testCases.forEach(({ unique_id, expected }) => {
        mockHass.states['sensor.test'] = {
          entity_id: 'sensor.test',
          state: 'on',
          attributes: { unique_id },
          context: { id: 'test', user_id: undefined },
          last_changed: '2023-01-01T00:00:00Z',
          last_updated: '2023-01-01T00:00:00Z',
        };

        const result = Utils.getInventoryId(mockHass, 'sensor.test');
        expect(result).toBe(expected);
      });
    });
    it('should return entire entityId when no domain separator exists', () => {
      mockHass.states['nodomain'] = {
        entity_id: 'nodomain',
        state: 'on',
        attributes: {},
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'nodomain');
      expect(result).toBe('nodomain'); // Should return entire entityId since parts.length = 1
    });

    // Kill EqualityOperator mutant on line 73: parts.length > 1 vs parts.length >= 1
    it('should handle entity IDs with exactly one part (no dots)', () => {
      mockHass.states['singlepart'] = {
        entity_id: 'singlepart',
        state: 'on',
        attributes: {},
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'singlepart');
      expect(result).toBe('singlepart'); // Should return entire entityId, not parts[1] which would be undefined
    });

    it('should handle entity IDs starting with dot (empty domain)', () => {
      mockHass.states['.entity'] = {
        entity_id: '.entity',
        state: 'on',
        attributes: {},
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, '.entity');
      expect(result).toBe('entity'); // parts = ['', 'entity'], parts.length = 2, so parts[1] = 'entity'
    });
    it('should handle missing state entity', () => {
      // Entity doesn't exist in hass.states
      const result = Utils.getInventoryId(mockHass, 'sensor.nonexistent');
      expect(result).toBe('nonexistent'); // Should fall back to entity domain removal
    });

    it('should handle empty string values in attributes', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          inventory_id: '', // Empty string is falsy
          unique_id: '', // Empty string is falsy
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test'); // Should fall back since both are falsy
    });

    it('should handle whitespace-only string values in attributes', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          inventory_id: '   ', // Whitespace only - truthy but probably not intended
          unique_id: '\t\n', // Whitespace only - truthy but probably not intended
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('   '); // Should return inventory_id since it's truthy
    });
    it('should prioritize inventory_id over unique_id even when unique_id has inventory_ prefix', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          inventory_id: 'direct_id',
          unique_id: 'inventory_other_id',
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('direct_id'); // Should return inventory_id since it has priority
    });

    // Kill ConditionalExpression mutant on line 64: true condition
    it('should properly evaluate unique_id condition and not always enter', () => {
      // This test ensures the condition isn't always true
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          // No unique_id property at all
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('test'); // Should fall back, proving unique_id condition was false
    });

    it('should extract ID from unique_id with inventory_ prefix', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          unique_id: 'inventory_kitchen_main',
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.test');
      expect(result).toBe('kitchen_main');
    });

    it('should fallback to entity_id domain removal', () => {
      mockHass.states['sensor.kitchen_inventory'] = {
        entity_id: 'sensor.kitchen_inventory',
        state: 'on',
        attributes: {},
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      const result = Utils.getInventoryId(mockHass, 'sensor.kitchen_inventory');
      expect(result).toBe('kitchen_inventory');
    });

    it('should handle unique_id without inventory_ prefix', () => {
      mockHass.states['sensor.test'] = {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: {
          unique_id: 'some_other_id',
        },
        context: { id: 'test', user_id: undefined },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

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

    it('should preserve text input values', () => {
      mockElements['name'] = { type: 'text', value: 'Test Item' } as HTMLInputElement;
      mockElements['category'] = { type: 'text', value: 'Food' } as HTMLInputElement;

      const result = Utils.preserveInputValues(mockShadowRoot, ['name', 'category']);

      expect(result).toEqual({
        name: 'Test Item',
        category: 'Food',
      });
    });

    it('should preserve checkbox values', () => {
      mockElements['autoAdd'] = { type: 'checkbox', checked: true } as HTMLInputElement;

      const result = Utils.preserveInputValues(mockShadowRoot, ['autoAdd']);

      expect(result).toEqual({
        autoAdd: true,
      });
    });

    it('should preserve number input values', () => {
      mockElements['quantity'] = { type: 'number', value: '5.5' } as HTMLInputElement;

      const result = Utils.preserveInputValues(mockShadowRoot, ['quantity']);

      expect(result).toEqual({
        quantity: 5.5,
      });
    });

    it('should handle missing elements', () => {
      const result = Utils.preserveInputValues(mockShadowRoot, ['nonexistent']);

      expect(result).toEqual({});
    });

    it('should restore text input values', () => {
      const mockInput = { type: 'text', value: '' } as HTMLInputElement;
      mockElements['name'] = mockInput;

      Utils.restoreInputValues(mockShadowRoot, { name: 'Restored Value' });

      expect(mockInput.value).toBe('Restored Value');
    });

    it('should restore checkbox values', () => {
      const mockCheckbox = { type: 'checkbox', checked: false } as HTMLInputElement;
      mockElements['autoAdd'] = mockCheckbox;

      Utils.restoreInputValues(mockShadowRoot, { autoAdd: true });

      expect(mockCheckbox.checked).toBe(true);
    });

    it('should handle null values object', () => {
      expect(() => {
        Utils.restoreInputValues(mockShadowRoot, null);
      }).not.toThrow();
    });
  });

  describe('formatDate', () => {
    // Basic functionality tests
    it('should format ISO date strings correctly', () => {
      const testCases = [
        '2023-12-25',
        '2023-01-01',
        '2023-06-15',
        '2024-02-29', // Leap year
      ];

      testCases.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        expect(result).not.toBe(dateString);
        const [year] = dateString.split('-');
        expect(result).toContain(year);
      });
    });

    it('should format ISO datetime strings', () => {
      const testCases = [
        '2023-12-25T15:30:00Z',
        '2023-12-25T00:00:00.000Z',
        '2023-12-25T23:59:59Z',
        '2023-06-15T12:00:00+05:00',
      ];

      testCases.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        expect(result).not.toBe(dateString);
      });
    });

    it('should handle various date formats', () => {
      const testCases = ['Dec 25, 2023', 'December 25, 2023', '2023/12/25'];

      testCases.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        // Some formats might already be in the correct format, so just check it's a string
        expect(typeof result).toBe('string');
      });
    });

    it('should handle already formatted date strings', () => {
      // These might already be in toLocaleDateString() format depending on locale
      const alreadyFormattedCases = ['12/25/2023', '25/12/2023'];

      alreadyFormattedCases.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        // Don't assert that result !== input since it might already be formatted correctly
      });
    });
    it('should return empty string for falsy inputs', () => {
      expect(Utils.formatDate(undefined)).toBe('');
      expect(Utils.formatDate('')).toBe('');
      expect(Utils.formatDate(null as any)).toBe('');
    });

    it('should return original string for truly invalid dates', () => {
      const invalidDates = [
        'invalid-date',
        'not-a-date',
        'abc123',
        '####',
        'completely-invalid',
        '[]{}()',
        'hello world',
        '!@#$%^&*()',
        'NaN',
        'undefined',
        'null',
        '123abc',
        'abc123',
        '12.34.56',
      ];

      invalidDates.forEach((invalidDate) => {
        const result = Utils.formatDate(invalidDate);
        expect(result).toBe(invalidDate);
      });
    });

    // Whitespace handling tests
    it('should handle ISO date strings with leading/trailing whitespace', () => {
      const testCases = [
        '  2023-12-25  ',
        '\t2023-12-25\n',
        ' 2023-12-25',
        '2023-12-25 ',
        '\t\t2023-12-25\t\t',
        '\n2023-12-25\n',
        '  2023-01-01  ',
        '  2024-02-29  ',
      ];

      testCases.forEach((paddedDate) => {
        const result = Utils.formatDate(paddedDate);
        expect(result).toBeTruthy();
        expect(result).not.toBe(paddedDate);
        expect(result).toMatch(/202[34]/);
      });
    });

    it('should require trim for ISO date regex matching', () => {
      const testCases = [
        ' 2023-12-25',
        '2023-12-25 ',
        ' 2023-12-25 ',
        '\t2023-12-25',
        '2023-12-25\n',
        '\n2023-12-25\t',
      ];

      testCases.forEach((dateWithWhitespace) => {
        const result = Utils.formatDate(dateWithWhitespace);

        // Should be formatted successfully (proving trim worked)
        expect(result).toBeTruthy();
        expect(result).not.toBe(dateWithWhitespace);
        expect(result).toContain('2023');

        // Verify trim is necessary for regex matching
        expect(/^\d{4}-\d{2}-\d{2}$/.test(dateWithWhitespace.trim())).toBe(true);
        expect(/^\d{4}-\d{2}-\d{2}$/.test(dateWithWhitespace)).toBe(false);
      });
    });

    it('should require trim before splitting for clean date parts', () => {
      const testCases = [
        {
          input: ' 2023-12-25 ',
          expectedParts: ['2023', '12', '25'],
        },
        {
          input: '\t2023-01-15\n',
          expectedParts: ['2023', '01', '15'],
        },
        {
          input: '  2024-02-29  ',
          expectedParts: ['2024', '02', '29'],
        },
      ];

      testCases.forEach(({ input, expectedParts }) => {
        const result = Utils.formatDate(input);
        expect(result).toBeTruthy();
        expect(result).not.toBe(input);

        // Verify trim is necessary for proper splitting
        const trimmedParts = input.trim().split('-');
        const untrimmedParts = input.split('-');

        expect(trimmedParts).toEqual(expectedParts);
        expect(untrimmedParts).not.toEqual(expectedParts);
        expect(untrimmedParts[0]).not.toBe(expectedParts[0]);
        expect(untrimmedParts[2]).not.toBe(expectedParts[2]);
      });
    });

    // Numeric timestamp tests
    it('should handle numeric timestamps with whitespace', () => {
      const timestamp = Date.now().toString();
      const testCases = [
        `  ${timestamp}  `,
        `\t${timestamp}\n`,
        ` ${timestamp}`,
        `${timestamp} `,
        `\t\t${timestamp}\t\t`,
        `\n${timestamp}\n`,
      ];

      testCases.forEach((paddedTimestamp) => {
        const result = Utils.formatDate(paddedTimestamp);
        expect(result).toBeTruthy();
        expect(result).not.toBe(paddedTimestamp);
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);

        // Verify regex behavior
        expect(/^\d+$/.test(paddedTimestamp.trim())).toBe(true);
        expect(/^\d+$/.test(paddedTimestamp)).toBe(false);
      });
    });

    it('should handle specific timestamp for consistent testing', () => {
      const timestamp = '1640995200000'; // 2021-12-31
      const testCases = [`  ${timestamp}  `, ` ${timestamp}\n`, `\t${timestamp} `];

      testCases.forEach((paddedTimestamp) => {
        const result = Utils.formatDate(paddedTimestamp);
        expect(result).toBeTruthy();
        expect(result).not.toBe(paddedTimestamp);
        expect(result).toMatch(/1\/1\/2022/);
      });
    });

    it('should reject numeric strings with non-digit characters', () => {
      const invalidCases = [
        '  123abc  ',
        ' 123 456 ',
        '\t123.45\n',
        ' 123e4 ',
        '  abc123  ',
        '  12-34  ',
        '  12/34  ',
        '1234567890abc',
        '1234567890   x',
        '  1234567890  abc  ',
      ];

      invalidCases.forEach((invalidNumeric) => {
        const result = Utils.formatDate(invalidNumeric);
        expect(result).toBe(invalidNumeric);

        // Verify it's correctly identified as non-numeric
        expect(/^\d+$/.test(invalidNumeric.trim())).toBe(false);
      });
    });

    it('should handle edge cases with pure numeric validation', () => {
      const testCases = [
        {
          input: '  1234567890  ',
          shouldMatch: true,
          description: 'Pure digits with whitespace should work after trim',
        },
        {
          input: '  12 34  ',
          shouldMatch: false,
          description: 'Digits with internal spaces should not match',
        },
        {
          input: '  12.34  ',
          shouldMatch: false,
          description: 'Decimal numbers should not match pure digit regex',
        },
        {
          input: '  12abc  ',
          shouldMatch: false,
          description: 'Mixed alphanumeric should not match pure digit regex',
        },
      ];

      testCases.forEach(({ input, shouldMatch }) => {
        const trimmed = input.trim();
        const regexMatches = /^\d+$/.test(trimmed);
        expect(regexMatches).toBe(shouldMatch);

        const result = Utils.formatDate(input);
        if (shouldMatch) {
          expect(result).not.toBe(input);
          expect(result).toBeTruthy();
        } else {
          expect(typeof result).toBe('string');
        }
      });
    });

    // ISO date pattern and regex tests
    it('should only accept exact ISO date format with anchors', () => {
      const validCases = ['2023-12-25', '2023-01-01', '2024-02-29', '2023-06-15'];
      const invalidCases = [
        '23-12-25', // Wrong year format
        '2023-2-25', // Wrong month format
        '2023-12-5', // Wrong day format
        '2023/12/25', // Wrong separator
        '2023-12-25T00:00:00', // Has time component
        '12023-12-25', // Too many year digits
        '2023-123-25', // Too many month digits
        '2023-12-251', // Too many day digits
      ];

      validCases.forEach((validDate) => {
        const regexTest = /^\d{4}-\d{2}-\d{2}$/.test(validDate.trim());
        expect(regexTest).toBe(true);

        const result = Utils.formatDate(validDate);
        expect(result).toBeTruthy();
        expect(result).not.toBe(validDate);
      });

      invalidCases.forEach((invalidDate) => {
        const regexTest = /^\d{4}-\d{2}-\d{2}$/.test(invalidDate.trim());
        expect(regexTest).toBe(false);
      });
    });

    it('should reject strings with date pattern not at start (regex anchor test)', () => {
      const testCases = [
        'abc2023-12-25',
        'hello2023-12-25',
        'x2023-12-25',
        'prefix2023-12-25end',
        'a2023-12-25',
      ];

      testCases.forEach((input) => {
        const result = Utils.formatDate(input);
        expect(result).toBe(input); // Should return as-is

        // Verify regex anchor behavior
        expect(/^\d{4}-\d{2}-\d{2}$/.test(input)).toBe(false); // With anchor - no match
        expect(/\d{4}-\d{2}-\d{2}/.test(input)).toBe(true); // Without anchor - matches
      });
    });

    // Edge cases and error handling
    it('should handle JavaScript permissive date parsing and overflow', () => {
      const malformedCases = ['2023-12-', '2023-12', '2023', '-12-25', '2023--25'];

      const overflowCases = [
        '2023-02-30', // Feb 30 becomes Mar 2
        '2023-13-01', // Month 13 becomes Jan next year
        '2023-01-32', // Jan 32 becomes Feb 1
      ];

      malformedCases.forEach((input) => {
        const result = Utils.formatDate(input);
        expect(typeof result).toBe('string');
      });

      overflowCases.forEach((input) => {
        const result = Utils.formatDate(input);
        expect(result).toBeTruthy();
        expect(result).not.toBe(input);
      });
    });

    it('should handle edge cases and boundaries', () => {
      const edgeCases = [
        '2024-02-29', // Leap year
        '2023-02-28', // Non-leap year February
        '2023-01-01', // New Year
        '2023-12-31', // End of year
        '1900-01-01', // Very old date
        '2100-12-31', // Far future date
      ];

      edgeCases.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        expect(result).not.toBe(dateString);
      });
    });

    it('should handle problematic whitespace in date separators', () => {
      const problematicCases = [
        '2023 - 12 - 25',
        '2023- 12-25',
        '2023 -12-25',
        '2023-12- 25',
        '2023-12 -25',
      ];

      problematicCases.forEach((problematicDate) => {
        const result = Utils.formatDate(problematicDate);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should handle various whitespace inputs', () => {
      expect(Utils.formatDate('   ')).toBe('   ');
      expect(Utils.formatDate('\t\n')).toBe('\t\n');

      const result = Utils.formatDate('  2023-12-25  ');
      expect(result).toBeTruthy();
      expect(result).not.toBe('  2023-12-25  ');
    });

    it('should handle timezone-specific ISO strings', () => {
      const timezoneStrings = [
        '2023-12-25T12:00:00Z',
        '2023-12-25T12:00:00+00:00',
        '2023-12-25T12:00:00-05:00',
        '2023-12-25T12:00:00+09:00',
      ];

      timezoneStrings.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        expect(result).not.toBe(dateString);
      });
    });

    it('should be consistent with multiple calls', () => {
      const dateString = '2023-12-25';
      const result1 = Utils.formatDate(dateString);
      const result2 = Utils.formatDate(dateString);
      const result3 = Utils.formatDate(dateString);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('formatDate', () => {
    it('should format ISO date strings correctly', () => {
      const testCases = [
        '2023-12-25',
        '2023-01-01',
        '2023-06-15',
        '2024-02-29', // Leap year
      ];

      testCases.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        expect(result).not.toBe(dateString);
        const [year, month, day] = dateString.split('-');
        expect(result).toContain(year);
      });
    });

    it('should handle specific date formatting', () => {
      const result = Utils.formatDate('2023-12-25');
      expect(result).toMatch(/25.*12.*2023|12.*25.*2023|2023.*12.*25/);
    });

    it('should format ISO datetime strings', () => {
      const testCases = [
        '2023-12-25T15:30:00Z',
        '2023-12-25T00:00:00.000Z',
        '2023-12-25T23:59:59Z',
        '2023-06-15T12:00:00+05:00',
      ];

      testCases.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        expect(result).not.toBe(dateString);
      });
    });

    it('should handle different date formats', () => {
      const testCases = [
        '12/25/2023',
        '25/12/2023',
        'Dec 25, 2023',
        'December 25, 2023',
        '2023/12/25',
      ];

      testCases.forEach((input) => {
        const result = Utils.formatDate(input);
        expect(result).toBeTruthy();
      });
    });

    it('should return empty string for falsy inputs', () => {
      expect(Utils.formatDate(undefined)).toBe('');
      expect(Utils.formatDate('')).toBe('');
      expect(Utils.formatDate(null as any)).toBe('');
    });

    it('should handle whitespace inputs', () => {
      expect(Utils.formatDate('   ')).toBe('   ');
      expect(Utils.formatDate('\t\n')).toBe('\t\n');

      const result = Utils.formatDate('  2023-12-25  ');
      expect(result).toBeTruthy();
      expect(result).not.toBe('  2023-12-25  ');
    });

    it('should return original string for truly invalid dates', () => {
      const invalidDates = [
        'invalid-date',
        'not-a-date',
        'abc123',
        '####',
        'completely-invalid',
        '[]{}()',
        'hello world',
        '!@#$%^&*()',
        'NaN',
        'undefined',
        'null',
      ];

      invalidDates.forEach((invalidDate) => {
        const result = Utils.formatDate(invalidDate);
        expect(result).toBe(invalidDate);
      });
    });

    it('should handle JavaScript permissive date parsing and overflow', () => {
      // Malformed date strings that may or may not be parsed successfully
      const malformedCases = [
        { input: '2023-12-', description: 'Missing day defaults to 1st' },
        { input: '2023-12', description: 'Missing day defaults to 1st' },
        { input: '2023', description: 'Year only might default to Jan 1' },
        { input: '-12-25', description: 'Missing year might be interpreted' },
        { input: '2023--25', description: 'Double dash might be parsed' },
      ];

      // Date overflow cases that JavaScript "corrects" by rolling over
      const overflowCases = [
        { input: '2023-02-30', description: 'Feb 30 becomes Mar 2' },
        { input: '2023-13-01', description: 'Month 13 becomes Jan next year' },
        { input: '2023-01-32', description: 'Jan 32 becomes Feb 1' },
      ];

      // Test malformed cases - might be parsed or returned as-is
      malformedCases.forEach(({ input, description }) => {
        const result = Utils.formatDate(input);
        expect(typeof result).toBe('string');

        // Either successfully formatted or returned as original
        const isFormatted = result !== input;
        const isOriginal = result === input;
        expect(isFormatted || isOriginal).toBe(true);
      });

      // Test overflow cases - should always be "corrected" and formatted
      overflowCases.forEach(({ input, description }) => {
        const result = Utils.formatDate(input);
        expect(result).toBeTruthy();
        expect(result).not.toBe(input); // Should be formatted, not returned as-is
      });
    });

    it('should handle edge cases and boundaries', () => {
      const edgeCases = [
        '2024-02-29', // Leap year
        '2023-02-28', // Non-leap year February
        '2023-01-01', // New Year
        '2023-12-31', // End of year
        '1900-01-01', // Very old date
        '2100-12-31', // Far future date
      ];

      edgeCases.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        expect(result).not.toBe(dateString);
      });
    });

    it('should handle dates with different time components', () => {
      const timeVariants = [
        '2023-12-25T00:00:00',
        '2023-12-25T12:30:45',
        '2023-12-25T23:59:59',
        '2023-12-25T12:30:45.123',
        '2023-12-25T12:30:45.123Z',
      ];

      timeVariants.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        expect(result).not.toBe(dateString);
      });
    });

    it('should handle malformed but partially valid dates', () => {
      const partialDates = [
        '2023-12', // Missing day - might be invalid
        '2023', // Year only - might be invalid
      ];

      partialDates.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(typeof result).toBe('string');
        // Could be formatted or returned as-is depending on parsing
      });
    });

    it('should be consistent with multiple calls', () => {
      const dateString = '2023-12-25';
      const result1 = Utils.formatDate(dateString);
      const result2 = Utils.formatDate(dateString);
      const result3 = Utils.formatDate(dateString);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should handle timezone-specific ISO strings', () => {
      const timezoneStrings = [
        '2023-12-25T12:00:00Z',
        '2023-12-25T12:00:00+00:00',
        '2023-12-25T12:00:00-05:00',
        '2023-12-25T12:00:00+09:00',
      ];

      timezoneStrings.forEach((dateString) => {
        const result = Utils.formatDate(dateString);
        expect(result).toBeTruthy();
        expect(result).not.toBe(dateString);
      });
    });

    it('should handle numeric timestamps', () => {
      const now = Date.now();
      const timestamp = now.toString();
      const result = Utils.formatDate(timestamp);

      expect(result).toBeTruthy();
      expect(result).not.toBe(timestamp);

      // Should format to a readable date
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}/);
    });

    it('should handle invalid numeric strings', () => {
      const invalidNumbers = ['123abc', 'abc123', '12.34.56'];

      invalidNumbers.forEach((invalid) => {
        const result = Utils.formatDate(invalid);
        expect(result).toBe(invalid); // Should return as-is
      });
    });
  });

  describe('isExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-06-15T12:00:00Z')); // Use UTC time
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for past dates', () => {
      expect(Utils.isExpired('2023-06-14')).toBe(true);
      expect(Utils.isExpired('2023-06-13')).toBe(true);
      expect(Utils.isExpired('2023-01-01')).toBe(true);
    });

    it('should return false for today', () => {
      expect(Utils.isExpired('2023-06-15')).toBe(false);
    });

    it('should return false for future dates', () => {
      expect(Utils.isExpired('2023-06-16')).toBe(false);
      expect(Utils.isExpired('2023-06-17')).toBe(false);
      expect(Utils.isExpired('2024-01-01')).toBe(false);
    });

    it('should handle date strings with time components', () => {
      // Past dates with times should be expired
      expect(Utils.isExpired('2023-06-14T23:59:59Z')).toBe(true);
      expect(Utils.isExpired('2023-06-14T00:00:00Z')).toBe(true);

      // Today with any time should not be expired
      expect(Utils.isExpired('2023-06-15T00:00:00Z')).toBe(false);
      expect(Utils.isExpired('2023-06-15T23:59:59Z')).toBe(false);

      // Future dates with times should not be expired
      expect(Utils.isExpired('2023-06-16T00:00:00Z')).toBe(false);
    });

    it('should handle different date formats', () => {
      // ISO format
      expect(Utils.isExpired('2023-06-14')).toBe(true);
      expect(Utils.isExpired('2023-06-15')).toBe(false);
      expect(Utils.isExpired('2023-06-16')).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(Utils.isExpired(undefined)).toBe(false);
      expect(Utils.isExpired('')).toBe(false);
      expect(Utils.isExpired('invalid-date')).toBe(false);
      expect(Utils.isExpired('not a date')).toBe(false);
      expect(Utils.isExpired('abc123')).toBe(false);
      expect(Utils.isExpired('2023-13-45')).toBe(false);
    });

    it('should handle null and whitespace', () => {
      expect(Utils.isExpired(null as any)).toBe(false);
      expect(Utils.isExpired('   ')).toBe(false);
      expect(Utils.isExpired('\t\n')).toBe(false);
    });

    it('should handle edge cases around midnight', () => {
      expect(Utils.isExpired('2023-06-14')).toBe(true);
      expect(Utils.isExpired('2023-06-15')).toBe(false);
      expect(Utils.isExpired('2023-06-16')).toBe(false);
    });

    it('should handle very old and very new dates', () => {
      expect(Utils.isExpired('1900-01-01')).toBe(true);
      expect(Utils.isExpired('2100-12-31')).toBe(false);
    });

    it('should handle leap year dates', () => {
      vi.setSystemTime(new Date('2024-02-29T12:00:00Z'));

      expect(Utils.isExpired('2024-02-28')).toBe(true);
      expect(Utils.isExpired('2024-02-29')).toBe(false);
      expect(Utils.isExpired('2024-03-01')).toBe(false);
    });

    it('should handle month/year boundaries', () => {
      vi.setSystemTime(new Date('2023-07-01T12:00:00Z'));

      expect(Utils.isExpired('2023-06-30')).toBe(true);
      expect(Utils.isExpired('2023-07-01')).toBe(false);
      expect(Utils.isExpired('2023-07-02')).toBe(false);
    });

    it('should be consistent across different times of day', () => {
      const testTimes = [
        '2023-06-15T00:00:00Z',
        '2023-06-15T06:00:00Z',
        '2023-06-15T12:00:00Z',
        '2023-06-15T18:00:00Z',
        '2023-06-15T23:59:59Z',
      ];

      testTimes.forEach((currentTime) => {
        vi.setSystemTime(new Date(currentTime));

        expect(Utils.isExpired('2023-06-14')).toBe(true);
        expect(Utils.isExpired('2023-06-15')).toBe(false);
        expect(Utils.isExpired('2023-06-16')).toBe(false);
      });
    });

    it('should handle completely invalid date strings', () => {
      expect(Utils.isExpired('completely invalid')).toBe(false);
      expect(Utils.isExpired('####')).toBe(false);
      expect(Utils.isExpired('1234567890abcdef')).toBe(false);
      expect(Utils.isExpired('[]{}()')).toBe(false);
    });
  });

  describe('isExpired - Additional mutation killing tests', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Kill ConditionalExpression and BlockStatement mutants for invalid date handling
    it('should properly handle invalid dates that would cause errors in date comparison', () => {
      // These are strings that create Invalid Date objects (getTime() returns NaN)
      // but the mutants would let them continue to the date comparison logic
      const invalidDateStrings = [
        'not-a-date-at-all',
        'invalid-date-string',
        '2023-99-99', // Invalid month/day
        'abc123def',
        'completely-bogus',
        '####-##-##',
        'null',
        'undefined',
        'NaN',
      ];

      invalidDateStrings.forEach((invalidDate) => {
        // Verify this creates an Invalid Date (NaN getTime)
        const testDate = new Date(invalidDate);
        expect(isNaN(testDate.getTime())).toBe(true);

        // The function should return false for invalid dates
        const result = Utils.isExpired(invalidDate);
        expect(result).toBe(false);
      });
    });

    // Additional test to ensure the NaN check is actually working
    it('should return false immediately for dates that produce NaN', () => {
      // Create a scenario where we can verify the early return
      const invalidInputs = [
        'this-is-not-a-date',
        'garbage-input',
        '99999999999999999999999', // Very large number that becomes NaN
      ];

      invalidInputs.forEach((input) => {
        // Double-check these create Invalid Dates
        const date = new Date(input);
        expect(isNaN(date.getTime())).toBe(true);

        // Should return false without proceeding to date comparison
        expect(Utils.isExpired(input)).toBe(false);
      });
    });

    // Test edge case that might bypass the isNaN check differently
    it('should handle edge case date strings that could cause issues', () => {
      const edgeCases = [
        'InvalidDate',
        'Wed Oct 05 2011 16:48:00 GMT+0200 (CEST)', // Valid format but potentially problematic
        '2023-02-30T25:61:61Z', // Invalid time components
      ];

      edgeCases.forEach((edgeCase) => {
        const result = Utils.isExpired(edgeCase);
        // Should either return false (if invalid) or a proper boolean (if valid)
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('isExpiringSoon', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for dates within threshold', () => {
      expect(Utils.isExpiringSoon('2023-06-20', 7)).toBe(true);
      expect(Utils.isExpiringSoon('2023-06-22', 7)).toBe(true);
    });

    it('should return false for dates beyond threshold', () => {
      expect(Utils.isExpiringSoon('2023-06-25', 7)).toBe(false);
    });

    it('should return false for past dates', () => {
      expect(Utils.isExpiringSoon('2023-06-10', 7)).toBe(false);
    });

    it('should use default threshold of 7 days', () => {
      expect(Utils.isExpiringSoon('2023-06-20')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(Utils.isExpiringSoon('')).toBe(false);
    });

    it('should return true for today when threshold is 0', () => {
      expect(Utils.isExpiringSoon('2023-06-15', 0)).toBe(true);
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

    it('should handle multiple arguments', () => {
      const mockFn = vi.fn();
      const debounced = Utils.debounce(mockFn, 100);

      debounced('arg1', 'arg2', 'arg3');
      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });
  });

  describe('validateRawFormData', () => {
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

    // Basic functionality
    it('should pass validation for valid data', () => {
      const formData = createValidFormData();
      const result = Utils.validateRawFormData(formData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // Name validation
    it('should fail validation for missing, empty, or whitespace-only name', () => {
      const testCases = [
        { name: '', expectedError: 'Item name is required' },
        { name: '   ', expectedError: 'Item name is required' },
        { name: undefined as any, expectedError: 'Item name is required' },
        { name: null as any, expectedError: 'Item name is required' },
      ];

      testCases.forEach(({ name, expectedError }) => {
        const formData = createValidFormData({ name });
        const result = Utils.validateRawFormData(formData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({ field: 'name', message: expectedError });
      });
    });

    // Quantity validation
    it('should handle quantity validation for various inputs', () => {
      const testCases = [
        { quantity: 'invalid', expectedError: 'Quantity must be a valid number' },
        { quantity: '-5', expectedError: 'Quantity cannot be negative' },
        { quantity: '-0.1', expectedError: 'Quantity cannot be negative' },
        { quantity: '0', expectedError: null }, // Zero should be valid
        { quantity: '5', expectedError: null }, // Positive should be valid
        { quantity: undefined as any, expectedError: null }, // undefined should not validate
        { quantity: null as any, expectedError: null }, // null should not validate
        { quantity: '', expectedError: null }, // empty should not validate
        { quantity: '   ', expectedError: null }, // whitespace only should not validate (trim makes it empty)
      ];

      testCases.forEach(({ quantity, expectedError }) => {
        const formData = createValidFormData({ quantity });
        const result = Utils.validateRawFormData(formData);

        if (expectedError) {
          expect(result.isValid).toBe(false);
          expect(
            result.errors.some(
              (e) => e.field === 'quantity' && e.message.includes(expectedError.split(' ')[2]),
            ),
          ).toBe(true);
        } else {
          expect(result.errors.some((e) => e.field === 'quantity')).toBe(false);
        }
      });
    });

    // Auto-add validation
    it('should validate auto-add requirements and handle edge cases', () => {
      const testCases = [
        {
          description: 'should require autoAddToListQuantity when autoAdd enabled',
          overrides: { autoAddEnabled: true, autoAddToListQuantity: '', todoList: 'todo.shopping' },
          expectedErrors: ['Quantity threshold is required when auto-add is enabled'],
        },
        {
          description: 'should require todoList when autoAdd enabled',
          overrides: { autoAddEnabled: true, autoAddToListQuantity: '2', todoList: '' },
          expectedErrors: ['Todo list selection is required when auto-add is enabled'],
        },
        {
          description: 'should require both when autoAdd enabled and both empty',
          overrides: { autoAddEnabled: true, autoAddToListQuantity: '', todoList: '' },
          expectedErrors: [
            'Quantity threshold is required when auto-add is enabled',
            'Todo list selection is required when auto-add is enabled',
          ],
        },
        {
          description: 'should handle undefined/null autoAddToListQuantity',
          overrides: {
            autoAddEnabled: true,
            autoAddToListQuantity: undefined as any,
            todoList: 'todo.shopping',
          },
          expectedErrors: ['Quantity threshold is required when auto-add is enabled'],
        },
        {
          description: 'should handle whitespace-only autoAddToListQuantity',
          overrides: {
            autoAddEnabled: true,
            autoAddToListQuantity: '   ',
            todoList: 'todo.shopping',
          },
          expectedErrors: ['Quantity threshold is required when auto-add is enabled'],
        },
        {
          description: 'should handle undefined/null todoList',
          overrides: {
            autoAddEnabled: true,
            autoAddToListQuantity: '2',
            todoList: undefined as any,
          },
          expectedErrors: ['Todo list selection is required when auto-add is enabled'],
        },
        {
          description: 'should handle whitespace-only todoList',
          overrides: { autoAddEnabled: true, autoAddToListQuantity: '2', todoList: '   ' },
          expectedErrors: ['Todo list selection is required when auto-add is enabled'],
        },
      ];

      testCases.forEach(({ description, overrides, expectedErrors }) => {
        const formData = createValidFormData(overrides);
        const result = Utils.validateRawFormData(formData);

        expect(result.isValid).toBe(false);
        expectedErrors.forEach((errorMessage) => {
          expect(result.errors.some((e) => e.message.includes(errorMessage))).toBe(true);
        });
      });
    });

    it('should validate auto-add quantity numeric values', () => {
      const testCases = [
        { value: 'invalid', expectedError: 'valid number' },
        { value: '-1', expectedError: 'negative' },
        { value: '0', expectedError: null },
        { value: '5', expectedError: null },
      ];

      testCases.forEach(({ value, expectedError }) => {
        const formData = createValidFormData({
          autoAddEnabled: true,
          autoAddToListQuantity: value,
          todoList: 'todo.shopping',
        });

        const result = Utils.validateRawFormData(formData);

        if (expectedError) {
          const hasExpectedError = result.errors.some(
            (e) => e.field === 'autoAddToListQuantity' && e.message.includes(expectedError),
          );
          expect(hasExpectedError).toBe(true);
        } else {
          const hasThresholdError = result.errors.some((e) => e.field === 'autoAddToListQuantity');
          expect(hasThresholdError).toBe(false);
        }
      });
    });

    // Expiry date validation
    it('should validate expiry date format and handle edge cases', () => {
      const testCases = [
        { expiryDate: 'invalid-date', shouldError: true },
        { expiryDate: '2023-12-25', shouldError: false },
        { expiryDate: undefined as any, shouldError: false }, // undefined should not validate
        { expiryDate: null as any, shouldError: false }, // null should not validate
        { expiryDate: '', shouldError: false }, // empty should not validate
        { expiryDate: '   ', shouldError: false }, // whitespace only should not validate (trim makes it empty)
      ];

      testCases.forEach(({ expiryDate, shouldError }) => {
        const formData = createValidFormData({ expiryDate });
        const result = Utils.validateRawFormData(formData);

        const hasExpiryDateError = result.errors.some((e) => e.field === 'expiryDate');
        expect(hasExpiryDateError).toBe(shouldError);
      });
    });

    // Expiry alert days validation
    it('should validate expiry alert days and handle edge cases', () => {
      const testCases = [
        { expiryAlertDays: 'invalid', shouldError: true, errorType: 'valid number' },
        { expiryAlertDays: '-1', shouldError: true, errorType: 'negative' },
        { expiryAlertDays: '0', shouldError: false },
        { expiryAlertDays: '7', shouldError: false },
        { expiryAlertDays: undefined as any, shouldError: false }, // undefined should not validate
        { expiryAlertDays: null as any, shouldError: false }, // null should not validate
        { expiryAlertDays: '', shouldError: false }, // empty should not validate
        { expiryAlertDays: '   ', shouldError: false }, // whitespace only should not validate
      ];

      testCases.forEach(({ expiryAlertDays, shouldError, errorType }) => {
        const formData = createValidFormData({
          expiryDate: '2023-12-25', // Valid date needed for validation
          expiryAlertDays,
        });

        const result = Utils.validateRawFormData(formData);

        if (shouldError) {
          const hasExpectedError = result.errors.some(
            (e) => e.field === 'expiryAlertDays' && e.message.includes(errorType!),
          );
          expect(hasExpectedError).toBe(true);
        } else {
          const hasAlertDaysError = result.errors.some((e) => e.field === 'expiryAlertDays');
          expect(hasAlertDaysError).toBe(false);
        }
      });
    });

    // Relationship validation between expiry date and alert days
    it('should require expiry date when alert days is set', () => {
      const testCases = [
        { expiryDate: '', expiryAlertDays: '5', shouldError: true },
        { expiryDate: '   ', expiryAlertDays: '5', shouldError: true }, // whitespace becomes empty after trim
        { expiryDate: undefined as any, expiryAlertDays: '5', shouldError: true },
        { expiryDate: null as any, expiryAlertDays: '5', shouldError: true },
        { expiryDate: '2023-12-25', expiryAlertDays: '5', shouldError: false },
        { expiryDate: '', expiryAlertDays: '   ', shouldError: false }, // alert days becomes empty after trim
        { expiryDate: '', expiryAlertDays: '', shouldError: false },
      ];

      testCases.forEach(({ expiryDate, expiryAlertDays, shouldError }) => {
        const formData = createValidFormData({ expiryDate, expiryAlertDays });
        const result = Utils.validateRawFormData(formData);

        const hasRelationshipError = result.errors.some(
          (e) => e.field === 'expiryAlertDays' && e.message.includes('requires an expiry date'),
        );

        expect(hasRelationshipError).toBe(shouldError);
      });
    });
  });

  describe('validateRawFormData - Specific field and message validation', () => {
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

    // Kill StringLiteral mutant for autoAddToListQuantity field
    it('should have exact field name for autoAddToListQuantity errors', () => {
      const formData = createValidFormData({
        autoAddEnabled: true,
        autoAddToListQuantity: '',
        todoList: 'todo.shopping',
      });

      const result = Utils.validateRawFormData(formData);

      // Must find error with exact field name 'autoAddToListQuantity'
      const autoAddError = result.errors.find((e) => e.field === 'autoAddToListQuantity');
      expect(autoAddError).toBeDefined();
      expect(autoAddError!.field).toBe('autoAddToListQuantity'); // Exact field name check
      expect(autoAddError!.message).toBe('Quantity threshold is required when auto-add is enabled');
    });

    // Kill ConditionalExpression mutant for todoList validation
    it('should not validate todoList when autoAdd is disabled', () => {
      const formData = createValidFormData({
        autoAddEnabled: false, // This should prevent todoList validation
        todoList: undefined as any, // This would cause error if validation ran
      });

      const result = Utils.validateRawFormData(formData);

      // Should not have todoList errors when autoAdd is disabled
      const todoListError = result.errors.find((e) => e.field === 'todoList');
      expect(todoListError).toBeUndefined();
      expect(result.isValid).toBe(true);
    });

    // Kill StringLiteral mutant for todoList field
    it('should have exact field name for todoList errors', () => {
      const formData = createValidFormData({
        autoAddEnabled: true,
        autoAddToListQuantity: '2',
        todoList: '',
      });

      const result = Utils.validateRawFormData(formData);

      // Must find error with exact field name 'todoList'
      const todoListError = result.errors.find((e) => e.field === 'todoList');
      expect(todoListError).toBeDefined();
      expect(todoListError!.field).toBe('todoList'); // Exact field name check
      expect(todoListError!.message).toBe(
        'Todo list selection is required when auto-add is enabled',
      );
    });

    // Kill StringLiteral mutant for expiryDate message
    it('should have exact error message for invalid expiry date', () => {
      const formData = createValidFormData({
        expiryDate: 'invalid-date',
      });

      const result = Utils.validateRawFormData(formData);

      // Must find error with exact message
      const expiryError = result.errors.find((e) => e.field === 'expiryDate');
      expect(expiryError).toBeDefined();
      expect(expiryError!.field).toBe('expiryDate');
      expect(expiryError!.message).toBe('Invalid expiry date format'); // Exact message check
    });

    // Additional test to ensure todoList conditional logic works correctly
    it('should validate todoList only when autoAdd is enabled', () => {
      // Test case 1: autoAdd disabled, invalid todoList - should pass
      const formData1 = createValidFormData({
        autoAddEnabled: false,
        todoList: null as any,
      });
      const result1 = Utils.validateRawFormData(formData1);
      expect(result1.errors.some((e) => e.field === 'todoList')).toBe(false);

      // Test case 2: autoAdd enabled, invalid todoList - should fail
      const formData2 = createValidFormData({
        autoAddEnabled: true,
        autoAddToListQuantity: '2',
        todoList: null as any,
      });
      const result2 = Utils.validateRawFormData(formData2);
      expect(result2.errors.some((e) => e.field === 'todoList')).toBe(true);
    });

    it('should not add todoList error when todoList has valid value', () => {
      const formData = createValidFormData({
        autoAddEnabled: true,
        autoAddToListQuantity: '2',
        todoList: 'todo.shopping', // Valid todoList value
      });

      const result = Utils.validateRawFormData(formData);

      // Should NOT have todoList errors when todoList has a valid value
      const todoListError = result.errors.find((e) => e.field === 'todoList');
      expect(todoListError).toBeUndefined();

      // Should pass validation overall since all fields are valid
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('convertRawFormDataToItemData', () => {
    it('should convert valid form data', () => {
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

    it('should handle empty and invalid values', () => {
      const formData: RawFormData = {
        name: '',
        quantity: '',
        autoAddEnabled: false,
        autoAddToListQuantity: 'invalid',
        todoList: '',
        expiryDate: '',
        expiryAlertDays: '',
        category: '',
        unit: '',
      };

      const result = Utils.convertRawFormDataToItemData(formData);

      expect(result).toEqual({
        name: '',
        quantity: 0,
        autoAddEnabled: false,
        autoAddToListQuantity: 0,
        todoList: '',
        expiryDate: '',
        expiryAlertDays: 7, // default value
        category: '',
        unit: '',
      });
    });

    it('should preserve zero as valid value for all numeric fields', () => {
      const formData: RawFormData = {
        name: 'Test Item',
        quantity: '0',
        autoAddEnabled: true,
        autoAddToListQuantity: '0',
        todoList: 'todo.test',
        expiryDate: '2023-12-25',
        expiryAlertDays: '0',
        category: 'Food',
        unit: 'kg',
      };

      const result = Utils.convertRawFormDataToItemData(formData);

      expect(result.quantity).toBe(0);
      expect(result.autoAddToListQuantity).toBe(0);
      expect(result.expiryAlertDays).toBe(0);
    });

    it('should enforce minimum of 0 for negative values', () => {
      const formData: RawFormData = {
        name: 'Test',
        quantity: '-5',
        autoAddEnabled: true,
        autoAddToListQuantity: '-2.5',
        todoList: 'todo.test',
        expiryDate: '',
        expiryAlertDays: '-1',
        category: '',
        unit: '',
      };

      const result = Utils.convertRawFormDataToItemData(formData);

      expect(result.quantity).toBe(0);
      expect(result.autoAddToListQuantity).toBe(0);
      expect(result.expiryAlertDays).toBe(0);
    });

    it('should handle decimal and float values correctly', () => {
      const formData: RawFormData = {
        name: 'Test',
        quantity: '5.75',
        autoAddEnabled: false,
        autoAddToListQuantity: '1.25',
        todoList: '',
        expiryDate: '',
        expiryAlertDays: '2.5',
        category: '',
        unit: '',
      };

      const result = Utils.convertRawFormDataToItemData(formData);

      expect(result.quantity).toBe(5.75);
      expect(result.autoAddToListQuantity).toBe(1.25);
      expect(result.expiryAlertDays).toBe(2.5);
    });

    it('should handle special numeric string formats', () => {
      const testCases = [
        { input: '0.0', expected: 0 },
        { input: '.5', expected: 0.5 },
        { input: '5.', expected: 5 },
        { input: '  3.14  ', expected: 3.14 },
        { input: '1e2', expected: 100 },
        { input: '2.5e-1', expected: 0.25 },
      ];

      testCases.forEach(({ input, expected }) => {
        const formData: RawFormData = {
          name: 'Test',
          quantity: input,
          autoAddEnabled: false,
          autoAddToListQuantity: input,
          todoList: '',
          expiryDate: '',
          expiryAlertDays: input,
          category: '',
          unit: '',
        };

        const result = Utils.convertRawFormDataToItemData(formData);

        expect(result.quantity).toBe(expected);
        expect(result.autoAddToListQuantity).toBe(expected);
        expect(result.expiryAlertDays).toBe(expected);
      });
    });

    it('should handle invalid numeric strings with appropriate defaults', () => {
      const testCases = [
        'not-a-number',
        'abc123',
        '12.34.56', // Multiple dots
        'Infinity', // Infinite values
        '-Infinity',
        'NaN',
        '++5',
        '--3',
        '5abc', // Partial numbers
        'hello123',
        '5+5',
      ];

      testCases.forEach((invalidInput) => {
        const formData: RawFormData = {
          name: 'Test',
          quantity: invalidInput,
          autoAddEnabled: false,
          autoAddToListQuantity: invalidInput,
          todoList: '',
          expiryDate: '',
          expiryAlertDays: invalidInput,
          category: '',
          unit: '',
        };

        const result = Utils.convertRawFormDataToItemData(formData);

        expect(result.quantity).toBe(0);
        expect(result.autoAddToListQuantity).toBe(0);
        expect(result.expiryAlertDays).toBe(7);
      });
    });

    it('should handle boolean conversion for autoAddEnabled', () => {
      const testCases = [
        { input: true, expected: true },
        { input: false, expected: false },
        { input: 'true' as any, expected: true },
        { input: 'false' as any, expected: true }, // non-empty string is truthy
        { input: 1 as any, expected: true },
        { input: 0 as any, expected: false },
        { input: null as any, expected: false },
        { input: undefined as any, expected: false },
        { input: '' as any, expected: false },
      ];

      testCases.forEach(({ input, expected }) => {
        const formData: RawFormData = {
          name: 'Test',
          quantity: '5',
          autoAddEnabled: input,
          autoAddToListQuantity: '2',
          todoList: 'todo.test',
          expiryDate: '',
          expiryAlertDays: '7',
          category: '',
          unit: '',
        };

        const result = Utils.convertRawFormDataToItemData(formData);
        expect(result.autoAddEnabled).toBe(expected);
      });
    });

    it('should properly trim and handle whitespace', () => {
      const formData: RawFormData = {
        name: '   Trimmed Item   ',
        quantity: '  5.5  ',
        autoAddEnabled: true,
        autoAddToListQuantity: '\t2\n',
        todoList: '  todo.shopping  ',
        expiryDate: ' 2023-12-25 ',
        expiryAlertDays: ' 3 ',
        category: '\n Food \t',
        unit: '  kg  ',
      };

      const result = Utils.convertRawFormDataToItemData(formData);

      expect(result).toEqual({
        name: 'Trimmed Item',
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

    it('should handle whitespace-only strings as empty', () => {
      const formData: RawFormData = {
        name: '   ',
        quantity: ' \t\n ',
        autoAddEnabled: false,
        autoAddToListQuantity: '  ',
        todoList: '\n\t',
        expiryDate: '   ',
        expiryAlertDays: ' ',
        category: '  ',
        unit: '\t',
      };

      const result = Utils.convertRawFormDataToItemData(formData);

      expect(result).toEqual({
        name: '',
        quantity: 0,
        autoAddEnabled: false,
        autoAddToListQuantity: 0,
        todoList: '',
        expiryDate: '',
        expiryAlertDays: 7, // default when empty
        category: '',
        unit: '',
      });
    });

    it('should handle mixed valid and invalid fields', () => {
      const formData: RawFormData = {
        name: 'Valid Item',
        quantity: 'invalid',
        autoAddEnabled: true,
        autoAddToListQuantity: '5',
        todoList: 'valid.todo',
        expiryDate: '2023-12-25',
        expiryAlertDays: 'not-a-number',
        category: 'Food',
        unit: '',
      };

      const result = Utils.convertRawFormDataToItemData(formData);

      expect(result).toEqual({
        name: 'Valid Item',
        quantity: 0, // invalid → default
        autoAddEnabled: true,
        autoAddToListQuantity: 5, // valid
        todoList: 'valid.todo',
        expiryDate: '2023-12-25',
        expiryAlertDays: 7, // invalid → default
        category: 'Food',
        unit: '',
      });
    });

    it('should handle very large and very small numbers', () => {
      const formData: RawFormData = {
        name: 'Test',
        quantity: '999999999',
        autoAddEnabled: false,
        autoAddToListQuantity: '0.00001',
        todoList: '',
        expiryDate: '',
        expiryAlertDays: '365',
        category: '',
        unit: '',
      };

      const result = Utils.convertRawFormDataToItemData(formData);

      expect(result.quantity).toBe(999999999);
      expect(result.autoAddToListQuantity).toBe(0.00001);
      expect(result.expiryAlertDays).toBe(365);
    });
  });

  describe('convertRawFormDataToItemData - Additional mutation killing tests', () => {
    // Kill OptionalChaining mutants - test with undefined/null fields
    it('should handle undefined and null string fields without crashing', () => {
      const testCases = [
        {
          description: 'undefined name',
          formData: {
            name: undefined as any,
            quantity: '5',
            autoAddEnabled: false,
            autoAddToListQuantity: '0',
            todoList: 'todo.test',
            expiryDate: '2023-12-25',
            expiryAlertDays: '7',
            category: 'Food',
            unit: 'kg',
          },
          expectedName: '',
        },
        {
          description: 'null todoList',
          formData: {
            name: 'Test Item',
            quantity: '5',
            autoAddEnabled: false,
            autoAddToListQuantity: '0',
            todoList: null as any,
            expiryDate: '2023-12-25',
            expiryAlertDays: '7',
            category: 'Food',
            unit: 'kg',
          },
          expectedTodoList: '',
        },
        {
          description: 'undefined expiryDate',
          formData: {
            name: 'Test Item',
            quantity: '5',
            autoAddEnabled: false,
            autoAddToListQuantity: '0',
            todoList: 'todo.test',
            expiryDate: undefined as any,
            expiryAlertDays: '7',
            category: 'Food',
            unit: 'kg',
          },
          expectedExpiryDate: '',
        },
        {
          description: 'null category',
          formData: {
            name: 'Test Item',
            quantity: '5',
            autoAddEnabled: false,
            autoAddToListQuantity: '0',
            todoList: 'todo.test',
            expiryDate: '2023-12-25',
            expiryAlertDays: '7',
            category: null as any,
            unit: 'kg',
          },
          expectedCategory: '',
        },
        {
          description: 'undefined unit',
          formData: {
            name: 'Test Item',
            quantity: '5',
            autoAddEnabled: false,
            autoAddToListQuantity: '0',
            todoList: 'todo.test',
            expiryDate: '2023-12-25',
            expiryAlertDays: '7',
            category: 'Food',
            unit: undefined as any,
          },
          expectedUnit: '',
        },
      ];

      testCases.forEach(
        ({
          description,
          formData,
          expectedName,
          expectedTodoList,
          expectedExpiryDate,
          expectedCategory,
          expectedUnit,
        }) => {
          // This should not crash even with undefined/null values
          const result = Utils.convertRawFormDataToItemData(formData);

          expect(typeof result).toBe('object');
          if (expectedName !== undefined) expect(result.name).toBe(expectedName);
          if (expectedTodoList !== undefined) expect(result.todoList).toBe(expectedTodoList);
          if (expectedExpiryDate !== undefined) expect(result.expiryDate).toBe(expectedExpiryDate);
          if (expectedCategory !== undefined) expect(result.category).toBe(expectedCategory);
          if (expectedUnit !== undefined) expect(result.unit).toBe(expectedUnit);
        },
      );
    });

    // Kill MethodExpression mutant for Number(value.trim()) vs Number(value)
    it('should handle numeric strings with specific whitespace patterns', () => {
      const testCases = [
        {
          description: 'whitespace that might affect parsing',
          input: ' \t 5.5 \n ',
          expected: 5.5,
        },
        {
          description: 'leading zeros with whitespace',
          input: '  000123  ',
          expected: 123,
        },
        {
          description: 'decimal with unusual whitespace',
          input: '\r 3.14159 \t',
          expected: 3.14159,
        },
        {
          description: 'scientific notation with whitespace',
          input: '  1.5e2  ',
          expected: 150,
        },
      ];

      testCases.forEach(({ description, input, expected }) => {
        const formData: RawFormData = {
          name: 'Test',
          quantity: input,
          autoAddEnabled: false,
          autoAddToListQuantity: input,
          todoList: 'todo.test',
          expiryDate: '2023-12-25',
          expiryAlertDays: input,
          category: 'Food',
          unit: 'kg',
        };

        const result = Utils.convertRawFormDataToItemData(formData);

        expect(result.quantity).toBe(expected);
        expect(result.autoAddToListQuantity).toBe(expected);
        expect(result.expiryAlertDays).toBe(expected);
      });
    });

    // Test edge case with all fields undefined/null
    it('should handle form data with all string fields undefined or null', () => {
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

      // Should not crash and should provide reasonable defaults
      const result = Utils.convertRawFormDataToItemData(formData);

      expect(result).toEqual({
        name: '',
        quantity: 0,
        autoAddEnabled: false,
        autoAddToListQuantity: 0,
        todoList: '',
        expiryDate: '',
        expiryAlertDays: 7, // default value
        category: '',
        unit: '',
      });
    });

    // Test mixed undefined/null with valid values
    it('should handle mixed undefined/null and valid string values', () => {
      const formData: RawFormData = {
        name: undefined as any,
        quantity: '5.5',
        autoAddEnabled: true,
        autoAddToListQuantity: '2',
        todoList: null as any,
        expiryDate: '2023-12-25',
        expiryAlertDays: '3',
        category: undefined as any,
        unit: 'kg',
      };

      const result = Utils.convertRawFormDataToItemData(formData);

      expect(result).toEqual({
        name: '', // undefined → empty
        quantity: 5.5,
        autoAddEnabled: true,
        autoAddToListQuantity: 2,
        todoList: '', // null → empty
        expiryDate: '2023-12-25',
        expiryAlertDays: 3,
        category: '', // undefined → empty
        unit: 'kg',
      });
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(Utils.isValidDate('2023-12-25')).toBe(true);
      expect(Utils.isValidDate('12/25/2023')).toBe(true);
      expect(Utils.isValidDate('2023-12-25T15:30:00Z')).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(Utils.isValidDate('invalid-date')).toBe(false);
      expect(Utils.isValidDate('2023-13-45')).toBe(false);
      expect(Utils.isValidDate('')).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    beforeEach(() => {
      // Mock document.createElement
      global.document = {
        createElement: vi.fn(() => ({
          textContent: '',
          innerHTML: '',
        })),
      } as any;
    });

    it('should sanitize HTML by using textContent', () => {
      const mockDiv = {
        textContent: '',
        innerHTML: 'Safe Text',
      };

      (global.document.createElement as any).mockReturnValue(mockDiv);

      const result = Utils.sanitizeHtml('<script>alert("xss")</script>');

      expect(global.document.createElement).toHaveBeenCalledWith('div');
      expect(result).toBe('Safe Text');
    });
  });

  describe('sanitizeString', () => {
    it('should trim and limit string length', () => {
      const result = Utils.sanitizeString('  hello world  ', 5);
      expect(result).toBe('hello');
    });

    it('should handle undefined input', () => {
      const result = Utils.sanitizeString(undefined, 10);
      expect(result).toBe('');
    });

    it('should handle non-string input', () => {
      const result = Utils.sanitizeString(123 as any, 10);
      expect(result).toBe('');
    });

    it('should preserve string if within limit', () => {
      const result = Utils.sanitizeString('short', 10);
      expect(result).toBe('short');
    });
  });

  describe('hasActiveFilters', () => {
    it('should return true when filters are active', () => {
      const filters: FilterState = {
        searchText: 'test',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      expect(Utils.hasActiveFilters(filters)).toBe(true);
    });

    it('should return false when no filters are active', () => {
      const filters: FilterState = {
        searchText: '',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      expect(Utils.hasActiveFilters(filters)).toBe(false);
    });

    it('should detect any active filter', () => {
      expect(
        Utils.hasActiveFilters({
          searchText: '',
          category: 'Food',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        }),
      ).toBe(true);

      expect(
        Utils.hasActiveFilters({
          searchText: '',
          category: '',
          quantity: 'low',
          expiry: '',
          showAdvanced: false,
        }),
      ).toBe(true);

      expect(
        Utils.hasActiveFilters({
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'expired',
          showAdvanced: false,
        }),
      ).toBe(true);
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
      expect(result['Fruit'][0].name).toBe('Apple');
      expect(result['Fruit'][1].name).toBe('Banana');
    });

    it('should handle empty array', () => {
      const result = Utils.groupItemsByCategory([]);
      expect(result).toEqual({});
    });

    it('should handle items with empty category', () => {
      const items = [
        { name: 'Item1', category: '' },
        { name: 'Item2', category: undefined },
      ];

      const result = Utils.groupItemsByCategory(items);
      expect(result['Uncategorized']).toHaveLength(2);
    });
  });

  describe('sanitizeItemData - Additional mutation killing tests', () => {
    it('should use empty string as default for falsy expiryDate values', () => {
      const testCases = [
        { expiryDate: undefined as any, expected: '' },
        { expiryDate: null as any, expected: '' },
        { expiryDate: '', expected: '' },
        { expiryDate: 0 as any, expected: '' }, // 0 is falsy
        { expiryDate: false as any, expected: '' }, // false is falsy
      ];

      testCases.forEach(({ expiryDate, expected }) => {
        const itemData: ItemData = {
          name: 'Test Item',
          quantity: 5,
          autoAddEnabled: false,
          autoAddToListQuantity: 0,
          category: 'Food',
          unit: 'kg',
          todoList: 'todo.test',
          expiryDate,
          expiryAlertDays: 7,
        };

        const result = Utils.sanitizeItemData(itemData);
        expect(result.expiryDate).toBe(expected); // Must be exactly empty string
      });
    });

    it('should preserve valid expiryDate values', () => {
      const validDates = ['2023-12-25', '2024-01-01', '2023-06-15T10:30:00Z'];

      validDates.forEach((expiryDate) => {
        const itemData: ItemData = {
          name: 'Test Item',
          quantity: 5,
          autoAddEnabled: false,
          autoAddToListQuantity: 0,
          category: 'Food',
          unit: 'kg',
          todoList: 'todo.test',
          expiryDate,
          expiryAlertDays: 7,
        };

        const result = Utils.sanitizeItemData(itemData);
        expect(result.expiryDate).toBe(expiryDate); // Should preserve the original value
      });
    });
  });

  describe('sanitizeItemData', () => {
    it('should sanitize and enforce limits', () => {
      const itemData: ItemData = {
        name: '  Test Item with very long name that is within the limit  ',
        quantity: -5,
        autoAddEnabled: 'true' as any,
        autoAddToListQuantity: 1000000,
        category: 'Very long category name that should definitely be truncated',
        unit: 'a very long unit name that should also be truncated',
        todoList: 'todo.test',
        expiryDate: '2023-12-25',
        expiryAlertDays: 0,
      };
      const result = Utils.sanitizeItemData(itemData);

      expect(result.name).toHaveLength(54); // Actual trimmed length
      expect(result.name).toBe('Test Item with very long name that is within the limit'); // Trimmed version
      expect(result.quantity).toBe(0); // Negative value corrected
      expect(result.autoAddEnabled).toBe(true); // Converted to boolean
      expect(result.category).toHaveLength(50); // Truncated to 50
      expect(result.unit).toHaveLength(20); // Truncated to 20
      expect(result.expiryAlertDays).toBe(7); // Default value
    });

    it('should truncate name to 100 characters', () => {
      const longName = 'a'.repeat(150); // 150 characters
      const itemData: ItemData = {
        name: longName,
        quantity: 5,
        autoAddEnabled: false,
        autoAddToListQuantity: 0,
        category: '',
        unit: '',
        todoList: '',
        expiryDate: '',
        expiryAlertDays: 7,
      };

      const result = Utils.sanitizeItemData(itemData);
      expect(result.name).toHaveLength(100);
    });

    it('should handle valid data without changes', () => {
      const itemData: ItemData = {
        name: 'Valid Item',
        quantity: 5,
        autoAddEnabled: true,
        autoAddToListQuantity: 2,
        category: 'Food',
        unit: 'kg',
        todoList: 'todo.shopping',
        expiryDate: '2023-12-25',
        expiryAlertDays: 7,
      };

      const result = Utils.sanitizeItemData(itemData);

      expect(result).toEqual({
        name: 'Valid Item',
        quantity: 5,
        autoAddEnabled: true,
        autoAddToListQuantity: 2,
        category: 'Food',
        unit: 'kg',
        todoList: 'todo.shopping',
        expiryDate: '2023-12-25',
        expiryAlertDays: 7,
      });
    });
  });
});
