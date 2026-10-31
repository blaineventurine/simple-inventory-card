import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';
import { Utilities } from '@/utils/utilities';
import { button, iconButton, iconCircle } from '@/templates/primitives';

/** Element ids of a sheet's image field; shared by the template and `ItemImageField`. */
export function imageFieldIds(prefix: string): {
  field: string;
  preview: string;
  file: string;
  choose: string;
  remove: string;
  media: string;
  status: string;
  offer: string;
  offerUse: string;
  offerPreview: string;
} {
  const id = `${prefix}-${ELEMENTS.IMAGE}`;
  return {
    field: id,
    preview: `${id}-preview`,
    file: `${id}-file`,
    choose: `${id}-choose`,
    remove: `${id}-remove`,
    media: `${id}-media`,
    status: `${id}-status`,
    offer: `${id}-offer`,
    offerUse: `${id}-offer-use`,
    offerPreview: `${id}-offer-preview`,
  };
}

/**
 * Image field of the add/edit sheet (`item_images`), one row: a preview, Photo (a file input;
 * phones offer the camera), Media (HA's media browser; `ItemImageField` shows it when the
 * frontend has one) and Remove; then a status line saying what Save does, and — in the add
 * sheet — the barcode lookup's product photo offer. `ItemImageField` stages the choice; it is
 * saved after the item.
 */
export function itemImage(prefix: string, translations: TranslationData): string {
  const ids = imageFieldIds(prefix);
  const text = (key: string, fallback: string): string =>
    TranslationManager.localize(translations, key, undefined, fallback);
  const label = Utilities.sanitizeHtml(text('image.label', 'Image'));

  const offer =
    prefix === 'add'
      ? `<label id="${ids.offer}" class="si-image-offer" hidden>
          <input type="checkbox" id="${ids.offerUse}" checked />
          <img id="${ids.offerPreview}" class="si-image-offer__img" alt="" referrerpolicy="no-referrer" />
          <span>${Utilities.sanitizeHtml(text('image.use_product_photo', 'Use product photo'))}</span>
        </label>`
      : '';

  return `
    <div class="form-group si-field si-image-field" id="${ids.field}" role="group" aria-labelledby="${ids.field}-label">
      <span class="form-label si-field__label" id="${ids.field}-label">${label}</span>
      <div class="si-image-field__row">
        <span id="${ids.preview}" class="si-image-field__preview">${iconCircle('mdi:image-outline', 'disabled')}</span>
        ${button({
          kind: 'tonal',
          icon: 'mdi:camera',
          label: text('image.choose', 'Photo'),
          attrs: { id: ids.choose },
        })}
        ${button({
          kind: 'tonal',
          icon: 'mdi:folder-image',
          label: text('image.media', 'Media'),
          attrs: { id: ids.media, hidden: true },
        })}
        ${iconButton({
          icon: 'mdi:delete',
          label: text('image.remove', 'Remove image'),
          className: 'si-tone-error',
          attrs: { id: ids.remove, hidden: true },
        })}
        <input type="file" id="${ids.file}" accept="image/*" hidden />
      </div>
      <small id="${ids.status}" class="help-text si-field__help si-image-field__status" role="status"></small>
      ${offer}
    </div>
  `;
}
