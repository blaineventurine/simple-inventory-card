import { InventoryItem } from '@/types/inventory';
import { GetCardContext } from '@/types/cardContext';
import { ServiceResult } from '@/types/serviceResult';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS, MAX_IMAGE_BYTES } from '@/utils/constants';
import { itemImagePath } from '@/utils/itemImage';
import { showHassNotification } from '@/utils/notify';
import { Utilities } from '@/utils/utilities';
import { imageFieldIds } from '@/templates/modalPartials/itemImage';
import { iconCircle, photo } from '@/templates/primitives';
import { ImageLoader, hydrateImages } from '../imageLoader';
import { ImageViewer } from '../imageViewer';
import { Services } from '../services';
import { TranslationManager } from '../translationManager';

type Prefix = 'add' | 'edit';

/** What the sheet will do to the item's image on save. */
type ImageChange =
  | { kind: 'file'; file: File; previewUrl: string }
  | { kind: 'media'; mediaContentId: string }
  | { kind: 'remove' };

interface FieldState {
  /** The edited item's id; unknown for a new item until it is created. */
  itemId: string | undefined;
  /** Thumbnail and full image path of the item's saved image; null when it has none. */
  savedThumb: string | null;
  savedFull: string | null;
  change: ImageChange | undefined;
  /** Barcode whose product photo the add sheet offers (I13). */
  offerBarcode: string | undefined;
}

export type ItemImageServices = Pick<
  Services,
  | 'getItem'
  | 'uploadItemImage'
  | 'deleteItemImage'
  | 'setItemImageFromBarcode'
  | 'setItemImageFromMedia'
>;

/** HA's media selector, limited to images; `accept` also hides its media player picker. */
const MEDIA_SELECTOR = { media: { accept: ['image/*'] } };

/**
 * HA's elements whose `_pickMedia()` opens its media browser dialog, preferred first: HA
 * 2026.10 moved it from `ha-selector-media` into `ha-media-item-picker` (same contract: `hass`,
 * `selector`, `value`, `value-changed`).
 */
const MEDIA_ELEMENTS = ['ha-media-item-picker', 'ha-selector-media'];

/** Backend error codes of the image endpoint with a message of their own. */
const ERROR_KEYS: Record<string, { key: string; fallback: string }> = {
  image_too_large: { key: 'image.too_large', fallback: 'The image is larger than 10 MB.' },
  image_invalid: { key: 'image.invalid', fallback: 'The file could not be read as an image.' },
  item_not_found: { key: 'image.item_not_found', fallback: 'The item no longer exists.' },
};

function emptyState(): FieldState {
  return {
    itemId: undefined,
    savedThumb: null,
    savedFull: null,
    change: undefined,
    offerBarcode: undefined,
  };
}

/** The defined element that can open HA's media browser (`_pickMedia`), if any. */
function mediaPickerElement(): string | undefined {
  return MEDIA_ELEMENTS.find((name) => {
    const element = customElements.get(name);
    return (
      element !== undefined && typeof Reflect.get(element.prototype, '_pickMedia') === 'function'
    );
  });
}

/**
 * What HA's media selector picked, from its `value-changed` event: its `media-source://` id.
 * Undefined for a cleared or non-media value.
 */
function pickedMedia(event: Event): string | undefined {
  const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
  if (detail === null || typeof detail !== 'object' || !('value' in detail)) {
    return undefined;
  }
  const value = detail.value;
  if (value === null || typeof value !== 'object' || !('media_content_id' in value)) {
    return undefined;
  }
  const id = value.media_content_id;
  return typeof id === 'string' && id.startsWith('media-source://') ? id : undefined;
}

/**
 * The add/edit sheets' image field (`item_images`). A choice is staged — a photo file, an image
 * from HA's media, removal, or the add sheet's product photo offer — and applied by `apply`
 * after the item itself was saved: a new item needs its id first (I14). Without the field in
 * the DOM every method does nothing.
 */
export class ItemImageField {
  private readonly fields: Record<Prefix, FieldState> = { add: emptyState(), edit: emptyState() };
  private translations: TranslationData = {};
  /** Hidden HA media picker, created on the first Media click (see `pickMedia`). */
  private mediaPicker: HTMLElement | undefined;
  /** The sheet whose Media button opened HA's media browser; its pick is staged there. */
  private mediaPrefix: Prefix | undefined;
  /** HA's media picker element is being loaded (see `loadMediaSelector`). */
  private mediaLoading = false;

  constructor(
    private readonly root: ShadowRoot,
    private readonly services: ItemImageServices,
    private readonly loader: ImageLoader,
    private readonly getContext: GetCardContext,
    /** Shows the preview's photo full screen. */
    private readonly viewer?: ImageViewer,
  ) {}

  /** Reset the field as its sheet opens; `item` is the item the edit sheet shows. */
  open(prefix: Prefix, translations: TranslationData, item?: InventoryItem): void {
    const ids = imageFieldIds(prefix);
    const field = this.root.getElementById(ids.field);
    if (!field) {
      return;
    }
    this.translations = translations;
    this.discard(prefix);
    this.fields[prefix] = {
      ...emptyState(),
      itemId: item?.id,
      savedThumb: item ? itemImagePath(item, 'thumb') : null,
      savedFull: item ? itemImagePath(item, 'full') : null,
    };
    this.bind(prefix, field);
    this.showMediaButton(prefix);
    this.loadMediaSelector();
    this.render(prefix);
  }

  /** Media is offered only when an HA element can open its media browser. */
  private showMediaButton(prefix: Prefix): void {
    const media = this.root.getElementById(imageFieldIds(prefix).media);
    if (media) {
      media.hidden = mediaPickerElement() === undefined;
    }
  }

  /**
   * HA defines its media picker elements only once some `ha-selector` rendered a media
   * selector: a hidden one for images in the shadow root loads them, then Media is shown in both
   * sheets as soon as one that can open the browser is defined.
   */
  private loadMediaSelector(): void {
    if (
      this.mediaLoading ||
      mediaPickerElement() !== undefined ||
      !customElements.get('ha-selector')
    ) {
      return;
    }
    this.mediaLoading = true;
    const loader = document.createElement('ha-selector');
    loader.hidden = true;
    Object.assign(loader, { hass: this.getContext().hass, selector: MEDIA_SELECTOR });
    this.root.append(loader);
    for (const name of MEDIA_ELEMENTS) {
      customElements.whenDefined(name).then(() => {
        if (mediaPickerElement() === undefined) {
          return;
        }
        loader.remove();
        this.showMediaButton('add');
        this.showMediaButton('edit');
      });
    }
  }

  /** The add sheet's barcode lookup found a product photo: offer it (checked when first shown). */
  offerProductPhoto(barcode: string, imageUrl: string): void {
    const ids = imageFieldIds('add');
    const offer = this.root.getElementById(ids.offer);
    const preview = this.root.getElementById(ids.offerPreview);
    const use = this.root.getElementById(ids.offerUse);
    const state = this.fields.add;
    if (
      !offer ||
      !(preview instanceof HTMLImageElement) ||
      !(use instanceof HTMLInputElement) ||
      state.change !== undefined
    ) {
      return;
    }
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      return;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return;
    }
    // Only the preview: HA's https page would block (or warn about) an http image. The
    // integration downloads the photo itself, so a preview that still fails just hides.
    url.protocol = 'https:';
    preview.hidden = false;
    preview.src = url.href;
    // A later lookup replaces the photo but keeps the user's choice of an offer already shown.
    if (offer.hidden) {
      use.checked = true;
    }
    offer.hidden = false;
    state.offerBarcode = barcode;
    this.render('add');
  }

  /**
   * Save the staged image of the item just saved as `itemName`. Never throws: the item stays
   * saved and a failure shows as a toast (HA shows its own for the service-based sources).
   */
  async apply(prefix: Prefix, inventoryId: string, itemName: string): Promise<void> {
    const state = this.fields[prefix];
    const use = this.root.getElementById(imageFieldIds(prefix).offerUse);
    // The integration only takes a lookup barcode the item has: the offer goes with its chip.
    const barcodes = this.root.getElementById(`${prefix}-${ELEMENTS.BARCODE}`);
    const offerBarcode =
      state.offerBarcode !== undefined &&
      use instanceof HTMLInputElement &&
      use.checked &&
      barcodes instanceof HTMLInputElement &&
      barcodes.value
        .split(',')
        .map((barcode) => barcode.trim())
        .includes(state.offerBarcode)
        ? state.offerBarcode
        : undefined;
    const change = state.change;
    if (change === undefined && offerBarcode === undefined) {
      this.discard(prefix);
      return;
    }

    // Service-based sources: a failure is toasted by HA's callService itself.
    if (change === undefined) {
      await this.services.setItemImageFromBarcode(inventoryId, itemName, offerBarcode);
      this.discard(prefix);
      return;
    }
    if (change.kind === 'media') {
      await this.services.setItemImageFromMedia(inventoryId, itemName, change.mediaContentId);
      this.discard(prefix);
      return;
    }

    // The HTTP endpoint addresses the item by id; a new item's id is looked up by name.
    const itemId = state.itemId ?? (await this.services.getItem(inventoryId, itemName))?.id;
    let result: ServiceResult;
    if (!itemId) {
      result = { success: false, error: 'item_not_found', errorCode: 'item_not_found' };
    } else if (change.kind === 'file') {
      result = await this.services.uploadItemImage(itemId, change.file);
    } else {
      result = await this.services.deleteItemImage(itemId);
    }
    this.discard(prefix);
    if (!result.success) {
      const known = result.errorCode ? ERROR_KEYS[result.errorCode] : undefined;
      const error = known ? this.localize(known.key, known.fallback) : (result.error ?? '');
      showHassNotification(
        this.root,
        TranslationManager.localize(
          this.translations,
          'image.save_failed',
          { name: itemName, error },
          `${itemName} was saved, but its image was not: ${error}`,
        ),
      );
    }
  }

  /** Listeners on the field's controls, once per rendered field (the sheet DOM persists). */
  private bind(prefix: Prefix, field: HTMLElement): void {
    if (field.hasAttribute('data-listeners-bound')) {
      return;
    }
    field.setAttribute('data-listeners-bound', 'true');
    const ids = imageFieldIds(prefix);
    const file = this.root.getElementById(ids.file);
    this.root.getElementById(ids.choose)?.addEventListener('click', () => {
      file?.click();
    });
    file?.addEventListener('change', () => {
      if (file instanceof HTMLInputElement) {
        this.chooseFile(prefix, file);
      }
    });
    this.root.getElementById(ids.remove)?.addEventListener('click', () => {
      this.setChange(prefix, this.fields[prefix].savedThumb ? { kind: 'remove' } : undefined);
    });
    this.root.getElementById(ids.media)?.addEventListener('click', () => {
      this.pickMedia(prefix);
    });
    this.root.getElementById(ids.offerUse)?.addEventListener('change', () => {
      this.render(prefix);
    });
    this.root.getElementById(ids.preview)?.addEventListener('click', (event) => {
      const open =
        event.target instanceof Element ? event.target.closest('.si-image-field__open') : null;
      if (open instanceof HTMLElement) {
        this.viewPhoto(prefix, open);
      }
    });
    // A product photo the browser cannot show leaves the offer (text and checkbox) in place.
    const offerPreview = this.root.getElementById(ids.offerPreview);
    offerPreview?.addEventListener('error', () => {
      offerPreview.hidden = true;
    });
  }

  /** The preview's photo full screen: the staged photo as is, else the saved image. */
  private viewPhoto(prefix: Prefix, opener: HTMLElement): void {
    const { change, savedThumb, savedFull } = this.fields[prefix];
    const nameInput = this.root.getElementById(`${prefix}-${ELEMENTS.NAME}`);
    const name = nameInput instanceof HTMLInputElement ? nameInput.value.trim() : '';
    if (change?.kind === 'file') {
      this.viewer?.open({ name, src: change.previewUrl }, opener, this.translations);
    } else if (change === undefined && savedThumb !== null && savedFull !== null) {
      this.viewer?.open(
        { name, fullPath: savedFull, thumbPath: savedThumb },
        opener,
        this.translations,
      );
    }
  }

  /**
   * Open HA's media browser through a hidden media picker in the card's shadow root: it must be
   * inside HA's element tree so its `show-dialog` event reaches HA's dialog manager. The pick
   * arrives as its `value-changed` event.
   */
  private pickMedia(prefix: Prefix): void {
    const name = mediaPickerElement();
    if (name === undefined) {
      return;
    }
    if (this.mediaPicker?.localName !== name) {
      this.mediaPicker?.remove();
      const created = document.createElement(name);
      created.hidden = true;
      created.addEventListener('value-changed', (event) => {
        const id = pickedMedia(event);
        if (id !== undefined && this.mediaPrefix !== undefined) {
          this.setChange(this.mediaPrefix, { kind: 'media', mediaContentId: id });
        }
      });
      this.mediaPicker = created;
    }
    const picker = this.mediaPicker;
    // A full card render rebuilds the shadow root and detaches it.
    if (!picker.isConnected) {
      this.root.append(picker);
    }
    // A fresh value each time, so the browser opens at the root and any pick counts as a change.
    Object.assign(picker, {
      hass: this.getContext().hass,
      selector: MEDIA_SELECTOR,
      value: undefined,
    });
    this.mediaPrefix = prefix;
    if ('_pickMedia' in picker && typeof picker._pickMedia === 'function') {
      picker._pickMedia();
    }
  }

  /** Client pre-check (the server decides): an image type, at most 10 MB. */
  private chooseFile(prefix: Prefix, input: HTMLInputElement): void {
    const file = input.files?.[0];
    // Cleared so picking the same file again still fires `change`.
    input.value = '';
    if (!file) {
      return;
    }
    // Some browsers report no type for HEIC photos; the server decodes those.
    if (file.type !== '' && !file.type.startsWith('image/')) {
      this.setStatus(prefix, this.localize('image.not_an_image', 'Choose an image file.'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.setStatus(prefix, this.localize('image.too_large', 'The image is larger than 10 MB.'));
      return;
    }
    this.setChange(prefix, { kind: 'file', file, previewUrl: URL.createObjectURL(file) });
  }

  /** Stage `change` (undefined = keep the saved image); an own choice replaces the offer. */
  private setChange(prefix: Prefix, change: ImageChange | undefined): void {
    this.discard(prefix);
    this.fields[prefix].change = change;
    this.render(prefix);
  }

  /** Drop the staged change and the offer; frees the local preview of a chosen file. */
  private discard(prefix: Prefix): void {
    const state = this.fields[prefix];
    if (state.change?.kind === 'file') {
      URL.revokeObjectURL(state.change.previewUrl);
    }
    state.change = undefined;
    state.offerBarcode = undefined;
    const offer = this.root.getElementById(imageFieldIds(prefix).offer);
    if (offer) {
      offer.hidden = true;
    }
  }

  private render(prefix: Prefix): void {
    const ids = imageFieldIds(prefix);
    const preview = this.root.getElementById(ids.preview);
    const remove = this.root.getElementById(ids.remove);
    const { change, savedThumb } = this.fields[prefix];
    if (preview) {
      let photoHtml: string | undefined;
      if (change?.kind === 'file') {
        photoHtml = `<img class="si-image-field__img" alt="" src="${Utilities.sanitizeHtml(change.previewUrl)}">`;
      } else if (change === undefined && savedThumb) {
        photoHtml = photo(savedThumb, this.loader.cached(savedThumb), 'si-image-field__img');
      }
      if (photoHtml === undefined) {
        preview.innerHTML =
          change?.kind === 'media'
            ? iconCircle('mdi:image-check-outline', 'primary')
            : iconCircle('mdi:image-outline', 'disabled');
      } else {
        // A photo opens full screen; the placeholders do not.
        const label = this.localize('image.view_photo_unnamed', 'View photo');
        preview.innerHTML = `<button type="button" class="si-image-field__open" aria-label="${Utilities.sanitizeHtml(label)}">${photoHtml}</button>`;
        hydrateImages(preview, this.loader);
      }
    }
    if (remove) {
      remove.hidden = change === undefined ? savedThumb === null : change.kind === 'remove';
    }
    this.setStatus(prefix, this.pendingStatus(prefix));
  }

  /** What Save will do to the image, for the status line; empty when it keeps it. */
  private pendingStatus(prefix: Prefix): string {
    const change = this.fields[prefix].change;
    switch (change?.kind) {
      case 'file':
        return this.localize('image.pending_photo', 'The new photo is saved when you save.');
      case 'media':
        return this.localize('image.pending_media', 'The image from media is saved when you save.');
      case 'remove':
        return this.localize('image.pending_remove', 'The image is removed when you save.');
    }
    const ids = imageFieldIds(prefix);
    const offer = this.root.getElementById(ids.offer);
    const use = this.root.getElementById(ids.offerUse);
    return offer && !offer.hidden && use instanceof HTMLInputElement && use.checked
      ? this.localize('image.pending_product_photo', 'The product photo is saved when you save.')
      : '';
  }

  private setStatus(prefix: Prefix, message: string): void {
    const status = this.root.getElementById(imageFieldIds(prefix).status);
    if (status) {
      status.textContent = message;
    }
  }

  private localize(key: string, fallback: string): string {
    return TranslationManager.localize(this.translations, key, undefined, fallback);
  }
}
