import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createItemsList, createItemsByCategory } from '../../src/templates/itemList';
import { InventoryItem } from '../../src/types/home-assistant';
import { TodoList } from '../../src/types/todoList';
import { Utils } from '../../src/utils/utils';
import { createItemRowTemplate } from '../../src/templates/itemRow';

vi.mock('../../src/utils/utils', () => ({
  Utils: {
    groupItemsByCategory: vi.fn(),
  },
}));

vi.mock('../../src/templates/itemRow', () => ({
  createItemRowTemplate: vi.fn(
    (item: InventoryItem, todoLists: TodoList[]) =>
      `<mock-item-row name="${item.name}" todos="${todoLists.length}" />`,
  ),
}));

vi.mock('../../src/utils/constants', () => ({
  CSS_CLASSES: {
    CATEGORY_GROUP: 'category-group',
    CATEGORY_HEADER: 'category-header',
  },
  MESSAGES: {
    NO_ITEMS: 'No items in inventory',
  },
}));

describe('itemList', () => {
  let mockItems: InventoryItem[];
  let mockTodoLists: TodoList[];

  beforeEach(() => {
    vi.clearAllMocks();

    mockItems = [
      {
        name: 'Apple',
        quantity: 5,
        category: 'Fruit',
        unit: 'pieces',
        expiry_date: '2024-12-31',
        expiry_alert_days: 7,
        auto_add_enabled: false,
        auto_add_to_list_quantity: 2,
        todo_list: 'grocery',
      },
      {
        name: 'Banana',
        quantity: 3,
        category: 'Fruit',
        unit: 'pieces',
        expiry_date: '2024-11-15',
        expiry_alert_days: 5,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 1,
        todo_list: 'shopping',
      },
      {
        name: 'Milk',
        quantity: 1,
        category: 'Dairy',
        unit: 'carton',
        expiry_date: '2024-10-20',
        expiry_alert_days: 3,
        auto_add_enabled: false,
        auto_add_to_list_quantity: 1,
        todo_list: 'grocery',
      },
    ];

    mockTodoLists = [
      { id: 'grocery-1', name: 'Grocery List', entity_id: 'todo.grocery' },
      { id: 'shopping-2', name: 'Shopping List', entity_id: 'todo.shopping' },
    ];
  });

  describe('createItemsList', () => {
    describe('empty items handling', () => {
      it('should return no-items message when items array is empty', () => {
        const result = createItemsList([], 'name', mockTodoLists);

        expect(result).toBe('<div class="no-items">No items in inventory</div>');
      });

      it('should use MESSAGES.NO_ITEMS constant for empty state', () => {
        const result = createItemsList([], 'category', mockTodoLists);

        expect(result).toContain('No items in inventory');
        expect(result).toContain('class="no-items"');
      });

      it('should not call any item rendering functions when empty', () => {
        createItemsList([], 'name', mockTodoLists);

        expect(vi.mocked(createItemRowTemplate)).not.toHaveBeenCalled();
        expect(Utils.groupItemsByCategory).not.toHaveBeenCalled();
      });
    });

    describe('category sort method', () => {
      it('should call createItemsByCategory when sortMethod is "category"', () => {
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
          Fruit: [mockItems[0], mockItems[1]],
          Dairy: [mockItems[2]],
        });

        const result = createItemsList(mockItems, 'category', mockTodoLists);

        expect(Utils.groupItemsByCategory).toHaveBeenCalledWith(mockItems);
        expect(result).toContain('class="category-group"');
        expect(result).toContain('class="category-header"');
      });

      it('should pass correct parameters to createItemsByCategory', () => {
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
          Test: [mockItems[0]],
        });

        createItemsList(mockItems, 'category', mockTodoLists);

        expect(Utils.groupItemsByCategory).toHaveBeenCalledWith(mockItems);
      });
    });

    describe('non-category sort methods', () => {
      it('should render items directly when sortMethod is not "category"', () => {
        createItemsList(mockItems, 'name', mockTodoLists);

        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledTimes(3);
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(mockItems[0], mockTodoLists);
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(mockItems[1], mockTodoLists);
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(mockItems[2], mockTodoLists);
        expect(Utils.groupItemsByCategory).not.toHaveBeenCalled();
      });

      it('should handle different sort methods correctly', () => {
        ['name', 'quantity', 'expiry', 'quantity_desc', 'zero_last'].forEach((sortMethod) => {
          vi.clearAllMocks();

          createItemsList(mockItems, sortMethod, mockTodoLists);

          expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledTimes(3);
          expect(Utils.groupItemsByCategory).not.toHaveBeenCalled();
        });
      });

      it('should join item templates without separators', () => {
        const result = createItemsList(mockItems, 'name', mockTodoLists);

        expect(result).toBe(
          '<mock-item-row name="Apple" todos="2" />' +
            '<mock-item-row name="Banana" todos="2" />' +
            '<mock-item-row name="Milk" todos="2" />',
        );
      });
    });

    describe('todo lists parameter', () => {
      it('should pass todoLists to item templates', () => {
        const customTodoLists = [{ id: 'custom-1', name: 'Custom List' }];

        createItemsList(mockItems, 'name', customTodoLists);

        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[0],
          customTodoLists,
        );
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[1],
          customTodoLists,
        );
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[2],
          customTodoLists,
        );
      });

      it('should handle empty todoLists array', () => {
        createItemsList(mockItems, 'name', []);

        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(mockItems[0], []);
      });
    });

    describe('edge cases', () => {
      it('should handle single item', () => {
        const singleItem = [mockItems[0]];
        const result = createItemsList(singleItem, 'name', mockTodoLists);

        expect(result).toBe('<mock-item-row name="Apple" todos="2" />');
      });

      it('should handle case-sensitive category comparison', () => {
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
          fruit: [mockItems[0]], // lowercase
        });

        const result = createItemsList(mockItems, 'category', mockTodoLists);

        expect(result).toContain('fruit'); // Should preserve exact case
      });
    });
  });

  describe('createItemsByCategory', () => {
    beforeEach(() => {
      vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
        Fruit: [mockItems[0], mockItems[1]],
        Dairy: [mockItems[2]],
      });
    });

    describe('basic functionality', () => {
      it('should group items by category and render category sections', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(Utils.groupItemsByCategory).toHaveBeenCalledWith(mockItems);
        expect(result).toContain('class="category-group"');
        expect(result).toContain('class="category-header"');
      });

      it('should use CSS_CLASSES constants for styling', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result).toContain('class="category-group"');
        expect(result).toContain('class="category-header"');
      });

      it('should render all grouped items', () => {
        createItemsByCategory(mockItems, mockTodoLists);

        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledTimes(3);
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(mockItems[0], mockTodoLists);
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(mockItems[1], mockTodoLists);
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(mockItems[2], mockTodoLists);
      });
    });

    describe('category sorting', () => {
      it('should sort categories alphabetically', () => {
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
          Zebra: [mockItems[0]],
          Apple: [mockItems[1]],
          Banana: [mockItems[2]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists);
        const appleIndex = result.indexOf('>Apple<');
        const bananaIndex = result.indexOf('>Banana<');
        const zebraIndex = result.indexOf('>Zebra<');

        expect(appleIndex).toBeLessThan(bananaIndex);
        expect(bananaIndex).toBeLessThan(zebraIndex);
      });

      it('should handle case-sensitive sorting', () => {
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
          apple: [mockItems[0]],
          Apple: [mockItems[1]],
          APPLE: [mockItems[2]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result).toContain('>APPLE<');
        expect(result).toContain('>Apple<');
        expect(result).toContain('>apple<');
      });
    });

    describe('category structure', () => {
      it('should create proper HTML structure for each category', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result).toMatch(/<div class="category-group">[\s\S]*?<\/div>/g);
        expect(result).toMatch(/<div class="category-header">[\s\S]*?<\/div>/g);
      });

      it('should render category names in headers', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result).toContain('>Dairy<');
        expect(result).toContain('>Fruit<');
      });

      it('should include all items within their category groups', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result).toContain('<mock-item-row name="Apple" todos="2" />');
        expect(result).toContain('<mock-item-row name="Banana" todos="2" />');
        expect(result).toContain('<mock-item-row name="Milk" todos="2" />');
      });
    });

    describe('edge cases', () => {
      it('should handle single category', () => {
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
          OnlyCategory: [mockItems[0], mockItems[1], mockItems[2]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result).toContain('>OnlyCategory<');
        expect(result.match(/class="category-group"/g)).toHaveLength(1);
      });

      it('should handle empty categories (no items in group)', () => {
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
          EmptyCategory: [],
          NonEmptyCategory: [mockItems[0]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result).toContain('>EmptyCategory<');
        expect(result).toContain('>NonEmptyCategory<');
      });

      it('should handle categories with special characters', () => {
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
          'Category & "Special" <chars>': [mockItems[0]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result).toContain('>Category & "Special" <chars><');
      });

      it('should handle very long category names', () => {
        const longCategoryName = 'A'.repeat(100);
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
          [longCategoryName]: [mockItems[0]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result).toContain(`>${longCategoryName}<`);
      });

      it('should handle many categories', () => {
        const manyCategories = Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`Category${i}`, [mockItems[0]]]),
        );
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue(manyCategories);

        const result = createItemsByCategory(mockItems, mockTodoLists);

        for (let i = 0; i < 50; i++) {
          expect(result).toContain(`>Category${i}<`);
        }
      });
    });

    describe('integration with Utils.groupItemsByCategory', () => {
      it('should pass items correctly to grouping function', () => {
        const customItems = [mockItems[0]];

        createItemsByCategory(customItems, mockTodoLists);

        expect(Utils.groupItemsByCategory).toHaveBeenCalledWith(customItems);
        expect(Utils.groupItemsByCategory).toHaveBeenCalledTimes(1);
      });

      it('should handle the result of grouping function correctly', () => {
        const mockGroupedResult = {
          Group1: [mockItems[0], mockItems[1]],
          Group2: [mockItems[2]],
        };
        vi.mocked(Utils.groupItemsByCategory).mockReturnValue(mockGroupedResult);

        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result).toContain('>Group1<');
        expect(result).toContain('>Group2<');
      });
    });

    describe('HTML structure validation', () => {
      it('should produce valid nested HTML structure', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists);
        const categoryGroups = result.match(/<div class="category-group">/g);
        const categoryGroupsEnd = result.match(/<\/div>/g);

        expect(categoryGroups?.length).toBeGreaterThan(0);
        expect(categoryGroupsEnd?.length).toBeGreaterThanOrEqual(categoryGroups?.length || 0);
      });

      it('should handle formatted output with newlines', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists);

        expect(result.split('<div class="category-group">').length - 1).toBe(2);
        expect(result).toContain('class="category-group"');
        expect(result).toContain('class="category-header"');
      });
    });
  });

  describe('integration between functions', () => {
    it('should produce same items when category vs non-category sorting', () => {
      vi.mocked(Utils.groupItemsByCategory).mockReturnValue({
        Single: mockItems,
      });

      vi.clearAllMocks();
      createItemsList(mockItems, 'name', mockTodoLists);
      const nonCategoryCalls = vi.mocked(createItemRowTemplate).mock.calls.length;

      vi.clearAllMocks();
      createItemsList(mockItems, 'category', mockTodoLists);
      const categoryCalls = vi.mocked(createItemRowTemplate).mock.calls.length;

      expect(nonCategoryCalls).toBe(categoryCalls);
      expect(nonCategoryCalls).toBe(mockItems.length);
    });
  });
});
