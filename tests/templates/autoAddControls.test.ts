import { describe, it, expect, vi, beforeEach } from 'vitest';

import { autoAddControls } from '../../src/templates/modalPartials/autoAddControls';
import { TodoList } from '../../src/types/todoList';
import { TranslationData } from '@/types/translatableComponent';
import { Utilities } from '../../src/utils/utilities';
vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn(
      (
        _translations: TranslationData,
        _key: string,
        _params: Record<string, unknown> | undefined,
        fallback: string,
      ) => {
        return fallback;
      },
    ),
  },
}));

vi.mock('../../src/utils/utilities', () => ({
  Utilities: {
    sanitizeHtml: vi.fn((str: string) => str),
  },
}));

describe('autoAddControls', () => {
  let mockTodoLists: TodoList[];
  let mockTranslations: TranslationData;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Utilities.sanitizeHtml).mockImplementation((str: string) => str);
    mockTodoLists = [
      { id: 'grocery-1', name: 'Grocery List', entity_id: 'todo.grocery' },
      { id: 'shopping-2', name: 'Shopping List' },
    ];
    mockTranslations = { modal: {} };
  });

  it('renders an option for every todo list with its id as the value and name as the label', () => {
    const result = autoAddControls('add', mockTodoLists, mockTranslations);

    expect(result).toContain('<option value="grocery-1">Grocery List</option>');
    expect(result).toContain('<option value="shopping-2">Shopping List</option>');
  });

  describe('XSS protection', () => {
    it('sanitizes each todo list name', () => {
      autoAddControls('add', mockTodoLists, mockTranslations);

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Grocery List');
      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Shopping List');
    });

    it('escapes a malicious todo list name so it cannot inject a tag or break out of the option element', () => {
      vi.mocked(Utilities.sanitizeHtml).mockImplementation((value: string) =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;'),
      );
      const maliciousName = '</option><script>alert(1)</script>';
      const escaped = '&lt;/option&gt;&lt;script&gt;alert(1)&lt;/script&gt;';
      const maliciousTodoLists: TodoList[] = [{ id: 'evil-1', name: maliciousName }];

      const result = autoAddControls('add', maliciousTodoLists, mockTranslations);

      expect(result).not.toContain(maliciousName);
      expect(result).toContain(`<option value="evil-1">${escaped}</option>`);
    });
  });
});
