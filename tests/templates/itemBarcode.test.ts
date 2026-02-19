import { describe, it, expect, vi, beforeEach } from 'vitest';

import { itemBarcode } from '../../src/templates/modalPartials/itemBarcode';
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
    BARCODE: 'barcode',
  },
}));

describe('itemBarcode', () => {
  let mockTranslations: TranslationData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTranslations = {
      modal: {
        barcode: 'Barcode',
        barcode_input_placeholder: 'Type barcode and press Enter',
      },
    };
  });

  it('should render the barcode label', () => {
    const result = itemBarcode('add', mockTranslations);
    expect(result).toContain('Barcode');
    expect(result).toContain('class="form-label"');
  });

  it('should render the hidden input with correct id', () => {
    const result = itemBarcode('add', mockTranslations);
    expect(result).toContain('type="hidden"');
    expect(result).toContain('id="add-barcode"');
  });

  it('should render the visible input with correct id', () => {
    const result = itemBarcode('add', mockTranslations);
    expect(result).toContain('id="add-barcode-input"');
    expect(result).toContain('Type barcode and press Enter');
  });

  it('should render the chips container', () => {
    const result = itemBarcode('add', mockTranslations);
    expect(result).toContain('id="add-barcode-chips"');
    expect(result).toContain('class="barcode-chips"');
  });

  it('should render the tag container', () => {
    const result = itemBarcode('add', mockTranslations);
    expect(result).toContain('class="barcode-tag-container"');
  });

  it('should use the correct prefix for edit modal', () => {
    const result = itemBarcode('edit', mockTranslations);
    expect(result).toContain('id="edit-barcode"');
    expect(result).toContain('id="edit-barcode-input"');
    expect(result).toContain('id="edit-barcode-chips"');
  });
});
