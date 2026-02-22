import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemPrice(prefix: string, translations: TranslationData): string {
  return `
    <div class="input-group">
      <label for="${prefix}-${ELEMENTS.PRICE}">
        ${TranslationManager.localize(translations, 'modal.price', undefined, 'Unit Price')}
      </label>
      <input type="number" id="${prefix}-${ELEMENTS.PRICE}" step="0.01" min="0" placeholder="${TranslationManager.localize(
        translations,
        'modal.price_placeholder',
        undefined,
        'Unit price',
      )}" />
    </div>
  `;
}
