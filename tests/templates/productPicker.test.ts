import { describe, it, expect, vi, beforeEach } from 'vitest';

import { productPicker } from '../../src/templates/modalPartials/productPicker';
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
    PRODUCT_PICKER: 'product-picker',
    PRODUCT_PICKER_LIST: 'product-picker-list',
  },
}));

describe('productPicker', () => {
  let mockTranslations: TranslationData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTranslations = {
      modal: {
        multiple_products_found: 'Multiple products found — select one:',
      },
    };
  });

  it('should render with correct IDs using prefix', () => {
    const html = productPicker('add', mockTranslations);
    expect(html).toContain('id="add-product-picker"');
    expect(html).toContain('id="add-product-picker-list"');
  });

  it('should be hidden by default', () => {
    const html = productPicker('add', mockTranslations);
    expect(html).toContain('style="display:none;"');
  });

  it('should contain the label text', () => {
    const html = productPicker('add', mockTranslations);
    expect(html).toContain('Multiple products found');
  });

  it('should use the correct CSS classes', () => {
    const html = productPicker('add', mockTranslations);
    expect(html).toContain('class="product-picker"');
    expect(html).toContain('class="product-picker-label"');
    expect(html).toContain('class="product-picker-list"');
  });

  it('should work with edit prefix', () => {
    const html = productPicker('edit', mockTranslations);
    expect(html).toContain('id="edit-product-picker"');
    expect(html).toContain('id="edit-product-picker-list"');
  });
});
