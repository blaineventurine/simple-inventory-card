import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemQuantity(prefix: string, translations: TranslationData): string {
  return `
    <div class="input-group">
      <label for="${prefix}-${ELEMENTS.QUANTITY}">
        ${TranslationManager.localize(translations, 'modal.quantity', undefined, 'Quantity')}
      </label>
      <input type="number" id="${prefix}-${ELEMENTS.QUANTITY}" min="0" />
    </div>
  `;
}
