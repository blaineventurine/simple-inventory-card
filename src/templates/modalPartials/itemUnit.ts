import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemUnit(prefix: string, translations: TranslationData): string {
  return `
    <div class="input-group">
      <label for="${prefix}-${ELEMENTS.UNIT}">
        ${TranslationManager.localize(translations, 'modal.unit', undefined, 'Unit')}
      </label>
      <input type="text" id="${prefix}-${ELEMENTS.UNIT}" placeholder="${TranslationManager.localize(
        translations,
        'modal.unit_placeholder',
        undefined,
        'kg, pcs, etc.',
      )}" />
    </div>
  `;
}
