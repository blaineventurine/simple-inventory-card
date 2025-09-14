import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSortOptions } from '../../src/templates/sortOptions';
import { ELEMENTS } from '../../src/utils/constants';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn((_translations: any, _key: string, _params: any, fallback: string) => {
      return fallback;
    }),
  },
}));

describe('createSortOptions', () => {
  let mockTranslations: TranslationData;

  beforeEach(() => {
    mockTranslations = {
      sort: {
        category: 'Category',
        expiry_date: 'Expiry Date',
        location: 'Location',
        name: 'Name',
        quantity_high: 'Quantity (High)',
        quantity_low: 'Quantity (Low)',
        sort_by: 'Sort by:',
        zero_last: 'Zero Last',
      },
    };
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should create sort dropdown with label', () => {
      const result = createSortOptions('name', mockTranslations);

      expect(result).toContain(`for="${ELEMENTS.SORT_METHOD}"`);
      expect(result).toContain('Sort by:');
      expect(result).toContain(`id="${ELEMENTS.SORT_METHOD}"`);
      expect(result).toContain('<select');
      expect(result).toContain('</select>');
    });

    it('should include all sort options', () => {
      const result = createSortOptions('', mockTranslations);

      expect(result).toContain('value="name"');
      expect(result).toContain('Name');
      expect(result).toContain('value="category"');
      expect(result).toContain('Category');
      expect(result).toContain('value="quantity"');
      expect(result).toContain('Quantity (High)');
      expect(result).toContain('value="quantity-low"');
      expect(result).toContain('Quantity (Low)');
      expect(result).toContain('value="expiry"');
      expect(result).toContain('Expiry Date');
      expect(result).toContain('value="zero-last"');
      expect(result).toContain('Zero Last');
      expect(result).toContain('value="location"');
      expect(result).toContain('Location');
    });

    it('should use correct element ID from constants', () => {
      const result = createSortOptions('name', mockTranslations);

      expect(result).toContain(`id="${ELEMENTS.SORT_METHOD}"`);
      expect(result).toContain(`for="${ELEMENTS.SORT_METHOD}"`);
    });
  });

  describe('sort method selection', () => {
    it('should select name option when sortMethod is name', () => {
      const result = createSortOptions('name', mockTranslations);

      expect(result).toContain('value="name" selected');
      expect(result).toContain('Name');
      expect(result).toContain('value="category"');
      expect(result).not.toContain('value="category" selected');
      expect(result).not.toContain('value="location" selected');
    });

    it('should select category option when sortMethod is category', () => {
      const result = createSortOptions('category', mockTranslations);

      expect(result).toContain('value="category" selected');
      expect(result).toContain('Category');
      expect(result).toContain('value="name"');
      expect(result).not.toContain('value="name" selected');
    });

    it('should select location option when sortMethod is location', () => {
      const result = createSortOptions('location', mockTranslations);

      expect(result).toContain('value="location" selected');
      expect(result).toContain('Location');
      expect(result).toContain('value="name"');
      expect(result).toContain('value="category"');
      expect(result).not.toContain('value="name" selected');
      expect(result).not.toContain('value="category" selected');
    });

    it('should select quantity option when sortMethod is quantity', () => {
      const result = createSortOptions('quantity', mockTranslations);

      expect(result).toContain('value="quantity" selected');
      expect(result).toContain('Quantity (High)');
      expect(result).toContain('value="quantity-low"');
      expect(result).not.toContain('value="quantity-low" selected');
    });

    it('should select quantity-low option when sortMethod is quantity-low', () => {
      const result = createSortOptions('quantity-low', mockTranslations);

      expect(result).toContain('value="quantity-low" selected');
      expect(result).toContain('Quantity (Low)');
      expect(result).toContain('value="quantity"');
      expect(result).not.toContain('value="quantity" selected');
    });

    it('should select expiry option when sortMethod is expiry', () => {
      const result = createSortOptions('expiry', mockTranslations);

      expect(result).toContain('value="expiry" selected');
      expect(result).toContain('Expiry Date');
      expect(result).toContain('value="name"');
      expect(result).not.toContain('value="name" selected');
    });

    it('should select zero-last option when sortMethod is zero-last', () => {
      const result = createSortOptions('zero-last', mockTranslations);

      expect(result).toContain('value="zero-last" selected');
      expect(result).toContain('Zero Last');
      expect(result).toContain('value="name"');
      expect(result).not.toContain('value="name" selected');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string sortMethod', () => {
      const result = createSortOptions('', mockTranslations);

      expect(result).toContain('value="name"');
      expect(result).toContain('Name');
      expect(result).toContain('value="category"');
      expect(result).toContain('Category');
      expect(result).not.toContain('selected');
    });

    it('should handle invalid sortMethod', () => {
      const result = createSortOptions('invalid-sort', mockTranslations);

      expect(result).toContain('value="name"');
      expect(result).toContain('Name');
      expect(result).toContain('value="category"');
      expect(result).toContain('Category');
      expect(result).not.toContain('selected');
    });

    it('should handle null sortMethod', () => {
      const result = createSortOptions(null as any, mockTranslations);

      expect(result).toContain('value="name"');
      expect(result).toContain('Name');
      expect(result).not.toContain('selected');
    });

    it('should handle undefined sortMethod', () => {
      const result = createSortOptions(undefined as any, mockTranslations);

      expect(result).toContain('value="name"');
      expect(result).toContain('Name');
      expect(result).not.toContain('selected');
    });

    it('should handle case-sensitive sortMethod', () => {
      const result = createSortOptions('NAME', mockTranslations);

      expect(result).toContain('value="name"');
      expect(result).toContain('Name');
      expect(result).not.toContain('selected');
    });

    it('should handle sortMethod with extra spaces', () => {
      const result = createSortOptions(' name ', mockTranslations);

      expect(result).toContain('value="name"');
      expect(result).toContain('Name');
      expect(result).not.toContain('selected');
    });
  });

  describe('HTML structure', () => {
    it('should generate valid HTML structure', () => {
      const result = createSortOptions('name', mockTranslations);

      // Check label structure
      expect(result).toMatch(/<label for="[^"]*">/);
      expect(result).toContain('Sort by:');

      // Check select structure
      expect(result).toMatch(/<select id="[^"]*">/);
      expect(result).toContain('</select>');

      // Check option structure
      expect(result).toMatch(/<option value="[^"]*"/);
      expect(result).toContain('</option>');
    });

    it('should have proper label-select association', () => {
      const result = createSortOptions('category', mockTranslations);

      const labelFor = result.match(/for="([^"]*)"/)?.[1];
      const selectId = result.match(/select id="([^"]*)"/)?.[1];

      expect(labelFor).toBe(selectId);
      expect(labelFor).toBe(ELEMENTS.SORT_METHOD);
    });

    it('should have consistent option count', () => {
      const result = createSortOptions('name', mockTranslations);

      const optionMatches = result.match(/<option/g);
      expect(optionMatches).toBeTruthy();
      expect(optionMatches?.length).toBe(7);
    });

    it('should have valid option values', () => {
      const result = createSortOptions('', mockTranslations);

      expect(result).toContain('value="name"');
      expect(result).toContain('value="category"');
      expect(result).toContain('value="location"');
      expect(result).toContain('value="quantity"');
      expect(result).toContain('value="quantity-low"');
      expect(result).toContain('value="expiry"');
      expect(result).toContain('value="zero-last"');
    });

    it('should have descriptive option text', () => {
      const result = createSortOptions('', mockTranslations);

      expect(result).toContain('Name');
      expect(result).toContain('Category');
      expect(result).toContain('Location');
      expect(result).toContain('Quantity (High)');
      expect(result).toContain('Quantity (Low)');
      expect(result).toContain('Expiry Date');
      expect(result).toContain('Zero Last');
    });

    it('should have consistent whitespace and formatting', () => {
      const result = createSortOptions('name', mockTranslations);

      expect(result).toContain('\n');
      expect(result.trim()).toBeTruthy();

      expect(result).toContain('<label');
      expect(result).toContain('</label>');
      expect(result).toContain('<select');
      expect(result).toContain('</select>');
      expect(result).toContain('<option');
      expect(result).toContain('</option>');
    });
  });

  describe('option order', () => {
    it('should maintain consistent option order', () => {
      const result = createSortOptions('', mockTranslations);

      const optionOrder = [
        'value="name"',
        'value="category"',
        'value="quantity"',
        'value="quantity-low"',
        'value="expiry"',
        'value="zero-last"',
      ];

      let lastIndex = -1;
      optionOrder.forEach((option) => {
        const currentIndex = result.indexOf(option);
        expect(currentIndex).toBeGreaterThan(lastIndex);
        lastIndex = currentIndex;
      });
    });

    it('should maintain option order regardless of selection', () => {
      const resultName = createSortOptions('name', mockTranslations);
      const resultExpiry = createSortOptions('expiry', mockTranslations);

      const extractOrder = (html: string) => {
        const matches = [...html.matchAll(/value="([^"]*)"/g)];
        return matches.map((match) => match[1]);
      };

      const orderName = extractOrder(resultName);
      const orderExpiry = extractOrder(resultExpiry);

      expect(orderName).toEqual(orderExpiry);
      expect(orderName).toEqual([
        'name',
        'category',
        'location',
        'quantity',
        'quantity-low',
        'expiry',
        'zero-last',
      ]);
    });
  });
});
