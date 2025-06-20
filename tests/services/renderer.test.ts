import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Renderer } from '../../src/services/renderer';
import { Utils } from '../../src/utils/utils';
import { styles } from '../../src/styles/styles';
import { MESSAGES } from '../../src/utils/constants';
import { generateCardHTML } from '../../src/templates/inventoryCard';
import { HassEntity, InventoryItem } from '../../src/types/home-assistant';
import { FilterState } from '../../src/types/filterState';
import { TodoList } from '../../src/types/todoList';

// Mock dependencies
vi.mock('../../src/utils/utils');
vi.mock('../../src/utils/constants');
vi.mock('../../src/templates/inventoryCard');

describe('Renderer', () => {
  let renderer: Renderer;
  let mockShadowRoot: ShadowRoot;

  beforeEach(() => {
    mockShadowRoot = {
      innerHTML: '',
    } as ShadowRoot;
    renderer = new Renderer(mockShadowRoot);

    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(Utils.getInventoryName).mockReturnValue('Test Inventory');
    vi.mocked(Utils.getInventoryDescription).mockReturnValue('Test Description');
    vi.mocked(Utils.sanitizeHtml).mockImplementation((input) => input);
    vi.mocked(generateCardHTML).mockReturnValue('<div>Generated Card HTML</div>');
    vi.mocked(MESSAGES).LOADING = 'Loading...';
  });

  describe('constructor', () => {
    it('should store shadowRoot reference', () => {
      const testShadowRoot = {} as ShadowRoot;
      const testRenderer = new Renderer(testShadowRoot);
      expect(testRenderer).toBeInstanceOf(Renderer);
    });
  });

  describe('renderCard', () => {
    const mockFilters: FilterState = {
      searchText: '',
      category: '',
      quantity: '',
      expiry: '',
      showAdvanced: false,
    };
    const mockTodoLists: TodoList[] = [];

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

      const mockItems: InventoryItem[] = [
        {
          auto_add_enabled: false,
          category: 'Test Category',
          expiry_date: '2024-12-31',
          name: 'Test Item',
          quantity: 1,
          todo_list: 'test-list',
          unit: 'pcs',
        },
      ];

      renderer.renderCard(mockState, 'test.entity', mockItems, mockFilters, 'name', mockTodoLists);

      expect(Utils.getInventoryName).toHaveBeenCalledWith(mockState, 'test.entity');
      expect(Utils.getInventoryDescription).toHaveBeenCalledWith(mockState);
      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        ['Category A', 'Category B'], // Sorted categories from state.attributes.items
        mockTodoLists,
        mockState.attributes.items,
        'Test Description',
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

      renderer.renderCard(mockState, 'test.entity', mockItems, mockFilters, 'name', mockTodoLists);

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        [], // Empty categories when no items
        mockTodoLists,
        [], // Empty allItems when no attributes
        'Test Description',
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

      renderer.renderCard(mockState, 'test.entity', mockItems, mockFilters, 'name', mockTodoLists);

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        [],
        mockTodoLists,
        [], // Empty allItems when attributes.items is undefined
        'Test Description',
      );
    });

    it('should handle null state', () => {
      const mockItems: InventoryItem[] = [];

      renderer.renderCard(
        null as any,
        'test.entity',
        mockItems,
        mockFilters,
        'name',
        mockTodoLists,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        [],
        mockTodoLists,
        [],
        'Test Description',
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
              name: 'Item 1',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: null as any,
              expiry_date: '2024-12-31',
              name: 'Item 2',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: undefined as any,
              expiry_date: '2024-12-31',
              name: 'Item 3',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: '',
              expiry_date: '2024-12-31',
              name: 'Item 4',
              quantity: 1,
              todo_list: 'list-1',
              unit: 'pcs',
            },
            {
              auto_add_enabled: false,
              category: 'Category B',
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

      renderer.renderCard(mockState, 'test.entity', [], mockFilters, 'name', mockTodoLists);

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        [],
        mockFilters,
        'name',
        ['Category A', 'Category B'], // Only truthy categories, sorted
        mockTodoLists,
        mockState.attributes.items,
        'Test Description',
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

      renderer.renderCard(mockState, 'test.entity', [], mockFilters, 'name', mockTodoLists);

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        [],
        mockFilters,
        'name',
        ['Apple', 'Banana', 'Zebra'], // Unique and sorted
        mockTodoLists,
        mockState.attributes.items,
        'Test Description',
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

      renderer.renderCard(mockState, 'test.entity', [], mockFilters, 'name', mockTodoLists);

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        [],
        mockFilters,
        'name',
        [], // Empty categories from empty items
        mockTodoLists,
        [],
        'Test Description',
      );
    });

    it('should pass all parameters correctly to generateCardHTML', () => {
      const mockState: HassEntity = {
        entity_id: 'custom.entity',
        state: 'unknown',
        attributes: { items: [] },
        context: { id: 'test-context' },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
      };
      const mockItems: InventoryItem[] = [
        {
          auto_add_enabled: false,
          category: 'Test Category',
          expiry_date: '2024-12-31',
          name: 'Test Item',
          quantity: 1,
          todo_list: 'test-list',
          unit: 'pcs',
        },
      ];
      const mockFilters: FilterState = {
        searchText: 'query',
        category: 'test',
        quantity: '1-5',
        expiry: 'expired',
        showAdvanced: true,
      };
      const mockTodoLists: TodoList[] = [{ id: '1', name: 'Test List' } as TodoList];

      renderer.renderCard(
        mockState,
        'custom.entity',
        mockItems,
        mockFilters,
        'category',
        mockTodoLists,
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockFilters,
        'category',
        [],
        mockTodoLists,
        [],
        'Test Description',
      );
    });
  });

  describe('renderError', () => {
    it('should render error message with sanitized HTML', () => {
      const errorMessage = 'Test error message';
      vi.mocked(Utils.sanitizeHtml).mockReturnValue('Sanitized error message');

      renderer.renderError(errorMessage);

      expect(Utils.sanitizeHtml).toHaveBeenCalledWith(errorMessage);
      expect(mockShadowRoot.innerHTML).toContain('Sanitized error message');
      expect(mockShadowRoot.innerHTML).toContain('<strong>Error:</strong>');
      expect(mockShadowRoot.innerHTML).toContain('error-message');
      expect(mockShadowRoot.innerHTML).toContain('<ha-card>');
      expect(mockShadowRoot.innerHTML).toContain(styles);
    });

    it('should handle empty error message', () => {
      vi.mocked(Utils.sanitizeHtml).mockReturnValue('');

      renderer.renderError('');

      expect(Utils.sanitizeHtml).toHaveBeenCalledWith('');
      expect(mockShadowRoot.innerHTML).toContain('<strong>Error:</strong>');
    });

    it('should handle error message with special characters', () => {
      const errorMessage = '<script>alert("xss")</script>';
      const sanitizedMessage = '&lt;script&gt;alert("xss")&lt;/script&gt;';
      vi.mocked(Utils.sanitizeHtml).mockReturnValue(sanitizedMessage);

      renderer.renderError(errorMessage);

      expect(Utils.sanitizeHtml).toHaveBeenCalledWith(errorMessage);
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

  describe('renderLoading', () => {
    it('should render loading message', () => {
      renderer.renderLoading();

      expect(mockShadowRoot.innerHTML).toContain(MESSAGES.LOADING);
      expect(mockShadowRoot.innerHTML).toContain('loading-container');
      expect(mockShadowRoot.innerHTML).toContain('<ha-card>');
      expect(mockShadowRoot.innerHTML).toContain(styles);
    });

    it('should include correct CSS styling', () => {
      renderer.renderLoading();

      expect(mockShadowRoot.innerHTML).toContain(`<style>${styles}</style>`);
      expect(mockShadowRoot.innerHTML).toContain('padding: 16px');
      expect(mockShadowRoot.innerHTML).toContain('text-align: center');
    });

    it('should handle case when MESSAGES.LOADING is empty', () => {
      vi.mocked(MESSAGES).LOADING = '';

      renderer.renderLoading();

      expect(mockShadowRoot.innerHTML).toContain('<p></p>');
    });

    it('should handle case when MESSAGES.LOADING contains HTML', () => {
      vi.mocked(MESSAGES).LOADING = '<span>Loading...</span>';

      renderer.renderLoading();

      expect(mockShadowRoot.innerHTML).toContain('<span>Loading...</span>');
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
        [],
        {
          searchText: '',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        } as FilterState,
        'name',
        [],
      );

      expect(generateCardHTML).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        expect.any(String),
        [longCategoryName],
        expect.any(Array),
        expect.any(Array),
        expect.any(String),
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
        [],
        {
          searchText: '',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        } as FilterState,
        'name',
        [],
      );

      // Whitespace-only categories should be included since they're truthy
      expect(generateCardHTML).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        expect.any(String),
        ['   ', '\t\n', 'Valid Category'].sort(),
        expect.any(Array),
        expect.any(Array),
        expect.any(String),
      );
    });
  });
});
