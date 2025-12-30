import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemDescription(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.DESCRIPTION}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.description', undefined, 'Description')}
      </label>
      <input type="text" id="${prefix}-${ELEMENTS.DESCRIPTION}" placeholder="${TranslationManager.localize(
        translations,
        'modal.description_placeholder',
        undefined,
        'Item description',
      )}" />
    </div> 
  `;
}
