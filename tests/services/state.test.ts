import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { State } from '../../src/services/state';
import { HomeAssistant, HassEntity } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import { must } from '../testHelpers';

describe('State', () => {
  let state: State;
  let mockHass: HomeAssistant;
  let mockShadowRoot: ShadowRoot;
  let mockInputs: Array<{ addEventListener: ReturnType<typeof vi.fn> }>;

  beforeEach(() => {
    vi.useFakeTimers();
    state = new State();

    // Mock HomeAssistant
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

    mockInputs = [
      {
        addEventListener: vi.fn(),
      },
      {
        addEventListener: vi.fn(),
      },
      {
        addEventListener: vi.fn(),
      },
    ];
    mockShadowRoot = {
      querySelectorAll: vi.fn().mockReturnValue(mockInputs),
    } as any;

    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    state.cleanup();
  });

  describe('trackUserInteraction', () => {
    it('should set up event listeners on all input elements', () => {
      state.trackUserInteraction(mockShadowRoot);

      expect(mockShadowRoot.querySelectorAll).toHaveBeenCalledWith('input, select, textarea');
      for (const input of mockInputs) {
        expect(input.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
        expect(input.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
      }
    });

    it('should set userInteracting to true on focus', () => {
      state.trackUserInteraction(mockShadowRoot);
      expect(state.userInteracting).toBe(false);

      // Simulate focus event
      const focusHandler = must(
        mockInputs[0].addEventListener.mock.calls.find((call: any) => call[0] === 'focus'),
      )[1];
      focusHandler();

      expect(state.userInteracting).toBe(true);
    });

    it('should set userInteracting to false on blur after delay', () => {
      state.trackUserInteraction(mockShadowRoot);
      state.userInteracting = true;

      // Simulate blur event
      const blurHandler = must(
        mockInputs[0].addEventListener.mock.calls.find((call: any) => call[0] === 'blur'),
      )[1];
      blurHandler();

      // Should still be true immediately
      expect(state.userInteracting).toBe(true);

      // After 100ms delay
      vi.advanceTimersByTime(100);
      expect(state.userInteracting).toBe(false);
    });

    it('should handle blur timeout correctly', () => {
      state.trackUserInteraction(mockShadowRoot);

      const focusHandler = must(
        mockInputs[0].addEventListener.mock.calls.find((call: any) => call[0] === 'focus'),
      )[1];
      const blurHandler = must(
        mockInputs[0].addEventListener.mock.calls.find((call: any) => call[0] === 'blur'),
      )[1];

      // Focus first
      focusHandler();
      expect(state.userInteracting).toBe(true);

      // Blur - starts timeout
      blurHandler();
      expect(state.userInteracting).toBe(true); // Still true immediately

      // The blur timeout will set userInteracting to false
      vi.advanceTimersByTime(100);
      expect(state.userInteracting).toBe(false);
    });

    it('should handle empty input list', () => {
      mockShadowRoot.querySelectorAll = vi.fn().mockReturnValue([]);

      expect(() => {
        state.trackUserInteraction(mockShadowRoot);
      }).not.toThrow();
    });
  });

  describe('hasRealEntityChange', () => {
    const entityId = 'sensor.test_inventory';

    it('should return false when entity does not exist', () => {
      const result = state.hasRealEntityChange(mockHass, entityId);
      expect(result).toBe(false);
    });

    it('should return true for first time with valid entity', () => {
      const mockEntity: HassEntity = {
        entity_id: entityId,
        state: 'on',
        attributes: {
          items: [{ name: 'Test Item', quantity: 5 }] as InventoryItem[],
        },
        context: { id: 'test', user_id: '' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      mockHass.states[entityId] = mockEntity;
      const result = state.hasRealEntityChange(mockHass, entityId);
      expect(result).toBe(true);
    });

    it('should return false when items have not changed', () => {
      const items = [{ name: 'Test Item', quantity: 5 }] as InventoryItem[];
      const mockEntity: HassEntity = {
        entity_id: entityId,
        state: 'on',
        attributes: { items },
        context: { id: 'test', user_id: '' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      mockHass.states[entityId] = mockEntity;

      // First call - should return true (first time)
      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);

      // Second call with same data - should return false
      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);
    });

    it('should return true when total_quantity has changed', () => {
      const mockEntity: HassEntity = {
        entity_id: entityId,
        state: 'on',
        attributes: { total_items: 1, total_quantity: 5 },
        context: { id: 'test', user_id: '' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      mockHass.states[entityId] = mockEntity;

      // First call
      state.hasRealEntityChange(mockHass, entityId);

      // Create new entity with different total_quantity
      const newMockEntity: HassEntity = {
        ...mockEntity,
        attributes: { total_items: 1, total_quantity: 10 },
      };
      mockHass.states[entityId] = newMockEntity;

      // Should detect change via total_quantity
      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);
    });

    it('should handle entities with undefined items', () => {
      const mockEntity: HassEntity = {
        entity_id: entityId,
        state: 'on',
        attributes: {},
        context: { id: 'test', user_id: '' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      mockHass.states[entityId] = mockEntity;

      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);
      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);
    });

    it('should handle transition detected via last_changed', () => {
      const mockEntity: HassEntity = {
        entity_id: entityId,
        state: 'on',
        attributes: {},
        context: { id: 'test', user_id: '' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      mockHass.states[entityId] = mockEntity;

      // First call
      state.hasRealEntityChange(mockHass, entityId);

      // Create new entity with different last_changed and total_items
      const newMockEntity: HassEntity = {
        ...mockEntity,
        attributes: { total_items: 1 },
        last_changed: '2023-01-02T00:00:00Z',
      };
      mockHass.states[entityId] = newMockEntity;

      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);
    });

    it('should handle empty items array', () => {
      const mockEntity: HassEntity = {
        entity_id: entityId,
        state: 'on',
        attributes: { items: [] as InventoryItem[] },
        context: { id: 'test', user_id: '' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      mockHass.states[entityId] = mockEntity;

      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);
      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should reset all state properties', () => {
      state.userInteracting = true;

      state.cleanup();

      expect(state.userInteracting).toBe(false);
    });

    it('should handle cleanup of a fresh state', () => {
      expect(() => {
        state.cleanup();
      }).not.toThrow();

      expect(state.userInteracting).toBe(false);
    });

    it('should handle multiple cleanup calls', () => {
      state.userInteracting = true;

      state.cleanup();
      state.cleanup(); // Second cleanup

      expect(state.userInteracting).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should handle complete user interaction workflow', () => {
      state.trackUserInteraction(mockShadowRoot);

      // Simulate user interaction
      const focusHandler = must(
        mockInputs[0].addEventListener.mock.calls.find((call: any) => call[0] === 'focus'),
      )[1];
      focusHandler();

      expect(state.userInteracting).toBe(true);

      state.cleanup();
      expect(state.userInteracting).toBe(false);
    });

    it('should handle entity state changes with user interaction', () => {
      const entityId = 'sensor.test';
      const mockEntity: HassEntity = {
        entity_id: entityId,
        state: 'on',
        attributes: { items: [] as InventoryItem[] },
        context: { id: 'test', user_id: '' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      mockHass.states[entityId] = mockEntity;

      // First check - should be true
      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);

      // Set user interaction
      state.userInteracting = true;

      // Same check - should be false
      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);

      // Create new entity with different last_changed and total_items
      const newMockEntity: HassEntity = {
        ...mockEntity,
        attributes: { total_items: 1, total_quantity: 1 },
        last_changed: '2023-01-02T00:00:00Z',
      };
      mockHass.states[entityId] = newMockEntity;

      // Should detect change even with user interaction
      expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);
    });
  });
});

describe('State - Additional mutation killing tests', () => {
  let state: State;
  let mockHass: HomeAssistant;

  beforeEach(() => {
    vi.useFakeTimers();
    state = new State();

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

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    state.cleanup();
  });

  // Kill OptionalChaining mutants - test with null/undefined attributes
  it('should handle entities with null attributes', () => {
    const entityId = 'sensor.test';
    const mockEntity: HassEntity = {
      entity_id: entityId,
      state: 'on',
      attributes: null as any, // This will break without optional chaining
      context: { id: 'test', user_id: '' },
      last_changed: '2023-01-01T00:00:00Z',
      last_updated: '2023-01-01T00:00:00Z',
    };

    mockHass.states[entityId] = mockEntity;

    // Should not crash and should work correctly
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);
  });

  it('should handle entities with undefined attributes', () => {
    const entityId = 'sensor.test';
    const mockEntity: HassEntity = {
      entity_id: entityId,
      state: 'on',
      attributes: undefined as any, // This will break without optional chaining
      context: { id: 'test', user_id: '' },
      last_changed: '2023-01-01T00:00:00Z',
      last_updated: '2023-01-01T00:00:00Z',
    };

    mockHass.states[entityId] = mockEntity;

    // Should not crash and should work correctly
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);
  });

  // Kill ConditionalExpression and LogicalOperator mutants
  it('should detect change when any of last_changed, total_items, or total_quantity differs', () => {
    const entityId = 'sensor.test';

    const mockEntity1: HassEntity = {
      entity_id: entityId,
      state: 'on',
      attributes: { total_items: 2, total_quantity: 5 },
      context: { id: 'test', user_id: '' },
      last_changed: '2023-01-01T00:00:00Z',
      last_updated: '2023-01-01T00:00:00Z',
    };

    mockHass.states[entityId] = mockEntity1;
    state.hasRealEntityChange(mockHass, entityId); // First call - stores initial state

    // Change only total_items (last_changed and total_quantity same)
    const mockEntity2: HassEntity = {
      ...mockEntity1,
      attributes: { total_items: 3, total_quantity: 5 },
    };
    mockHass.states[entityId] = mockEntity2;
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);

    // Same entity again - no change
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);
  });

  it('should properly update lastEntityState after detecting a change', () => {
    const entityId = 'sensor.test';

    // Initial state
    const mockEntity1: HassEntity = {
      entity_id: entityId,
      state: 'on',
      attributes: { total_items: 1, total_quantity: 1 },
      context: { id: 'test', user_id: '' },
      last_changed: '2023-01-01T00:00:00Z',
      last_updated: '2023-01-01T00:00:00Z',
    };

    mockHass.states[entityId] = mockEntity1;
    state.hasRealEntityChange(mockHass, entityId); // First call

    // Changed state with higher total_quantity
    const mockEntity2: HassEntity = {
      ...mockEntity1,
      attributes: { total_items: 1, total_quantity: 2 },
    };
    mockHass.states[entityId] = mockEntity2;

    // Should detect change
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);

    // Same entity again - state was updated, so no change
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);

    // Change back to original values - should detect as change again
    mockHass.states[entityId] = {
      ...mockEntity1,
      attributes: { total_items: 1, total_quantity: 1 },
    };
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);
  });

  // Kill BlockStatement, ObjectLiteral, and ArrayDeclaration mutants
  it('should return false on repeated calls with same entity state', () => {
    const entityId = 'sensor.test';

    const mockEntity: HassEntity = {
      entity_id: entityId,
      state: 'on',
      attributes: { total_items: 2, total_quantity: 3 },
      context: { id: 'test', user_id: '' },
      last_changed: '2023-01-01T00:00:00Z',
      last_updated: '2023-01-01T00:00:00Z',
    };

    mockHass.states[entityId] = mockEntity;
    state.hasRealEntityChange(mockHass, entityId); // First call - stores state

    // Change to new entity with more items/quantity
    const newMockEntity: HassEntity = {
      ...mockEntity,
      attributes: { total_items: 3, total_quantity: 5 },
      last_changed: '2023-01-02T00:00:00Z',
    };
    mockHass.states[entityId] = newMockEntity;

    // Should detect change
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);

    // Second call with same new entity should return false (state was updated)
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);
  });

  it('should handle conditional state update scenarios', () => {
    const entityId = 'sensor.test';

    // Test scenario where changed=false, newItems=truthy (should not update)
    const mockEntity: HassEntity = {
      entity_id: entityId,
      state: 'on',
      attributes: { items: [{ name: 'Item1', quantity: 1 }] as InventoryItem[] },
      context: { id: 'test', user_id: '' },
      last_changed: '2023-01-01T00:00:00Z',
      last_updated: '2023-01-01T00:00:00Z',
    };

    mockHass.states[entityId] = mockEntity;

    // First call
    state.hasRealEntityChange(mockHass, entityId);

    // Second call with same data (changed=false, but newItems is truthy)
    const result = state.hasRealEntityChange(mockHass, entityId);
    expect(result).toBe(false); // No change detected

    // Third call should still be false (proving state wasn't updated when changed=false)
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);
  });

  describe('expanded batch lists', () => {
    it('toggles an item in and out of the expanded set', () => {
      expect(state.toggleBatchesExpanded('Milk')).toBe(true);
      expect(state.expandedBatchItems.has('Milk')).toBe(true);
      expect(state.toggleBatchesExpanded('Milk')).toBe(false);
      expect(state.expandedBatchItems.has('Milk')).toBe(false);
    });

    it('forgets expanded items on cleanup', () => {
      state.toggleBatchesExpanded('Milk');
      state.cleanup();
      expect(state.expandedBatchItems.size).toBe(0);
    });
  });
});
