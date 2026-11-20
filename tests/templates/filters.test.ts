import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActiveFiltersDisplay } from '../../src/templates/filters';
import { FilterState } from '../../src/types/filterState';
import { ELEMENTS } from '../../src/utils/constants';
import { TranslationData } from '@/types/translatableComponent';
import { must } from '../testHelpers';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

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

      expect(result).toContain('class="active-filters" hidden>');
      expect(result).toContain(`id="${ELEMENTS.ACTIVE_FILTERS}"`);
      expect(result).toContain('class="active-filters"');
    });

    it('should show display when filters are active', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: 'apple',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('class="active-filters">');
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

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge search">');
      expect(result).toContain('Search: &quot;banana&quot;');
      expect(result).toContain('</span>');
      expect(result).toContain('class="active-filters">');
    });

    it('should display single category filter badge', () => {
      const filters: FilterState = {
        ...baseFilters,
        category: ['Fruit'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge category">');
      expect(result).toContain('Category: Fruit');
      expect(result).toContain('</span>');
    });

    it('should display multiple categories as count', () => {
      const filters: FilterState = {
        ...baseFilters,
        category: ['Fruit', 'Dairy'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge category">');
      expect(result).toContain('Category: 2 selected');
      expect(result).toContain('</span>');
    });

    it('should display single quantity filter badge', () => {
      const filters: FilterState = {
        ...baseFilters,
        quantity: ['zero'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge quantity">');
      expect(result).toContain('Quantity: zero');
      expect(result).toContain('</span>');
    });

    it('should display multiple quantity filters as count', () => {
      const filters: FilterState = {
        ...baseFilters,
        quantity: ['zero', 'nonzero'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge quantity">');
      expect(result).toContain('Quantity: 2 selected');
      expect(result).toContain('</span>');
    });

    it('should display single expiry filter badge with translation', () => {
      const filters: FilterState = {
        ...baseFilters,
        expiry: ['expired'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge expiry">');
      expect(result).toContain('Expiry: expired'); // Note: translated value
      expect(result).toContain('</span>');
    });

    it('should display location filter badge', () => {
      const filters: FilterState = {
        ...baseFilters,
        location: ['Pantry'],
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge location">');
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

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge search">');
      expect(result).toContain('Search: &quot;apple&quot;');
      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge category">');
      expect(result).toContain('Category: Fruit');
      expect(result).toContain('class="active-filters">');
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

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge search">');
      expect(result).toContain('Search: &quot;test&quot;');
      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge category">');
      expect(result).toContain('Category: Food');
      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge location">');
      expect(result).toContain('Location: Pantry');
      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge quantity">');
      expect(result).toContain('Quantity: zero');
      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge expiry">');
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

      expect(result).toContain('Search: &quot;milk&quot;');
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

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge search">');
      expect(result).toContain('Search: &quot;coffee &amp; cream &quot;special&quot;&quot;');
    });

    it('should handle empty arrays (should not display)', () => {
      const result = createActiveFiltersDisplay(baseFilters, mockTranslations);
      const badgesContainer = result.match(/<div id="active-filters-list"[^>]*>([\s\S]*?)<\/div>/);

      expect(result).toContain('class="active-filters" hidden>');
      expect(badgesContainer).toBeTruthy();
      expect(must(badgesContainer)[1].trim()).toBe('');
      expect(result).not.toContain('si-chip');
    });

    it('should handle whitespace-only filters (should display)', () => {
      const filters: FilterState = {
        ...baseFilters,
        searchText: '   ',
      };

      const result = createActiveFiltersDisplay(filters, mockTranslations);

      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge search">');
      expect(result).toContain('Search: &quot;   &quot;');
      expect(result).toContain('class="active-filters">');
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

      expect(result).toMatch(/<div id="[^"]*" class="active-filters">[\s\S]*<\/div>/);

      expect(result).toContain('class="filter-badges-container"');
      expect(result).toContain('<span class="si-chip si-tone-primary filter-badge');
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
      const searchIndex = result.indexOf('filter-badge search"');
      const categoryIndex = result.indexOf('filter-badge category"');
      const quantityIndex = result.indexOf('filter-badge quantity"');
      const expiryIndex = result.indexOf('filter-badge expiry"');
      const locationIndex = result.indexOf('filter-badge location"');

      expect(searchIndex).toBeLessThan(categoryIndex);
      expect(categoryIndex).toBeLessThan(locationIndex);
      expect(locationIndex).toBeLessThan(quantityIndex);
      expect(quantityIndex).toBeLessThan(expiryIndex);
    });
  });

  describe('removable chips', () => {
    it('gives every active filter chip a remove button keyed by filter', () => {
      const host = document.createElement('div');
      host.innerHTML = createActiveFiltersDisplay(
        {
          ...baseFilters,
          searchText: 'milk',
          category: ['Fruit'],
          location: ['Pantry'],
          quantity: ['zero'],
          expiry: ['soon'],
        },
        mockTranslations,
      );

      const keys = [...host.querySelectorAll<HTMLElement>('[data-filter-remove]')].map(
        (button) => button.dataset.filterRemove,
      );
      expect(keys).toEqual(['search', 'category', 'location', 'quantity', 'expiry']);
    });

    it('labels the remove button with the chip text', () => {
      const host = document.createElement('div');
      host.innerHTML = createActiveFiltersDisplay(
        { ...baseFilters, category: ['Fruit'] },
        mockTranslations,
      );

      const remove = host.querySelector('[data-filter-remove="category"]');
      expect(remove?.tagName).toBe('BUTTON');
      expect(remove?.classList.contains('si-chip__remove')).toBe(true);
      expect(remove?.getAttribute('aria-label')).toBe('Remove Category: Fruit');
    });

    it('escapes the search text inside the chip', () => {
      const result = createActiveFiltersDisplay(
        { ...baseFilters, searchText: '<img src=x onerror=alert(1)>' },
        mockTranslations,
      );

      expect(result).not.toContain('<img');
      expect(result).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });
  });
});
