import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { createAutoCompleteInput } from '../autoCompleteInput';
import { ELEMENTS } from '@/utils/constants';

export function itemLocation(
  prefix: string,
  translations: TranslationData,
  locations: string[] = [],
): string {
  return `
    <div class="input-group">
      <label for="${prefix}-${ELEMENTS.LOCATION}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.location', undefined, 'Location')}
      </label>
      ${createAutoCompleteInput({
        id: `${prefix}-${ELEMENTS.LOCATION}`,
        placeholder: TranslationManager.localize(
          translations,
          'modal.location_placeholder',
          undefined,
          'Pantry, Garage Shelf, etc.',
        ),
        options: locations.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
      })}
    </div>
  `;
}
