import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function autoAddCheckbox(prefix: string, translations: TranslationData): string {
  return `
    <input type="checkbox" id="${prefix}-${ELEMENTS.AUTO_ADD_ENABLED}" class="auto-add-checkbox" />
    <label for="${prefix}-${ELEMENTS.AUTO_ADD_ENABLED}" class="checkbox-label">
      ${TranslationManager.localize(
        translations,
        'modal.auto_add_when_low',
        undefined,
        'Auto-add to todo list when low',
      )}
    </label>
  `;
}
