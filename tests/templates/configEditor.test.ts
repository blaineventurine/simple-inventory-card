import { describe, it, expect, beforeEach, vi } from 'vitest';
import { html } from 'lit-element';
import {
  createEntitySelector,
  createEntityInfo,
  createNoEntityMessage,
} from '../../src/templates/configEditor';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { createMockHomeAssistant, createMockHassEntity } from '../testHelpers';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('lit-element', () => ({
  html: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    _$litType$: 1, // Lit template marker
    toString: () => strings.join(''),
  })),
}));

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn((_translations: any, _key: string, _params: any, fallback: string) => {
      return fallback;
    }),
  },
  TranslationData: {},
}));

describe('Config Editor Templates', () => {
  let mockHass: HomeAssistant;
  let mockOnValueChanged: (event_: CustomEvent) => void;
  let mockTranslations: TranslationData;

  beforeEach(() => {
    mockHass = createMockHomeAssistant();
    mockOnValueChanged = vi.fn();
    mockTranslations = {
      config: {
        inventory_entity_required: 'Inventory Entity (Required)',
        selected_inventory: 'Selected Inventory:',
        items_count: 'Items',
        select_entity_message: 'Please select an inventory entity above',
      },
    };
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
        mockTranslations,
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

      createEntitySelector(
        mockHass,
        entityOptions,
        selectedEntity,
        mockOnValueChanged,
        mockTranslations,
      );

      expect(html).toHaveBeenCalled();
      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[3]).toEqual([]); // .items should be empty array
      expect(htmlCall[4]).toBe(''); // .value should be empty string
    });

    it('should handle null/undefined values gracefully', () => {
      const entityOptions = [{ value: 'sensor.test', label: 'Test' }];

      createEntitySelector(
        mockHass,
        entityOptions,
        undefined as any,
        mockOnValueChanged,
        mockTranslations,
      );

      expect(html).toHaveBeenCalled();
      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[4]).toBe(undefined); // .value should be null
    });

    it('should create proper template structure', () => {
      const entityOptions = [{ value: 'sensor.test', label: 'Test' }];
      const selectedEntity = 'sensor.test';

      createEntitySelector(
        mockHass,
        entityOptions,
        selectedEntity,
        mockOnValueChanged,
        mockTranslations,
      );

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

      const result = createEntityInfo(mockHass, entityId, mockTranslations);

      expect(html).toHaveBeenCalled();
      expect(result).toHaveProperty('_$litType$', 1);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[1]).toBe('Selected Inventory:'); // Translation result
      expect(htmlCall[2]).toBe('Test Inventory'); // friendly_name
      expect(htmlCall[3]).toBe(entityId);
      expect(htmlCall[4]).toBe('Items'); // Translation result
      expect(htmlCall[5]).toBe(3); // item count
    });

    it('should handle entity without friendly name', () => {
      const entityId = 'sensor.test_inventory';
      const mockEntity = createMockHassEntity(entityId, {
        attributes: {
          items: [{ name: 'Item 1' }],
        },
      });

      mockHass.states[entityId] = mockEntity;

      createEntityInfo(mockHass, entityId, mockTranslations);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[2]).toBe(entityId); // should fallback to entity ID - position 2
      expect(htmlCall[3]).toBe(entityId); // entity ID - position 3
      expect(htmlCall[5]).toBe(1);
    });

    it('should handle entity without items', () => {
      const entityId = 'sensor.test_inventory';
      const mockEntity = createMockHassEntity(entityId, {
        attributes: {
          friendly_name: 'Empty Inventory',
        },
      });

      mockHass.states[entityId] = mockEntity;

      createEntityInfo(mockHass, entityId, mockTranslations);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[2]).toBe('Empty Inventory');
      expect(htmlCall[3]).toBe(entityId);
      expect(htmlCall[5]).toBe(0); // item count should be 0
    });

    it('should handle missing entity state', () => {
      const entityId = 'sensor.nonexistent';

      createEntityInfo(mockHass, entityId, mockTranslations);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[2]).toBe(entityId); // should fallback to entity ID
      expect(htmlCall[3]).toBe(entityId);
      expect(htmlCall[5]).toBe(0); // item count should be 0
    });

    it('should handle entity without attributes', () => {
      const entityId = 'sensor.test_inventory';
      const mockEntity = createMockHassEntity(entityId, {});
      delete (mockEntity as any).attributes;

      mockHass.states[entityId] = mockEntity;

      createEntityInfo(mockHass, entityId, mockTranslations);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[2]).toBe(entityId); // should fallback to entity ID
      expect(htmlCall[5]).toBe(0); // item count should be 0
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

      createEntityInfo(mockHass, entityId, mockTranslations);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[5]).toBe(0); // item count should be 0
    });

    it('should create proper template structure', () => {
      const entityId = 'sensor.test_inventory';
      mockHass.states[entityId] = createMockHassEntity(entityId, {
        attributes: { friendly_name: 'Test', items: [] },
      });

      createEntityInfo(mockHass, entityId, mockTranslations);

      const htmlCall = vi.mocked(html).mock.calls[0];
      const templateString = htmlCall[0].join('');
      const values = htmlCall.slice(1); // Get all the interpolated values

      expect(templateString).toContain('class="entity-info"');
      expect(templateString).toContain('class="info-header"');
      expect(templateString).toContain('class="info-content"');
      expect(templateString).toContain('<strong>');
      expect(templateString).toContain('<small>');
      expect(values[0]).toBe('Selected Inventory:'); // First interpolated value
      expect(values[1]).toBe('Test'); // friendlyName
      expect(values[2]).toBe(entityId); // entityId
      expect(values[3]).toBe('Items'); // Second translation
      expect(values[4]).toBe(0); // itemCount
    });

    it('should handle empty string entity ID', () => {
      createEntityInfo(mockHass, '', mockTranslations);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[2]).toBe(''); // should use empty string
      expect(htmlCall[3]).toBe('');
      expect(htmlCall[5]).toBe(0);
    });

    it('should handle very large item counts', () => {
      const entityId = 'sensor.test_inventory';
      const largeItemsArray = Array.from({ length: 1000 }).fill({ name: 'Item' });
      const mockEntity = createMockHassEntity(entityId, {
        attributes: {
          friendly_name: 'Large Inventory',
          items: largeItemsArray,
        },
      });

      mockHass.states[entityId] = mockEntity;

      createEntityInfo(mockHass, entityId, mockTranslations);

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[5]).toBe(1000); // should handle large counts
    });
  });

  describe('createNoEntityMessage', () => {
    it('should create no entity message template', () => {
      const result = createNoEntityMessage(mockTranslations);

      expect(html).toHaveBeenCalled();
      expect(result).toHaveProperty('_$litType$', 1);
    });

    it('should create proper template structure', () => {
      createNoEntityMessage(mockTranslations);

      const htmlCall = vi.mocked(html).mock.calls[0];
      const templateString = htmlCall[0].join('');

      expect(templateString).toContain('class="no-entity"');
      expect(templateString).toContain('ha-icon');
      expect(templateString).toContain('icon="mdi:information-outline"');
      expect(htmlCall[1]).toBe('Please select an inventory entity above');
    });

    it('should not require any parameters', () => {
      expect(() => createNoEntityMessage(mockTranslations)).not.toThrow();
    });

    it('should create consistent output', () => {
      createNoEntityMessage(mockTranslations);
      createNoEntityMessage(mockTranslations);

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
      createEntitySelector(
        mockHass,
        entityOptions,
        selectedEntity,
        mockOnValueChanged,
        mockTranslations,
      );
      createEntityInfo(mockHass, selectedEntity, mockTranslations);
      createNoEntityMessage(mockTranslations);

      expect(html).toHaveBeenCalledTimes(3);
    });

    it('should handle template creation with minimal Home Assistant object', () => {
      const minimalHass = {
        states: {},
      } as unknown as HomeAssistant;

      const entityOptions: Array<{ value: string; label: string }> = [];

      expect(() => {
        createEntitySelector(minimalHass, entityOptions, '', mockOnValueChanged, mockTranslations);
        createEntityInfo(minimalHass, 'sensor.test', mockTranslations);
        createNoEntityMessage(mockTranslations);
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
        createEntitySelector(
          mockHass,
          malformedOptions as any,
          '',
          mockOnValueChanged,
          mockTranslations,
        );
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
        createEntityInfo(mockHass, entityId, mockTranslations);
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
        createEntityInfo(mockHass, longEntityId, mockTranslations);
      }).not.toThrow();

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[2]).toBe(longFriendlyName);
      expect(htmlCall[3]).toBe(longEntityId);
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
        createEntityInfo(mockHass, entityId, mockTranslations);
      }).not.toThrow();

      const htmlCall = vi.mocked(html).mock.calls[0];
      expect(htmlCall[2]).toBe(specialCharName); // Should pass through as-is (Lit handles escaping)
    });
  });
});
