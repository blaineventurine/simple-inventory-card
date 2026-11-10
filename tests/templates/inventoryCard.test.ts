import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCardHTML } from '../../src/templates/inventoryCard';
import { InventoryConfig, InventoryItem } from '../../src/types/inventory';
import { FilterState } from '../../src/types/filterState';
import { TodoList } from '../../src/types/todoList';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '../../src/utils/constants';
import { createAddModal, createEditModal } from '../../src/templates/modalTemplates';
import { createEmptyState, createItemsList } from '../../src/templates/itemList';
import { ImageLoader } from '../../src/services/imageLoader';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

vi.mock('../../src/templates/inventoryHeader', () => ({
  createInventoryHeader: vi.fn(
    (name, items, _translations, description) =>
      `<mock-header name="${name}" items="${items.length}" description="${description || ''}" />`,
  ),
}));

vi.mock('../../src/templates/searchAndFilters', () => ({
  createSearchRow: vi.fn(() => '<mock-search-row />'),
  createFilterPanel: vi.fn(
    (_, categories, _locations, _translations) =>
      `<mock-search-filters categories="${categories.length}" />`,
  ),
}));

vi.mock('../../src/templates/modalTemplates', () => ({
  createAddModal: vi.fn(
    (todoLists, _translations) => `<mock-add-modal todos="${todoLists.length}" />`,
  ),
  createEditModal: vi.fn(
    (todoLists, _translations) => `<mock-edit-modal todos="${todoLists.length}" />`,
  ),
}));

vi.mock('../../src/templates/itemList', () => ({
  createItemsList: vi.fn(
    (items, sortMethod, todoLists, _translations) =>
      `<mock-items-list items="${items.length}" sort="${sortMethod}" todos="${todoLists.length}" />`,
  ),
  createEmptyState: vi.fn((kind) => `<mock-empty kind="${kind}" />`),
}));

vi.mock('../../src/templates/sortOptions', () => ({
  createSortOptions: vi.fn(
    (sortMethod, _translations) => `<mock-sort-options method="${sortMethod}" />`,
  ),
}));

vi.mock('../../src/templates/filters', () => ({
  createActiveFiltersDisplay: vi.fn(
    (filters, _translations) => `<mock-active-filters searchText="${filters.searchText}" />`,
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
  let mockLocations: string[];
  let mockTranslations: TranslationData;

  beforeEach(() => {
    vi.clearAllMocks();

    mockItems = [
      {
        auto_add_enabled: false,
        auto_add_id_to_description_enabled: false,
        auto_add_to_list_quantity: 2,
        category: 'Fruit',
        description: 'Fresh red apples',
        expiry_alert_days: 7,
        expiry_date: '2024-12-31',
        location: 'Kitchen',
        name: 'Apple',
        quantity: 5,
        todo_list: 'grocery',
        unit: 'pieces',
      },
      {
        auto_add_enabled: true,
        auto_add_id_to_description_enabled: false,
        auto_add_to_list_quantity: 1,
        category: 'Fruit',
        description: 'Ripe bananas',
        expiry_alert_days: 5,
        expiry_date: '2024-11-15',
        location: 'Kitchen',
        name: 'Banana',
        quantity: 3,
        todo_list: 'shopping',
        unit: 'pieces',
      },
    ];

    mockFilters = {
      category: [],
      expiry: [],
      location: [],
      quantity: [],
      searchText: '',
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
    mockLocations = ['Kitchen', 'Pantry', 'Fridge'];

    mockTranslations = {
      items: {
        no_items: 'No items in inventory',
      },
      general: {
        add_item: '+ Add Item',
      },
    };
  });

  describe('basic functionality', () => {
    it('should generate complete HTML structure with items', () => {
      const result = generateCardHTML(
        'Kitchen Inventory',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        'Kitchen items description',
        mockTranslations,
      );

      expect(result).toContain('<style>mock-styles-content</style>');
      expect(result).toContain('<ha-card>');
      expect(result).toContain('</ha-card>');
      expect(result).toContain('class="si-toolbar"');
      expect(result).toContain('<mock-search-row />');
      expect(result).toContain('class="items-container"');
    });

    it('should include all required sections', () => {
      const result = generateCardHTML(
        'Test Inventory',
        mockItems,
        mockFilters,
        'category',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
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
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
      );

      expect(result).toContain(`id="${ELEMENTS.OPEN_ADD_MODAL}"`);
      expect(result).toContain('class="si-icon-btn si-add-btn si-tint si-tone-primary"');
      expect(result).toContain('aria-label="Add Item"');
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
        mockLocations,
        mockTodoLists,
        [],
        undefined,
        mockTranslations,
      );

      expect(result).toContain('<mock-empty kind="empty" />');
      expect(createEmptyState).toHaveBeenCalledWith('empty', mockTranslations);
      expect(result).not.toContain('<mock-items-list');
    });

    it('should not include items list when empty', () => {
      const result = generateCardHTML(
        'Test',
        [],
        mockFilters,
        'name',
        [],
        [],
        [],
        [],
        undefined,
        mockTranslations,
      );

      expect(result).toContain('<mock-empty kind="empty" />');
      expect(createEmptyState).toHaveBeenCalledWith('empty', mockTranslations);
      expect(result).not.toContain('mock-items-list');
    });

    it('should show the no-results state when filters hide every item', () => {
      const result = generateCardHTML(
        'Test',
        [],
        { ...mockFilters, searchText: 'zzz' },
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        [],
        undefined,
        mockTranslations,
      );

      expect(result).toContain('<mock-empty kind="no_results" />');
      expect(createEmptyState).toHaveBeenCalledWith('no_results', mockTranslations);
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
        [],
        'Description for empty inventory',
        mockTranslations,
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
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
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
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
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
        mockLocations,
        mockTodoLists,
        mockItems,
        'Test description',
        mockTranslations,
      );

      expect(withDescription).toContain('description="Test description"');

      const withoutDescription = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
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
        mockLocations,
        largeTodoLists,
        mockItems,
        undefined,
        mockTranslations,
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
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
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
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
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
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
      );

      expect(result).toContain('class="si-toolbar"');
      expect(result).toContain('class="si-toolbar__row"');
      expect(result).toContain('class="si-chip-row"');
      expect(result).toContain('class="si-icon-btn si-add-btn si-tint si-tone-primary"');
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
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
      );

      expect(result).toContain('<mock-items-list items="2"');
      expect(result).not.toContain('<mock-empty');
    });

    it('should use empty state when items.length === 0', () => {
      const result = generateCardHTML(
        'Test',
        [],
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        [],
        undefined,
        mockTranslations,
      );

      expect(result).not.toContain('<mock-items-list');
      expect(result).toContain('<mock-empty');
    });

    it('should handle single item correctly', () => {
      const singleItem = [mockItems[0]];
      const result = generateCardHTML(
        'Test',
        singleItem,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        singleItem,
        undefined,
        mockTranslations,
      );

      expect(result).toContain('<mock-items-list items="1"');
      expect(result).not.toContain('<mock-empty');
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
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
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
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
      );

      expect(result).toContain('name="Kitchen & Pantry "Main""');
    });

    it('should handle empty arrays for all array parameters', () => {
      const result = generateCardHTML(
        'Test',
        [],
        mockFilters,
        'name',
        [],
        [],
        [],
        [],
        undefined,
        mockTranslations,
      );

      expect(result).toContain('categories="0"');
      expect(result).toContain('todos="0"');
      expect(result).toContain('items="0"');
    });

    it('should handle filters with active values', () => {
      const activeFilters: FilterState = {
        category: ['Fruit'],
        expiry: ['soon'],
        location: ['Kitchen'],
        quantity: ['low'],
        searchText: 'apple',
        showAdvanced: true,
      };

      const result = generateCardHTML(
        'Test',
        mockItems,
        activeFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
      );

      expect(result).toContain('searchText="apple"');
    });
  });

  describe('config visibility toggles', () => {
    it('should render all sections by default (no config)', () => {
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
      );

      expect(result).toContain('<mock-header');
      expect(result).toContain('class="si-toolbar"');
      expect(result).toContain('<mock-sort-options');
      expect(result).toContain('si-add-btn');
      expect(result).toContain('<mock-search-row />');
      expect(result).toContain('<mock-active-filters');
    });

    it('should omit header when show_header is false', () => {
      const config = {
        type: 'custom:simple-inventory-card',
        entity: 'sensor.test',
        show_header: false,
      } as any;
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
        config,
      );

      expect(result).not.toContain('<mock-header');
      // Other sections should still be present
      expect(result).toContain('class="si-toolbar"');
      expect(result).toContain('<mock-search-row />');
    });

    it('should omit search controls and active filters when show_search is false', () => {
      const config = {
        type: 'custom:simple-inventory-card',
        entity: 'sensor.test',
        show_search: false,
      } as any;
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
        config,
      );

      expect(result).not.toContain('<mock-search-row');
      expect(result).not.toContain('<mock-search-filters');
      expect(result).not.toContain('<mock-active-filters');
      // Other sections should still be present
      expect(result).toContain('<mock-header');
      expect(result).toContain('class="si-toolbar"');
    });

    it('should omit sort dropdown but keep add button when show_sort is false', () => {
      const config = {
        type: 'custom:simple-inventory-card',
        entity: 'sensor.test',
        show_sort: false,
      } as any;
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
        config,
      );

      expect(result).not.toContain('<mock-sort-options');
      expect(result).toContain('si-add-btn');
      expect(result).toContain('class="si-toolbar"');
    });

    it('should omit add button but keep sort when show_add_button is false', () => {
      const config = {
        type: 'custom:simple-inventory-card',
        entity: 'sensor.test',
        show_add_button: false,
      } as any;
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
        config,
      );

      expect(result).toContain('<mock-sort-options');
      expect(result).not.toContain('si-add-btn');
      expect(result).toContain('class="si-toolbar"');
    });

    it('should hide the chip row when sort and add are hidden and no filter is active', () => {
      const config = {
        type: 'custom:simple-inventory-card',
        entity: 'sensor.test',
        show_sort: false,
        show_add_button: false,
      } as any;
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
        config,
      );

      expect(result).not.toContain('<mock-sort-options');
      expect(result).not.toContain('si-add-btn');
      expect(result).toContain('<div class="si-chip-row" hidden>');
      expect(result).toContain('<mock-search-row />');
    });

    it('should keep the chip row visible for active filters when sort is hidden', () => {
      const config = {
        type: 'custom:simple-inventory-card',
        entity: 'sensor.test',
        show_sort: false,
      } as InventoryConfig;
      const result = generateCardHTML(
        'Test',
        mockItems,
        { ...mockFilters, category: ['Fruit'] },
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
        config,
      );

      expect(result).toContain('<div class="si-chip-row">');
      expect(result).toContain('<mock-active-filters');
    });

    it('should omit the whole toolbar when search, sort and add are hidden', () => {
      const config = {
        type: 'custom:simple-inventory-card',
        entity: 'sensor.test',
        show_search: false,
        show_sort: false,
        show_add_button: false,
      } as InventoryConfig;
      const result = generateCardHTML(
        'Test',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
        config,
      );

      expect(result).not.toContain('si-toolbar');
      expect(result).toContain('class="items-container"');
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
        mockLocations,
        mockTodoLists,
        mockItems,
        'Test description',
        mockTranslations,
      );

      expect(inventoryHeaderModule.createInventoryHeader).toHaveBeenCalledWith(
        'Test Inventory',
        mockItems,
        mockTranslations,
        'Test description',
      );
      expect(searchAndFiltersModule.createSearchRow).toHaveBeenCalledWith(
        mockFilters,
        mockTranslations,
      );
      expect(searchAndFiltersModule.createFilterPanel).toHaveBeenCalledWith(
        mockFilters,
        mockCategories,
        mockLocations,
        mockTranslations,
      );
      expect(sortOptionsModule.createSortOptions).toHaveBeenCalledWith(
        'category',
        mockTranslations,
      );
      expect(filtersModule.createActiveFiltersDisplay).toHaveBeenCalledWith(
        mockFilters,
        mockTranslations,
      );
      expect(itemListModule.createItemsList).toHaveBeenCalledWith(
        mockItems,
        'category',
        mockTodoLists,
        mockTranslations,
        undefined,
        undefined,
      );
      expect(modalTemplatesModule.createAddModal).toHaveBeenCalledWith(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
        false,
        false,
        false,
      );
      expect(modalTemplatesModule.createEditModal).toHaveBeenCalledWith(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
        false,
        false,
        false,
      );
    });
  });

  describe('batches', () => {
    const render = (rowOptions?: {
      batches: boolean;
      expanded: Set<string>;
      transfers: boolean;
    }): string =>
      generateCardHTML(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
        undefined,
        rowOptions,
      );

    it('adds no batch markup without the batches feature', () => {
      const result = render();

      expect(result).not.toContain(`id="${ELEMENTS.BATCH_LOCATION_OPTIONS}"`);
      expect(result).not.toContain(`id="${ELEMENTS.SCAN_BATCH_FIELDS}"`);
      expect(vi.mocked(createEditModal)).toHaveBeenLastCalledWith(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
        false,
        false,
        false,
      );
    });

    it('adds the location datalist, scan batch details and batch editor with the feature', () => {
      const rowOptions = { batches: true, expanded: new Set<string>(), transfers: false };
      const result = render(rowOptions);

      expect(result).toContain(`id="${ELEMENTS.BATCH_LOCATION_OPTIONS}"`);
      expect(result).toContain('<option value="Kitchen"></option>');
      expect(result).toContain(`id="${ELEMENTS.SCAN_BATCH_FIELDS}"`);
      expect(vi.mocked(createEditModal)).toHaveBeenLastCalledWith(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
        true,
        false,
        false,
      );
      expect(vi.mocked(createAddModal)).toHaveBeenLastCalledWith(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
        true,
        false,
        false,
      );
      expect(vi.mocked(createItemsList)).toHaveBeenLastCalledWith(
        mockItems,
        'name',
        mockTodoLists,
        mockTranslations,
        undefined,
        rowOptions,
      );
    });
  });

  describe('item icons', () => {
    it('passes the item icons flag to both item sheets', () => {
      generateCardHTML(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
        undefined,
        undefined,
        true,
      );

      expect(vi.mocked(createAddModal)).toHaveBeenLastCalledWith(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
        false,
        true,
        false,
      );
      expect(vi.mocked(createEditModal)).toHaveBeenLastCalledWith(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
        false,
        true,
        false,
      );
    });
  });

  describe('item images', () => {
    it('renders both item sheets with the image field when the rows get images', () => {
      generateCardHTML(
        'Test Inventory',
        mockItems,
        mockFilters,
        'name',
        mockCategories,
        mockLocations,
        mockTodoLists,
        mockItems,
        undefined,
        mockTranslations,
        undefined,
        {
          batches: true,
          expanded: new Set<string>(),
          transfers: true,
          images: new ImageLoader(vi.fn<(path: string) => Promise<Blob>>()),
        },
        true,
      );

      expect(vi.mocked(createAddModal)).toHaveBeenLastCalledWith(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
        true,
        true,
        true,
      );
      expect(vi.mocked(createEditModal)).toHaveBeenLastCalledWith(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
        true,
        true,
        true,
      );
    });
  });
});
