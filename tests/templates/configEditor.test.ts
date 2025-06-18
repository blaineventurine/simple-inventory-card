import { describe, it, expect, beforeEach, vi } from 'vitest';
import { html } from 'lit-element';
import {
  createEntitySelector,
  createEntityInfo,
  createNoEntityMessage,
} from '../../src/templates/configEditor';
import { HomeAssistant } from '../../src/types/home-assistant';
import { createMockHomeAssistant, createMockHassEntity } from '../testHelpers';

vi.mock('lit-element', () => ({
  html: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    _$litType$: 1, // Lit template marker
    toString: () => strings.join(''),
  })),
}));

describe('Config Editor Templates', () => {
  let mockHass: HomeAssistant;
  let mockOnValueChanged: (ev: CustomEvent) => void;

  beforeEach(() => {
    mockHass = createMockHomeAssistant();
    mockOnValueChanged = vi.fn();
    vi.clearAllMocks();
  });

  describe('createEntitySelector', () => {
    it('should create entity selector with all required properties', () => {
      const entityOptions = [
        { value: 'sensor.inventory1', label: 'Inventory 1' },
        { value: 'sensor.inventory2', label: 'Inventory 2' },
      ];
      const selectedEntity = 'sensor.inventory1';

      const result = createEntitySelector(
        mockHass,
        entityOptions,
        selectedEntity,
        mockOnValueChanged,
      );

      expect(html).toHaveBeenCalled();
      expect(result).toHaveProperty('_$litType$', 1);

      // Verify the template was called with correct parameters
      const htmlCall = vi.mocked(html).mock.calls[0];
      const templateString = htmlCall[0].join(''); // Join the template strings array
      expect(templateString).toContain('ha-combo-box');
      expect(htmlCall[1]).toBe(mockHass); // .hass
      expect(htmlCall[2]).toBe('Inventory Entity (Required)'); // .label
      expect(htmlCall[3]).toBe(entityOptions); // .items
      expect(htmlCall[4]).toBe(selectedEntity); // .value
      expect(htmlCall[5]).toBe(mockOnValueChanged); // @value-changed
    });

    it('should handle empty entity options', () => {
      const entityOptions: Array<{ value: string; label: string }> = [];
      const selectedEntity = '';

      createEntitySelector(mockHass, entityOptions, selectedEntity, mockOnValueChanged);

      expect(html).toHaveBeenCalled();
      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[3]).toEqual([]); // .items should be empty array
      expect(htmlCall[4]).toBe(''); // .value should be empty string
    });

    it('should handle null/undefined values gracefully', () => {
      const entityOptions = [{ value: 'sensor.test', label: 'Test' }];

      createEntitySelector(mockHass, entityOptions, null as any, mockOnValueChanged);

      expect(html).toHaveBeenCalled();
      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[4]).toBe(null); // .value should be null
    });

    it('should create proper template structure', () => {
      const entityOptions = [{ value: 'sensor.test', label: 'Test' }];
      const selectedEntity = 'sensor.test';

      createEntitySelector(mockHass, entityOptions, selectedEntity, mockOnValueChanged);

      const htmlCall = vi.mocked(html).mock.calls[0];
      const templateString = htmlCall[0].join('');

      expect(templateString).toContain('class="option"');
      expect(templateString).toContain('class="row"');
      expect(templateString).toContain('class="col"');
      expect(templateString).toContain('ha-combo-box');
      expect(templateString).toContain('.hass=');
      expect(templateString).toContain('.label=');
      expect(templateString).toContain('.items=');
      expect(templateString).toContain('.value=');
      expect(templateString).toContain('@value-changed=');
    });
  });

  describe('createEntityInfo', () => {
    it('should create entity info with complete entity data', () => {
      const entityId = 'sensor.test_inventory';
      const mockEntity = createMockHassEntity(entityId, {
        attributes: {
          friendly_name: 'Test Inventory',
          items: [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }],
        },
      });

      mockHass.states[entityId] = mockEntity;

      const result = createEntityInfo(mockHass, entityId);

      expect(html).toHaveBeenCalled();
      expect(result).toHaveProperty('_$litType$', 1);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[1]).toBe('Test Inventory'); // friendly_name
      expect(htmlCall[2]).toBe(entityId); // entity ID
      expect(htmlCall[3]).toBe(3); // item count
    });

    it('should handle entity without friendly name', () => {
      const entityId = 'sensor.test_inventory';
      const mockEntity = createMockHassEntity(entityId, {
        attributes: {
          items: [{ name: 'Item 1' }],
        },
      });

      mockHass.states[entityId] = mockEntity;

      createEntityInfo(mockHass, entityId);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[1]).toBe(entityId); // should fallback to entity ID
      expect(htmlCall[2]).toBe(entityId); // entity ID
      expect(htmlCall[3]).toBe(1); // item count
    });

    it('should handle entity without items', () => {
      const entityId = 'sensor.test_inventory';
      const mockEntity = createMockHassEntity(entityId, {
        attributes: {
          friendly_name: 'Empty Inventory',
        },
      });

      mockHass.states[entityId] = mockEntity;

      createEntityInfo(mockHass, entityId);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[1]).toBe('Empty Inventory');
      expect(htmlCall[2]).toBe(entityId);
      expect(htmlCall[3]).toBe(0); // item count should be 0
    });

    it('should handle missing entity state', () => {
      const entityId = 'sensor.nonexistent';

      createEntityInfo(mockHass, entityId);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[1]).toBe(entityId); // should fallback to entity ID
      expect(htmlCall[2]).toBe(entityId);
      expect(htmlCall[3]).toBe(0); // item count should be 0
    });

    it('should handle entity without attributes', () => {
      const entityId = 'sensor.test_inventory';
      const mockEntity = createMockHassEntity(entityId, {});
      delete (mockEntity as any).attributes;

      mockHass.states[entityId] = mockEntity;

      createEntityInfo(mockHass, entityId);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[1]).toBe(entityId); // should fallback to entity ID
      expect(htmlCall[3]).toBe(0); // item count should be 0
    });

    it('should handle null/undefined items array', () => {
      const entityId = 'sensor.test_inventory';
      const mockEntity = createMockHassEntity(entityId, {
        attributes: {
          friendly_name: 'Test Inventory',
          items: null,
        },
      });

      mockHass.states[entityId] = mockEntity;

      createEntityInfo(mockHass, entityId);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[3]).toBe(0); // item count should be 0
    });

    it('should create proper template structure', () => {
      const entityId = 'sensor.test_inventory';
      mockHass.states[entityId] = createMockHassEntity(entityId, {
        attributes: { friendly_name: 'Test', items: [] },
      });

      createEntityInfo(mockHass, entityId);

      const htmlCall = vi.mocked(html).mock.calls[0];
      const templateString = htmlCall[0].join('');

      expect(templateString).toContain('class="entity-info"');
      expect(templateString).toContain('class="info-header"');
      expect(templateString).toContain('class="info-content"');
      expect(templateString).toContain('Selected Inventory:');
      expect(templateString).toContain('<strong>');
      expect(templateString).toContain('<small>');
      expect(templateString).toContain('Items:');
    });

    it('should handle empty string entity ID', () => {
      createEntityInfo(mockHass, '');

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[1]).toBe(''); // should use empty string
      expect(htmlCall[2]).toBe('');
      expect(htmlCall[3]).toBe(0);
    });

    it('should handle very large item counts', () => {
      const entityId = 'sensor.test_inventory';
      const largeItemsArray = new Array(1000).fill({ name: 'Item' });
      const mockEntity = createMockHassEntity(entityId, {
        attributes: {
          friendly_name: 'Large Inventory',
          items: largeItemsArray,
        },
      });

      mockHass.states[entityId] = mockEntity;

      createEntityInfo(mockHass, entityId);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[3]).toBe(1000); // should handle large counts
    });
  });

  describe('createNoEntityMessage', () => {
    it('should create no entity message template', () => {
      const result = createNoEntityMessage();

      expect(html).toHaveBeenCalled();
      expect(result).toHaveProperty('_$litType$', 1);
    });

    it('should create proper template structure', () => {
      createNoEntityMessage();

      const htmlCall = vi.mocked(html).mock.calls[0];
      const templateString = htmlCall[0].join('');

      expect(templateString).toContain('class="no-entity"');
      expect(templateString).toContain('ha-icon');
      expect(templateString).toContain('icon="mdi:information-outline"');
      expect(templateString).toContain('Please select an inventory entity above');
    });

    it('should not require any parameters', () => {
      expect(() => createNoEntityMessage()).not.toThrow();
    });

    it('should create consistent output', () => {
      createNoEntityMessage();
      createNoEntityMessage();

      // Both calls should result in identical templates
      expect(vi.mocked(html).mock.calls[0][0]).toEqual(vi.mocked(html).mock.calls[1][0]);
    });
  });

  describe('Template Integration', () => {
    it('should handle all template functions in sequence', () => {
      const entityOptions = [{ value: 'sensor.test', label: 'Test' }];
      const selectedEntity = 'sensor.test';
      const mockEntity = createMockHassEntity(selectedEntity, {
        attributes: { friendly_name: 'Test Inventory', items: [{ name: 'Item' }] },
      });
      mockHass.states[selectedEntity] = mockEntity;

      // Call all template functions
      createEntitySelector(mockHass, entityOptions, selectedEntity, mockOnValueChanged);
      createEntityInfo(mockHass, selectedEntity);
      createNoEntityMessage();

      expect(html).toHaveBeenCalledTimes(3);
    });

    it('should handle template creation with minimal Home Assistant object', () => {
      const minimalHass = {
        states: {},
      } as unknown as HomeAssistant;

      const entityOptions: Array<{ value: string; label: string }> = [];

      expect(() => {
        createEntitySelector(minimalHass, entityOptions, '', mockOnValueChanged);
        createEntityInfo(minimalHass, 'sensor.test');
        createNoEntityMessage();
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed entity options', () => {
      const malformedOptions = [
        { value: undefined, label: null },
        { value: '', label: '' },
        {} as any,
      ];

      expect(() => {
        createEntitySelector(mockHass, malformedOptions as any, '', mockOnValueChanged);
      }).not.toThrow();
    });

    it('should handle circular references in entity data', () => {
      const entityId = 'sensor.test_inventory';
      const circularEntity: any = createMockHassEntity(entityId, {
        attributes: { friendly_name: 'Test' },
      });
      circularEntity.circular = circularEntity; // Create circular reference

      mockHass.states[entityId] = circularEntity;

      expect(() => {
        createEntityInfo(mockHass, entityId);
      }).not.toThrow();
    });

    it('should handle very long entity names and IDs', () => {
      const longEntityId = 'sensor.' + 'a'.repeat(1000);
      const longFriendlyName = 'Very Long Friendly Name ' + 'x'.repeat(1000);

      const mockEntity = createMockHassEntity(longEntityId, {
        attributes: {
          friendly_name: longFriendlyName,
          items: [],
        },
      });

      mockHass.states[longEntityId] = mockEntity;

      expect(() => {
        createEntityInfo(mockHass, longEntityId);
      }).not.toThrow();

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[1]).toBe(longFriendlyName);
      expect(htmlCall[2]).toBe(longEntityId);
    });

    it('should handle special characters in entity data', () => {
      const entityId = 'sensor.test_inventory';
      const specialCharName = '<script>alert("test")</script>';

      const mockEntity = createMockHassEntity(entityId, {
        attributes: {
          friendly_name: specialCharName,
          items: [],
        },
      });

      mockHass.states[entityId] = mockEntity;

      expect(() => {
        createEntityInfo(mockHass, entityId);
      }).not.toThrow();

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[1]).toBe(specialCharName); // Should pass through as-is (Lit handles escaping)
    });
  });
});
