import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { createModalMultiSelect } from './modalMultiSelect';
import { ELEMENTS } from '@/utils/constants';

export function itemLocation(
  prefix: string,
  translations: TranslationData,
  locations: string[] = [],
): string {
  return `
    <div class="input-group si-field">
      <label for="${prefix}-${ELEMENTS.LOCATION}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.location', undefined, 'Location')}
      </label>
      ${createModalMultiSelect({
        id: `${prefix}-${ELEMENTS.LOCATION}`,
        placeholder: TranslationManager.localize(
          translations,
          'modal.location_placeholder',
          undefined,
          'Pantry, Garage Shelf, etc.',
        ),
        // Already sorted by itemOptions; the multi-select re-sorts when values are added.
        options: locations,
      })}
    </div>
  `;
}
