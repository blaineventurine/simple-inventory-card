import { ELEMENTS } from '@/utils/constants';
import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';

export function itemAlias(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.ALIASES}-input" class="form-label">
        ${TranslationManager.localize(translations, 'modal.aliases', undefined, 'Aliases')}
      </label>
      <div class="alias-tag-container">
        <div class="alias-chips" id="${prefix}-alias-chips"></div>
        <div class="alias-input-row">
          <input type="text" id="${prefix}-${ELEMENTS.ALIASES}-input" placeholder="${TranslationManager.localize(
            translations,
            'modal.aliases_input_placeholder',
            undefined,
            'Type an alias and press Enter',
          )}" />
        </div>
        <input type="hidden" id="${prefix}-${ELEMENTS.ALIASES}" />
      </div>
    </div>
  `;
}
