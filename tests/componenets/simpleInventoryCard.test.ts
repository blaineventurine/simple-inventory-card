import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { LifecycleManager } from '../../src/services/lifecycleManager';
import { RenderingCoordinator } from '../../src/services/renderingCoordinator';
import { Utils } from '../../src/utils/utils';
import { HomeAssistant, InventoryConfig } from '../../src/types/home-assistant';
import { createMockHomeAssistant, createMockHassEntity } from '../testHelpers';

vi.mock('../../src/services/lifecycleManager');
vi.mock('../../src/services/renderingCoordinator');
vi.mock('../../src/utils/utils');
vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    shadowRoot: any = null;
    constructor() {
      this.shadowRoot = document.createElement('div');
    }
    attachShadow() {
      return this.shadowRoot;
    }
  },
  css: vi.fn((strings: TemplateStringsArray) => ({
    cssText: strings.join(''),
    toString: () => strings.join(''),
  })),
}));

describe('SimpleInventoryCard', () => {
  let card: SimpleInventoryCard;
  let mockLifecycleManager: any;
  let mockRenderingCoordinator: any;

  beforeEach(() => {
    mockLifecycleManager = {
      initialize: vi.fn(),
      updateDependencies: vi.fn(),
      getServices: vi.fn(),
      isReady: vi.fn(),
      cleanup: vi.fn(),
    };

    mockRenderingCoordinator = {
      render: vi.fn(),
      cleanup: vi.fn(),
    };

    vi.mocked(LifecycleManager).mockImplementation(() => mockLifecycleManager);
    vi.mocked(RenderingCoordinator).mockImplementation(() => mockRenderingCoordinator);
    vi.mocked(Utils.extractTodoLists).mockReturnValue([
      { id: 'todo.shopping', name: 'Shopping List' },
    ]);
    vi.mocked(Utils.validateInventoryItems).mockReturnValue([]);

    card = new SimpleInventoryCard();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Construction', () => {
    it('should initialize lifecycle and rendering managers', () => {
      expect(LifecycleManager).toHaveBeenCalledWith(card.shadowRoot);
      expect(RenderingCoordinator).toHaveBeenCalledWith(mockLifecycleManager, card.shadowRoot);
    });
  });

  describe('Configuration Management', () => {
    it('should require entity in config', () => {
      expect(() => card.setConfig({} as InventoryConfig)).toThrow('Entity is required');
      expect(() => card.setConfig({ entity: '' } as InventoryConfig)).toThrow('Entity is required');
      expect(() => card.setConfig({ entity: null } as any)).toThrow('Entity is required');
    });

    it('should accept valid config', () => {
      const config = { entity: 'sensor.inventory' } as InventoryConfig;

      expect(() => card.setConfig(config)).not.toThrow();
      expect((card as any)._config).toBe(config);
    });
  });

  describe('Home Assistant Integration', () => {
    let mockHass: HomeAssistant;
    let config: InventoryConfig;

    beforeEach(() => {
      config = { entity: 'sensor.inventory' } as InventoryConfig;
      card.setConfig(config);

      mockHass = createMockHomeAssistant({
        'sensor.inventory': createMockHassEntity('sensor.inventory', {
          state: 'active',
          attributes: {
            items: [],
            friendly_name: 'Test Inventory',
          },
        }),
        'todo.shopping': createMockHassEntity('todo.shopping', {
          state: 'active',
          attributes: {
            friendly_name: 'Shopping List',
          },
        }),
      });

      const mockServices = {
        state: {
          hasRealEntityChange: vi.fn(),
          userInteracting: false,
          debouncedRender: vi.fn(),
        },
      };
      mockLifecycleManager.getServices.mockReturnValue(mockServices);
    });

    it('should render on first hass assignment', () => {
      const renderSpy = vi.spyOn(card, 'render');

      card.hass = mockHass;

      expect(Utils.extractTodoLists).toHaveBeenCalledWith(mockHass);
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should update dependencies and handle entity changes', () => {
      card.hass = mockHass;
      vi.clearAllMocks();

      const mockState = mockLifecycleManager.getServices().state;
      mockState.hasRealEntityChange.mockReturnValue(true);
      mockState.userInteracting = false;

      const renderSpy = vi.spyOn(card, 'render');

      const updatedHass = { ...mockHass, updated: true } as any;
      card.hass = updatedHass;

      expect(mockLifecycleManager.updateDependencies).toHaveBeenCalledWith(updatedHass, config);
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should use debounced render when user is interacting', () => {
      card.hass = mockHass;
      vi.clearAllMocks();

      const mockState = mockLifecycleManager.getServices().state;
      mockState.hasRealEntityChange.mockReturnValue(true);
      mockState.userInteracting = true;

      const renderSpy = vi.spyOn(card, 'render');

      // Update hass
      card.hass = { ...mockHass, updated: true } as any;

      expect(mockState.debouncedRender).toHaveBeenCalled();
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should extract todo lists from hass states', () => {
      card.hass = mockHass;

      expect(Utils.extractTodoLists).toHaveBeenCalledWith(mockHass);
      expect((card as any)._todoLists).toEqual([{ id: 'todo.shopping', name: 'Shopping List' }]);
    });
  });

  describe('Rendering Coordination', () => {
    beforeEach(() => {
      const config = { entity: 'sensor.inventory' } as InventoryConfig;
      const mockHass = { states: {} } as HomeAssistant;

      card.setConfig(config);
      card.hass = mockHass;
    });

    it('should delegate rendering to RenderingCoordinator', () => {
      card.render();

      expect(mockRenderingCoordinator.render).toHaveBeenCalledWith(
        (card as any)._config,
        (card as any)._hass,
        (card as any)._todoLists,
        expect.any(Function), // validateInventoryItems callback
      );
    });

    it('should pass Utils.validateInventoryItems as callback', () => {
      card.render();

      const renderCall = mockRenderingCoordinator.render.mock.calls[0];
      const validateCallback = renderCall[3];

      // Test the callback delegates to Utils
      const testItems = [{ name: 'test' }];
      validateCallback(testItems);

      expect(Utils.validateInventoryItems).toHaveBeenCalledWith(testItems);
    });
  });

  describe('Lifecycle Management', () => {
    it('should return correct card size', () => {
      expect(card.getCardSize()).toBe(4);
    });

    it('should cleanup managers on disconnect', () => {
      card.disconnectedCallback();

      expect(mockLifecycleManager.cleanup).toHaveBeenCalled();
      expect(mockRenderingCoordinator.cleanup).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing dependencies gracefully', () => {
      expect(() => card.render()).not.toThrow();

      // RenderingCoordinator should handle the missing dependencies
      expect(mockRenderingCoordinator.render).toHaveBeenCalledWith(
        null, // no config
        null, // no hass
        [], // empty todo lists
        expect.any(Function),
      );
    });

    it('should handle hass updates without config', () => {
      const mockHass = createMockHomeAssistant();

      expect(() => {
        card.hass = mockHass;
      }).not.toThrow();

      expect(mockLifecycleManager.updateDependencies).not.toHaveBeenCalled();
    });
  });

  describe('Static Methods', () => {
    it('should provide config element', () => {
      const configElement = SimpleInventoryCard.getConfigElement();
      expect(configElement.tagName.toLowerCase()).toBe('simple-inventory-config-editor');
    });

    it('should provide stub config', () => {
      const stubConfig = SimpleInventoryCard.getStubConfig();
      expect(stubConfig).toEqual({});
    });
  });
});
