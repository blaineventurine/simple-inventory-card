import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function productPicker(prefix: string, translations: TranslationData): string {
  return `
    <div class="product-picker" id="${prefix}-${ELEMENTS.PRODUCT_PICKER}" style="display:none;">
      <div class="product-picker-label">
        ${TranslationManager.localize(translations, 'modal.multiple_products_found', undefined, 'Multiple products found — select one:')}
      </div>
      <div class="product-picker-list" id="${prefix}-${ELEMENTS.PRODUCT_PICKER_LIST}">
      </div>
    </div>
  `;
}
