import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Renderer } from '../../src/services/renderer';
import { Utilities } from '../../src/utils/utilities';
import { InventoryResolver } from '../../src/utils/inventoryResolver';
import { styles } from '../../src/styles/styles';
import { generateCardHTML } from '../../src/templates/inventoryCard';
import { HassEntity } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import { FilterState } from '../../src/types/filterState';
import { TodoList } from '../../src/types/todoList';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/utils/utilities');
vi.mock('../../src/utils/inventoryResolver');
vi.mock('../../src/utils/constants');
vi.mock('../../src/templates/inventoryCard');

describe('Renderer', () => {
  let renderer: Renderer;
  let mockShadowRoot: ShadowRoot;
  let mockTranslations: TranslationData;

  const mockItems: InventoryItem[] = [
    {
      auto_add_enabled: false,
      auto_add_id_to_description_enabled: false,
      category: 'Test Category',
      description: 'Test Description',
      expiry_date: '2024-12-31',
      location: 'Test Location',
      name: 'Test Item',
      quantity: 1,
      todo_list: 'test-list',
      unit: 'pcs',
    },
  ];

  const mockFilters: FilterState = {
    category: [''],
    expiry: [],
    location: [''],
    quantity: [],
    searchText: '',
    showAdvanced: false,
  };
  const mockTodoLists: TodoList[] = [];

  beforeEach(() => {
    mockShadowRoot = {
      innerHTML: '',
    } as ShadowRoot;
    renderer = new Renderer(mockShadowRoot);

    mockTranslations = {
      items: {
        no_items: 'No items in inventory',
      },
    };

    vi.clearAllMocks();

    vi.mocked(InventoryResolver.getInventoryName).mockReturnValue('Test Inventory');
    vi.mocked(InventoryResolver.getInventoryDescription).mockReturnValue('Test Description');
    vi.mocked(Utilities.sanitizeHtml).mockImplementation((input) => input);
    vi.mocked(generateCardHTML).mockReturnValue('<div>Generated Card HTML</div>');
  });

  describe('constructor', () => {
    it('should store shadowRoot reference', () => {
      const testShadowRoot = {} as ShadowRoot;
      const testRenderer = new Renderer(testShadowRoot);
      expect(testRenderer).toBeInstanceOf(Renderer);
    });
  });

  describe('renderCard', () => {
    it('forwards the row options to the card template', () => {
      const rowOptions = { batches: true, expanded: new Set(['Test Item']), transfers: false };
      const state: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {},
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      renderer.renderCard(
        state,
        'test.entity',
        mockItems,
        mockItems,
        mockFilters,
        'name',
        mockTodoLists,
        mockTranslations,
        undefined,
        rowOptions,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        ['Test Category'],
        ['Test Location'],
        mockTodoLists,
        mockItems,
        'Test Description',
        mockTranslations,
        undefined,
        rowOptions,
        false,
      );
    });

    it('forwards the item icons flag to the card template', () => {
      const state: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {},
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      renderer.renderCard(
        state,
        'test.entity',
        mockItems,
        mockItems,
        mockFilters,
        'name',
        mockTodoLists,
        mockTranslations,
        undefined,
        undefined,
        true,
      );

      expect(vi.mocked(generateCardHTML).mock.lastCall?.[12]).toBe(true);
    });

    it('offers locations that only hold stock as location options', () => {
      const state: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {},
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };
      const items: InventoryItem[] = [
        { ...mockItems[0], locations: ['Pantry'], stocked_locations: ['Garage', ' Pantry '] },
      ];

      renderer.renderCard(
        state,
        'test.entity',
        items,
        items,
        mockFilters,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      expect(vi.mocked(generateCardHTML).mock.lastCall?.[5]).toEqual(['Garage', 'Pantry']);
    });

    it('lists the visible items but takes header data and filter options from all items', () => {
      const state: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {},
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };
      const milk: InventoryItem = {
        ...mockItems[0],
        name: 'Milk',
        categories: ['Dairy'],
        locations: ['Fridge'],
      };
      const hammer: InventoryItem = {
        ...mockItems[0],
        name: 'Hammer',
        categories: ['Tools'],
        locations: ['Garage'],
      };

      renderer.renderCard(
        state,
        'test.entity',
        [milk],
        [milk, hammer],
        mockFilters,
        'name',
        [],
        {},
      );

      const call = vi.mocked(generateCardHTML).mock.lastCall;
      expect(call?.[1]).toEqual([milk]);
      expect(call?.[4]).toEqual(['Dairy', 'Tools']);
      expect(call?.[5]).toEqual(['Fridge', 'Garage']);
      expect(call?.[7]).toEqual([milk, hammer]);
    });

    it('should render card with valid state and items', () => {
      const mockState: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {
          items: [
            {
              auto_add_enabled: false,
              category: 'Category A',
              expiry_date: '2024-12-31',
              location: 'Location 1',
              name: 'Item 1',
              quantity: 2,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: true,
              auto_add_to_list_quantity: 5,
              category: 'Category B',
              expiry_date: '2024-11-30',
              location: 'Location 2',
              name: 'Item 2',
              quantity: 1,
              todo_list: 'list-2',
              unit: 'kg',
            },
          ] as InventoryItem[],
        },
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      renderer.renderCard(
        mockState,
        'test.entity',
        mockItems,
        mockItems,
        mockFilters,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      expect(InventoryResolver.getInventoryName).toHaveBeenCalledWith(mockState, 'test.entity');
      expect(InventoryResolver.getInventoryDescription).toHaveBeenCalledWith(mockState);
      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        ['Test Category'], // Sorted categories from items param (mockItems)
        ['Test Location'], // Locations from items param (mockItems)
        mockTodoLists,
        mockItems, // allItems = items param
        'Test Description',
        mockTranslations,
        undefined,
        undefined,
        false,
      );
      expect(mockShadowRoot.innerHTML).toBe('<div>Generated Card HTML</div>');
    });

    it('should handle state with no attributes', () => {
      const mockState: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {},
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      } as HassEntity;
      const mockItems: InventoryItem[] = [];

      renderer.renderCard(
        mockState,
        'test.entity',
        mockItems,
        mockItems,
        mockFilters,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        [], // Empty categories when no items
        [], // Empty locations when no items
        mockTodoLists,
        [], // Empty allItems when no attributes
        'Test Description',
        mockTranslations,
        undefined,
        undefined,
        false,
      );
    });

    it('should handle state with attributes but no items', () => {
      const mockState: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {},
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };
      const mockItems: InventoryItem[] = [];

      renderer.renderCard(
        mockState,
        'test.entity',
        mockItems,
        mockItems,
        mockFilters,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        [],
        [],
        mockTodoLists,
        [], // Empty allItems when attributes.items is undefined
        'Test Description',
        mockTranslations,
        undefined,
        undefined,
        false,
      );
    });

    it('should handle null state', () => {
      const mockItems: InventoryItem[] = [];

      renderer.renderCard(
        null as any,
        'test.entity',
        mockItems,
        mockItems,
        mockFilters,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        [],
        [],
        mockTodoLists,
        [],
        'Test Description',
        mockTranslations,
        undefined,
        undefined,
        false,
      );
    });

    it('should filter out items with null/undefined categories', () => {
      const mockState: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {
          items: [
            {
              auto_add_enabled: false,
              category: 'Category A',
              expiry_date: '2024-12-31',
              location: 'Location 1',
              name: 'Item 1',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: null as any,
              expiry_date: '2024-12-31',
              location: 'Location 2',
              name: 'Item 2',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: undefined as any,
              expiry_date: '2024-12-31',
              location: 'Location 3',
              name: 'Item 3',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: '',
              expiry_date: '2024-12-31',
              location: 'Location 4',
              name: 'Item 4',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: 'Category B',
              expiry_date: '2024-12-31',
              location: 'Location 5',
              name: 'Item 5',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
          ] as InventoryItem[],
        },
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      renderer.renderCard(
        mockState,
        'test.entity',
        mockState.attributes.items as InventoryItem[],
        mockState.attributes.items as InventoryItem[],
        mockFilters,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockState.attributes.items,
        mockFilters,
        'name',
        ['Category A', 'Category B'], // Only truthy categories, sorted
        ['Location 1', 'Location 2', 'Location 3', 'Location 4', 'Location 5'],
        mockTodoLists,
        mockState.attributes.items, // allItems = items param
        'Test Description',
        mockTranslations,
        undefined,
        undefined,
        false,
      );
    });

    it('should remove duplicate categories and sort them', () => {
      const mockState: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {
          items: [
            {
              auto_add_enabled: false,
              category: 'Zebra',
              expiry_date: '2024-12-31',
              name: 'Item 1',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: 'Apple',
              expiry_date: '2024-12-31',
              name: 'Item 2',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: 'Zebra',
              expiry_date: '2024-12-31',
              name: 'Item 3',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: 'Banana',
              expiry_date: '2024-12-31',
              name: 'Item 4',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: 'Apple',
              expiry_date: '2024-12-31',
              name: 'Item 5',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
          ] as InventoryItem[],
        },
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      renderer.renderCard(
        mockState,
        'test.entity',
        mockState.attributes.items as InventoryItem[],
        mockState.attributes.items as InventoryItem[],
        mockFilters,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockState.attributes.items,
        mockFilters,
        'name',
        ['Apple', 'Banana', 'Zebra'], // Unique and sorted
        [],
        mockTodoLists,
        mockState.attributes.items, // allItems = items param
        'Test Description',
        mockTranslations,
        undefined,
        undefined,
        false,
      );
    });

    it('should handle empty items array', () => {
      const mockState: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {
          items: [],
        },
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      renderer.renderCard(
        mockState,
        'test.entity',
        [],
        [],
        mockFilters,
        'name',
        mockTodoLists,
        mockTranslations,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        [],
        mockFilters,
        'name',
        [], // Empty categories from empty items
        [], // empty location
        mockTodoLists,
        [],
        'Test Description',
        mockTranslations,
        undefined,
        undefined,
        false,
      );
    });

    it('should pass all parameters correctly to generateCardHTML', () => {
      const mockState: HassEntity = {
        attributes: { items: [] },
        context: { id: 'test-context' },
        entity_id: 'custom.entity',
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
        state: 'unknown',
      };
      const mockFilters: FilterState = {
        category: ['test'],
        expiry: ['expired'],
        location: ['fridge'],
        quantity: ['1-5'],
        searchText: 'query',
        showAdvanced: true,
      };
      const mockTodoLists: TodoList[] = [{ id: '1', name: 'Test List' } as TodoList];

      renderer.renderCard(
        mockState,
        'custom.entity',
        mockItems,
        mockItems,
        mockFilters,
        'category',
        mockTodoLists,
        mockTranslations,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'category',
        ['Test Category'], // categories from mockItems
        ['Test Location'], // locations from mockItems
        mockTodoLists,
        mockItems, // allItems = items param
        'Test Description',
        mockTranslations,
        undefined,
        undefined,
        false,
      );
    });
  });

  describe('renderError', () => {
    it('should render error message with sanitized HTML', () => {
      const errorMessage = 'Test error message';
      vi.mocked(Utilities.sanitizeHtml).mockReturnValue('Sanitized error message');

      renderer.renderError(errorMessage);

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith(errorMessage);
      expect(mockShadowRoot.innerHTML).toContain('Sanitized error message');
      expect(mockShadowRoot.innerHTML).toContain('<strong>Error:</strong>');
      expect(mockShadowRoot.innerHTML).toContain('error-message');
      expect(mockShadowRoot.innerHTML).toContain('<ha-card>');
      expect(mockShadowRoot.innerHTML).toContain(styles);
    });

    it('should handle empty error message', () => {
      vi.mocked(Utilities.sanitizeHtml).mockReturnValue('');

      renderer.renderError('');

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('');
      expect(mockShadowRoot.innerHTML).toContain('<strong>Error:</strong>');
    });

    it('should handle error message with special characters', () => {
      const errorMessage = '<script>alert("xss")</script>';
      const sanitizedMessage = '&lt;script&gt;alert("xss")&lt;/script&gt;';
      vi.mocked(Utilities.sanitizeHtml).mockReturnValue(sanitizedMessage);

      renderer.renderError(errorMessage);

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith(errorMessage);
      expect(mockShadowRoot.innerHTML).toContain(sanitizedMessage);
      expect(mockShadowRoot.innerHTML).not.toContain('<script>');
    });

    it('should include correct CSS styling', () => {
      renderer.renderError('test');

      expect(mockShadowRoot.innerHTML).toContain(`<style>${styles}</style>`);
      expect(mockShadowRoot.innerHTML).toContain('color: var(--error-color)');
      expect(mockShadowRoot.innerHTML).toContain('padding: 16px');
      expect(mockShadowRoot.innerHTML).toContain('text-align: center');
    });
  });

  describe('edge cases', () => {
    it('should handle very long category names', () => {
      const longCategoryName = 'A'.repeat(1000);
      const mockState: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {
          items: [
            {
              auto_add_enabled: false,
              category: longCategoryName,
              expiry_date: '2024-12-31',
              name: 'Item 1',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
          ] as InventoryItem[],
        },
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      renderer.renderCard(
        mockState,
        'test.entity',
        mockState.attributes.items as InventoryItem[],
        mockState.attributes.items as InventoryItem[],
        mockFilters,
        'name',
        [],
        mockTranslations,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        expect.any(String),
        [longCategoryName],
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        expect.any(String),
        expect.any(Object),
        undefined,
        undefined,
        false,
      );
    });

    it('should handle very long location names', () => {
      const longLocationName = 'A'.repeat(1000);
      const mockState: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {
          items: [
            {
              auto_add_enabled: false,
              category: 'Category 1',
              expiry_date: '2024-12-31',
              location: longLocationName,
              name: 'Item 1',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
          ] as InventoryItem[],
        },
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      renderer.renderCard(
        mockState,
        'test.entity',
        mockState.attributes.items as InventoryItem[],
        mockState.attributes.items as InventoryItem[],
        mockFilters,
        'name',
        [],
        mockTranslations,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        expect.any(String),
        expect.any(Array),
        [longLocationName],
        expect.any(Array),
        expect.any(Array),
        expect.any(String),
        expect.any(Object),
        undefined,
        undefined,
        false,
      );
    });

    it('should handle items with only whitespace categories', () => {
      const mockState: HassEntity = {
        entity_id: 'test.entity',
        state: 'unknown',
        attributes: {
          items: [
            {
              auto_add_enabled: false,
              category: '   ',
              expiry_date: '2024-12-31',
              name: 'Item 1',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: '\t\n',
              expiry_date: '2024-12-31',
              name: 'Item 2',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: 'Valid Category',
              expiry_date: '2024-12-31',
              name: 'Item 3',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
          ] as InventoryItem[],
        },
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };

      renderer.renderCard(
        mockState,
        'test.entity',
        mockState.attributes.items as InventoryItem[],
        mockState.attributes.items as InventoryItem[],
        mockFilters,
        'name',
        [],
        mockTranslations,
      );

      // Whitespace-only categories should be filtered out after trimming
      expect(generateCardHTML).toHaveBeenCalledWith(
        expect.any(String), // inventory name
        expect.any(Array), // items
        expect.any(Object), // filters
        expect.any(String), // sort method
        ['Valid Category'], // categories (whitespace-only trimmed out)
        expect.any(Array), // locations
        expect.any(Array), // todo lists
        expect.any(Array), // all items
        expect.any(String), // description
        expect.any(Object), // translations
        undefined,
        undefined,
        false,
      );
    });
  });
});
