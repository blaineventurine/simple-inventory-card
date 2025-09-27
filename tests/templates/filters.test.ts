import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActiveFiltersDisplay } from '../../src/templates/filters';
import { FilterState } from '../../src/types/filterState';
import { ELEMENTS } from '../../src/utils/constants';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn((_translations: any, _key: string, _params: any, fallback: string) => {
      return fallback;
    }),
  },
}));

const baseFilters: FilterState = {
  category: [],
  expiry: [],
  location: [],
  quantity: [],
  searchText: '',
  showAdvanced: false,
  sortMethod: 'name',
};

describe('createActiveFiltersDisplay', () => {
  let mockTranslations: TranslationData;

  beforeEach(() => {
    mockTranslations = {
      active_filters: {
        category: 'Category',
        expiry: 'Expiry',
        label: 'Active filters:',
        location: 'Location',
        quantity: 'Quantity',
        search: 'Search',
        selected: 'selected',
      },
      filters: {
        expired: 'Expired',
        future: 'Future',
        none: 'No Expiry',
        nonzero: 'Non-zero',
        soon: 'Expiring Soon',
        zero: 'Zero',
      },
    };
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should hide display when no filters are active', () => {
      const result = createActiveFiltersDisplay(baseFilters, mockTranslations);

      expect(result).toContain('style="display: none;">');
      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS}"`);
      expect(result).toContain('class="active-filters"');
    });

    it('should show display when filters are active', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'apple',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('style="display: block;">');
    });

    it('should include active filters list element', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'test',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS_LIST}"`);
      expect(result).toContain('class="filter-badges-container"');
    });
  });

  describe('individual filter types', () => {
    it('should display search text filter badge', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'banana',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge search">');
      expect(result).toContain('Search: "banana"');
      expect(result).toContain('</span>');
      expect(result).toContain('style="display: block;">');
    });

    it('should display single category filter badge', () => {
      const filters: FilterState = {
        ...baseFilters,
        category: ['Fruit'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge category">');
      expect(result).toContain('Category: Fruit');
      expect(result).toContain('</span>');
    });

    it('should display multiple categories as count', () => {
      const filters: FilterState = {
        ...baseFilters,
        category: ['Fruit', 'Dairy'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge category">');
      expect(result).toContain('Category: 2 selected');
      expect(result).toContain('</span>');
    });

    it('should display single quantity filter badge', () => {
      const filters: FilterState = {
        ...baseFilters,
        quantity: ['zero'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge quantity">');
      expect(result).toContain('Quantity: zero');
      expect(result).toContain('</span>');
    });

    it('should display multiple quantity filters as count', () => {
      const filters: FilterState = {
        ...baseFilters,
        quantity: ['zero', 'nonzero'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge quantity">');
      expect(result).toContain('Quantity: 2 selected');
      expect(result).toContain('</span>');
    });

    it('should display single expiry filter badge with translation', () => {
      const filters: FilterState = {
        ...baseFilters,
        expiry: ['expired'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge expiry">');
      expect(result).toContain('Expiry: expired'); // Note: translated value
      expect(result).toContain('</span>');
    });

    it('should display location filter badge', () => {
      const filters: FilterState = {
        ...baseFilters,
        location: ['Pantry'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge location">');
      expect(result).toContain('Location: Pantry');
      expect(result).toContain('</span>');
    });
  });

  describe('multiple filters', () => {
    it('should display multiple filter badges', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'apple',
        category: ['Fruit'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge search">');
      expect(result).toContain('Search: "apple"');
      expect(result).toContain('<span class="filter-badge category">');
      expect(result).toContain('Category: Fruit');
      expect(result).toContain('style="display: block;">');
    });

    it('should display all filter types when active', () => {
      const filters: FilterState = {
        category: ['Food'],
        expiry: ['soon'],
        location: ['Pantry'],
        quantity: ['zero'],
        searchText: 'test',
        showAdvanced: true,
        sortMethod: 'name',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge search">');
      expect(result).toContain('Search: "test"');
      expect(result).toContain('<span class="filter-badge category">');
      expect(result).toContain('Category: Food');
      expect(result).toContain('<span class="filter-badge location">');
      expect(result).toContain('Location: Pantry');
      expect(result).toContain('<span class="filter-badge quantity">');
      expect(result).toContain('Quantity: zero');
      expect(result).toContain('<span class="filter-badge expiry">');
      expect(result).toContain('Expiry: soon'); // Translated
    });

    it('should handle mix of single and multiple selections', () => {
      const filters: FilterState = {
        category: ['Dairy', 'Bakery', 'Frozen'],
        expiry: [],
        location: ['Pantry'],
        quantity: ['zero', 'nonzero'],
        searchText: 'milk',
        showAdvanced: false,
        sortMethod: 'name',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('Search: "milk"');
      expect(result).toContain('Category: 3 selected');
      expect(result).toContain('Location: Pantry');
      expect(result).toContain('Quantity: 2 selected');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in search text', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'coffee & cream "special"',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge search">');
      expect(result).toContain('Search: "coffee & cream "special""');
    });

    it('should handle empty arrays (should not display)', () => {
      const result = createActiveFiltersDisplay(baseFilters, mockTranslations);
      const badgesContainer = result.match(/<div id="active-filters-list"[^>]*>([\s\S]*?)<\/div>/);

      expect(result).toContain('style="display: none;">');
      expect(badgesContainer).toBeTruthy();
      expect(badgesContainer![1].trim()).toBe('');
      expect(result).not.toMatch(/<span class="filter-badge[^"]*">/);
    });

    it('should handle whitespace-only filters (should display)', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: '   ',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="filter-badge search">');
      expect(result).toContain('Search: "   "');
      expect(result).toContain('style="display: block;">');
    });
  });

  describe('HTML structure', () => {
    it('should generate valid HTML structure', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'test',
        category: ['Food'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toMatch(
        /<div id="[^"]*" class="active-filters" style="display: block;">[\s\S]*<\/div>/,
      );

      expect(result).toContain('class="filter-badges-container"');
      expect(result).toContain('<span class="filter-badge');
    });

    it('should use correct element IDs from constants', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'test',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS}"`);
      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS_LIST}"`);
    });

    it('should have consistent whitespace and formatting', () => {
      const result = createActiveFiltersDisplay(baseFilters, mockTranslations);

      expect(result).toContain('\n');
      expect(result.trim()).toBeTruthy();
      expect(result).toContain('<div id=');
      expect(result).toContain('</div>');
    });
  });

  describe('filter badge ordering', () => {
    it('should display filter badges in consistent order', () => {
      const filters: FilterState = {
        category: ['category'],
        expiry: ['none'],
        location: ['location'],
        quantity: ['zero'],
        searchText: 'search',
        showAdvanced: false,
        sortMethod: 'name',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);
      const searchIndex = result.indexOf('class="filter-badge search"');
      const categoryIndex = result.indexOf('class="filter-badge category"');
      const quantityIndex = result.indexOf('class="filter-badge quantity"');
      const expiryIndex = result.indexOf('class="filter-badge expiry"');
      const locationIndex = result.indexOf('class="filter-badge location"');

      expect(searchIndex).toBeLessThan(categoryIndex);
      expect(categoryIndex).toBeLessThan(locationIndex);
      expect(locationIndex).toBeLessThan(quantityIndex);
      expect(quantityIndex).toBeLessThan(expiryIndex);
    });
  });
});
