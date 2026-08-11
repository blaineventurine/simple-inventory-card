import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createModalMultiSelect } from '../../src/templates/modalPartials/modalMultiSelect';
import { ModalMultiSelectConfig } from '../../src/types/modalMultiSelect';
import { Utilities } from '../../src/utils/utilities';

vi.mock('../../src/utils/utilities', () => ({
  Utilities: {
    sanitizeHtml: vi.fn((str: string) => str),
  },
}));

describe('createModalMultiSelect', () => {
  let baseConfig: ModalMultiSelectConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Utilities.sanitizeHtml).mockImplementation((str: string) => str);
    baseConfig = {
      id: 'add-category',
      options: ['Fruit', 'Dairy'],
      placeholder: 'Select categories...',
    };
  });

  it('renders a checkbox option for every entry in options', () => {
    const result = createModalMultiSelect(baseConfig);

    expect(result).toContain('value="Fruit"');
    expect(result).toContain('<span>Fruit</span>');
    expect(result).toContain('value="Dairy"');
    expect(result).toContain('<span>Dairy</span>');
  });

  describe('XSS protection', () => {
    it('sanitizes each option value', () => {
      createModalMultiSelect(baseConfig);

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Fruit');
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

      const result = createModalMultiSelect({ ...baseConfig, options: [maliciousOption] });

      expect(result).not.toContain(maliciousOption);
      expect(result).toContain(`value="${escaped}"`);
      expect(result).toContain(`<span>${escaped}</span>`);
    });
  });
});
