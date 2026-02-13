import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemBarcode(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.BARCODE}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.barcode', undefined, 'Barcode')}
      </label>
      <input type="text" id="${prefix}-${ELEMENTS.BARCODE}" placeholder="${TranslationManager.localize(
        translations,
        'modal.barcode_placeholder',
        undefined,
        'UPC, EAN, etc.',
      )}" />
    </div>
  `;
}
