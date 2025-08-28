import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemName(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.NAME}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.name_required', undefined, 'Name *')}
      </label>
      <input type="text" id="${prefix}-${ELEMENTS.NAME}" required />
    </div> 
  `;
}
