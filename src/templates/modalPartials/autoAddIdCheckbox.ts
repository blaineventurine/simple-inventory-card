import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function autoAddIdCheckbox(prefix: string, translations: TranslationData): string {
  return `
    <div class="auto-add-id-container">
      <input type="checkbox" id="${prefix}-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}" class="auto-add-id-checkbox" />
      <label for="${prefix}-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}" class="checkbox-label">
        ${TranslationManager.localize(
          translations,
          'modal.auto_add_id_to_description',
          undefined,
          'Append inventory ID to item description',
        )}
      </label>
    </div>
  `;
}
