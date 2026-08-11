import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createMultiSelect } from '../../src/templates/multiSelect';
import { MultiSelectConfig } from '../../src/types/multiSelectConfig';
import { Utilities } from '../../src/utils/utilities';

vi.mock('../../src/utils/utilities', () => ({
  Utilities: {
    sanitizeHtml: vi.fn((str: string) => str),
  },
}));

describe('createMultiSelect', () => {
  let baseConfig: MultiSelectConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Utilities.sanitizeHtml).mockImplementation((str: string) => str);
    baseConfig = {
      id: 'filter-category',
      options: ['Fruit', 'Dairy'],
      placeholder: 'All Categories',
      selected: [],
    };
  });

  it('renders an option for every entry in options', () => {
    const result = createMultiSelect(baseConfig);

    expect(result).toContain('value="Fruit"');
    expect(result).toContain('<span>Fruit</span>');
    expect(result).toContain('value="Dairy"');
    expect(result).toContain('<span>Dairy</span>');
  });

  it('marks selected options as checked', () => {
    const result = createMultiSelect({ ...baseConfig, selected: ['Fruit'] });

    expect(result).toContain('value="Fruit" checked>');
    expect(result).toContain('value="Dairy" >');
  });

  it('uses the label mapping for display text when provided', () => {
    const result = createMultiSelect({ ...baseConfig, labels: { Fruit: 'Fresh Fruit' } });

    expect(result).toContain('<span>Fresh Fruit</span>');
    expect(result).toContain('<span>Dairy</span>');
  });

  describe('XSS protection', () => {
    it('sanitizes each option value', () => {
      createMultiSelect(baseConfig);

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Fruit');
      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Dairy');
    });

    it('sanitizes the label text (including when it falls back to the raw option)', () => {
      createMultiSelect({ ...baseConfig, labels: { Fruit: 'Fresh Fruit' } });

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Fresh Fruit');
      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Dairy');
    });

    it('escapes a malicious option so it cannot inject a tag or break out of the checkbox value attribute', () => {
      vi.mocked(Utilities.sanitizeHtml).mockImplementation((value: string) =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;'),
      );
      const maliciousOption = '"><img src=x onerror=alert(1)>';
      const escaped = '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;';

      const result = createMultiSelect({
        ...baseConfig,
        options: [maliciousOption],
        selected: [],
      });

      expect(result).not.toContain(maliciousOption);
      expect(result).toContain(`value="${escaped}"`);
      expect(result).toContain(`<span>${escaped}</span>`);
    });
  });
});
