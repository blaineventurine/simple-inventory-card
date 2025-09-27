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

const filters: FilterState = {
  category: [],
  expiry: [],
  location: [],
  quantity: [],
  searchText: '',
  showAdvanced: false,
  sortMethod: 'name',
};
const categories = ['Food', 'Drinks'];
const locations = ['Pantry', 'Fridge'];

describe('createSearchAndFilters', () => {
  let mockTranslations: TranslationData;

  beforeEach(() => {
    mockTranslations = {
      filters: {
        all_categories: 'All Categories',
        all_items: 'All Items',
        all_locations: 'All Locations',
        all_quantities: 'All Quantities',
        category: 'Category',
        clear_all_filters: 'Clear All Filters',
        expired: 'Expired',
        expiring_soon: 'Expiring Soon',
        expiry: 'Expiry',
        filters: 'Filters',
        future: 'Future',
        hide_filters: 'Hide Filters',
        location: 'location',
        no_expiry: 'No Expiry',
        non_zero: 'Non-zero',
        quantity: 'Quantity',
        search_placeholder: 'Search items...',
        zero: 'Zero',
      },
    };
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should create search input with empty filters', () => {
      const result = createSearchAndFilters(filters, categories, locations, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.SEARCH_INPUT}"`);
      expect(result).toContain('placeholder="Search items..."');
      expect(result).toContain('value=""');
      expect(result).toContain('class="search-input "');
    });

    it('should create search input with search text and has-value class', () => {
      const _filters: FilterState = {
        ...filters,
        searchText: 'apple',
      };
      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('value="apple"');
      expect(result).toContain('class="search-input has-value"');
    });

    it('should include all required element IDs', () => {
      const result = createSearchAndFilters(filters, categories, locations, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.SEARCH_INPUT}"`);
      expect(result).toContain(`id="${ELEMENTS.ADVANCED_SEARCH_TOGGLE}"`);
      expect(result).toContain(`id="${ELEMENTS.FILTER_CATEGORY}-trigger"`);
      expect(result).toContain(`id="${ELEMENTS.FILTER_LOCATION}-trigger"`);
      expect(result).toContain(`id="${ELEMENTS.FILTER_QUANTITY}-trigger"`);
      expect(result).toContain(`id="${ELEMENTS.FILTER_EXPIRY}-trigger"`);
      expect(result).toContain(`id="${ELEMENTS.CLEAR_FILTERS}"`);
    });
  });

  describe('advanced search toggle', () => {
    it('should show "Filters" when advanced filters are hidden', () => {
      const result = createSearchAndFilters(filters, categories, locations, mockTranslations);

      expect(result).toContain('Filters');
      expect(result).not.toContain('Hide Filters');
    });

    it('should show "Hide Filters" when advanced filters are shown', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('Hide Filters');
      expect(result).not.toContain('>Filters<');
    });

    it('should include toggle button with correct class', () => {
      const result = createSearchAndFilters(filters, categories, locations, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.ADVANCED_SEARCH_TOGGLE}"`);
      expect(result).toContain('class="toggle-btn');
    });
  });

  describe('advanced filters visibility', () => {
    it('should hide advanced filters when showAdvanced is false', () => {
      const result = createSearchAndFilters(filters, categories, locations, mockTranslations);

      expect(result).toContain('style="display: none"');
      expect(result).toContain('id="advanced-filters"');
    });

    it('should show advanced filters when showAdvanced is true', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('style="display: block"');
      expect(result).toContain('class="advanced-filters"');
    });
  });

  describe('category filter', () => {
    it('should create multiselect with "All Categories" placeholder', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('All Categories');
      expect(result).toContain(`id="${ELEMENTS.FILTER_CATEGORY}-trigger"`);
      expect(result).toContain('All Locations');
      expect(result).toContain(`id="${ELEMENTS.FILTER_LOCATION}-trigger"`);
    });

    it('should create options for all categories', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };
      const categories = ['Food', 'Drinks', 'Household'];

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="Food" >');
      expect(result).toContain('Food');
      expect(result).toContain('<input type="checkbox" value="Drinks" >');
      expect(result).toContain('Drinks');
      expect(result).toContain('<input type="checkbox" value="Household" >');
      expect(result).toContain('Household');
    });

    it('should create options for all locations', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };
      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="Pantry" >');
      expect(result).toContain('Pantry');
      expect(result).toContain('<input type="checkbox" value="Fridge" >');
      expect(result).toContain('Fridge');
    });

    it('should mark selected category as selected', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
        category: ['Food'],
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="Food" checked>');
      expect(result).toContain('Food');
      expect(result).toContain('<input type="checkbox" value="Drinks" >');
      expect(result).toContain('Drinks');
    });

    it('should mark selected location as selected', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
        location: ['Pantry'],
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="Pantry" checked>');
      expect(result).toContain('Pantry');
      expect(result).toContain('<input type="checkbox" value="Fridge" >');
      expect(result).toContain('Fridge');
    });

    describe('category filter', () => {
      it('should handle empty categories array', () => {
        const _filters: FilterState = {
          ...filters,
          showAdvanced: true,
        };
        const categories: string[] = [];

        const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);
        expect(result).toContain('class="multi-select-container"');
        expect(result).toContain('id="filter-category-trigger"');
        expect(result).toContain('All Categories');

        expect(result).toContain('id="filter-category-dropdown"');
        const categoryDropdownIndex = result.indexOf('id="filter-category-dropdown"');
        const nextDropdownIndex = result.indexOf(
          'id="filter-location-dropdown"',
          categoryDropdownIndex,
        );
        const categorySection = result.substring(categoryDropdownIndex, nextDropdownIndex);
        expect(categorySection).not.toContain('<input type="checkbox"');
      });

      it('should render category options from array', () => {
        const _filters: FilterState = {
          ...filters,
          showAdvanced: true,
        };
        const categories = ['Food', 'Cleaning', 'Electronics'];
        const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

        expect(result).toContain('class="multi-select-container"');
        categories.forEach((category) => {
          expect(result).toContain(`value="${category}"`);
          expect(result).toContain(`<span>${category}</span>`);
        });

        const checkboxCount = (result.match(/<input type="checkbox"/g) || []).length;
        expect(checkboxCount).toBeGreaterThanOrEqual(categories.length);
      });

      it('should show selected categories', () => {
        const _filters: FilterState = {
          ...filters,
          showAdvanced: true,
          category: ['Food', 'Electronics'],
        };
        const categories = ['Food', 'Cleaning', 'Electronics'];

        const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

        expect(result).toContain('value="Food" checked');
        expect(result).toContain('value="Electronics" checked');
        expect(result).not.toContain('value="Cleaning" checked');
        expect(result).toContain('2 selected');
      });
    });
  });

  describe('location filter', () => {
    it('should handle empty locations array', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };
      const locations: string[] = [];

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('class="multi-select-container"');
      expect(result).toContain('id="filter-location-trigger"');
      expect(result).toContain('All Locations');

      expect(result).toContain('id="filter-location-dropdown"');
      const locationDropdownIndex = result.indexOf('id="filter-location-dropdown"');
      const nextSectionIndex = result.indexOf(
        'id="filter-quantity-trigger"',
        locationDropdownIndex,
      );
      const locationSection = result.substring(locationDropdownIndex, nextSectionIndex);
      expect(locationSection).not.toContain('<input type="checkbox"');
    });

    it('should render location options from array', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };
      const locations = ['Pantry', 'Fridge', 'Garage'];

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('class="multi-select-container"');

      locations.forEach((location) => {
        expect(result).toContain(`value="${location}"`);
        expect(result).toContain(`<span>${location}</span>`);
      });
    });
  });

  describe('quantity filter', () => {
    it('should create quantity multiselect with all options', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('All Quantities');
      expect(result).toContain('<input type="checkbox" value="zero" >');
      expect(result).toContain('Zero');
      expect(result).toContain('<input type="checkbox" value="nonzero" >');
      expect(result).toContain('Non-zero');
      expect(result).toContain(`id="${ELEMENTS.FILTER_QUANTITY}-trigger"`);
    });

    it('should select zero quantity when specified', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
        quantity: ['zero'],
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="zero" checked>');
      expect(result).toContain('Zero');
      expect(result).toContain('<input type="checkbox" value="nonzero" >');
      expect(result).toContain('Non-zero');
    });

    it('should select nonzero quantity when specified', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
        quantity: ['nonzero'],
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="zero" >');
      expect(result).toContain('Zero');
      expect(result).toContain('<input type="checkbox" value="nonzero" checked>');
      expect(result).toContain('Non-zero');
    });
  });

  describe('expiry filter', () => {
    it('should create expiry multiselect with all options', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('All Items');
      expect(result).toContain('<input type="checkbox" value="none" >');
      expect(result).toContain('No Expiry');
      expect(result).toContain('<input type="checkbox" value="expired" >');
      expect(result).toContain('Expired');
      expect(result).toContain('<input type="checkbox" value="soon" >');
      expect(result).toContain('Expiring Soon');
      expect(result).toContain('<input type="checkbox" value="future" >');
      expect(result).toContain('Future');
      expect(result).toContain(`id="${ELEMENTS.FILTER_EXPIRY}-trigger"`);
    });

    it('should select none expiry when specified', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
        expiry: ['none'],
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="none" checked>');
      expect(result).toContain('No Expiry');
    });

    it('should select expired when specified', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
        expiry: ['expired'],
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="expired" checked>');
      expect(result).toContain('Expired');
    });

    it('should select soon when specified', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
        expiry: ['soon'],
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="soon" checked');
      expect(result).toContain('Expiring Soon');
    });

    it('should select future when specified', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
        expiry: ['future'],
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="future" checked');
      expect(result).toContain('Future');
    });
  });

  describe('clear filters button', () => {
    it('should include clear filters button', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.CLEAR_FILTERS}"`);
      expect(result).toContain('class="clear-only-btn"');
      expect(result).toContain('Clear All Filters');
    });
  });

  describe('HTML structure', () => {
    it('should generate valid HTML structure', () => {
      const _filters: FilterState = {
        ...filters,
        searchText: 'test',
        showAdvanced: true,
        category: ['Food'],
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      // Check main structure
      expect(result).toContain('<div class="search-row">');
      expect(result).toContain('<div id="advanced-filters"');
      expect(result).toContain('<div class="filter-row">');
      expect(result).toContain('<div class="filter-actions">');

      // Check form elements
      expect(result).toContain('<input');
      expect(result).toContain('<button');
      expect(result).toContain('<label>');
    });

    it('should have proper nesting structure', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      // Check that filter groups are inside filter row
      expect(result).toMatch(
        /<div class="filter-row">[\s\S]*<div class="filter-group">[\s\S]*<\/div>[\s\S]*<\/div>/,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle null searchText gracefully', () => {
      const _filters: FilterState = {
        ...filters,
        searchText: null as any,
        showAdvanced: false,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('value=""');
      expect(result).toContain('class="search-input "');
    });

    it('should handle undefined searchText gracefully', () => {
      const _filters: FilterState = {
        ...filters,
        searchText: undefined as any,
        showAdvanced: false,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('value=""');
      expect(result).toContain('class="search-input "');
    });

    it('should handle categories with special characters', () => {
      const _filters: FilterState = {
        ...filters,
        showAdvanced: true,
        category: ['Food & Drinks'],
      };
      const categories = ['Food & Drinks', 'Health & Beauty'];

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('<input type="checkbox" value="Food & Drinks" checked>');
      expect(result).toContain('<input type="checkbox" value="Health & Beauty" >');
    });

    it('should handle search text with quotes', () => {
      const _filters: FilterState = {
        ...filters,
        searchText: 'search "with quotes"',
        showAdvanced: false,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('value="search "with quotes""');
      expect(result).toContain('class="search-input has-value"');
    });

    it('should handle whitespace-only search text', () => {
      const _filters: FilterState = {
        ...filters,
        searchText: '   ',
        showAdvanced: false,
      };

      const result = createSearchAndFilters(_filters, categories, locations, mockTranslations);

      expect(result).toContain('value="   "');
      expect(result).toContain('class="search-input has-value"');
    });
  });

  describe('multiple active filters', () => {
    it('should handle all filters being active', () => {
      const filters: FilterState = {
        category: ['Food'],
        expiry: ['expired'],
        location: ['Pantry'],
        quantity: ['zero'],
        searchText: 'apple',
        showAdvanced: true,
        sortMethod: 'name',
      };

      const result = createSearchAndFilters(filters, categories, locations, mockTranslations);

      expect(result).toContain('value="apple"');
      expect(result).toContain('class="search-input has-value"');
      expect(result).toContain('<input type="checkbox" value="Food" checked>');
      expect(result).toContain('<input type="checkbox" value="zero" checked>');
      expect(result).toContain('Zero');
      expect(result).toContain('<input type="checkbox" value="expired" checked>');
      expect(result).toContain('Expired');
      expect(result).toContain('style="display: block"');
      expect(result).toContain('<input type="checkbox" value="Pantry" checked>');
    });

    it('should maintain filter independence', () => {
      const filters: FilterState = {
        category: ['Food'],
        expiry: ['soon'],
        location: [],
        quantity: [],
        searchText: 'test',
        showAdvanced: true,
        sortMethod: 'name',
      };

      const result = createSearchAndFilters(filters, categories, locations, mockTranslations);

      // Selected filters should be marked as selected
      expect(result).toContain('<input type="checkbox" value="Food" checked>');
      expect(result).toContain('value="soon" checked');
      expect(result).toContain('Expiring Soon');

      // Non-selected filters should not be marked as selected
      expect(result).toContain('<input type="checkbox" value="zero" >');
      expect(result).toContain('Zero');
      expect(result).toContain('<input type="checkbox" value="nonzero" >');
      expect(result).toContain('Non-zero');
      expect(result).toContain('<input type="checkbox" value="Drinks" >');
      expect(result).toContain('Drinks');
      expect(result).toContain('<input type="checkbox" value="Pantry" >');
    });
  });
});
