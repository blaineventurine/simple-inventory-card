import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemExpiryDate(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.EXPIRY_DATE}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.expiry_date', undefined, 'Expiry Date')}
      </label>
      <input type="date" id="${prefix}-${ELEMENTS.EXPIRY_DATE}" />
    </div>
  `;
}
