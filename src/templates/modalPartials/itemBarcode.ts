import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemBarcode(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.BARCODE}-input" class="form-label">
        ${TranslationManager.localize(translations, 'modal.barcode', undefined, 'Barcode')}
      </label>
      <div class="barcode-tag-container">
        <div class="barcode-chips" id="${prefix}-barcode-chips"></div>
        <div class="barcode-input-row">
          <input type="text" id="${prefix}-${ELEMENTS.BARCODE}-input" placeholder="${TranslationManager.localize(
            translations,
            'modal.barcode_input_placeholder',
            undefined,
            'Type barcode and press Enter',
          )}" />
        </div>
        <input type="hidden" id="${prefix}-${ELEMENTS.BARCODE}" />
      </div>
    </div>
  `;
}
