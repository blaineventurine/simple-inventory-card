import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { State } from '../../src/services/state';
import { HomeAssistant, HassEntity, InventoryItem } from '../../src/types/homeAssistant';

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
      const focusHandler = mockInputs[0].addEventListener.mock.calls.find(
        (call: any) => call[0] === 'focus',
      )![1];
      focusHandler();

      expect(state.userInteracting).toBe(true);
    });

    it('should set userInteracting to false on blur after delay', () => {
      state.trackUserInteraction(mockShadowRoot);
      state.userInteracting = true;

      // Simulate blur event
      const blurHandler = mockInputs[0].addEventListener.mock.calls.find(
        (call: any) => call[0] === 'blur',
      )![1];
      blurHandler();

      // Should still be true immediately
      expect(state.userInteracting).toBe(true);

      // After 100ms delay
      vi.advanceTimersByTime(100);
      expect(state.userInteracting).toBe(false);
    });

    it('should handle blur timeout correctly', () => {
      state.trackUserInteraction(mockShadowRoot);

      const focusHandler = mockInputs[0].addEventListener.mock.calls.find(
        (call: any) => call[0] === 'focus',
      )![1];
      const blurHandler = mockInputs[0].addEventListener.mock.calls.find(
        (call: any) => call[0] === 'blur',
      )![1];

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

    it('should return true when items have changed', () => {
      const initialItems = [{ name: 'Test Item', quantity: 5 }] as InventoryItem[];

      const mockEntity: HassEntity = {
        entity_id: entityId,
        state: 'on',
        attributes: { items: initialItems },
        context: { id: 'test', user_id: '' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      mockHass.states[entityId] = mockEntity;

      // First call
      state.hasRealEntityChange(mockHass, entityId);

      // Create new entity with different items (new object reference)
      const changedItems = [{ name: 'Test Item', quantity: 10 }] as InventoryItem[];
      const newMockEntity: HassEntity = {
        ...mockEntity,
        attributes: { items: changedItems },
      };
      mockHass.states[entityId] = newMockEntity;

      // Should detect change
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

    it('should handle transition from undefined to defined items', () => {
      const mockEntity: HassEntity = {
        entity_id: entityId,
        state: 'on',
        attributes: {},
        context: { id: 'test', user_id: '' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      mockHass.states[entityId] = mockEntity;

      // First call with undefined items
      state.hasRealEntityChange(mockHass, entityId);

      // Create new entity with items (new object reference)
      const newMockEntity: HassEntity = {
        ...mockEntity,
        attributes: { items: [{ name: 'New Item', quantity: 1 }] as InventoryItem[] },
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

  describe('debouncedRender', () => {
    it('should warn when no render function is available', () => {
      state.debouncedRender();

      expect(console.warn).toHaveBeenCalledWith('No render function provided to debouncedRender');
    });

    it('should use stored callback when function is provided', () => {
      // The debouncedRender always uses the stored callback, not the provided function
      const mockStoredCallback = vi.fn();
      const mockProvidedFunction = vi.fn();

      state.setRenderCallback(mockStoredCallback);
      state.debouncedRender(mockProvidedFunction);

      vi.advanceTimersByTime(100);

      // Should call the stored callback, not the provided function
      expect(mockStoredCallback).toHaveBeenCalledTimes(1);
      expect(mockProvidedFunction).not.toHaveBeenCalled();
    });

    it('should use stored callback when no function provided', () => {
      const mockCallback = vi.fn();
      state.setRenderCallback(mockCallback);

      state.debouncedRender();
      vi.advanceTimersByTime(100);

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should debounce multiple calls', () => {
      const mockCallback = vi.fn();
      state.setRenderCallback(mockCallback);

      state.debouncedRender();
      state.debouncedRender();
      state.debouncedRender();

      // Should not have called yet
      expect(mockCallback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      // Should only call once
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should respect custom delay', () => {
      const mockCallback = vi.fn();
      state.setRenderCallback(mockCallback);

      state.debouncedRender(undefined, 200);

      vi.advanceTimersByTime(100);
      expect(mockCallback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should create debounced function only once', () => {
      const mockCallback = vi.fn();
      state.setRenderCallback(mockCallback);

      // First call creates debounced function
      state.debouncedRender(undefined, 100);

      // Second call with different delay should still use original delay
      state.debouncedRender(undefined, 200);

      vi.advanceTimersByTime(100);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('setRenderCallback', () => {
    it('should set the render callback', () => {
      const mockCallback = vi.fn();

      state.setRenderCallback(mockCallback);
      state.debouncedRender();

      vi.advanceTimersByTime(100);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should replace existing callback', () => {
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();

      state.setRenderCallback(mockCallback1);
      state.setRenderCallback(mockCallback2);
      state.debouncedRender();

      vi.advanceTimersByTime(100);
      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('debouncedRenderWithCallback', () => {
    it('should call debouncedRender with provided function and delay', () => {
      const mockRenderFunction = vi.fn();
      const spy = vi.spyOn(state, 'debouncedRender');

      state.debouncedRenderWithCallback(mockRenderFunction, 150);

      expect(spy).toHaveBeenCalledWith(mockRenderFunction, 150);
    });

    it('should use default delay when not provided', () => {
      const mockRenderFunction = vi.fn();
      const spy = vi.spyOn(state, 'debouncedRender');

      state.debouncedRenderWithCallback(mockRenderFunction);

      expect(spy).toHaveBeenCalledWith(mockRenderFunction, 100);
    });
  });

  describe('debouncedRenderDefault', () => {
    it('should call debouncedRender with undefined and delay', () => {
      const spy = vi.spyOn(state, 'debouncedRender');

      state.debouncedRenderDefault(200);

      expect(spy).toHaveBeenCalledWith(undefined, 200);
    });

    it('should use default delay when not provided', () => {
      const spy = vi.spyOn(state, 'debouncedRender');

      state.debouncedRenderDefault();

      expect(spy).toHaveBeenCalledWith(undefined, 100);
    });
  });

  describe('cleanup', () => {
    it('should reset all state properties', () => {
      const mockCallback = vi.fn();

      // Set up some state
      state.userInteracting = true;
      state.setRenderCallback(mockCallback);
      state.debouncedRender(); // Creates timeout

      state.cleanup();

      expect(state.userInteracting).toBe(false);

      // Should not call callback after cleanup
      vi.advanceTimersByTime(200);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should clear active render timeout', () => {
      const mockCallback = vi.fn();
      state.setRenderCallback(mockCallback);

      // Start a debounced render
      state.debouncedRender();

      // Cleanup before timeout completes
      state.cleanup();

      // Advance time - callback should not be called
      vi.advanceTimersByTime(200);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle cleanup when no timeout is active', () => {
      expect(() => {
        state.cleanup();
      }).not.toThrow();

      expect(state.userInteracting).toBe(false);
    });

    it('should handle multiple cleanup calls', () => {
      const mockCallback = vi.fn();
      state.setRenderCallback(mockCallback);
      state.userInteracting = true;

      state.cleanup();
      state.cleanup(); // Second cleanup

      expect(state.userInteracting).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should handle complete user interaction workflow', () => {
      const mockCallback = vi.fn();

      // Set up tracking and callback
      state.trackUserInteraction(mockShadowRoot);
      state.setRenderCallback(mockCallback);

      // Simulate user interaction
      const focusHandler = mockInputs[0].addEventListener.mock.calls.find(
        (call: any) => call[0] === 'focus',
      )![1];
      focusHandler();

      expect(state.userInteracting).toBe(true);

      // Trigger debounced render
      state.debouncedRender();
      vi.advanceTimersByTime(100);

      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Cleanup
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

      // Create new entity with different items
      const newMockEntity: HassEntity = {
        ...mockEntity,
        attributes: { items: [{ name: 'New Item', quantity: 1 }] as InventoryItem[] },
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
  it('should only update lastEntityState when both changed and newItems are truthy', () => {
    const entityId = 'sensor.test';

    // Start with entity that has items
    const mockEntity1: HassEntity = {
      entity_id: entityId,
      state: 'on',
      attributes: { items: [{ name: 'Item1', quantity: 1 }] as InventoryItem[] },
      context: { id: 'test', user_id: '' },
      last_changed: '2023-01-01T00:00:00Z',
      last_updated: '2023-01-01T00:00:00Z',
    };

    mockHass.states[entityId] = mockEntity1;
    state.hasRealEntityChange(mockHass, entityId); // First call - stores initial state

    // Change to entity with undefined items (changed=true, newItems=undefined)
    const mockEntity2: HassEntity = {
      ...mockEntity1,
      attributes: {}, // No items property
    };
    mockHass.states[entityId] = mockEntity2;

    // Should detect change but NOT update stored state (because newItems is falsy)
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);

    // Call again with same undefined items - should still return true
    // because stored state wasn't updated (still has old items)
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);
  });

  it('should properly update lastEntityState when items change', () => {
    const entityId = 'sensor.test';
    const initialItems = [{ name: 'Item1', quantity: 1 }] as InventoryItem[];
    const changedItems = [{ name: 'Item1', quantity: 2 }] as InventoryItem[];

    // Initial state
    const mockEntity1: HassEntity = {
      entity_id: entityId,
      state: 'on',
      attributes: { items: initialItems },
      context: { id: 'test', user_id: '' },
      last_changed: '2023-01-01T00:00:00Z',
      last_updated: '2023-01-01T00:00:00Z',
    };

    mockHass.states[entityId] = mockEntity1;
    state.hasRealEntityChange(mockHass, entityId); // First call

    // Changed state
    const mockEntity2: HassEntity = {
      ...mockEntity1,
      attributes: { items: changedItems },
    };
    mockHass.states[entityId] = mockEntity2;

    // Should detect change
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);

    // Change back to original - should detect as change because state was updated
    mockHass.states[entityId] = {
      ...mockEntity1,
      attributes: { items: [...initialItems] }, // New array reference
    };
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);
  });

  // Kill BlockStatement, ObjectLiteral, and ArrayDeclaration mutants
  it('should properly clone items array in state update', () => {
    const entityId = 'sensor.test';
    const originalItems = [{ name: 'Item1', quantity: 1 }] as InventoryItem[];

    const mockEntity: HassEntity = {
      entity_id: entityId,
      state: 'on',
      attributes: { items: originalItems },
      context: { id: 'test', user_id: '' },
      last_changed: '2023-01-01T00:00:00Z',
      last_updated: '2023-01-01T00:00:00Z',
    };

    mockHass.states[entityId] = mockEntity;
    state.hasRealEntityChange(mockHass, entityId); // First call - stores state

    // Create completely new items array with different content
    const newItems = [
      { name: 'Item1', quantity: 1 },
      { name: 'Item2', quantity: 2 },
    ] as InventoryItem[];

    const newMockEntity: HassEntity = {
      ...mockEntity,
      attributes: { items: newItems },
    };
    mockHass.states[entityId] = newMockEntity;

    // Should detect change (different JSON content)
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(true);

    // Second call with same new items should return false (state was updated)
    expect(state.hasRealEntityChange(mockHass, entityId)).toBe(false);
  });

  // Kill NoCoverage mutant for renderTimeout cleanup
  it('should clear renderTimeout in cleanup when timeout exists', () => {
    // Set up a scenario where renderTimeout would be set
    const mockCallback = vi.fn();
    state.setRenderCallback(mockCallback);

    // Create a timeout by calling debouncedRender
    state.debouncedRender();

    // Manually set renderTimeout to simulate the scenario
    // Since renderTimeout is private, we'll test the cleanup behavior indirectly
    state.cleanup();

    // Advance time to see if callback gets called (it shouldn't after cleanup)
    vi.advanceTimersByTime(200);
    expect(mockCallback).not.toHaveBeenCalled();

    // Test multiple cleanups don't crash
    state.cleanup();
    state.cleanup();
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
});
