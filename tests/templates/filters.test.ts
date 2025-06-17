import { describe, it, expect } from 'vitest';
import { createActiveFiltersDisplay } from '../../src/templates/filters';
import { FilterState } from '../../src/types/filterState';
import { ELEMENTS } from '../../src/utils/constants';

describe('createActiveFiltersDisplay', () => {
  describe('basic functionality', () => {
    it('should hide display when no filters are active', () => {
      const filters: FilterState = {
        searchText: '',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('style="display: none;"');
      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS}"`);
      expect(result).toContain('class="active-filters"');
    });

    it('should show display when filters are active', () => {
      const filters: FilterState = {
        searchText: 'apple',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('style="display: block;"');
      expect(result).toContain('Active filters:');
    });

    it('should include active filters list element', () => {
      const filters: FilterState = {
        searchText: 'test',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS_LIST}"`);
    });
  });

  describe('individual filter types', () => {
    it('should display search text filter', () => {
      const filters: FilterState = {
        searchText: 'banana',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('Search: "banana"');
      expect(result).toContain('style="display: block;"');
    });

    it('should display category filter', () => {
      const filters: FilterState = {
        searchText: '',
        category: 'Fruit',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('Category: Fruit');
      expect(result).toContain('style="display: block;"');
    });

    it('should display quantity filter', () => {
      const filters: FilterState = {
        searchText: '',
        category: '',
        quantity: 'low',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('Quantity: low');
      expect(result).toContain('style="display: block;"');
    });

    it('should display expiry filter', () => {
      const filters: FilterState = {
        searchText: '',
        category: '',
        quantity: '',
        expiry: 'expired',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('Expiry: expired');
      expect(result).toContain('style="display: block;"');
    });
  });

  describe('multiple filters', () => {
    it('should display multiple filters separated by commas', () => {
      const filters: FilterState = {
        searchText: 'apple',
        category: 'Fruit',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('Search: "apple", Category: Fruit');
      expect(result).toContain('style="display: block;"');
    });

    it('should display all filter types when active', () => {
      const filters: FilterState = {
        searchText: 'test',
        category: 'Food',
        quantity: 'high',
        expiry: 'soon',
        showAdvanced: true,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('Search: "test"');
      expect(result).toContain('Category: Food');
      expect(result).toContain('Quantity: high');
      expect(result).toContain('Expiry: soon');
      expect(result).toContain('style="display: block;"');

      // Check they're comma-separated
      const filtersList = result.match(/<span id="[^"]*">[^<]*<\/span>/)?.[0];
      expect(filtersList).toContain(', ');
    });

    it('should join filters with commas and spaces', () => {
      const filters: FilterState = {
        searchText: 'milk',
        category: 'Dairy',
        quantity: 'zero',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      const expectedText = 'Search: "milk", Category: Dairy, Quantity: zero';
      expect(result).toContain(expectedText);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in search text', () => {
      const filters: FilterState = {
        searchText: 'coffee & cream "special"',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('Search: "coffee & cream "special""');
    });

    it('should handle empty string filters (should not display)', () => {
      const filters: FilterState = {
        searchText: '',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).not.toContain('Search:');
      expect(result).not.toContain('Category:');
      expect(result).not.toContain('Quantity:');
      expect(result).not.toContain('Expiry:');
      expect(result).toContain('style="display: none;"');
    });

    it('should handle whitespace-only filters (should display)', () => {
      const filters: FilterState = {
        searchText: '   ',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('Search: "   "');
      expect(result).toContain('style="display: block;"');
    });

    it('should handle undefined showAdvanced property', () => {
      const filters = {
        searchText: 'test',
        category: '',
        quantity: '',
        expiry: '',
      } as FilterState;

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('Search: "test"');
      expect(result).toContain('style="display: block;"');
    });
  });

  describe('HTML structure', () => {
    it('should generate valid HTML structure', () => {
      const filters: FilterState = {
        searchText: 'test',
        category: 'Food',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      // Check outer div structure
      expect(result).toMatch(
        /<div id="[^"]*" class="active-filters" style="display: block;">[\s\S]*<\/div>/,
      );

      // Check inner spans
      expect(result).toContain('<span>Active filters: </span>');
      expect(result).toMatch(/<span id="[^"]*">.*<\/span>/);
    });

    it('should use correct element IDs from constants', () => {
      const filters: FilterState = {
        searchText: 'test',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS}"`);
      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS_LIST}"`);
    });

    it('should have consistent whitespace and formatting', () => {
      const filters: FilterState = {
        searchText: '',
        category: '',
        quantity: '',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      expect(result).toContain('\n');
      expect(result.trim()).toBeTruthy(); // Should not be just whitespace

      // Check that the HTML structure is properly formatted
      expect(result).toContain('<div id=');
      expect(result).toContain('</div>');
      expect(result).toContain('<span>');
      expect(result).toContain('</span>');
    });
  });

  describe('filter ordering', () => {
    it('should display filters in consistent order', () => {
      const filters: FilterState = {
        searchText: 'search',
        category: 'category',
        quantity: 'quantity',
        expiry: 'expiry',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      const filterText = result.match(/<span id="[^"]*">(.*?)<\/span>/)?.[1] || '';
      const parts = filterText.split(', ');

      expect(parts[0]).toBe('Search: "search"');
      expect(parts[1]).toBe('Category: category');
      expect(parts[2]).toBe('Quantity: quantity');
      expect(parts[3]).toBe('Expiry: expiry');
    });

    it('should maintain order even when some filters are missing', () => {
      const filters: FilterState = {
        searchText: 'search',
        category: '',
        quantity: 'quantity',
        expiry: '',
        showAdvanced: false,
      };

      const result = createActiveFiltersDisplay(filters);

      const filterText = result.match(/<span id="[^"]*">(.*?)<\/span>/)?.[1] || '';
      const parts = filterText.split(', ');

      expect(parts[0]).toBe('Search: "search"');
      expect(parts[1]).toBe('Quantity: quantity');
      expect(parts.length).toBe(2);
    });
  });
});
