import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemLocation(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.LOCATION}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.location', undefined, 'Location')}
      </label>
      <input type="text" id="${prefix}-${ELEMENTS.LOCATION}" placeholder="${TranslationManager.localize(
        translations,
        'modal.location_placeholder',
        undefined,
        'Pantry, Garage Shelf, etc.',
      )}" />
    </div>
  `;
}
