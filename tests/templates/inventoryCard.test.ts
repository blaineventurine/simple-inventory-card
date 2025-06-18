import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCardHTML } from '../../src/templates/inventoryCard';
import { InventoryItem } from '../../src/types/home-assistant';
import { FilterState } from '../../src/types/filterState';
import { TodoList } from '../../src/types/todoList';
import { ELEMENTS, MESSAGES } from '../../src/utils/constants';

vi.mock('../../src/templates/inventoryHeader', () => ({
  createInventoryHeader: vi.fn(
    (name, items, description) =>
      `<mock-header name="${name}" items="${items.length}" description="${description || ''}" />`,
  ),
}));

vi.mock('../../src/templates/searchAndFilters', () => ({
  createSearchAndFilters: vi.fn(
    (_, categories) => `<mock-search-filters categories="${categories.length}" />`,
  ),
}));

vi.mock('../../src/templates/modalTemplates', () => ({
  createAddModal: vi.fn((todoLists) => `<mock-add-modal todos="${todoLists.length}" />`),
  createEditModal: vi.fn((todoLists) => `<mock-edit-modal todos="${todoLists.length}" />`),
}));

vi.mock('../../src/templates/itemList', () => ({
  createItemsList: vi.fn(
    (items, sortMethod, todoLists) =>
      `<mock-items-list items="${items.length}" sort="${sortMethod}" todos="${todoLists.length}" />`,
  ),
}));

vi.mock('../../src/templates/sortOptions', () => ({
  createSortOptions: vi.fn((sortMethod) => `<mock-sort-options method="${sortMethod}" />`),
}));

vi.mock('../../src/templates/filters', () => ({
  createActiveFiltersDisplay: vi.fn(
    (filters) => `<mock-active-filters searchText="${filters.searchText}" />`,
  ),
}));

vi.mock('../../src/styles/styles', () => ({
  styles: 'mock-styles-content',
}));

describe('generateCardHTML', () => {
  let mockItems: InventoryItem[];
  let mockFilters: FilterState;
  let mockTodoLists: TodoList[];
  let mockCategories: string[];

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
    ];

    mockFilters = {
      searchText: '',
      category: '',
      quantity: '',
      expiry: '',
      showAdvanced: false,
    };

    mockTodoLists = [
      {
        id: 'grocery-list-1',
        name: 'Grocery List',
        entity_id: 'todo.grocery',
      },
      {
        id: 'shopping-list-2',
        name: 'Shopping List',
        entity_id: 'todo.shopping',
      },
    ];

    mockCategories = ['Fruit', 'Vegetable', 'Dairy'];
  });

  describe('basic functionality', () => {
    it('should generate complete HTML structure with items', () => {
      const result = generateCardHTML(
        'Kitchen Inventory',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        'Kitchen items description',
      );

      expect(result).toContain('<style>mock-styles-content</style>');
      expect(result).toContain('<ha-card>');
      expect(result).toContain('</ha-card>');
      expect(result).toContain('class="controls-row"');
      expect(result).toContain('class="search-controls"');
      expect(result).toContain('class="items-container"');
    });

    it('should include all required sections', () => {
      const result = generateCardHTML(
        'Test Inventory',
        mockItems,
        mockFilters,
        'category',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      // Check for main sections
      expect(result).toContain('<mock-header name="Test Inventory"');
      expect(result).toContain('<mock-sort-options method="category"');
      expect(result).toContain('<mock-search-filters categories="3"');
      expect(result).toContain('<mock-active-filters');
      expect(result).toContain('<mock-items-list items="2"');
      expect(result).toContain('<mock-add-modal todos="2"');
      expect(result).toContain('<mock-edit-modal todos="2"');
    });

    it('should include add button with correct ID', () => {
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      expect(result).toContain(`id="${ELEMENTS.OPEN_ADD_MODAL}"`);
      expect(result).toContain('class="add-new-btn"');
      expect(result).toContain('+ Add Item');
    });
  });

  describe('empty state handling', () => {
    it('should show empty state when no items', () => {
      const result = generateCardHTML(
        'Empty Inventory',
        [],
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        [],
        undefined,
      );

      expect(result).toContain('class="empty-state"');
      expect(result).toContain(MESSAGES.NO_ITEMS);
      expect(result).not.toContain('<mock-items-list');
    });

    it('should not include items list when empty', () => {
      const result = generateCardHTML('Test', [], mockFilters, 'name', [], [], [], undefined);

      expect(result).toContain('<div class="empty-state">');
      expect(result).toContain(MESSAGES.NO_ITEMS);
      expect(result).not.toContain('mock-items-list');
    });

    it('should still include all other sections when empty', () => {
      const result = generateCardHTML(
        'Empty Test',
        [],
        mockFilters,
        'name',
        [],
        [],
        [],
        'Description for empty inventory',
      );

      // Should still have header, controls, modals, etc.
      expect(result).toContain('<mock-header');
      expect(result).toContain('<mock-sort-options');
      expect(result).toContain('<mock-search-filters');
      expect(result).toContain('<mock-add-modal');
      expect(result).toContain('<mock-edit-modal');
    });
  });

  describe('parameter handling', () => {
    it('should handle different inventory names', () => {
      const result = generateCardHTML(
        'Pantry & Storage',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      expect(result).toContain('name="Pantry & Storage"');
    });

    it('should handle different sort methods', () => {
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'quantity_desc',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      expect(result).toContain('method="quantity_desc"');
      expect(result).toContain('sort="quantity_desc"');
    });

    it('should handle description parameter', () => {
      const withDescription = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        'Test description',
      );

      expect(withDescription).toContain('description="Test description"');

      const withoutDescription = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      expect(withoutDescription).toContain('description=""');
    });

    it('should handle different array sizes', () => {
      const largeCategories = ['Cat1', 'Cat2', 'Cat3', 'Cat4', 'Cat5'];
      const largeTodoLists = Array.from({ length: 10 }, (_, i) => ({
        entity_id: `todo.list${i}`,
        id: `todo-list-${i}`,
        name: `List ${i}`,
      }));

      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        largeCategories,
        largeTodoLists,
        mockItems,
        undefined,
      );

      expect(result).toContain('categories="5"');
      expect(result).toContain('todos="10"');
    });
  });

  describe('HTML structure validation', () => {
    it('should have proper nesting structure', () => {
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      // Check that ha-card wraps everything
      const haCardStart = result.indexOf('<ha-card>');
      const haCardEnd = result.indexOf('</ha-card>');
      expect(haCardStart).toBeGreaterThan(-1);
      expect(haCardEnd).toBeGreaterThan(haCardStart);

      // Check that styles come before ha-card
      const stylesIndex = result.indexOf('<style>');
      expect(stylesIndex).toBeGreaterThan(-1);
      expect(stylesIndex).toBeLessThan(haCardStart);
    });

    it('should include styles at the beginning', () => {
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      expect(result.trim()).toMatch(/^\s*<style>mock-styles-content<\/style>/);
    });

    it('should have consistent class names', () => {
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      expect(result).toContain('class="controls-row"');
      expect(result).toContain('class="sorting-controls"');
      expect(result).toContain('class="add-new-btn"');
      expect(result).toContain('class="search-controls"');
      expect(result).toContain('class="items-container"');
    });
  });

  describe('conditional logic', () => {
    it('should use items list when items.length > 0', () => {
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      expect(result).toContain('<mock-items-list items="2"');
      expect(result).not.toContain('class="empty-state"');
    });

    it('should use empty state when items.length === 0', () => {
      const result = generateCardHTML(
        'Test',
        [],
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        [],
        undefined,
      );

      expect(result).not.toContain('<mock-items-list');
      expect(result).toContain('class="empty-state"');
    });

    it('should handle single item correctly', () => {
      const singleItem = [mockItems[0]];
      const result = generateCardHTML(
        'Test',
        singleItem,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        singleItem,
        undefined,
      );

      expect(result).toContain('<mock-items-list items="1"');
      expect(result).not.toContain('class="empty-state"');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string inventory name', () => {
      const result = generateCardHTML(
        '',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      expect(result).toContain('name=""');
    });

    it('should handle special characters in inventory name', () => {
      const result = generateCardHTML(
        'Kitchen & Pantry "Main"',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      expect(result).toContain('name="Kitchen & Pantry "Main""');
    });

    it('should handle empty arrays for all array parameters', () => {
      const result = generateCardHTML('Test', [], mockFilters, 'name', [], [], [], undefined);

      expect(result).toContain('categories="0"');
      expect(result).toContain('todos="0"');
      expect(result).toContain('items="0"');
    });

    it('should handle filters with active values', () => {
      const activeFilters: FilterState = {
        searchText: 'apple',
        category: 'Fruit',
        quantity: 'low',
        expiry: 'soon',
        showAdvanced: true,
      };

      const result = generateCardHTML(
        'Test',
        mockItems,
        activeFilters,
        'name',
        mockCategories,
        mockTodoLists,
        mockItems,
        undefined,
      );

      expect(result).toContain('searchText="apple"');
    });
  });

  describe('integration with child templates', () => {
    it('should pass correct parameters to all child templates', async () => {
      const inventoryHeaderModule = await import('../../src/templates/inventoryHeader');
      const searchAndFiltersModule = await import('../../src/templates/searchAndFilters');
      const modalTemplatesModule = await import('../../src/templates/modalTemplates');
      const itemListModule = await import('../../src/templates/itemList');
      const sortOptionsModule = await import('../../src/templates/sortOptions');
      const filtersModule = await import('../../src/templates/filters');

      generateCardHTML(
        'Test Inventory',
        mockItems,
        mockFilters,
        'category',
        mockCategories,
        mockTodoLists,
        mockItems,
        'Test description',
      );

      expect(inventoryHeaderModule.createInventoryHeader).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        'Test description',
      );
      expect(searchAndFiltersModule.createSearchAndFilters).toHaveBeenCalledWith(
        mockFilters,
        mockCategories,
      );
      expect(sortOptionsModule.createSortOptions).toHaveBeenCalledWith('category');
      expect(filtersModule.createActiveFiltersDisplay).toHaveBeenCalledWith(mockFilters);
      expect(itemListModule.createItemsList).toHaveBeenCalledWith(
        mockItems,
        'category',
        mockTodoLists,
      );
      expect(modalTemplatesModule.createAddModal).toHaveBeenCalledWith(mockTodoLists);
      expect(modalTemplatesModule.createEditModal).toHaveBeenCalledWith(mockTodoLists);
    });
  });
});
