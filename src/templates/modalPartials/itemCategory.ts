import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { createAutoCompleteInput } from '../autocompleteInput';
import { ELEMENTS } from '@/utils/constants';

export function itemCategory(
  prefix: string,
  translations: TranslationData,
  categories: string[] = [],
): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.CATEGORY}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.category', undefined, 'Category')}
      </label>
      ${createAutoCompleteInput({
        id: `${prefix}-${ELEMENTS.CATEGORY}`,
        placeholder: TranslationManager.localize(
          translations,
          'modal.category_placeholder',
          undefined,
          'Food, Tools, Supplies, etc.',
        ),
        options: categories.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
      })}
    </div>
  `;
}
