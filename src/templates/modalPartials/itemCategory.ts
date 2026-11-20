import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { createModalMultiSelect } from './modalMultiSelect';
import { ELEMENTS } from '@/utils/constants';

export function itemCategory(
  prefix: string,
  translations: TranslationData,
  categories: string[] = [],
): string {
  return `
    <div class="input-group si-field">
      <label for="${prefix}-${ELEMENTS.CATEGORY}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.category', undefined, 'Category')}
      </label>
      ${createModalMultiSelect({
        id: `${prefix}-${ELEMENTS.CATEGORY}`,
        placeholder: TranslationManager.localize(
          translations,
          'modal.category_placeholder',
          undefined,
          'Food, Tools, Supplies, etc.',
        ),
        // Already sorted by itemOptions; the multi-select re-sorts when values are added.
        options: categories,
      })}
    </div>
  `;
}
