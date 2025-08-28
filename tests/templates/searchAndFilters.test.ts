import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSearchAndFilters } from '../../src/templates/searchAndFilters';
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
describe('createSearchAndFilters', () => {
  let mockTranslations: TranslationData;

  beforeEach(() => {
    mockTranslations = {
      filters: {
        search_placeholder: 'Search items...',
        hide_filters: 'Hide Filters',
        filters: 'Filters',
        category: 'Category',
        all_categories: 'All Categories',
        quantity: 'Quantity',
        all_quantities: 'All Quantities',
        zero: 'Zero',
        non_zero: 'Non-zero',
        expiry: 'Expiry',
        all_items: 'All Items',
        no_expiry: 'No Expiry',
        expired: 'Expired',
        expiring_soon: 'Expiring Soon',
        future: 'Future',
        clear_all_filters: 'Clear All Filters',
      },
    };
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should create search input with empty filters', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: false,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food', 'Drinks'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.SEARCH_INPUT}"`);
      expect(result).toContain('placeholder="Search items..."');
      expect(result).toContain('value=""');
      expect(result).toContain('class="search-input "');
    });

    it('should create search input with search text and has-value class', () => {
      const filters: FilterState = {
        searchText: 'apple',
        showAdvanced: false,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food', 'Drinks'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('value="apple"');
      expect(result).toContain('class="search-input has-value"');
    });

    it('should include all required element IDs', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.SEARCH_INPUT}"`);
      expect(result).toContain(`id="${ELEMENTS.ADVANCED_SEARCH_TOGGLE}"`);
      expect(result).toContain(`id="${ELEMENTS.FILTER_CATEGORY}"`);
      expect(result).toContain(`id="${ELEMENTS.FILTER_QUANTITY}"`);
      expect(result).toContain(`id="${ELEMENTS.FILTER_EXPIRY}"`);
      expect(result).toContain(`id="${ELEMENTS.CLEAR_FILTERS}"`);
    });
  });

  describe('advanced search toggle', () => {
    it('should show "Filters" when advanced filters are hidden', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: false,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('Filters');
      expect(result).not.toContain('Hide Filters');
    });

    it('should show "Hide Filters" when advanced filters are shown', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('Hide Filters');
      expect(result).not.toContain('>Filters<');
    });

    it('should include toggle button with correct class', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: false,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.ADVANCED_SEARCH_TOGGLE}"`);
      expect(result).toContain('class="toggle-btn');
    });
  });

  describe('advanced filters visibility', () => {
    it('should hide advanced filters when showAdvanced is false', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: false,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('style="display: none"');
      expect(result).toContain('id="advanced-filters"');
    });

    it('should show advanced filters when showAdvanced is true', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('style="display: block"');
      expect(result).toContain('class="advanced-filters"');
    });
  });

  describe('category filter', () => {
    it('should create category dropdown with "All Categories" option', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food', 'Drinks'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="">');
      expect(result).toContain('All Categories');
      expect(result).toContain(`id="${ELEMENTS.FILTER_CATEGORY}"`);
    });

    it('should create options for all categories', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food', 'Drinks', 'Household'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="Food" >');
      expect(result).toContain('Food');
      expect(result).toContain('<option value="Drinks" >');
      expect(result).toContain('Drinks');
      expect(result).toContain('<option value="Household" >');
      expect(result).toContain('Household');
    });

    it('should mark selected category as selected', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: 'Food',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food', 'Drinks'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="Food" selected>');
      expect(result).toContain('Food');
      expect(result).toContain('<option value="Drinks" >');
      expect(result).toContain('Drinks');
    });

    it('should handle empty categories array', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories: string[] = [];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="">');
      expect(result).toContain('All Categories');
      // Should only contain the "All Categories" option
      const categorySelect = result.match(
        /<select id="[^"]*filter-category[^"]*">[\s\S]*?<\/select>/,
      )?.[0];
      expect(categorySelect).toBeTruthy();
      expect((categorySelect?.match(/<option/g) || []).length).toBe(1);
    });
  });

  describe('quantity filter', () => {
    it('should create quantity dropdown with all options', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="">');
      expect(result).toContain('All Quantities');
      expect(result).toContain('<option value="zero" >');
      expect(result).toContain('Zero');
      expect(result).toContain('<option value="nonzero" >');
      expect(result).toContain('Non-zero');
      expect(result).toContain(`id="${ELEMENTS.FILTER_QUANTITY}"`);
    });

    it('should select zero quantity when specified', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: 'zero',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="zero" selected>');
      expect(result).toContain('Zero');
      expect(result).toContain('<option value="nonzero" >');
      expect(result).toContain('Non-zero');
    });

    it('should select nonzero quantity when specified', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: 'nonzero',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="zero" >');
      expect(result).toContain('Zero');
      expect(result).toContain('<option value="nonzero" selected>');
      expect(result).toContain('Non-zero');
    });
  });

  describe('expiry filter', () => {
    it('should create expiry dropdown with all options', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="">');
      expect(result).toContain('All Items');
      expect(result).toContain('<option value="none" >');
      expect(result).toContain('No Expiry');
      expect(result).toContain('<option value="expired" >');
      expect(result).toContain('Expired');
      expect(result).toContain('<option value="soon" >');
      expect(result).toContain('Expiring Soon');
      expect(result).toContain('<option value="future" >');
      expect(result).toContain('Future');
      expect(result).toContain(`id="${ELEMENTS.FILTER_EXPIRY}"`);
    });

    it('should select none expiry when specified', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: 'none',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="none" selected>');
      expect(result).toContain('No Expiry');
    });

    it('should select expired when specified', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: 'expired',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="expired" selected>');
      expect(result).toContain('Expired');
    });

    it('should select soon when specified', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: 'soon',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="soon" selected');
      expect(result).toContain('Expiring Soon');
    });

    it('should select future when specified', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: 'future',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="future" selected');
      expect(result).toContain('Future');
    });
  });

  describe('clear filters button', () => {
    it('should include clear filters button', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.CLEAR_FILTERS}"`);
      expect(result).toContain('class="clear-only-btn"');
      expect(result).toContain('Clear All Filters');
    });
  });

  describe('HTML structure', () => {
    it('should generate valid HTML structure', () => {
      const filters: FilterState = {
        searchText: 'test',
        showAdvanced: true,
        category: 'Food',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food', 'Drinks'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      // Check main structure
      expect(result).toContain('<div class="search-row">');
      expect(result).toContain('<div id="advanced-filters"');
      expect(result).toContain('<div class="filter-row">');
      expect(result).toContain('<div class="filter-actions">');

      // Check form elements
      expect(result).toContain('<input');
      expect(result).toContain('<button');
      expect(result).toContain('<select');
      expect(result).toContain('<label>');
    });

    it('should have proper nesting structure', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      // Check that filter groups are inside filter row
      expect(result).toMatch(
        /<div class="filter-row">[\s\S]*<div class="filter-group">[\s\S]*<\/div>[\s\S]*<\/div>/,
      );

      // Check that selects are inside filter groups
      expect(result).toMatch(
        /<div class="filter-group">[\s\S]*<select[\s\S]*<\/select>[\s\S]*<\/div>/,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle null searchText gracefully', () => {
      const filters: FilterState = {
        searchText: null as any,
        showAdvanced: false,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('value=""');
      expect(result).toContain('class="search-input "');
    });

    it('should handle undefined searchText gracefully', () => {
      const filters: FilterState = {
        searchText: undefined as any,
        showAdvanced: false,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('value=""');
      expect(result).toContain('class="search-input "');
    });

    it('should handle categories with special characters', () => {
      const filters: FilterState = {
        searchText: '',
        showAdvanced: true,
        category: 'Food & Drinks',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food & Drinks', 'Health & Beauty'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('<option value="Food & Drinks" selected>Food & Drinks</option>');
      expect(result).toContain('<option value="Health & Beauty" >Health & Beauty</option>');
    });

    it('should handle search text with quotes', () => {
      const filters: FilterState = {
        searchText: 'search "with quotes"',
        showAdvanced: false,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('value="search "with quotes""');
      expect(result).toContain('class="search-input has-value"');
    });

    it('should handle whitespace-only search text', () => {
      const filters: FilterState = {
        searchText: '   ',
        showAdvanced: false,
        category: '',
        quantity: '',
        expiry: '',
      };
      const categories = ['Food'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('value="   "');
      expect(result).toContain('class="search-input has-value"');
    });
  });

  describe('multiple active filters', () => {
    it('should handle all filters being active', () => {
      const filters: FilterState = {
        searchText: 'apple',
        showAdvanced: true,
        category: 'Food',
        quantity: 'zero',
        expiry: 'expired',
      };
      const categories = ['Food', 'Drinks'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      expect(result).toContain('value="apple"');
      expect(result).toContain('class="search-input has-value"');
      expect(result).toContain('<option value="Food" selected>Food</option>');
      expect(result).toContain('<option value="zero" selected>');
      expect(result).toContain('Zero');
      expect(result).toContain('<option value="expired" selected>');
      expect(result).toContain('Expired');
      expect(result).toContain('style="display: block"');
    });

    it('should maintain filter independence', () => {
      const filters: FilterState = {
        searchText: 'test',
        showAdvanced: true,
        category: 'Food',
        quantity: '',
        expiry: 'soon',
      };
      const categories = ['Food', 'Drinks'];

      const result = createSearchAndFilters(filters, categories, mockTranslations);

      // Selected filters should be marked as selected
      expect(result).toContain('<option value="Food" selected>Food</option>');
      expect(result).toContain('value="soon" selected');
      expect(result).toContain('Expiring Soon');

      // Non-selected filters should not be marked as selected
      expect(result).toContain('<option value="zero" >');
      expect(result).toContain('Zero');
      expect(result).toContain('<option value="nonzero" >');
      expect(result).toContain('Non-zero');
      expect(result).toContain('<option value="Drinks" >');
      expect(result).toContain('Drinks');
    });
  });
});
