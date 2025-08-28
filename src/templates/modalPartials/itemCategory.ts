import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemCategory(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.CATEGORY}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.category', undefined, 'Category')}
      </label>
      <input type="text" id="${prefix}-${ELEMENTS.CATEGORY}" placeholder="${TranslationManager.localize(
        translations,
        'modal.category_placeholder',
        undefined,
        'Food, Cleaning, etc.',
      )}" />
    </div>
  `;
}
