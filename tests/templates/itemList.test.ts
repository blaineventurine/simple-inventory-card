import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createItemsList, createItemsByCategory } from '../../src/templates/itemList';
import { InventoryItem } from '../../src/types/homeAssistant';
import { TodoList } from '../../src/types/todoList';
import { TranslationData } from '@/types/translatableComponent';
import { Utilities } from '../../src/utils/utilities';
import { createItemRowTemplate } from '../../src/templates/itemRow';

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn((_translations: any, _key: string, _params: any, fallback: string) => {
      return fallback;
    }),
  },
}));

vi.mock('../../src/utils/utilities', () => ({
  Utilities: {
    groupItemsByCategory: vi.fn(),
  },
}));

vi.mock('../../src/templates/itemRow', () => ({
  createItemRowTemplate: vi.fn(
    (item: InventoryItem, todoLists: TodoList[], _translations: any) =>
      `<mock-item-row name="${item.name}" todos="${todoLists.length}" />`,
  ),
}));

vi.mock('../../src/utils/constants', () => ({
  CSS_CLASSES: {
    CATEGORY_GROUP: 'category-group',
    CATEGORY_HEADER: 'category-header',
  },
}));

describe('itemList', () => {
  let mockItems: InventoryItem[];
  let mockTodoLists: TodoList[];
  let mockTranslations: TranslationData;

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

    mockTranslations = {
      items: {
        no_items: 'No items in inventory',
      },
    };
  });

  describe('createItemsList', () => {
    describe('empty items handling', () => {
      it('should return no-items message when items array is empty', () => {
        const result = createItemsList([], 'name', mockTodoLists, mockTranslations);

        expect(result).toContain('class="no-items"');
        expect(result).toContain('No items in inventory');
      });

      it('should use translation for empty state', () => {
        const result = createItemsList([], 'category', mockTodoLists, mockTranslations);

        expect(result).toContain('No items in inventory');
        expect(result).toContain('class="no-items"');
      });

      it('should not call any item rendering functions when empty', () => {
        createItemsList([], 'name', mockTodoLists, mockTranslations);

        expect(vi.mocked(createItemRowTemplate)).not.toHaveBeenCalled();
        expect(Utilities.groupItemsByCategory).not.toHaveBeenCalled();
      });
    });

    describe('category sort method', () => {
      it('should call createItemsByCategory when sortMethod is "category"', () => {
        vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
          Fruit: [mockItems[0], mockItems[1]],
          Dairy: [mockItems[2]],
        });

        const result = createItemsList(mockItems, 'category', mockTodoLists, mockTranslations);

        expect(Utilities.groupItemsByCategory).toHaveBeenCalledWith(mockItems);
        expect(result).toContain('class="category-group"');
        expect(result).toContain('class="category-header"');
      });

      it('should pass correct parameters to createItemsByCategory', () => {
        vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
          Test: [mockItems[0]],
        });

        createItemsList(mockItems, 'category', mockTodoLists, mockTranslations);

        expect(Utilities.groupItemsByCategory).toHaveBeenCalledWith(mockItems);
      });
    });

    describe('non-category sort methods', () => {
      it('should render items directly when sortMethod is not "category"', () => {
        createItemsList(mockItems, 'name', mockTodoLists, mockTranslations);

        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledTimes(3);
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[0],
          mockTodoLists,
          mockTranslations,
        );
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[1],
          mockTodoLists,
          mockTranslations,
        );
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[2],
          mockTodoLists,
          mockTranslations,
        );
        expect(Utilities.groupItemsByCategory).not.toHaveBeenCalled();
      });

      it('should handle different sort methods correctly', () => {
        for (const sortMethod of ['name', 'quantity', 'expiry', 'quantity_desc', 'zero_last']) {
          vi.clearAllMocks();

          createItemsList(mockItems, sortMethod, mockTodoLists, mockTranslations);

          expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledTimes(3);
          expect(Utilities.groupItemsByCategory).not.toHaveBeenCalled();
        }
      });

      it('should join item templates without separators', () => {
        const result = createItemsList(mockItems, 'name', mockTodoLists, mockTranslations);

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

        createItemsList(mockItems, 'name', customTodoLists, mockTranslations);

        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[0],
          customTodoLists,
          mockTranslations,
        );
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[1],
          customTodoLists,
          mockTranslations,
        );
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[2],
          customTodoLists,
          mockTranslations,
        );
      });

      it('should handle empty todoLists array', () => {
        createItemsList(mockItems, 'name', [], mockTranslations);

        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[0],
          [],
          mockTranslations,
        );
      });
    });

    describe('edge cases', () => {
      it('should handle single item', () => {
        const singleItem = [mockItems[0]];
        const result = createItemsList(singleItem, 'name', mockTodoLists, mockTranslations);

        expect(result).toBe('<mock-item-row name="Apple" todos="2" />');
      });

      it('should handle case-sensitive category comparison', () => {
        vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
          fruit: [mockItems[0]], // lowercase
        });

        const result = createItemsList(mockItems, 'category', mockTodoLists, mockTranslations);

        expect(result).toContain('fruit'); // Should preserve exact case
      });
    });
  });

  describe('createItemsByCategory', () => {
    beforeEach(() => {
      vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
        Fruit: [mockItems[0], mockItems[1]],
        Dairy: [mockItems[2]],
      });
    });

    describe('basic functionality', () => {
      it('should group items by category and render category sections', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(Utilities.groupItemsByCategory).toHaveBeenCalledWith(mockItems);
        expect(result).toContain('class="category-group"');
        expect(result).toContain('class="category-header"');
      });

      it('should use CSS_CLASSES constants for styling', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result).toContain('class="category-group"');
        expect(result).toContain('class="category-header"');
      });

      it('should render all grouped items', () => {
        createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledTimes(3);
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[0],
          mockTodoLists,
          mockTranslations,
        );
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[1],
          mockTodoLists,
          mockTranslations,
        );
        expect(vi.mocked(createItemRowTemplate)).toHaveBeenCalledWith(
          mockItems[2],
          mockTodoLists,
          mockTranslations,
        );
      });
    });

    describe('category sorting', () => {
      it('should sort categories alphabetically', () => {
        vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
          Zebra: [mockItems[0]],
          Apple: [mockItems[1]],
          Banana: [mockItems[2]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);
        const appleIndex = result.indexOf('>Apple<');
        const bananaIndex = result.indexOf('>Banana<');
        const zebraIndex = result.indexOf('>Zebra<');

        expect(appleIndex).toBeLessThan(bananaIndex);
        expect(bananaIndex).toBeLessThan(zebraIndex);
      });

      it('should handle case-sensitive sorting', () => {
        vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
          apple: [mockItems[0]],
          Apple: [mockItems[1]],
          APPLE: [mockItems[2]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result).toContain('>APPLE<');
        expect(result).toContain('>Apple<');
        expect(result).toContain('>apple<');
      });
    });

    describe('category structure', () => {
      it('should create proper HTML structure for each category', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result).toMatch(/<div class="category-group">[\s\S]*?<\/div>/g);
        expect(result).toMatch(/<div class="category-header">[\s\S]*?<\/div>/g);
      });

      it('should render category names in headers', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result).toContain('>Dairy<');
        expect(result).toContain('>Fruit<');
      });

      it('should include all items within their category groups', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result).toContain('<mock-item-row name="Apple" todos="2" />');
        expect(result).toContain('<mock-item-row name="Banana" todos="2" />');
        expect(result).toContain('<mock-item-row name="Milk" todos="2" />');
      });
    });

    describe('edge cases', () => {
      it('should handle single category', () => {
        vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
          OnlyCategory: [mockItems[0], mockItems[1], mockItems[2]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result).toContain('>OnlyCategory<');
        expect(result.match(/class="category-group"/g)).toHaveLength(1);
      });

      it('should handle empty categories (no items in group)', () => {
        vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
          EmptyCategory: [],
          NonEmptyCategory: [mockItems[0]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result).toContain('>EmptyCategory<');
        expect(result).toContain('>NonEmptyCategory<');
      });

      it('should handle categories with special characters', () => {
        vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
          'Category & "Special" <chars>': [mockItems[0]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result).toContain('>Category & "Special" <chars><');
      });

      it('should handle very long category names', () => {
        const longCategoryName = 'A'.repeat(100);
        vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
          [longCategoryName]: [mockItems[0]],
        });

        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result).toContain(`>${longCategoryName}<`);
      });
    });

    describe('integration with Utilities.groupItemsByCategory', () => {
      it('should pass items correctly to grouping function', () => {
        const customItems = [mockItems[0]];

        createItemsByCategory(customItems, mockTodoLists, mockTranslations);

        expect(Utilities.groupItemsByCategory).toHaveBeenCalledWith(customItems);
        expect(Utilities.groupItemsByCategory).toHaveBeenCalledTimes(1);
      });

      it('should handle the result of grouping function correctly', () => {
        const mockGroupedResult = {
          Group1: [mockItems[0], mockItems[1]],
          Group2: [mockItems[2]],
        };
        vi.mocked(Utilities.groupItemsByCategory).mockReturnValue(mockGroupedResult);

        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result).toContain('>Group1<');
        expect(result).toContain('>Group2<');
      });
    });

    describe('HTML structure validation', () => {
      it('should produce valid nested HTML structure', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);
        const categoryGroups = result.match(/<div class="category-group">/g);
        const categoryGroupsEnd = result.match(/<\/div>/g);

        expect(categoryGroups?.length).toBeGreaterThan(0);
        expect(categoryGroupsEnd?.length).toBeGreaterThanOrEqual(categoryGroups?.length || 0);
      });

      it('should handle formatted output with newlines', () => {
        const result = createItemsByCategory(mockItems, mockTodoLists, mockTranslations);

        expect(result.split('<div class="category-group">').length - 1).toBe(2);
        expect(result).toContain('class="category-group"');
        expect(result).toContain('class="category-header"');
      });
    });
  });

  describe('integration between functions', () => {
    it('should produce same items when category vs non-category sorting', () => {
      vi.mocked(Utilities.groupItemsByCategory).mockReturnValue({
        Single: mockItems,
      });

      vi.clearAllMocks();
      createItemsList(mockItems, 'name', mockTodoLists, mockTranslations);
      const nonCategoryCalls = vi.mocked(createItemRowTemplate).mock.calls.length;

      vi.clearAllMocks();
      createItemsList(mockItems, 'category', mockTodoLists, mockTranslations);
      const categoryCalls = vi.mocked(createItemRowTemplate).mock.calls.length;

      expect(nonCategoryCalls).toBe(categoryCalls);
      expect(nonCategoryCalls).toBe(mockItems.length);
    });
  });
});
