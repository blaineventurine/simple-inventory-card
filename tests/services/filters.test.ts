import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Filters } from '../../src/services/filters';
import { Utilities } from '../../src/utils/utilities';
import { FILTER_VALUES, STORAGE_KEYS, ELEMENTS, SORT_METHODS } from '../../src/utils/constants';
import { InventoryItem } from '../../src/types/homeAssistant';
import { FilterState } from '../../src/types/filterState';

vi.mock('../../src/utils/utilities');
vi.mock('../../src/utils/constants');

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

vi.useFakeTimers();

describe('Filters', () => {
  let filters: Filters;
  let mockShadowRoot: ShadowRoot;
  let mockSearchInput: HTMLInputElement;
  let mockAdvancedToggle: HTMLElement;
  let mockActiveFiltersDiv: HTMLElement;
  let mockActiveFiltersList: HTMLElement;

  const createMockItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
    auto_add_enabled: false,
    category: 'Test Category',
    expiry_date: '2024-12-31',
    name: 'Test Item',
    quantity: 5,
    todo_list: 'test-list',
    unit: 'pcs',
    ...overrides,
  });

  beforeEach(() => {
    mockSearchInput = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      value: '',
    } as unknown as HTMLInputElement;

    mockAdvancedToggle = {
      textContent: '',
      style: { background: '' },
    } as unknown as HTMLElement;

    mockActiveFiltersDiv = {
      style: { display: '' },
    } as unknown as HTMLElement;

    mockActiveFiltersList = {
      textContent: '',
    } as unknown as HTMLElement;

    mockShadowRoot = {
      getElementById: vi.fn((id: string) => {
        switch (id) {
          case ELEMENTS.SEARCH_INPUT:
            return mockSearchInput;
          case ELEMENTS.ADVANCED_SEARCH_TOGGLE:
            return mockAdvancedToggle;
          case ELEMENTS.ACTIVE_FILTERS:
            return mockActiveFiltersDiv;
          case ELEMENTS.ACTIVE_FILTERS_LIST:
            return mockActiveFiltersList;
          default:
            return null;
        }
      }),
    } as unknown as ShadowRoot;

    filters = new Filters(mockShadowRoot);

    vi.clearAllMocks();
    localStorageMock.clear();

    vi.mocked(STORAGE_KEYS).FILTERS = vi.fn((entityId: string) => `filters_${entityId}`);
    vi.mocked(ELEMENTS).SEARCH_INPUT = 'search-input';
    vi.mocked(ELEMENTS).ADVANCED_SEARCH_TOGGLE = 'advanced-toggle';
    vi.mocked(ELEMENTS).ACTIVE_FILTERS = 'active-filters';
    vi.mocked(ELEMENTS).ACTIVE_FILTERS_LIST = 'active-filters-list';

    vi.mocked(FILTER_VALUES).QUANTITY = {
      ZERO: 'zero',
      NONZERO: 'nonzero',
    };
    vi.mocked(FILTER_VALUES).EXPIRY = {
      NONE: 'none',
      EXPIRED: 'expired',
      SOON: 'soon',
      FUTURE: 'future',
    };

    vi.mocked(SORT_METHODS).NAME = 'name';
    vi.mocked(SORT_METHODS).CATEGORY = 'category';
    vi.mocked(SORT_METHODS).QUANTITY = 'quantity';
    vi.mocked(SORT_METHODS).QUANTITY_LOW = 'quantity_low';
    vi.mocked(SORT_METHODS).EXPIRY = 'expiry';
    vi.mocked(SORT_METHODS).ZERO_LAST = 'zero_last';
    vi.mocked(Utilities.isExpired).mockReturnValue(false);
    vi.mocked(Utilities.isExpiringSoon).mockReturnValue(false);
    vi.mocked(Utilities.hasActiveFilters).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('basic functionality', () => {
    it('should initialize with shadowRoot', () => {
      const testFilters = new Filters(mockShadowRoot);
      expect(testFilters).toBeInstanceOf(Filters);
    });

    describe('localStorage operations', () => {
      it('should return parsed filters from localStorage when valid JSON exists', () => {
        const savedFilters: FilterState = {
          searchText: 'test search',
          category: 'test category',
          quantity: 'nonzero',
          expiry: 'soon',
          showAdvanced: true,
          sortMethod: SORT_METHODS.NAME,
        };
        localStorageMock.setItem('filters_test.entity', JSON.stringify(savedFilters));

        const result = filters.getCurrentFilters('test.entity');

        expect(localStorageMock.getItem).toHaveBeenCalledWith('filters_test.entity');
        expect(result).toEqual(savedFilters);
      });

      it('should return default filters when no saved filters exist', () => {
        localStorageMock.getItem.mockReturnValue(null);

        const result = filters.getCurrentFilters('test.entity');

        expect(result).toEqual({
          searchText: '',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
          sortMethod: SORT_METHODS.NAME,
        });
      });

      it('should return default filters when localStorage contains invalid JSON', () => {
        localStorageMock.getItem.mockReturnValue('invalid json');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = filters.getCurrentFilters('test.entity');

        expect(consoleSpy).toHaveBeenCalledWith(
          'Error parsing saved filters:',
          expect.any(SyntaxError),
        );
        expect(result).toEqual({
          searchText: '',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
          sortMethod: SORT_METHODS.NAME,
        });

        consoleSpy.mockRestore();
      });

      it('should handle empty string from localStorage', () => {
        localStorageMock.getItem.mockReturnValue('');

        const result = filters.getCurrentFilters('test.entity');

        expect(result).toEqual({
          searchText: '',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
          sortMethod: SORT_METHODS.NAME,
        });
      });

      it('should save filters to localStorage as JSON', () => {
        const testFilters: FilterState = {
          searchText: 'test',
          category: 'category',
          quantity: 'zero',
          expiry: 'expired',
          showAdvanced: true,
          sortMethod: SORT_METHODS.NAME,
        };

        filters.saveFilters('test.entity', testFilters);

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'filters_test.entity',
          JSON.stringify(testFilters),
        );
      });

      it('should remove filters from localStorage', () => {
        filters.clearFilters('test.entity');

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('filters_test.entity');
      });
    });
  });

  describe('filtering functionality', () => {
    it('should return copy of all items when no filters provided', () => {
      const items: InventoryItem[] = [
        createMockItem({ name: 'Item 1' }),
        createMockItem({ name: 'Item 2' }),
      ];

      const result = filters.filterItems(items, null as any);
      expect(result).toEqual(items);
      expect(result).not.toBe(items);
    });

    it('should handle completely empty filters object', () => {
      const items: InventoryItem[] = [createMockItem()];

      // Pass completely empty object - this tests Object.keys({}).length === 0
      const result = filters.filterItems(items, {} as FilterState);
      expect(result).toHaveLength(1);
    });

    it('should treat filters with all empty string values same as no filters', () => {
      const items: InventoryItem[] = [createMockItem(), createMockItem({ name: 'Item 2' })];

      const filtersWithEmptyKeys = {
        searchText: '',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
        sortMethod: '',
      } as FilterState;

      const result = filters.filterItems(items, filtersWithEmptyKeys);
      expect(result).toHaveLength(2);

      const noFiltersResult = filters.filterItems(items, {} as FilterState);
      expect(result).toEqual(noFiltersResult);
    });

    describe('text search filtering', () => {
      it('should filter by search text - name match', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Apple Juice' }),
          createMockItem({ name: 'Orange Juice' }),
          createMockItem({ name: 'Milk' }),
        ];

        const result = filters.filterItems(items, {
          searchText: 'juice',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Apple Juice');
        expect(result[1].name).toBe('Orange Juice');
      });

      it('should filter by search text - category match', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Item 1', category: 'Beverages' }),
          createMockItem({ name: 'Item 2', category: 'Food' }),
        ];

        const result = filters.filterItems(items, {
          searchText: 'beverage',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('Beverages');
      });

      it('should filter by search text - unit match', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Item 1', unit: 'liters' }),
          createMockItem({ name: 'Item 2', unit: 'pieces' }),
        ];

        const result = filters.filterItems(items, {
          searchText: 'liter',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(1);
        expect(result[0].unit).toBe('liters');
      });

      it('should handle case sensitivity in search', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'UPPERCASE' }),
          createMockItem({ name: 'lowercase' }),
          createMockItem({ name: 'MixedCase' }),
        ];

        const result = filters.filterItems(items, {
          searchText: 'case',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(3);
      });

      it('should handle items with null/undefined properties in text search', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: undefined as any, category: 'Test', unit: 'pcs' }),
          createMockItem({ name: 'Test Item', category: null as any, unit: 'pcs' }),
          createMockItem({ name: 'Test Item', category: 'Test', unit: undefined as any }),
        ];

        const result = filters.filterItems(items, {
          searchText: 'test',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(3);
      });

      it('should fail search when null defaults are changed (mutation test)', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: null as any, category: 'nomatch', unit: 'nomatch' }),
        ];

        const result = filters.filterItems(items, {
          searchText: 'stryker', // Should NOT match if name is null -> ''
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(0);
        // If mutation changes name ?? '' to name ?? "Stryker was here!", this would match
      });

      it('should search specifically for empty string in category (mutation test)', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'nomatch', category: null as any, unit: 'nomatch' }),
          createMockItem({ name: 'nomatch', category: 'realcategory', unit: 'nomatch' }),
        ];

        const result = filters.filterItems(items, {
          searchText: 'stryker',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(0);
        // If mutation changes category ?? '' to category ?? "Stryker was here!", first item would match
      });

      it('should search specifically for empty string in unit (mutation test)', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'nomatch', category: 'nomatch', unit: null as any }),
        ];

        const result = filters.filterItems(items, {
          searchText: 'stryker', // Should NOT match if unit becomes ''
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(0);
        // If mutation changes unit ?? '' to unit ?? "Stryker was here!", this would match
      });
    });

    describe('category filtering', () => {
      it('should filter by category', () => {
        const items: InventoryItem[] = [
          createMockItem({ category: 'Food' }),
          createMockItem({ category: 'Drinks' }),
          createMockItem({ category: 'Food' }),
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: 'Food',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(2);
        expect(result.every((item) => item.category === 'Food')).toBe(true);
      });
    });

    describe('quantity filtering', () => {
      it('should filter by quantity - zero', () => {
        const items: InventoryItem[] = [
          createMockItem({ quantity: 0 }),
          createMockItem({ quantity: 5 }),
          createMockItem({ quantity: 0 }),
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: 'zero',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(2);
        expect(result.every((item) => item.quantity === 0)).toBe(true);
      });

      it('should filter by quantity - nonzero', () => {
        const items: InventoryItem[] = [
          createMockItem({ quantity: 0 }),
          createMockItem({ quantity: 5 }),
          createMockItem({ quantity: 3 }),
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: 'nonzero',
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(2);
        expect(result.every((item) => item.quantity > 0)).toBe(true);
      });

      it('should ensure quantity filter default case returns true', () => {
        const items: InventoryItem[] = [createMockItem({ quantity: 5 })];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: 'unknown_filter_value', // Should hit default case
          expiry: '',
          showAdvanced: false,
        });

        expect(result).toHaveLength(1); // Should include item (default: return true)
      });
    });

    describe('expiry filtering', () => {
      beforeEach(() => {
        vi.setSystemTime(new Date('2024-06-01'));
      });
      it('should exclude items with expiry but zero quantity (tests || vs && mutation)', () => {
        const items: InventoryItem[] = [
          createMockItem({ expiry_date: '2024-12-31', quantity: 0 }), // has expiry but zero quantity
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'future',
          showAdvanced: false,
        });

        expect(result).toHaveLength(0);
        // With ||: (!item.expiry_date || quantity <= 0) = (false || true) = true -> excluded
        // With &&: (!item.expiry_date && quantity <= 0) = (false && true) = false -> included
      });

      it('should exclude items with no expiry but positive quantity (tests conditional mutation)', () => {
        const items: InventoryItem[] = [
          createMockItem({ expiry_date: null as any, quantity: 5 }), // no expiry but positive quantity
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'future',
          showAdvanced: false,
        });

        expect(result).toHaveLength(0);
        // With original: (!item.expiry_date || quantity <= 0) = (true || false) = true -> excluded
        // With mutation to false: (!item.expiry_date || false) = (true || false) = true -> excluded
        // But if quantity condition becomes false: (!item.expiry_date || false) when it should check quantity
      });

      it('should distinguish between zero and negative quantities (tests <= vs < mutation)', () => {
        const items: InventoryItem[] = [
          createMockItem({ expiry_date: '2024-12-31', quantity: 0 }), // exactly zero
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'future',
          showAdvanced: false,
        });

        expect(result).toHaveLength(0);
        // With <=: quantity 0 <= 0 is true -> excluded
        // With <: quantity 0 < 0 is false -> would be included
      });

      it('should filter by expiry - expired items', () => {
        vi.mocked(Utilities.isExpired).mockImplementation(
          (date: string | undefined) => date === '2023-01-01',
        );

        const items: InventoryItem[] = [
          createMockItem({ expiry_date: '2023-01-01', quantity: 5 }), // expired
          createMockItem({ expiry_date: '2025-01-01', quantity: 3 }), // not expired
          createMockItem({ expiry_date: '2023-01-01', quantity: 0 }), // expired but no quantity
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'expired',
          showAdvanced: false,
        });

        expect(result).toHaveLength(1);
        expect(result[0].expiry_date).toBe('2023-01-01');
        expect(result[0].quantity).toBe(5);
      });

      it('should match items with no expiry date for NONE filter', () => {
        const items: InventoryItem[] = [
          createMockItem({ expiry_date: null as any }),
          createMockItem({ expiry_date: undefined as any }),
          createMockItem({ expiry_date: '' }),
          createMockItem({ expiry_date: '2024-12-31' }),
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'none',
          showAdvanced: false,
        });

        expect(result).toHaveLength(3); // null, undefined, and empty string
      });

      it('should match expiring soon items for SOON filter', () => {
        vi.mocked(Utilities.isExpiringSoon).mockImplementation(
          (expiryDate: string, threshold?: number) =>
            expiryDate === '2024-06-05' && threshold === 7,
        );

        const items: InventoryItem[] = [
          createMockItem({ expiry_date: '2024-06-05', quantity: 5, expiry_alert_days: 7 }),
          createMockItem({ expiry_date: '2024-12-31', quantity: 3 }),
          createMockItem({ expiry_date: '2024-06-05', quantity: 0 }), // no quantity
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'soon',
          showAdvanced: false,
        });

        expect(result).toHaveLength(1);
        expect(result[0].expiry_date).toBe('2024-06-05');
        expect(result[0].quantity).toBe(5);
      });

      it('should handle expiry_alert_days of 0 in soon filter', () => {
        vi.mocked(Utilities.isExpiringSoon).mockImplementation(
          (expiryDate: string, threshold?: number) =>
            expiryDate === '2024-06-05' && threshold === 7, // 0 becomes 7 due to || operator
        );

        const items: InventoryItem[] = [
          createMockItem({ expiry_date: '2024-06-05', quantity: 5, expiry_alert_days: 0 }),
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'soon',
          showAdvanced: false,
        });

        expect(result).toHaveLength(1);
        expect(Utilities.isExpiringSoon).toHaveBeenCalledWith('2024-06-05', 7); // 0 || 7 = 7
      });

      it('should exclude items at exact threshold boundary (tests > vs >= mutation)', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thresholdDate = new Date(today);
        thresholdDate.setDate(today.getDate() + 7);

        const exactThresholdDateString = thresholdDate.toISOString().split('T')[0];

        const items: InventoryItem[] = [
          createMockItem({
            expiry_date: exactThresholdDateString,
            quantity: 5,
            expiry_alert_days: 7,
          }),
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'future',
          showAdvanced: false,
        });

        expect(result).toHaveLength(0); // With >, should exclude exact match
      });

      it('should include items beyond threshold boundary', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const beyondThresholdDate = new Date(today);
        beyondThresholdDate.setDate(today.getDate() + 10);

        const beyondThresholdDateString = beyondThresholdDate.toISOString().split('T')[0];

        const items: InventoryItem[] = [
          createMockItem({
            expiry_date: beyondThresholdDateString,
            quantity: 5,
            expiry_alert_days: 7,
          }),
        ];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'future',
          showAdvanced: false,
        });

        expect(result).toHaveLength(1);
      });

      it('should ensure expiry filter default case returns true', () => {
        const items: InventoryItem[] = [createMockItem({ expiry_date: '2024-12-31' })];

        const result = filters.filterItems(items, {
          searchText: '',
          category: '',
          quantity: '',
          expiry: 'unknown_expiry_filter', // Should hit default case
          showAdvanced: false,
        });

        expect(result).toHaveLength(1); // Should include item (default: return true)
      });
    });

    it('should apply multiple filters together', () => {
      const items: InventoryItem[] = [
        createMockItem({ name: 'Apple Juice', category: 'Drinks', quantity: 5 }),
        createMockItem({ name: 'Apple Pie', category: 'Food', quantity: 3 }),
        createMockItem({ name: 'Orange Juice', category: 'Drinks', quantity: 0 }),
      ];

      const result = filters.filterItems(items, {
        searchText: 'apple',
        category: 'Drinks',
        quantity: 'nonzero',
        expiry: '',
        showAdvanced: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Apple Juice');
    });
  });

  describe('sorting functionality', () => {
    it('should verify NAME case returns and does not fall through (mutation test)', () => {
      const items: InventoryItem[] = [
        createMockItem({ name: 'zebra' }),
        createMockItem({ name: 'apple' }),
      ];

      // Mock to verify NAME case is hit and returns
      const sortByNameSpy = vi
        .spyOn(filters as any, 'sortByName')
        .mockReturnValue([createMockItem({ name: 'apple' }), createMockItem({ name: 'zebra' })]);

      const result = filters.sortItems(items, 'name');

      expect(sortByNameSpy).toHaveBeenCalledWith(expect.any(Array));
      expect(result.map((item) => item.name)).toEqual(['apple', 'zebra']);

      // If return statement is removed, it would fall through to next case (CATEGORY)
      // and call sortByCategory instead
      sortByNameSpy.mockRestore();
    });

    it('should return copy of original array for unknown sort method', () => {
      const items: InventoryItem[] = [createMockItem({ name: 'B' }), createMockItem({ name: 'A' })];

      const result = filters.sortItems(items, 'unknown');

      expect(result).toEqual(items);
      expect(result).not.toBe(items); // Should be a copy
    });

    describe('name sorting', () => {
      it('should sort by name alphabetically', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Zebra' }),
          createMockItem({ name: 'Apple' }),
          createMockItem({ name: 'Banana' }),
        ];

        const result = filters.sortItems(items, 'name');

        expect(result.map((item) => item.name)).toEqual(['Apple', 'Banana', 'Zebra']);
      });

      it('should sort by name with numeric sorting', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Item 10' }),
          createMockItem({ name: 'Item 2' }),
          createMockItem({ name: 'Item 1' }),
        ];

        const result = filters.sortItems(items, 'name');

        expect(result.map((item) => item.name)).toEqual(['Item 1', 'Item 2', 'Item 10']);
      });

      it('should verify NAME sort method actually executes (mutation test)', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'zebra' }),
          createMockItem({ name: 'apple' }),
        ];

        const nameSort = filters.sortItems(items, 'name');
        const unknownSort = filters.sortItems(items, 'unknown_method');

        expect(nameSort.map((i) => i.name)).toEqual(['apple', 'zebra']);
        expect(unknownSort.map((i) => i.name)).toEqual(['zebra', 'apple']); // original order

        expect(nameSort).not.toEqual(unknownSort);
      });

      it('should handle names with leading/trailing whitespace', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: '  zebra  ' }),
          createMockItem({ name: ' apple ' }),
          createMockItem({ name: 'banana' }),
        ];

        const result = filters.sortItems(items, 'name');

        expect(result.map((item) => item.name)).toEqual([' apple ', 'banana', '  zebra  ']);
      });

      it('should detect trim differences in name sorting (mutation test)', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: ' b' }), // space before
          createMockItem({ name: 'a ' }), // space after
        ];

        const result = filters.sortItems(items, 'name');

        expect(result.map((item) => item.name)).toEqual(['a ', ' b']);
      });

      it('should detect numeric vs string sorting (mutation test)', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'item10' }),
          createMockItem({ name: 'item2' }),
        ];

        const result = filters.sortItems(items, 'name');

        expect(result.map((item) => item.name)).toEqual(['item2', 'item10']);
        // With numeric: false, would be ['item10', 'item2']
      });

      it('should handle undefined names in sorting', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: undefined as any }),
          createMockItem({ name: 'Real Name' }),
          createMockItem({ name: null as any }),
        ];

        const result = filters.sortItems(items, 'name');

        expect(result).toHaveLength(3);
        expect(result.some((item) => item.name === 'Real Name')).toBe(true);
      });
    });

    describe('category sorting', () => {
      it('should sort by category then by name', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Zebra', category: 'Animals' }),
          createMockItem({ name: 'Apple', category: 'Fruits' }),
          createMockItem({ name: 'Bear', category: 'Animals' }),
        ];

        const result = filters.sortItems(items, 'category');

        expect(result.map((item) => `${item.category}-${item.name}`)).toEqual([
          'Animals-Bear',
          'Animals-Zebra',
          'Fruits-Apple',
        ]);
      });

      it('should handle undefined categories in category sort', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Item1', category: undefined as any }),
          createMockItem({ name: 'Item2', category: 'Real Category' }),
          createMockItem({ name: 'Item3', category: null as any }),
        ];

        const result = filters.sortItems(items, 'category');

        expect(result[0].category).toBe('Real Category');
        expect([undefined, null]).toContain(result[1].category);
        expect([undefined, null]).toContain(result[2].category);
      });

      it('should handle categories with leading/trailing whitespace', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Item1', category: ' Food ' }),
          createMockItem({ name: 'Item2', category: 'Drinks' }),
          createMockItem({ name: 'Item3', category: '  Food  ' }),
        ];

        const result = filters.sortItems(items, 'category');

        expect(result[0].category).toContain('Drinks');
        expect(result[1].category).toContain('Food');
        expect(result[2].category).toContain('Food');
      });
    });

    describe('quantity sorting', () => {
      it('should sort by quantity high to low', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'A', quantity: 1 }),
          createMockItem({ name: 'B', quantity: 5 }),
          createMockItem({ name: 'C', quantity: 3 }),
        ];

        const result = filters.sortItems(items, 'quantity');

        expect(result.map((item) => item.quantity)).toEqual([5, 3, 1]);
      });

      it('should sort by quantity low to high', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'A', quantity: 5 }),
          createMockItem({ name: 'B', quantity: 1 }),
          createMockItem({ name: 'C', quantity: 3 }),
        ];

        const result = filters.sortItems(items, 'quantity_low');

        expect(result.map((item) => item.quantity)).toEqual([1, 3, 5]);
      });

      it('should sort by quantity with name as secondary sort', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Zebra', quantity: 5 }),
          createMockItem({ name: 'Apple', quantity: 5 }),
          createMockItem({ name: 'Banana', quantity: 3 }),
        ];

        const result = filters.sortItems(items, 'quantity');

        expect(result.map((item) => item.name)).toEqual(['Apple', 'Zebra', 'Banana']);
      });

      it('should test lowToHigh default parameter (mutation test)', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Low', quantity: 1 }),
          createMockItem({ name: 'High', quantity: 10 }),
        ];

        const resultDefault = filters.sortItems(items, 'quantity');
        expect(resultDefault.map((item) => item.quantity)).toEqual([10, 1]);

        const resultLowHigh = filters.sortItems(items, 'quantity_low');
        expect(resultLowHigh.map((item) => item.quantity)).toEqual([1, 10]);

        expect(resultDefault).not.toEqual(resultLowHigh);
      });

      it('should handle undefined quantities in sorting', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'A', quantity: undefined as any }),
          createMockItem({ name: 'B', quantity: 5 }),
          createMockItem({ name: 'C', quantity: null as any }),
        ];

        const result = filters.sortItems(items, 'quantity');

        expect(result[0].quantity).toBe(5);
        expect([undefined, null]).toContain(result[1].quantity);
        expect([undefined, null]).toContain(result[2].quantity);
      });
    });

    describe('expiry sorting', () => {
      it('should sort by expiry date', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'A', expiry_date: '2024-12-31' }),
          createMockItem({ name: 'B', expiry_date: '2024-01-01' }),
          createMockItem({ name: 'C', expiry_date: '2024-06-15' }),
        ];

        const result = filters.sortItems(items, 'expiry');

        expect(result.map((item) => item.expiry_date)).toEqual([
          '2024-01-01',
          '2024-06-15',
          '2024-12-31',
        ]);
      });

      it('should put items without expiry date at the end', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'A', expiry_date: '2024-12-31' }),
          createMockItem({ name: 'B', expiry_date: null as any }),
          createMockItem({ name: 'C', expiry_date: '2024-01-01' }),
          createMockItem({ name: 'D', expiry_date: undefined as any }),
        ];

        const result = filters.sortItems(items, 'expiry');

        expect(result.map((item) => item.name)).toEqual(['C', 'A', 'B', 'D']);
      });

      it('should handle items with same expiry date using name as secondary sort', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Zebra', expiry_date: '2024-06-15' }),
          createMockItem({ name: 'Apple', expiry_date: '2024-06-15' }),
          createMockItem({ name: 'Banana', expiry_date: '2024-06-01' }),
        ];

        const result = filters.sortItems(items, 'expiry');

        expect(result.map((item) => item.name)).toEqual(['Banana', 'Apple', 'Zebra']);
      });
    });

    describe('zero last sorting', () => {
      it('should sort with zero quantities last', () => {
        const items: InventoryItem[] = [
          createMockItem({ name: 'Zero Item', quantity: 0 }),
          createMockItem({ name: 'High Item', quantity: 5 }),
          createMockItem({ name: 'Another Zero', quantity: 0 }),
          createMockItem({ name: 'Low Item', quantity: 1 }),
        ];

        const result = filters.sortItems(items, 'zero_last');

        expect(result.map((item) => item.name)).toEqual([
          'High Item',
          'Low Item',
          'Another Zero',
          'Zero Item',
        ]);
      });
    });
  });

  describe('UI interaction', () => {
    describe('setupSearchInput', () => {
      it('should set up search input event listener', () => {
        const onFilterChange = vi.fn();

        filters.setupSearchInput('test.entity', onFilterChange);

        expect(mockShadowRoot.getElementById).toHaveBeenCalledWith('search-input');
        expect(mockSearchInput.addEventListener).toHaveBeenCalledWith(
          'input',
          expect.any(Function),
        );
      });

      // TODO: re-enable when verified this is correct behavior
      // it('should not set up listener twice', () => {
      //   const onFilterChange = vi.fn();
      //
      //   filters.setupSearchInput('test.entity', onFilterChange);
      //   filters.setupSearchInput('test.entity', onFilterChange);
      //
      //   expect(mockSearchInput.addEventListener).toHaveBeenCalledTimes(1);
      // });

      it('should handle search input changes with debouncing', () => {
        const onFilterChange = vi.fn();
        const existingFilters: FilterState = {
          searchText: '',
          category: 'test',
          quantity: '',
          expiry: '',
          showAdvanced: false,
          sortMethod: SORT_METHODS.NAME,
        };

        vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify(existingFilters));

        filters.setupSearchInput('test.entity', onFilterChange);

        const eventListener = vi.mocked(mockSearchInput.addEventListener).mock.calls[0][1] as (
          e: Event,
        ) => void;

        const mockEvent = {
          target: { value: 'new search' } as HTMLInputElement,
        } as unknown as Event;

        eventListener(mockEvent);

        expect(onFilterChange).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);

        expect(onFilterChange).toHaveBeenCalled();
        expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
          'filters_test.entity',
          JSON.stringify({
            ...existingFilters,
            searchText: 'new search',
          }),
        );
      });

      it('should clear previous timeout on rapid input changes', () => {
        const onFilterChange = vi.fn();
        filters.setupSearchInput('test.entity', onFilterChange);

        const eventListener = vi.mocked(mockSearchInput.addEventListener).mock.calls[0][1] as (
          e: Event,
        ) => void;

        eventListener({ target: { value: 'first' } } as any);
        vi.advanceTimersByTime(100);

        eventListener({ target: { value: 'second' } } as any);
        vi.advanceTimersByTime(300);

        expect(onFilterChange).toHaveBeenCalledTimes(1);
      });

      it('should handle case when search input element is not found', () => {
        vi.mocked(mockShadowRoot.getElementById).mockReturnValue(null);
        const onFilterChange = vi.fn();

        expect(() => {
          filters.setupSearchInput('test.entity', onFilterChange);
        }).not.toThrow();
      });
    });

    describe('updateFilterIndicators', () => {
      it('should update advanced toggle when no active filters', () => {
        const testFilters: FilterState = {
          searchText: '',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        };
        vi.mocked(Utilities.hasActiveFilters).mockReturnValue(false);

        filters.updateFilterIndicators(testFilters);

        expect(mockAdvancedToggle.textContent).toBe('Filters');
        expect(mockAdvancedToggle.style.background).toBe('var(--primary-color)');
      });

      it('should update advanced toggle when active filters exist', () => {
        const testFilters: FilterState = {
          searchText: 'test',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        };
        vi.mocked(Utilities.hasActiveFilters).mockReturnValue(true);

        filters.updateFilterIndicators(testFilters);

        expect(mockAdvancedToggle.textContent).toBe('Filters ●');
        expect(mockAdvancedToggle.style.background).toBe('var(--warning-color, #ff9800)');
      });

      it('should handle showAdvanced=true with active filters', () => {
        const testFilters: FilterState = {
          searchText: 'test',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: true,
        };
        vi.mocked(Utilities.hasActiveFilters).mockReturnValue(true);

        filters.updateFilterIndicators(testFilters);

        expect(mockAdvancedToggle.textContent).toBe('Hide Filters ●');
      });

      it('should handle showAdvanced=true without active filters', () => {
        const testFilters: FilterState = {
          searchText: '',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: true,
        };
        vi.mocked(Utilities.hasActiveFilters).mockReturnValue(false);

        filters.updateFilterIndicators(testFilters);

        expect(mockAdvancedToggle.textContent).toBe('Hide Filters');
      });

      it('should show active filters when filters are applied', () => {
        const testFilters: FilterState = {
          searchText: 'test search',
          category: 'Food',
          quantity: 'nonzero',
          expiry: 'soon',
          showAdvanced: true,
        };

        filters.updateFilterIndicators(testFilters);

        expect(mockActiveFiltersList.textContent).toBe(
          'Search: "test search", Category: Food, Quantity: nonzero, Expiry: soon',
        );
        expect(mockActiveFiltersDiv.style.display).toBe('block');
      });

      it('should hide active filters when no filters are applied', () => {
        const testFilters: FilterState = {
          searchText: '',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        };

        filters.updateFilterIndicators(testFilters);

        expect(mockActiveFiltersDiv.style.display).toBe('none');
      });

      it('should handle case when elements are not found', () => {
        vi.mocked(mockShadowRoot.getElementById).mockReturnValue(null);

        const testFilters: FilterState = {
          searchText: 'test',
          category: '',
          quantity: '',
          expiry: '',
          showAdvanced: false,
        };

        expect(() => {
          filters.updateFilterIndicators(testFilters);
        }).not.toThrow();
      });
    });
  });

  describe('edge cases and stress tests', () => {
    it('should handle empty items array', () => {
      const result = filters.filterItems([], {
        searchText: 'test',
        category: 'Food',
        quantity: 'nonzero',
        expiry: 'soon',
        showAdvanced: false,
      });

      expect(result).toEqual([]);
    });

    it('should handle items with very long names in text search', () => {
      const longName = 'A'.repeat(1000);
      const items: InventoryItem[] = [createMockItem({ name: longName })];

      const result = filters.filterItems(items, {
        searchText: 'A'.repeat(100),
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      });

      expect(result).toHaveLength(1);
    });

    it('should handle special characters in search text', () => {
      const items: InventoryItem[] = [
        createMockItem({ name: 'Test & Item' }),
        createMockItem({ name: 'Regular Item' }),
      ];

      const result = filters.filterItems(items, {
        searchText: '&',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test & Item');
    });
  });
});
