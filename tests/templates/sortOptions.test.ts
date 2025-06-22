import { describe, it, expect } from 'vitest';
import { createSortOptions } from '../../src/templates/sortOptions';
import { ELEMENTS } from '../../src/utils/constants';

describe('createSortOptions', () => {
  describe('basic functionality', () => {
    it('should create sort dropdown with label', () => {
      const result = createSortOptions('name');

      expect(result).toContain(`<label for="${ELEMENTS.SORT_METHOD}">Sort by:</label>`);
      expect(result).toContain(`<select id="${ELEMENTS.SORT_METHOD}">`);
      expect(result).toContain('</select>');
    });

    it('should include all sort options', () => {
      const result = createSortOptions('');

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).toContain('<option value="category" >Category</option>');
      expect(result).toContain('<option value="quantity" >Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" >Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" >Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" >Zero Last</option>');
    });

    it('should use correct element ID from constants', () => {
      const result = createSortOptions('name');

      expect(result).toContain(`id="${ELEMENTS.SORT_METHOD}"`);
      expect(result).toContain(`for="${ELEMENTS.SORT_METHOD}"`);
    });
  });

  describe('sort method selection', () => {
    it('should select name option when sortMethod is name', () => {
      const result = createSortOptions('name');

      expect(result).toContain('<option value="name" selected>Name</option>');
      expect(result).toContain('<option value="category" >Category</option>');
      expect(result).toContain('<option value="quantity" >Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" >Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" >Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" >Zero Last</option>');
    });

    it('should select category option when sortMethod is category', () => {
      const result = createSortOptions('category');

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).toContain('<option value="category" selected>Category</option>');
      expect(result).toContain('<option value="quantity" >Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" >Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" >Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" >Zero Last</option>');
    });

    it('should select quantity option when sortMethod is quantity', () => {
      const result = createSortOptions('quantity');

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).toContain('<option value="category" >Category</option>');
      expect(result).toContain('<option value="quantity" selected>Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" >Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" >Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" >Zero Last</option>');
    });

    it('should select quantity-low option when sortMethod is quantity-low', () => {
      const result = createSortOptions('quantity-low');

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).toContain('<option value="category" >Category</option>');
      expect(result).toContain('<option value="quantity" >Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" selected>Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" >Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" >Zero Last</option>');
    });

    it('should select expiry option when sortMethod is expiry', () => {
      const result = createSortOptions('expiry');

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).toContain('<option value="category" >Category</option>');
      expect(result).toContain('<option value="quantity" >Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" >Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" selected>Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" >Zero Last</option>');
    });

    it('should select zero-last option when sortMethod is zero-last', () => {
      const result = createSortOptions('zero-last');

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).toContain('<option value="category" >Category</option>');
      expect(result).toContain('<option value="quantity" >Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" >Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" >Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" selected>Zero Last</option>');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string sortMethod', () => {
      const result = createSortOptions('');

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).toContain('<option value="category" >Category</option>');
      expect(result).toContain('<option value="quantity" >Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" >Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" >Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" >Zero Last</option>');

      expect(result).not.toContain('selected');
    });

    it('should handle invalid sortMethod', () => {
      const result = createSortOptions('invalid-sort');

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).toContain('<option value="category" >Category</option>');
      expect(result).toContain('<option value="quantity" >Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" >Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" >Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" >Zero Last</option>');

      expect(result).not.toContain('selected');
    });

    it('should handle null sortMethod', () => {
      const result = createSortOptions(null as any);

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).toContain('<option value="category" >Category</option>');
      expect(result).toContain('<option value="quantity" >Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" >Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" >Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" >Zero Last</option>');

      expect(result).not.toContain('selected');
    });

    it('should handle undefined sortMethod', () => {
      const result = createSortOptions(undefined as any);

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).toContain('<option value="category" >Category</option>');
      expect(result).toContain('<option value="quantity" >Quantity (High)</option>');
      expect(result).toContain('<option value="quantity-low" >Quantity (Low)</option>');
      expect(result).toContain('<option value="expiry" >Expiry Date</option>');
      expect(result).toContain('<option value="zero-last" >Zero Last</option>');

      expect(result).not.toContain('selected');
    });

    it('should handle case-sensitive sortMethod', () => {
      const result = createSortOptions('NAME');

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).not.toContain('selected');
    });

    it('should handle sortMethod with extra spaces', () => {
      const result = createSortOptions(' name ');

      expect(result).toContain('<option value="name" >Name</option>');
      expect(result).not.toContain('selected');
    });
  });

  describe('HTML structure', () => {
    it('should generate valid HTML structure', () => {
      const result = createSortOptions('name');

      // Check label structure
      expect(result).toMatch(/<label for="[^"]*">Sort by:<\/label>/);

      // Check select structure
      expect(result).toMatch(/<select id="[^"]*">[\s\S]*<\/select>/);

      // Check option structure
      expect(result).toMatch(/<option value="[^"]*"[^>]*>[^<]+<\/option>/);
    });

    it('should have proper label-select association', () => {
      const result = createSortOptions('category');

      const labelFor = result.match(/for="([^"]*)"/)?.[1];
      const selectId = result.match(/select id="([^"]*)"/)?.[1];

      expect(labelFor).toBe(selectId);
      expect(labelFor).toBe(ELEMENTS.SORT_METHOD);
    });

    it('should have consistent option count', () => {
      const result = createSortOptions('name');

      const optionMatches = result.match(/<option/g);
      expect(optionMatches).toBeTruthy();
      expect(optionMatches?.length).toBe(6);
    });

    it('should have valid option values', () => {
      const result = createSortOptions('');

      expect(result).toContain('value="name"');
      expect(result).toContain('value="category"');
      expect(result).toContain('value="quantity"');
      expect(result).toContain('value="quantity-low"');
      expect(result).toContain('value="expiry"');
      expect(result).toContain('value="zero-last"');
    });

    it('should have descriptive option text', () => {
      const result = createSortOptions('');

      expect(result).toContain('>Name</option>');
      expect(result).toContain('>Category</option>');
      expect(result).toContain('>Quantity (High)</option>');
      expect(result).toContain('>Quantity (Low)</option>');
      expect(result).toContain('>Expiry Date</option>');
      expect(result).toContain('>Zero Last</option>');
    });

    it('should have consistent whitespace and formatting', () => {
      const result = createSortOptions('name');

      expect(result).toContain('\n');
      expect(result.trim()).toBeTruthy();

      // Check that the HTML structure is properly formatted
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
      const result = createSortOptions('');

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
      const resultName = createSortOptions('name');
      const resultExpiry = createSortOptions('expiry');

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
        'quantity',
        'quantity-low',
        'expiry',
        'zero-last',
      ]);
    });
  });
});
