import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigEditor } from '../../src/components/configEditor';
import { HomeAssistant, InventoryConfig, HassEntity } from '../../src/types/home-assistant';
import { html } from 'lit-element';

// Improved mock for lit-element
vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    dispatchEvent = vi.fn();
    static get properties() {
      return {};
    }
    static get styles() {
      return {};
    }
  },
  html: vi.fn((strings, ...values) => {
    // Create a structure that better represents the template result
    return {
      strings,
      values,
      // Add a _$litType$ property to identify it as a lit-html template result
      _$litType$: 1,
      // toString for debugging
      toString: () =>
        strings.reduce(
          (acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ''),
          ''
        ),
    };
  }),
  css: vi.fn((strings, ...values) => ({
    strings,
    values,
    toString: () => strings.join(''),
  })),
}));

describe('ConfigEditor', () => {
  let configEditor: ConfigEditor;
  let mockHass: HomeAssistant;

  // Helper function to create complete HassEntity objects
  const createMockEntity = (entityId: string, overrides: Partial<HassEntity> = {}): HassEntity => ({
    entity_id: entityId,
    state: 'unknown',
    attributes: {},
    context: { id: 'test-context' },
    last_changed: '2023-01-01T00:00:00Z',
    last_updated: '2023-01-01T00:00:00Z',
    ...overrides,
  });

  const createMockHass = (entities: Record<string, HassEntity> = {}): HomeAssistant => ({
    states: entities,
    config: {
      latitude: 0,
      longitude: 0,
      elevation: 0,
      unit_system: {
        length: 'ft',
        mass: 'lb',
        temperature: '°F',
        volume: 'gal',
      },
      location_name: 'Test Location',
      time_zone: 'America/New_York',
      components: ['inventory'],
      config_dir: '/config',
      whitelist_external_dirs: [],
      allowlist_external_dirs: [],
      allowlist_external_urls: [],
      version: '2024.1.0',
      config_source: 'yaml',
      safe_mode: false,
      state: 'RUNNING',
    },
    themes: {},
    selectedTheme: null,
    panels: {},
    panelUrl: '',
    language: 'en',
    selectedLanguage: 'en',
    localize: vi.fn(),
    translationMetadata: {},
    dockedSidebar: 'docked',
    moreInfoEntityId: null,
    callService: vi.fn(),
    callApi: vi.fn(),
    fetchWithAuth: vi.fn(),
    sendWS: vi.fn(),
    callWS: vi.fn(),
  });

  beforeEach(() => {
    configEditor = new ConfigEditor();
    mockHass = createMockHass();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const editor = new ConfigEditor();

      expect(editor['_config']).toEqual({
        entity: '',
        type: '',
      });
    });

    it('should test constructor spreading mutation', () => {
      const editor1 = new ConfigEditor();
      const config1 = editor1['_config'];
      const editor2 = new ConfigEditor();
      const config2 = editor2['_config'];

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });

  describe('properties', () => {
    it('should define correct static properties', () => {
      const properties = ConfigEditor.properties;

      expect(properties).toEqual({
        hass: { type: Object },
        _config: { type: Object },
      });
    });
  });

  describe('setConfig', () => {
    it('should set config by spreading the input', () => {
      const inputConfig: InventoryConfig = {
        type: 'inventory-card',
        entity: 'sensor.test_inventory',
      };

      configEditor.setConfig(inputConfig);

      expect(configEditor['_config']).toEqual(inputConfig);
      expect(configEditor['_config']).not.toBe(inputConfig); // Should be a copy
    });

    it('should overwrite existing config', () => {
      const initialConfig: InventoryConfig = {
        type: 'inventory-card',
        entity: 'sensor.old_inventory',
      };

      const newConfig: InventoryConfig = {
        type: 'inventory-card',
        entity: 'sensor.new_inventory',
      };

      configEditor.setConfig(initialConfig);
      configEditor.setConfig(newConfig);

      expect(configEditor['_config']).toEqual(newConfig);
    });

    it('should handle empty config object', () => {
      const emptyConfig: InventoryConfig = {
        type: '',
        entity: '',
      };

      configEditor.setConfig(emptyConfig);

      expect(configEditor['_config']).toEqual(emptyConfig);
    });

    it('should test object spreading in setConfig', () => {
      const originalConfig = {
        type: 'inventory-card',
        entity: 'sensor.test',
        extraProperty: 'test' as any,
      };

      configEditor.setConfig(originalConfig);

      // Should create a new object, not reference the same one
      expect(configEditor['_config']).toEqual(originalConfig);
      expect(configEditor['_config']).not.toBe(originalConfig);

      // Modify original to ensure it's a copy
      originalConfig.entity = 'sensor.modified';
      expect(configEditor['_config']?.entity).toBe('sensor.test');
    });
  });

  describe('_entity getter', () => {
    it('should return entity when config exists', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.test_inventory',
      };

      expect(configEditor['_entity']).toBe('sensor.test_inventory');
    });

    it('should return empty string when config is undefined', () => {
      configEditor['_config'] = undefined;

      expect(configEditor['_entity']).toBe('');
    });

    it('should return empty string when entity is undefined', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: undefined as any,
      };

      expect(configEditor['_entity']).toBe('');
    });

    it('should return empty string when entity is null', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: null as any,
      };

      expect(configEditor['_entity']).toBe('');
    });

    it('should return entity even when empty string', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: '',
      };

      expect(configEditor['_entity']).toBe('');
    });
  });

  describe('render', () => {
    beforeEach(() => {
      configEditor.hass = mockHass;
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: '',
      };
    });

    it('should return loading template when hass is undefined', () => {
      configEditor.hass = undefined;

      configEditor.render();

      expect(html).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('Loading')])
      );
    });

    it('should return loading template when config is undefined', () => {
      configEditor['_config'] = undefined;

      configEditor.render();

      expect(html).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('Loading')])
      );
    });

    it('should filter entities that start with sensor', () => {
      mockHass.states = {
        'sensor.inventory_1': createMockEntity('sensor.inventory_1', {
          attributes: { items: [] },
        }),
        'switch.test': createMockEntity('switch.test', {
          attributes: {},
        }),
        'light.test': createMockEntity('light.test', {
          attributes: {},
        }),
        'sensor.other': createMockEntity('sensor.other', {
          attributes: {},
        }),
      };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Should include sensor.inventory_1 but not the others
      expect(items).toContainEqual({
        label: 'sensor.inventory_1',
        value: 'sensor.inventory_1',
      });

      // Should not include non-sensor entities
      expect(items.some((item) => item.value === 'switch.test')).toBe(false);
      expect(items.some((item) => item.value === 'light.test')).toBe(false);
    });

    it('should filter entities containing "inventory" in name', () => {
      mockHass.states = {
        'sensor.my_inventory': createMockEntity('sensor.my_inventory', {
          attributes: {},
        }),
        'sensor.kitchen_inventory_items': createMockEntity('sensor.kitchen_inventory_items', {
          attributes: {},
        }),
        'sensor.temperature': createMockEntity('sensor.temperature', {
          attributes: {},
        }),
      };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Should include entities with "inventory" in name
      expect(items).toContainEqual({
        label: 'sensor.my_inventory',
        value: 'sensor.my_inventory',
      });
      expect(items).toContainEqual({
        label: 'sensor.kitchen_inventory_items',
        value: 'sensor.kitchen_inventory_items',
      });

      // Should not include entities without "inventory" in name
      expect(items.some((item) => item.value === 'sensor.temperature')).toBe(false);
    });

    it('should filter entities with items attribute', () => {
      mockHass.states = {
        'sensor.test_entity': createMockEntity('sensor.test_entity', {
          attributes: { items: [] },
        }),
        'sensor.other_entity': createMockEntity('sensor.other_entity', {
          attributes: { temperature: 20 },
        }),
      };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Should include entities with items attribute
      expect(items).toContainEqual({
        label: 'sensor.test_entity',
        value: 'sensor.test_entity',
      });

      // Should not include entities without items attribute
      expect(items.some((item) => item.value === 'sensor.other_entity')).toBe(false);
    });

    it('should handle entities with undefined attributes', () => {
      mockHass.states = {
        'sensor.inventory_test': createMockEntity('sensor.inventory_test', {
          attributes: undefined as any,
        }),
        'sensor.test_inventory': createMockEntity('sensor.test_inventory'),
      };

      expect(() => configEditor.render()).not.toThrow();
    });

    it('should sort filtered entities', () => {
      mockHass.states = {
        'sensor.z_inventory': createMockEntity('sensor.z_inventory', {
          attributes: { items: [] },
        }),
        'sensor.a_inventory': createMockEntity('sensor.a_inventory', {
          attributes: { items: [] },
        }),
        'sensor.m_inventory': createMockEntity('sensor.m_inventory', {
          attributes: { items: [] },
        }),
      };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Verify items are sorted alphabetically
      expect(items.map((item) => item.value)).toEqual([
        'sensor.a_inventory',
        'sensor.m_inventory',
        'sensor.z_inventory',
      ]);
    });

    it('should render entity info when entity is selected', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.test_inventory',
      };

      mockHass.states = {
        'sensor.test_inventory': createMockEntity('sensor.test_inventory', {
          attributes: {
            friendly_name: 'Test Inventory',
            items: [{ name: 'item1' }, { name: 'item2' }],
          },
        }),
      };

      (html as any).mockClear();
      configEditor.render();

      // Find the entity info section in the template
      const entityInfoCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('entity-info'))
      );

      expect(entityInfoCall).toBeDefined();

      // Check if friendly name is included
      const values = entityInfoCall.flat().filter((v) => typeof v === 'string');
      expect(values).toContain('Test Inventory');

      // Check if item count is included
      expect(entityInfoCall.flat()).toContain(2);
    });

    it('should render no-entity message when no entity selected', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: '',
      };

      (html as any).mockClear();
      configEditor.render();

      // Find the no-entity message in the template
      const noEntityCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('no-entity'))
      );

      expect(noEntityCall).toBeDefined();
      expect(
        noEntityCall[0].some((str) => str.includes('Please select an inventory entity above'))
      ).toBe(true);
    });

    it('should handle entity with no friendly name', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.test_inventory',
      };

      mockHass.states = {
        'sensor.test_inventory': createMockEntity('sensor.test_inventory', {
          attributes: {
            items: [],
          },
        }),
      };

      (html as any).mockClear();
      configEditor.render();

      // Find the entity info section in the template
      const entityInfoCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('entity-info'))
      );

      expect(entityInfoCall).toBeDefined();

      // When no friendly name, should fall back to entity ID
      const values = entityInfoCall.flat().filter((v) => typeof v === 'string');
      expect(values).toContain('sensor.test_inventory');
    });

    it('should handle entity with no items', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.test_inventory',
      };

      mockHass.states = {
        'sensor.test_inventory': createMockEntity('sensor.test_inventory', {
          attributes: {
            friendly_name: 'Test Inventory',
          },
        }),
      };

      (html as any).mockClear();
      configEditor.render();

      // Find the entity info section in the template
      const entityInfoCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('entity-info'))
      );

      expect(entityInfoCall).toBeDefined();

      // When no items, should show 0
      expect(entityInfoCall.flat()).toContain(0);
    });

    it('should handle entity that does not exist in states', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.nonexistent',
      };

      expect(() => configEditor.render()).not.toThrow();
    });

    it('should use entity ID as fallback for friendly name in combo box', () => {
      mockHass.states = {
        'sensor.no_friendly_name': createMockEntity('sensor.no_friendly_name', {
          attributes: { items: [] },
        }),
      };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Should use entity ID as label when no friendly name
      expect(items).toContainEqual({
        label: 'sensor.no_friendly_name',
        value: 'sensor.no_friendly_name',
      });
    });

    it('should handle empty states object', () => {
      mockHass.states = {};

      expect(() => configEditor.render()).not.toThrow();
    });
  });

  describe('_valueChanged', () => {
    beforeEach(() => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.old_entity',
      };
    });

    it('should return early when config is undefined', () => {
      configEditor['_config'] = undefined;
      const mockEvent = {
        detail: { value: 'sensor.new_entity' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(configEditor.dispatchEvent).not.toHaveBeenCalled();
    });

    it('should return early when value has not changed', () => {
      const mockEvent = {
        detail: { value: 'sensor.old_entity' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(configEditor.dispatchEvent).not.toHaveBeenCalled();
    });

    it('should dispatch config-changed event when value changes', () => {
      const mockEvent = {
        detail: { value: 'sensor.new_entity' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(configEditor.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'config-changed',
          detail: {
            config: {
              type: 'inventory-card',
              entity: 'sensor.new_entity',
            },
          },
          bubbles: true,
          composed: true,
        })
      );
    });

    it('should preserve other config properties when updating entity', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.old_entity',
        someOtherProperty: 'test' as any,
      };

      const mockEvent = {
        detail: { value: 'sensor.new_entity' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(configEditor.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            config: {
              type: 'inventory-card',
              entity: 'sensor.new_entity',
              someOtherProperty: 'test',
            },
          },
        })
      );
    });

    it('should handle empty string value', () => {
      const mockEvent = {
        detail: { value: '' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(configEditor.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            config: {
              type: 'inventory-card',
              entity: '',
            },
          },
        })
      );
    });

    it('should handle null value', () => {
      const mockEvent = {
        detail: { value: null },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(configEditor.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            config: {
              type: 'inventory-card',
              entity: null,
            },
          },
        })
      );
    });

    it('should handle undefined value', () => {
      const mockEvent = {
        detail: { value: undefined },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(configEditor.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            config: {
              type: 'inventory-card',
              entity: undefined,
            },
          },
        })
      );
    });

    it('should handle event with no detail', () => {
      const mockEvent = {
        detail: undefined,
      } as any;

      expect(() => configEditor['_valueChanged'](mockEvent)).not.toThrow();
    });

    it('should handle event with no detail.value', () => {
      const mockEvent = {
        detail: {},
      } as any;

      configEditor['_valueChanged'](mockEvent);

      expect(configEditor.dispatchEvent).toHaveBeenCalled();
    });

    it('should test strict equality in _valueChanged', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.test',
      };

      // Reset the mock
      (configEditor.dispatchEvent as any).mockClear();

      // Test with same value - should not dispatch
      const noChangeEvent = new CustomEvent('value-changed', {
        detail: { value: 'sensor.test' },
      });

      configEditor['_valueChanged'](noChangeEvent);
      expect(configEditor.dispatchEvent).not.toHaveBeenCalled();

      // Test with different value - should dispatch
      const changeEvent = new CustomEvent('value-changed', {
        detail: { value: 'sensor.different' },
      });

      configEditor['_valueChanged'](changeEvent);
      expect(configEditor.dispatchEvent).toHaveBeenCalled();
    });
  });

  describe('styles', () => {
    it('should return CSS styles', () => {
      const styles = ConfigEditor.styles;

      expect(styles).toBeDefined();
    });
  });

  describe('entity filtering logic', () => {
    it('should correctly filter sensor entities with inventory in name', () => {
      mockHass.states = {
        'sensor.inventory_test': createMockEntity('sensor.inventory_test'),
        'light.inventory_test': createMockEntity('light.inventory_test'),
        'sensor.other': createMockEntity('sensor.other'),
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      // Verify that only sensor.inventory_test is included in the filtered entities
      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      expect(items).toEqual([{ label: 'sensor.inventory_test', value: 'sensor.inventory_test' }]);

      // Verify light.inventory_test is not included (wrong domain)
      expect(items.some((item) => item.value === 'light.inventory_test')).toBe(false);

      // Verify sensor.other is not included (no inventory in name)
      expect(items.some((item) => item.value === 'sensor.other')).toBe(false);
    });

    it('should correctly filter sensor entities with items attribute', () => {
      mockHass.states = {
        'sensor.with_items': createMockEntity('sensor.with_items', {
          attributes: { items: [] },
        }),
        'sensor.without_items': createMockEntity('sensor.without_items'),
        'light.with_items': createMockEntity('light.with_items', {
          attributes: { items: [] },
        }),
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      // Verify that only sensor.with_items is included in the filtered entities
      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      expect(items).toEqual([{ label: 'sensor.with_items', value: 'sensor.with_items' }]);

      // Verify light.with_items is not included (wrong domain)
      expect(items.some((item) => item.value === 'light.with_items')).toBe(false);
    });

    it('should correctly sort filtered entities', () => {
      mockHass.states = {
        'sensor.c_inventory': createMockEntity('sensor.c_inventory'),
        'sensor.a_inventory': createMockEntity('sensor.a_inventory'),
        'sensor.b_inventory': createMockEntity('sensor.b_inventory'),
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      // Verify that entities are sorted alphabetically
      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      expect(items).toEqual([
        { label: 'sensor.a_inventory', value: 'sensor.a_inventory' },
        { label: 'sensor.b_inventory', value: 'sensor.b_inventory' },
        { label: 'sensor.c_inventory', value: 'sensor.c_inventory' },
      ]);
    });

    it('should handle null attributes safely', () => {
      mockHass.states = {
        'sensor.null_attributes': createMockEntity('sensor.null_attributes', {
          attributes: null as any,
        }),
        'sensor.inventory': createMockEntity('sensor.inventory'),
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      (html as any).mockClear();

      // Should not throw an error
      expect(() => configEditor.render()).not.toThrow();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Only sensor.inventory should be included, not the one with null attributes
      expect(items).toEqual([{ label: 'sensor.inventory', value: 'sensor.inventory' }]);
    });

    it('should test logical operator mutations in entity filtering', () => {
      mockHass.states = {
        'sensor.inventory_test': createMockEntity('sensor.inventory_test', {
          attributes: {},
        }), // Has 'inventory' but no items
        'sensor.test_entity': createMockEntity('sensor.test_entity', {
          attributes: { items: [] },
        }), // Has items but no 'inventory'
        'light.inventory_test': createMockEntity('light.inventory_test', {
          attributes: { items: [] },
        }), // Not sensor
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Should filter entities with either 'inventory' in name OR items attribute
      // Mutation changing || to && would filter differently
      expect(items).toContainEqual({
        label: 'sensor.inventory_test',
        value: 'sensor.inventory_test',
      });
      expect(items).toContainEqual({
        label: 'sensor.test_entity',
        value: 'sensor.test_entity',
      });
      expect(items).toHaveLength(2);
    });

    it('should test startsWith mutation', () => {
      mockHass.states = {
        'sensor.inventory': createMockEntity('sensor.inventory', {
          attributes: { items: [] },
        }),
        'binary_sensor.inventory': createMockEntity('binary_sensor.inventory', {
          attributes: { items: [] },
        }),
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Only sensor.inventory should be included, not binary_sensor.inventory
      expect(items).toEqual([{ label: 'sensor.inventory', value: 'sensor.inventory' }]);
    });

    it('should test includes mutation', () => {
      mockHass.states = {
        'sensor.my_inventory_test': createMockEntity('sensor.my_inventory_test', {
          attributes: {},
        }),
        'sensor.temperature': createMockEntity('sensor.temperature', {
          attributes: {},
        }),
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Should include entity with 'inventory' in name
      expect(items).toEqual([
        { label: 'sensor.my_inventory_test', value: 'sensor.my_inventory_test' },
      ]);
    });

    it('should test undefined check mutations', () => {
      mockHass.states = {
        'sensor.test': createMockEntity('sensor.test', {
          attributes: { items: undefined },
        }),
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Should handle undefined items gracefully
      expect(items).toEqual([]);
    });
  });

  describe('rendering logic', () => {
    it('should correctly render entity info with friendly name', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.test_inventory',
      };

      mockHass.states = {
        'sensor.test_inventory': createMockEntity('sensor.test_inventory', {
          attributes: {
            friendly_name: 'Test Inventory',
            items: [{ name: 'item1' }, { name: 'item2' }],
          },
        }),
      };

      configEditor.hass = mockHass;

      (html as any).mockClear();
      configEditor.render();

      // Find the entity info section in the template
      const entityInfoCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('entity-info'))
      );

      expect(entityInfoCall).toBeDefined();

      // Check if friendly name is included
      const values = entityInfoCall.flat().filter((v) => typeof v === 'string');
      expect(values).toContain('Test Inventory');

      // Check if item count is included
      expect(entityInfoCall.flat()).toContain(2);
    });

    it('should correctly render entity info without friendly name', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.test_inventory',
      };

      mockHass.states = {
        'sensor.test_inventory': createMockEntity('sensor.test_inventory', {
          attributes: {
            items: [{ name: 'item1' }],
          },
        }),
      };

      configEditor.hass = mockHass;

      (html as any).mockClear();
      configEditor.render();

      // Find the entity info section in the template
      const entityInfoCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('entity-info'))
      );

      expect(entityInfoCall).toBeDefined();

      // When no friendly name, should fall back to entity ID
      const values = entityInfoCall.flat().filter((v) => typeof v === 'string');
      expect(values).toContain('sensor.test_inventory');

      // Check if item count is included
      expect(entityInfoCall.flat()).toContain(1);
    });

    it('should correctly render no-entity message when no entity selected', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: '',
      };

      configEditor.hass = mockHass;

      (html as any).mockClear();
      configEditor.render();

      // Find the no-entity message in the template
      const noEntityCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('no-entity'))
      );

      expect(noEntityCall).toBeDefined();
      expect(
        noEntityCall[0].some((str) => str.includes('Please select an inventory entity above'))
      ).toBe(true);
    });
  });

  describe('edge cases and mutation tests', () => {
    it('should handle states with null attributes', () => {
      mockHass.states = {
        'sensor.inventory_test': createMockEntity('sensor.inventory_test', {
          attributes: null as any,
        }),
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      expect(() => configEditor.render()).not.toThrow();
    });

    it('should test empty entity list rendering', () => {
      mockHass.states = {
        'light.test': createMockEntity('light.test', {
          attributes: {},
        }), // Not a sensor
        'switch.test': createMockEntity('switch.test', {
          attributes: {},
        }), // Not a sensor
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Should handle case with no valid entities
      expect(items).toEqual([]);
    });

    it('should test entity filtering with complex conditions', () => {
      mockHass.states = {
        'sensor.has_inventory_name': createMockEntity('sensor.has_inventory_name', {
          attributes: {},
        }), // inventory in name, no items
        'sensor.has_items': createMockEntity('sensor.has_items', {
          attributes: { items: [] },
        }), // items but no inventory in name
        'sensor.has_both': createMockEntity('sensor.has_both', {
          attributes: { items: [] },
        }), // This one doesn't have inventory in name but has items
        'sensor.inventory_and_items': createMockEntity('sensor.inventory_and_items', {
          attributes: { items: [] },
        }), // Has both
        'binary_sensor.inventory': createMockEntity('binary_sensor.inventory', {
          attributes: { items: [] },
        }), // Wrong domain
      };

      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      (html as any).mockClear();
      configEditor.render();

      // Find the call that contains the combo box items
      const comboBoxCall = (html as any).mock.calls.find((call) =>
        call[0].some((str) => str.includes('.items='))
      );

      expect(comboBoxCall).toBeDefined();
      const itemsIndex = comboBoxCall[0].findIndex((str) => str.includes('.items='));
      const items = comboBoxCall[itemsIndex + 1];

      // Test the complex filtering logic: sensor.* AND (inventory in name OR items exists)
      expect(items).toContainEqual({
        label: 'sensor.has_inventory_name',
        value: 'sensor.has_inventory_name',
      });
      expect(items).toContainEqual({
        label: 'sensor.has_items',
        value: 'sensor.has_items',
      });
      expect(items).toContainEqual({
        label: 'sensor.has_both',
        value: 'sensor.has_both',
      });
      expect(items).toContainEqual({
        label: 'sensor.inventory_and_items',
        value: 'sensor.inventory_and_items',
      });
      expect(items).toHaveLength(4);

      // Verify binary_sensor.inventory is not included (wrong domain)
      expect(items.some((item) => item.value === 'binary_sensor.inventory')).toBe(false);
    });
  });
});
