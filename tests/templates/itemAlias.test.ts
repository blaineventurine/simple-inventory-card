import { describe, it, expect, vi, beforeEach } from 'vitest';

import { itemAlias } from '../../src/templates/modalPartials/itemAlias';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn((_translations: any, _key: string, _params: any, fallback: string) => {
      return fallback;
    }),
  },
}));

vi.mock('../../src/utils/constants', () => ({
  ELEMENTS: {
    ALIASES: 'aliases',
  },
}));

describe('itemAlias', () => {
  let mockTranslations: TranslationData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTranslations = {
      modal: {
        aliases: 'Aliases',
        aliases_input_placeholder: 'Type an alias and press Enter',
      },
    };
  });

  it('should render the aliases label', () => {
    const result = itemAlias('add', mockTranslations);
    expect(result).toContain('Aliases');
    expect(result).toContain('class="form-label"');
  });

  it('should render the hidden input with correct id', () => {
    const result = itemAlias('add', mockTranslations);
    expect(result).toContain('type="hidden"');
    expect(result).toContain('id="add-aliases"');
  });

  it('should render the visible input with correct id', () => {
    const result = itemAlias('add', mockTranslations);
    expect(result).toContain('id="add-aliases-input"');
    expect(result).toContain('Type an alias and press Enter');
  });

  it('should render the chips container', () => {
    const result = itemAlias('add', mockTranslations);
    expect(result).toContain('id="add-alias-chips"');
    expect(result).toContain('class="alias-chips"');
  });

  it('should render the tag container', () => {
    const result = itemAlias('add', mockTranslations);
    expect(result).toContain('class="alias-tag-container"');
  });

  it('should use the correct prefix for edit modal', () => {
    const result = itemAlias('edit', mockTranslations);
    expect(result).toContain('id="edit-aliases"');
    expect(result).toContain('id="edit-aliases-input"');
    expect(result).toContain('id="edit-alias-chips"');
  });
});
