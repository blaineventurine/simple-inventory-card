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
  expiry: '',
  location: [],
  quantity: '',
  searchText: '',
  showAdvanced: false,
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

      expect(result).toContain('style="display: none;"');
      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS}"`);
      expect(result).toContain('class="active-filters"');
    });

    it('should show display when filters are active', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'apple',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('style="display: block;"');
      expect(result).toContain('Active filters:');
    });

    it('should include active filters list element', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'test',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS_LIST}"`);
    });
  });

  describe('individual filter types', () => {
    it('should display search text filter', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'banana',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('Search: "banana"');
      expect(result).toContain('style="display: block;"');
    });

    it('should display category filter', () => {
      const filters: FilterState = {
        ...baseFilters,
        category: ['Fruit'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('Category: Fruit');
      expect(result).toContain('style="display: block;"');
    });

    it('should display quantity filter', () => {
      const filters: FilterState = {
        ...baseFilters,
        quantity: 'zero',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('Quantity: zero');
      expect(result).toContain('style="display: block;"');
    });

    it('should display expiry filter', () => {
      const filters: FilterState = {
        ...baseFilters,
        expiry: 'expired',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('Expiry: expired');
      expect(result).toContain('style="display: block;"');
    });
  });

  describe('multiple filters', () => {
    it('should display multiple filters separated by commas', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'apple',
        category: ['Fruit'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('Search: "apple", Category: Fruit');
      expect(result).toContain('style="display: block;"');
    });

    it('should display all filter types when active', () => {
      const filters: FilterState = {
        category: ['Food'],
        expiry: 'soon',
        location: ['Pantry'],
        quantity: 'zero',
        searchText: 'test',
        showAdvanced: true,
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('Search: "test"');
      expect(result).toContain('Category: Food');
      expect(result).toContain('Quantity: zero');
      expect(result).toContain('Expiry: soon');
      expect(result).toContain('Location: Pantry');
      expect(result).toContain('style="display: block;"');

      // Check they're comma-separated
      const filtersList = result.match(/<span id="[^"]*">[^<]*<\/span>/)?.[0];
      expect(filtersList).toContain(', ');
    });

    it('should join filters with commas and spaces', () => {
      const filters: FilterState = {
        category: ['Dairy'],
        expiry: '',
        location: ['Pantry'],
        quantity: 'zero',
        searchText: 'milk',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      const expectedText = 'Search: "milk", Category: Dairy, Quantity: zero, Location: Pantry';
      expect(result).toContain(expectedText);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in search text', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'coffee & cream "special"',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('Search: "coffee & cream "special""');
    });

    it('should handle empty string filters (should not display)', () => {
      const result = createActiveFiltersDisplay(baseFilters, mockTranslations);

      expect(result).not.toContain('Search:');
      expect(result).not.toContain('Category:');
      expect(result).not.toContain('Quantity:');
      expect(result).not.toContain('Expiry:');
      expect(result).not.toContain('Location:');
      expect(result).toContain('style="display: none;"');
    });

    it('should handle whitespace-only filters (should display)', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: '   ',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('Search: "   "');
      expect(result).toContain('style="display: block;"');
    });

    it('should handle undefined showAdvanced property', () => {
      const filters = {
        category: [''],
        expiry: '',
        location: [''],
        quantity: '',
        searchText: 'test',
      } as FilterState;

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('Search: "test"');
      expect(result).toContain('style="display: block;"');
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

      expect(result).toContain('<span>Active filters:</span>');
      expect(result).toMatch(/<span id="[^"]*">.*<\/span>/);
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
      expect(result.trim()).toBeTruthy(); // Should not be just whitespace
      expect(result).toContain('<div id=');
      expect(result).toContain('</div>');
      expect(result).toContain('<span>');
      expect(result).toContain('</span>');
    });
  });

  describe('filter ordering', () => {
    it('should display filters in consistent order', () => {
      const filters: FilterState = {
        category: ['category'],
        expiry: 'expiry',
        location: ['location'],
        quantity: 'quantity',
        searchText: 'search',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      const filterText = result.match(/<span id="[^"]*">(.*?)<\/span>/)?.[1] || '';
      const parts = filterText.split(', ');

      expect(parts[0]).toBe('Search: "search"');
      expect(parts[1]).toBe('Category: category');
      expect(parts[2]).toBe('Quantity: quantity');
      expect(parts[3]).toBe('Expiry: expiry');
      expect(parts[4]).toBe('Location: location');
    });

    it('should maintain order even when some filters are missing', () => {
      const filters: FilterState = {
        category: [],
        expiry: '',
        location: [],
        quantity: 'quantity',
        searchText: 'search',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      const filterText = result.match(/<span id="[^"]*">(.*?)<\/span>/)?.[1] || '';
      const parts = filterText.split(', ');

      expect(parts[0]).toBe('Search: "search"');
      expect(parts[1]).toBe('Quantity: quantity');
      expect(parts.length).toBe(2);
    });
  });
});
