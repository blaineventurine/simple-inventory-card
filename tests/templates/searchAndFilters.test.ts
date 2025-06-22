import { describe, it, expect } from 'vitest';
import { createSearchAndFilters } from '../../src/templates/searchAndFilters';
import { FilterState } from '../../src/types/filterState';
import { ELEMENTS } from '../../src/utils/constants';

describe('createSearchAndFilters', () => {
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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="">All Categories</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="Food" >Food</option>');
      expect(result).toContain('<option value="Drinks" >Drinks</option>');
      expect(result).toContain('<option value="Household" >Household</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="Food" selected>Food</option>');
      expect(result).toContain('<option value="Drinks" >Drinks</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="">All Categories</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="">All Quantities</option>');
      expect(result).toContain('<option value="zero" >Zero</option>');
      expect(result).toContain('<option value="nonzero" >Non-zero</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="zero" selected>Zero</option>');
      expect(result).toContain('<option value="nonzero" >Non-zero</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="zero" >Zero</option>');
      expect(result).toContain('<option value="nonzero" selected>Non-zero</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="">All Items</option>');
      expect(result).toContain('<option value="none" >No Expiry</option>');
      expect(result).toContain('<option value="expired" >Expired</option>');
      expect(result).toContain('<option value="soon" >Expiring Soon</option>');
      expect(result).toContain('<option value="future" >Future</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="none" selected>No Expiry</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="expired" selected>Expired</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="soon" selected>Expiring Soon</option>');
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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('<option value="future" selected>Future</option>');
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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

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

      const result = createSearchAndFilters(filters, categories);

      expect(result).toContain('value="apple"');
      expect(result).toContain('class="search-input has-value"');
      expect(result).toContain('<option value="Food" selected>Food</option>');
      expect(result).toContain('<option value="zero" selected>Zero</option>');
      expect(result).toContain('<option value="expired" selected>Expired</option>');
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

      const result = createSearchAndFilters(filters, categories);

      // Selected filters should be marked as selected
      expect(result).toContain('<option value="Food" selected>Food</option>');
      expect(result).toContain('<option value="soon" selected>Expiring Soon</option>');

      // Non-selected filters should not be marked as selected
      expect(result).toContain('<option value="zero" >Zero</option>');
      expect(result).toContain('<option value="nonzero" >Non-zero</option>');
      expect(result).toContain('<option value="Drinks" >Drinks</option>');
    });
  });
});
