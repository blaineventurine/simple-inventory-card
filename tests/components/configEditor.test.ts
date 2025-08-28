import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigEditor } from '../../src/components/configEditor';
import { Utilities } from '../../src/utils/utilities';
import {
  createEntitySelector,
  createEntityInfo,
  createNoEntityMessage,
} from '../../src/templates/configEditor';
import { HomeAssistant, InventoryConfig } from '../../src/types/homeAssistant';
import { createMockHomeAssistant, createMockHassEntity } from '../testHelpers';

vi.mock('../../src/utils/utilities');
vi.mock('../../src/templates/configEditor');

vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    dispatchEvent = vi.fn();
    requestUpdate = vi.fn();
    static get properties() {
      return {};
    }
    static get styles() {
      return {};
    }
  },
  html: vi.fn((strings, ...values) => ({
    strings,
    values,
    _$litType$: 1, // Lit template marker
    toString: () => strings.join(''),
  })),
  css: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    toString: () => strings.join(''),
  })),
}));

describe('ConfigEditor', () => {
  let configEditor: ConfigEditor;
  let mockHass: HomeAssistant;

  beforeEach(() => {
    configEditor = new ConfigEditor();
    mockHass = createMockHomeAssistant();
    vi.clearAllMocks();
  });

  describe('Construction and Properties', () => {
    it('should initialize with default config', () => {
      expect(configEditor['_config']).toEqual({
        entity: '',
        type: '',
      });
    });

    it('should define correct static properties', () => {
      const properties = ConfigEditor.properties;
      expect(properties).toEqual({
        hass: { type: Object },
        _config: { type: Object },
      });
    });
  });

  describe('Configuration Management', () => {
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
  });

  describe('Entity Property Getter', () => {
    it('should return entity when config exists', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.test_inventory',
      };

      expect(configEditor['_entity']).toBe('sensor.test_inventory');
    });

    it('should return empty string when config is null', () => {
      configEditor['_config'] = undefined as any;
      expect(configEditor['_entity']).toBe('');
    });

    it('should return empty string when entity is undefined', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: undefined as any,
      };

      expect(configEditor['_entity']).toBe('');
    });
  });

  describe('Rendering Coordination', () => {
    beforeEach(() => {
      configEditor.hass = mockHass;
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: '',
      };

      vi.mocked(Utilities.findInventoryEntities).mockReturnValue([]);
      vi.mocked(Utilities.createEntityOptions).mockReturnValue([]);
    });

    it('should set default entity and dispatch event when no entity selected', () => {
      const mockEntities = ['sensor.inventory1', 'sensor.inventory2'];
      vi.mocked(Utilities.findInventoryEntities).mockReturnValue(mockEntities);

      configEditor['_config'] = {
        type: 'custom:simple-inventory-card',
        entity: '',
      };

      configEditor.render();

      expect(configEditor['_config'].entity).toBe('sensor.inventory1');
      expect(vi.mocked(configEditor.dispatchEvent)).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'config-changed',
          detail: {
            config: {
              type: 'custom:simple-inventory-card',
              entity: 'sensor.inventory1',
            },
          },
        }),
      );
    });

    it('should not set default entity when entity already selected', () => {
      const mockEntities = ['sensor.inventory1', 'sensor.inventory2'];
      vi.mocked(Utilities.findInventoryEntities).mockReturnValue(mockEntities);

      configEditor['_config'] = {
        type: 'custom:simple-inventory-card',
        entity: 'sensor.existing',
      };

      configEditor.render();

      expect(configEditor['_config'].entity).toBe('sensor.existing');
      expect(vi.mocked(configEditor.dispatchEvent)).not.toHaveBeenCalled();
    });

    it('should return loading template when hass is missing', () => {
      configEditor.hass = undefined as any;

      const result = configEditor.render();

      // Should return a loading template (exact implementation depends on template)
      expect(result).toBeDefined();
    });

    it('should return loading template when config is missing', () => {
      configEditor['_config'] = undefined as any;

      const result = configEditor.render();

      expect(result).toBeDefined();
    });

    it('should delegate to Utilities for entity processing', () => {
      const mockEntities = ['sensor.inventory1', 'sensor.inventory2'];
      const mockOptions = [
        { value: 'sensor.inventory1', label: 'Inventory 1' },
        { value: 'sensor.inventory2', label: 'Inventory 2' },
      ];

      vi.mocked(Utilities.findInventoryEntities).mockReturnValue(mockEntities);
      vi.mocked(Utilities.createEntityOptions).mockReturnValue(mockOptions);

      configEditor.render();

      expect(Utilities.findInventoryEntities).toHaveBeenCalledWith(mockHass);
      expect(Utilities.createEntityOptions).toHaveBeenCalledWith(mockHass, mockEntities);
    });

    it('should delegate to template functions', () => {
      const mockEntities = ['sensor.inventory1'];
      const mockOptions = [{ value: 'sensor.inventory1', label: 'Inventory 1' }];

      vi.mocked(Utilities.findInventoryEntities).mockReturnValue(mockEntities);
      vi.mocked(Utilities.createEntityOptions).mockReturnValue(mockOptions);

      configEditor.render();

      expect(createEntitySelector).toHaveBeenCalledWith(
        mockHass,
        mockOptions,
        'sensor.inventory1',
        expect.any(Function),
        expect.any(Object),
      );
    });

    it('should render entity info when entity is selected', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.test_inventory',
      };

      mockHass.states = {
        'sensor.test_inventory': createMockHassEntity('sensor.test_inventory', {
          attributes: { friendly_name: 'Test Inventory', items: [] },
        }),
      };

      configEditor.render();

      expect(createEntityInfo).toHaveBeenCalledWith(
        mockHass,
        'sensor.test_inventory',
        expect.any(Object),
      );
    });

    it('should render no-entity message when no entity selected', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: '',
      };

      configEditor.render();

      expect(createNoEntityMessage).toHaveBeenCalled();
    });
  });

  describe('Value Change Handling', () => {
    beforeEach(() => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.old_entity',
      };
    });

    it('should update internal config and call requestUpdate when value changes', () => {
      configEditor['_config'] = {
        type: 'custom:simple-inventory-card',
        entity: 'sensor.old_entity',
      };

      const mockEvent = {
        detail: { value: 'sensor.new_entity' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(configEditor['_config'].entity).toBe('sensor.new_entity');
      expect(vi.mocked(configEditor.requestUpdate)).toHaveBeenCalled();
      expect(vi.mocked(configEditor.dispatchEvent)).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'config-changed',
          detail: {
            config: {
              type: 'custom:simple-inventory-card',
              entity: 'sensor.new_entity',
            },
          },
        }),
      );
    });

    it('should set default type when type is missing', () => {
      configEditor['_config'] = {
        type: '',
        entity: 'sensor.old_entity',
      };

      const mockEvent = {
        detail: { value: 'sensor.new_entity' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(vi.mocked(configEditor.dispatchEvent)).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            config: expect.objectContaining({
              type: 'custom:simple-inventory-card',
              entity: 'sensor.new_entity',
            }),
          },
        }),
      );
    });

    it('should return early when config is null', () => {
      configEditor['_config'] = undefined as any;
      const mockEvent = {
        detail: { value: 'sensor.new_entity' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(vi.mocked(configEditor.dispatchEvent)).not.toHaveBeenCalled();
    });

    it('should return early when value has not changed', () => {
      const mockEvent = {
        detail: { value: 'sensor.old_entity' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(vi.mocked(configEditor.dispatchEvent)).not.toHaveBeenCalled();
    });

    it('should dispatch config-changed event when value changes', () => {
      const mockEvent = {
        detail: { value: 'sensor.new_entity' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(vi.mocked(configEditor.dispatchEvent)).toHaveBeenCalledWith(
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
        }),
      );
    });

    it('should preserve other config properties when updating entity', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.old_entity',
        someOtherProperty: 'test',
      } as any;

      const mockEvent = {
        detail: { value: 'sensor.new_entity' },
      } as CustomEvent;

      configEditor['_valueChanged'](mockEvent);

      expect(vi.mocked(configEditor.dispatchEvent)).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            config: expect.objectContaining({
              type: 'inventory-card',
              entity: 'sensor.new_entity',
              someOtherProperty: 'test',
            }),
          },
        }),
      );
    });

    it('should handle events with missing detail gracefully', () => {
      const mockEvent = { detail: undefined } as any;

      expect(() => configEditor['_valueChanged'](mockEvent)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty states object gracefully', () => {
      mockHass.states = {};
      configEditor.hass = mockHass;
      configEditor['_config'] = { type: 'inventory-card', entity: '' };

      expect(() => configEditor.render()).not.toThrow();
    });

    it('should handle missing entity gracefully', () => {
      configEditor['_config'] = {
        type: 'inventory-card',
        entity: 'sensor.nonexistent',
      };

      expect(() => configEditor.render()).not.toThrow();
    });
  });

  describe('Static Methods', () => {
    it('should have styles defined', () => {
      const styles = ConfigEditor.styles;
      expect(styles).toBeDefined();
    });
  });
});
