import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';
import { DEFAULT_ITEM_ICON } from '@/utils/itemStatus';
import { Utilities } from '@/utils/utilities';
import { iconCircle } from '@/templates/primitives';

/**
 * Icon field of the add/edit sheet (`item_icons` feature). Uses Home Assistant's icon picker when
 * the frontend has loaded it, otherwise a `prefix:name` text input with a live preview circle
 * (kept in sync by `initializeIconField`). Both expose the icon as `.value` on `#<prefix>-icon`.
 */
export function itemIcon(prefix: string, translations: TranslationData): string {
  const id = `${prefix}-${ELEMENTS.ICON}`;
  const label = Utilities.sanitizeHtml(
    TranslationManager.localize(translations, 'modal.icon', undefined, 'Icon'),
  );
  const help = Utilities.sanitizeHtml(
    TranslationManager.localize(
      translations,
      'modal.icon_help',
      undefined,
      'Any Material Design icon, e.g. mdi:apple. Leave empty for the default icon.',
    ),
  );

  // The picker keeps its label (accessible name, shown inside the empty field); the help text
  // sits below it so the outlined border in forms.ts wraps only the field.
  if (customElements.get('ha-icon-picker')) {
    return `
    <div class="form-group si-field">
      <ha-icon-picker id="${id}" label="${label}" placeholder="${DEFAULT_ITEM_ICON}"></ha-icon-picker>
      <small class="help-text si-field__help">${help}</small>
    </div>
  `;
  }

  return `
    <div class="form-group si-field">
      <label for="${id}" class="form-label si-field__label">${label}</label>
      <div class="si-icon-field">
        <span id="${id}-preview" class="si-icon-field__preview" aria-hidden="true">${iconCircle(DEFAULT_ITEM_ICON, 'primary')}</span>
        <input type="text" id="${id}" placeholder="${DEFAULT_ITEM_ICON}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="${id}-help" />
      </div>
      <small id="${id}-help" class="help-text si-field__help">${help}</small>
    </div>
  `;
}
