import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemExpiryDate(prefix: string, translations: TranslationData): string {
  // The group id lets the batch editor hide the field for items with several batches (D6).
  return `
    <div class="input-group si-field" id="${prefix}-${ELEMENTS.EXPIRY_DATE}-group">
      <label for="${prefix}-${ELEMENTS.EXPIRY_DATE}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.expiry_date', undefined, 'Expiry Date')}
      </label>
      <input type="date" id="${prefix}-${ELEMENTS.EXPIRY_DATE}" />
    </div>
  `;
}
