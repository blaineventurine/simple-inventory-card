import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

import { ItemImageField, ItemImageServices } from '../../../src/services/modals/itemImageField';
import { ImageLoader } from '../../../src/services/imageLoader';
import { ImageViewer } from '../../../src/services/imageViewer';
import { itemImage } from '../../../src/templates/modalPartials/itemImage';
import { HomeAssistant } from '../../../src/types/homeAssistant';
import { InventoryItem } from '../../../src/types/inventory';
import { MAX_IMAGE_BYTES } from '../../../src/utils/constants';
import { createMockHomeAssistant, createMockCardContext } from '../../testHelpers';

/** HA's `ha-selector-media` class as `customElements.get` returns it (the setup stubs the registry). */
class FakeMediaSelector extends HTMLElement {
  _pickMedia(): void {}
}

const milk: InventoryItem = {
  auto_add_enabled: false,
  auto_add_id_to_description_enabled: false,
  category: '',
  description: '',
  expiry_date: '',
  id: 'milk-id',
  image: 's1',
  location: '',
  name: 'Milk',
  quantity: 1,
  todo_list: '',
  unit: '',
};

describe('ItemImageField', () => {
  let host: HTMLElement;
  let root: ShadowRoot;
  let hass: HomeAssistant;
  let services: { [K in keyof ItemImageServices]: Mock<ItemImageServices[K]> };
  let fetchBlob: Mock<(path: string) => Promise<Blob>>;
  let createObjectURL: Mock<(blob: Blob) => string>;
  let revokeObjectURL: Mock<(url: string) => void>;
  let field: ItemImageField;
  let viewer: ImageViewer;

  function element<T extends HTMLElement>(id: string, type: new () => T): T {
    const found = root.getElementById(id);
    if (!(found instanceof type)) {
      throw new Error(`missing #${id}`);
    }
    return found;
  }

  function choose(prefix: string, file: File): void {
    const input = element(`${prefix}-image-file`, HTMLInputElement);
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));
  }

  function notifications(): string[] {
    const messages: string[] = [];
    root.addEventListener('hass-notification', (event) => {
      if (event instanceof CustomEvent) {
        messages.push(String(event.detail.message));
      }
    });
    return messages;
  }

  const photoFile = (): File => new File(['png'], 'milk.png', { type: 'image/png' });

  /** `_pickMedia` of the created media picker elements: opens HA's media browser. */
  let pickMedia: Mock<() => void>;

  beforeEach(() => {
    vi.spyOn(customElements, 'get').mockImplementation((name: string) =>
      name === 'ha-selector-media' ? FakeMediaSelector : undefined,
    );
    pickMedia = vi.fn<() => void>();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const created = createElement(tagName);
      if (tagName === 'ha-selector-media' || tagName === 'ha-media-item-picker') {
        Object.assign(created, { _pickMedia: pickMedia });
      }
      return created;
    });
    host = document.createElement('div');
    document.body.append(host);
    root = host.attachShadow({ mode: 'open' });
    // The add sheet's barcode tag input keeps its chips as a comma list in `#add-barcode`.
    root.innerHTML =
      itemImage('add', {}) +
      itemImage('edit', {}) +
      '<input id="add-barcode" value="4006"><input id="add-name"><input id="edit-name" value="Milk">';
    let next = 0;
    createObjectURL = vi.fn<(blob: Blob) => string>(() => `blob:test/${++next}`);
    revokeObjectURL = vi.fn<(url: string) => void>();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });
    hass = createMockHomeAssistant();
    services = {
      getItem: vi.fn<ItemImageServices['getItem']>().mockResolvedValue({ ...milk, id: 'new-id' }),
      uploadItemImage: vi
        .fn<ItemImageServices['uploadItemImage']>()
        .mockResolvedValue({ success: true, image: 's2' }),
      deleteItemImage: vi
        .fn<ItemImageServices['deleteItemImage']>()
        .mockResolvedValue({ success: true, image: '' }),
      setItemImageFromBarcode: vi
        .fn<ItemImageServices['setItemImageFromBarcode']>()
        .mockResolvedValue({ success: true }),
      setItemImageFromMedia: vi
        .fn<ItemImageServices['setItemImageFromMedia']>()
        .mockResolvedValue({ success: true }),
    };
    fetchBlob = vi.fn<(path: string) => Promise<Blob>>(() => new Promise<Blob>(() => {}));
    const loader = new ImageLoader(fetchBlob);
    viewer = new ImageViewer(root, loader);
    field = new ItemImageField(
      root,
      services,
      loader,
      () => createMockCardContext({ hass }),
      viewer,
    );
  });

  afterEach(() => {
    host.remove();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.restoreAllMocks();
  });

  it('does nothing without the field (no item_images)', async () => {
    root.innerHTML = '';

    field.open('add', {});
    field.offerProductPhoto('4006', 'https://images.example/milk.jpg');
    await field.apply('add', 'inv', 'Milk');

    expect(Object.values(services).every((mock) => mock.mock.calls.length === 0)).toBe(true);
  });

  it("shows the edited item's thumbnail and offers to remove it", () => {
    field.open('edit', {}, milk);

    const img = root.querySelector('#edit-image-preview img');
    expect(img?.getAttribute('data-image-path')).toBe(
      '/api/simple_inventory/image/milk-id?thumb=1&v=s1',
    );
    expect(fetchBlob).toHaveBeenCalledWith('/api/simple_inventory/image/milk-id?thumb=1&v=s1');
    expect(element('edit-image-remove', HTMLButtonElement).hidden).toBe(false);
  });

  it('shows the placeholder and no remove button for an item without an image', () => {
    field.open('edit', {}, { ...milk, image: '' });

    expect(root.querySelector('#edit-image-preview img')).toBeNull();
    expect(root.querySelector('#edit-image-preview ha-icon')?.getAttribute('icon')).toBe(
      'mdi:image-outline',
    );
    expect(element('edit-image-remove', HTMLButtonElement).hidden).toBe(true);
  });

  it('opens the saved image full screen from the edit preview', () => {
    const open = vi.spyOn(viewer, 'open').mockImplementation(() => {});
    field.open('edit', { image: { view_photo_unnamed: 'Foto ansehen' } }, milk);
    const preview = element('edit-image-preview', HTMLElement).querySelector('button');

    expect(preview?.getAttribute('aria-label')).toBe('Foto ansehen');
    preview?.click();

    expect(open).toHaveBeenCalledWith(
      {
        name: 'Milk',
        fullPath: '/api/simple_inventory/image/milk-id?v=s1',
        thumbPath: '/api/simple_inventory/image/milk-id?thumb=1&v=s1',
      },
      preview,
      { image: { view_photo_unnamed: 'Foto ansehen' } },
    );
  });

  it('opens a staged photo full screen as it is, under the typed name', () => {
    const open = vi.spyOn(viewer, 'open').mockImplementation(() => {});
    field.open('add', {});
    choose('add', photoFile());
    element('add-name', HTMLInputElement).value = ' Oat milk ';

    const preview = element('add-image-preview', HTMLElement).querySelector('button');
    preview?.click();

    expect(open).toHaveBeenCalledWith({ name: 'Oat milk', src: 'blob:test/1' }, preview, {});
  });

  it('offers no viewer without a photo to show', () => {
    field.open('add', {});
    expect(element('add-image-preview', HTMLElement).querySelector('button')).toBeNull();

    field.open('edit', {}, milk);
    element('edit-image-remove', HTMLButtonElement).click();
    expect(element('edit-image-preview', HTMLElement).querySelector('button')).toBeNull();
  });

  it('opens the file picker from the photo button', () => {
    field.open('add', {});
    const input = element('add-image-file', HTMLInputElement);
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});

    element('add-image-choose', HTMLButtonElement).click();

    expect(click).toHaveBeenCalled();
  });

  it('refuses files that are not images or larger than 10 MB, before uploading', async () => {
    field.open('add', {});

    choose('add', new File(['%PDF'], 'scan.pdf', { type: 'application/pdf' }));
    expect(element('add-image-status', HTMLElement).textContent).toBe('Choose an image file.');

    const big = photoFile();
    Object.defineProperty(big, 'size', { value: MAX_IMAGE_BYTES + 1 });
    choose('add', big);
    expect(element('add-image-status', HTMLElement).textContent).toBe(
      'The image is larger than 10 MB.',
    );

    await field.apply('add', 'inv', 'Milk');
    expect(services.uploadItemImage).not.toHaveBeenCalled();
  });

  it('previews a chosen photo and uploads it once the new item exists', async () => {
    field.open('add', {});
    const file = photoFile();

    choose('add', file);

    expect(root.querySelector('#add-image-preview img')?.getAttribute('src')).toBe('blob:test/1');
    expect(element('add-image-remove', HTMLButtonElement).hidden).toBe(false);

    await field.apply('add', 'inv', 'Milk');

    expect(services.getItem).toHaveBeenCalledWith('inv', 'Milk');
    expect(services.uploadItemImage).toHaveBeenCalledWith('new-id', file);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/1');
  });

  it("uploads to the edited item's id without looking it up", async () => {
    field.open('edit', {}, milk);
    const file = photoFile();
    choose('edit', file);

    await field.apply('edit', 'inv', 'Milk');

    expect(services.getItem).not.toHaveBeenCalled();
    expect(services.uploadItemImage).toHaveBeenCalledWith('milk-id', file);
  });

  it('keeps the item and toasts the reason when the upload is refused', async () => {
    const messages = notifications();
    services.uploadItemImage.mockResolvedValueOnce({
      success: false,
      error: 'HTTP 413',
      errorCode: 'image_too_large',
    });
    field.open('edit', {}, milk);
    choose('edit', photoFile());

    await field.apply('edit', 'inv', 'Milk');

    expect(messages).toEqual([
      'Milk was saved, but its image was not: The image is larger than 10 MB.',
    ]);
  });

  it('toasts when the new item cannot be found for the upload', async () => {
    const messages = notifications();
    services.getItem.mockResolvedValueOnce(null);
    field.open('add', {});
    choose('add', photoFile());

    await field.apply('add', 'inv', 'Milk');

    expect(services.uploadItemImage).not.toHaveBeenCalled();
    expect(messages).toEqual(['Milk was saved, but its image was not: The item no longer exists.']);
  });

  it('stages removal of the saved image and deletes it on save', async () => {
    field.open('edit', {}, milk);

    element('edit-image-remove', HTMLButtonElement).click();

    expect(root.querySelector('#edit-image-preview img')).toBeNull();
    expect(element('edit-image-remove', HTMLButtonElement).hidden).toBe(true);
    expect(element('edit-image-status', HTMLElement).textContent).toBe(
      'The image is removed when you save.',
    );
    await field.apply('edit', 'inv', 'Milk');
    expect(services.deleteItemImage).toHaveBeenCalledWith('milk-id');
  });

  it('drops a chosen photo on remove when there is no saved image', async () => {
    field.open('add', {});
    choose('add', photoFile());

    element('add-image-remove', HTMLButtonElement).click();

    expect(element('add-image-remove', HTMLButtonElement).hidden).toBe(true);
    await field.apply('add', 'inv', 'Milk');
    expect(services.uploadItemImage).not.toHaveBeenCalled();
    expect(services.deleteItemImage).not.toHaveBeenCalled();
  });

  function mediaPicker(): Element {
    const pickers = Array.from(root.children).filter(
      (child) =>
        child.localName === 'ha-selector-media' || child.localName === 'ha-media-item-picker',
    );
    const [picker] = pickers;
    if (pickers.length !== 1 || !picker) {
      throw new Error(`expected one media picker, found ${pickers.length}`);
    }
    return picker;
  }

  function pick(picker: Element, mediaContentId: string): void {
    picker.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: { media_content_id: mediaContentId, media_content_type: 'image/jpeg' } },
      }),
    );
  }

  it("shows the Media button when HA's media selector can open its browser", () => {
    field.open('edit', {}, milk);

    expect(element('edit-image-media', HTMLButtonElement).hidden).toBe(false);
  });

  it('hides the Media button when the frontend has neither ha-selector-media nor ha-selector', () => {
    vi.mocked(customElements.get).mockReturnValue(undefined);

    field.open('edit', {}, milk);

    expect(element('edit-image-media', HTMLButtonElement).hidden).toBe(true);
    expect(root.querySelector('ha-selector')).toBeNull();
  });

  it("loads HA's media selector through a hidden image ha-selector, then shows Media", async () => {
    class FakeSelector extends HTMLElement {}
    let mediaDefined = false;
    vi.mocked(customElements.get).mockImplementation((name: string) => {
      if (name === 'ha-selector') return FakeSelector;
      return name === 'ha-selector-media' && mediaDefined ? FakeMediaSelector : undefined;
    });
    let define: (element: CustomElementConstructor) => void = () => {};
    // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
    const defined = new Promise<CustomElementConstructor>((resolve) => {
      define = resolve;
    });
    const whenDefined = vi.spyOn(customElements, 'whenDefined').mockReturnValue(defined);

    field.open('add', {});
    field.open('edit', {}, milk);

    expect(element('edit-image-media', HTMLButtonElement).hidden).toBe(true);
    expect(whenDefined).toHaveBeenCalledWith('ha-selector-media');
    const loaders = root.querySelectorAll('ha-selector');
    expect(loaders).toHaveLength(1);
    const loader = loaders[0];
    expect(loader?.parentNode).toBe(root);
    expect(loader instanceof HTMLElement && loader.hidden).toBe(true);
    expect(loader).toHaveProperty('hass', hass);
    expect(loader).toHaveProperty('selector', { media: { accept: ['image/*'] } });

    mediaDefined = true;
    define(FakeMediaSelector);
    await Promise.resolve();

    expect(element('add-image-media', HTMLButtonElement).hidden).toBe(false);
    expect(element('edit-image-media', HTMLButtonElement).hidden).toBe(false);
    expect(loader?.isConnected).toBe(false);
  });

  it('hides the Media button when ha-selector-media has no _pickMedia', () => {
    class OtherSelector extends HTMLElement {}
    vi.mocked(customElements.get).mockReturnValue(OtherSelector);

    field.open('edit', {}, milk);

    expect(element('edit-image-media', HTMLButtonElement).hidden).toBe(true);
  });

  it('uses ha-media-item-picker (HA 2026.10+), where _pickMedia moved from ha-selector-media', async () => {
    class NewSelector extends HTMLElement {}
    vi.mocked(customElements.get).mockImplementation((name: string) => {
      if (name === 'ha-selector-media') return NewSelector;
      return name === 'ha-media-item-picker' ? FakeMediaSelector : undefined;
    });
    field.open('edit', {}, milk);
    expect(element('edit-image-media', HTMLButtonElement).hidden).toBe(false);

    element('edit-image-media', HTMLButtonElement).click();

    const picker = mediaPicker();
    expect(picker.localName).toBe('ha-media-item-picker');
    expect(picker).toHaveProperty('hass', hass);
    expect(picker).toHaveProperty('selector', { media: { accept: ['image/*'] } });
    expect(pickMedia).toHaveBeenCalledTimes(1);
    expect(pickMedia.mock.contexts[0]).toBe(picker);
    pick(picker, 'media-source://media_source/local/milk.jpg');
    await field.apply('edit', 'inv', 'Milk');
    expect(services.setItemImageFromMedia).toHaveBeenCalledWith(
      'inv',
      'Milk',
      'media-source://media_source/local/milk.jpg',
    );
  });

  it('shows Media once ha-media-item-picker is defined after a pick-less ha-selector-media', async () => {
    class FakeSelector extends HTMLElement {}
    class NewSelector extends HTMLElement {}
    const defined: Record<string, CustomElementConstructor | undefined> = {
      'ha-selector': FakeSelector,
    };
    vi.mocked(customElements.get).mockImplementation((name: string) => defined[name]);
    const resolvers: Record<string, (element: CustomElementConstructor) => void> = {};
    const whenDefined = vi.spyOn(customElements, 'whenDefined').mockImplementation(
      (name: string) =>
        // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
        new Promise<CustomElementConstructor>((resolve) => {
          resolvers[name] = resolve;
        }),
    );
    field.open('edit', {}, milk);
    expect(whenDefined).toHaveBeenCalledWith('ha-selector-media');
    expect(whenDefined).toHaveBeenCalledWith('ha-media-item-picker');
    const loader = root.querySelector('ha-selector');

    defined['ha-selector-media'] = NewSelector;
    resolvers['ha-selector-media']?.(NewSelector);
    await Promise.resolve();
    expect(element('edit-image-media', HTMLButtonElement).hidden).toBe(true);
    expect(loader?.isConnected).toBe(true);

    defined['ha-media-item-picker'] = FakeMediaSelector;
    resolvers['ha-media-item-picker']?.(FakeMediaSelector);
    await Promise.resolve();
    expect(element('edit-image-media', HTMLButtonElement).hidden).toBe(false);
    expect(loader?.isConnected).toBe(false);
  });

  it('keeps Media working after a full render replaced the shadow root', () => {
    field.open('edit', {}, milk);
    element('edit-image-media', HTMLButtonElement).click();

    // A full card render rebuilds the shadow root, detaching the hidden picker.
    root.innerHTML = itemImage('add', {}) + itemImage('edit', {});
    field.open('edit', {}, milk);
    element('edit-image-media', HTMLButtonElement).click();

    const picker = mediaPicker();
    expect(picker.isConnected).toBe(true);
    expect(pickMedia).toHaveBeenCalledTimes(2);
    expect(pickMedia.mock.contexts[1]).toBe(picker);
    pick(picker, 'media-source://media_source/local/milk.jpg');
    expect(element('edit-image-status', HTMLElement).textContent).toBe(
      'The image from media is saved when you save.',
    );
  });

  it("opens HA's media browser from a hidden image selector in the card's shadow root", () => {
    field.open('edit', {}, milk);

    element('edit-image-media', HTMLButtonElement).click();
    element('edit-image-media', HTMLButtonElement).click();

    const picker = mediaPicker();
    expect(picker.parentNode).toBe(root);
    expect(picker instanceof HTMLElement && picker.hidden).toBe(true);
    expect(picker).toHaveProperty('hass', hass);
    expect(picker).toHaveProperty('selector', { media: { accept: ['image/*'] } });
    expect(picker).toHaveProperty('value', undefined);
    expect(pickMedia).toHaveBeenCalledTimes(2);
    expect(pickMedia.mock.contexts[0]).toBe(picker);
  });

  it('stages a picked media image and copies it on save', async () => {
    field.open('edit', {}, milk);
    element('edit-image-media', HTMLButtonElement).click();

    pick(mediaPicker(), 'media-source://media_source/local/milk.jpg');

    expect(root.querySelector('#edit-image-preview ha-icon')?.getAttribute('icon')).toBe(
      'mdi:image-check-outline',
    );
    expect(element('edit-image-remove', HTMLButtonElement).hidden).toBe(false);
    expect(element('edit-image-status', HTMLElement).textContent).toBe(
      'The image from media is saved when you save.',
    );
    await field.apply('edit', 'inv', 'Milk');
    expect(services.setItemImageFromMedia).toHaveBeenCalledWith(
      'inv',
      'Milk',
      'media-source://media_source/local/milk.jpg',
    );
  });

  it('stages the pick for the sheet whose Media button opened the browser', async () => {
    field.open('add', {});
    field.open('edit', {}, milk);
    element('edit-image-media', HTMLButtonElement).click();
    element('add-image-media', HTMLButtonElement).click();

    pick(mediaPicker(), 'media-source://media_source/local/oats.jpg');

    await field.apply('edit', 'inv', 'Milk');
    expect(services.setItemImageFromMedia).not.toHaveBeenCalled();
    await field.apply('add', 'inv', 'Oats');
    expect(services.setItemImageFromMedia).toHaveBeenCalledWith(
      'inv',
      'Oats',
      'media-source://media_source/local/oats.jpg',
    );
  });

  it('replaces a media pick with a photo chosen afterwards', async () => {
    field.open('edit', {}, milk);
    element('edit-image-media', HTMLButtonElement).click();
    pick(mediaPicker(), 'media-source://media_source/local/milk.jpg');

    choose('edit', photoFile());

    await field.apply('edit', 'inv', 'Milk');
    expect(services.setItemImageFromMedia).not.toHaveBeenCalled();
    expect(services.uploadItemImage).toHaveBeenCalled();
  });

  it('ignores a cleared or non-media value', async () => {
    field.open('edit', {}, milk);
    element('edit-image-media', HTMLButtonElement).click();

    mediaPicker().dispatchEvent(new CustomEvent('value-changed', { detail: { value: undefined } }));
    pick(mediaPicker(), 'https://example.com/milk.jpg');

    await field.apply('edit', 'inv', 'Milk');
    expect(services.setItemImageFromMedia).not.toHaveBeenCalled();
  });

  it('says a chosen photo is saved on save', () => {
    field.open('add', {});

    choose('add', photoFile());

    expect(element('add-image-status', HTMLElement).textContent).toBe(
      'The new photo is saved when you save.',
    );
  });

  it('says the product photo is saved on save while its offer is ticked', () => {
    field.open('add', {});
    expect(element('add-image-status', HTMLElement).textContent).toBe('');

    field.offerProductPhoto('4006', 'https://images.example/milk.jpg');
    expect(element('add-image-status', HTMLElement).textContent).toBe(
      'The product photo is saved when you save.',
    );

    const use = element('add-image-offer-use', HTMLInputElement);
    use.checked = false;
    use.dispatchEvent(new Event('change'));
    expect(element('add-image-status', HTMLElement).textContent).toBe('');
  });

  it("offers the product photo, checked, and sets it from the item's barcode on save", async () => {
    field.open('add', {});

    field.offerProductPhoto('4006', 'https://images.example/milk.jpg');

    expect(element('add-image-offer', HTMLElement).hidden).toBe(false);
    expect(element('add-image-offer-preview', HTMLImageElement).src).toBe(
      'https://images.example/milk.jpg',
    );
    await field.apply('add', 'inv', 'Milk');
    expect(services.setItemImageFromBarcode).toHaveBeenCalledWith('inv', 'Milk', '4006');
    expect(element('add-image-offer', HTMLElement).hidden).toBe(true);
  });

  it('does not use the product photo when the offer is unchecked', async () => {
    field.open('add', {});
    field.offerProductPhoto('4006', 'https://images.example/milk.jpg');

    element('add-image-offer-use', HTMLInputElement).checked = false;
    await field.apply('add', 'inv', 'Milk');

    expect(services.setItemImageFromBarcode).not.toHaveBeenCalled();
  });

  it('drops the offer when its barcode was removed from the item', async () => {
    field.open('add', {});
    field.offerProductPhoto('4006', 'https://images.example/milk.jpg');

    element('add-barcode', HTMLInputElement).value = '5000, 6000';
    await field.apply('add', 'inv', 'Milk');

    expect(services.setItemImageFromBarcode).not.toHaveBeenCalled();
    expect(element('add-image-offer', HTMLElement).hidden).toBe(true);
  });

  it('uses the offer when its barcode is one of several', async () => {
    field.open('add', {});
    field.offerProductPhoto('4006', 'https://images.example/milk.jpg');

    element('add-barcode', HTMLInputElement).value = '5000, 4006';
    await field.apply('add', 'inv', 'Milk');

    expect(services.setItemImageFromBarcode).toHaveBeenCalledWith('inv', 'Milk', '4006');
  });

  it('keeps an unticked offer unticked when a later lookup finds a photo', async () => {
    field.open('add', {});
    field.offerProductPhoto('4006', 'https://images.example/milk.jpg');
    element('add-image-offer-use', HTMLInputElement).checked = false;

    element('add-barcode', HTMLInputElement).value = '4006, 5000';
    field.offerProductPhoto('5000', 'https://images.example/cream.jpg');

    expect(element('add-image-offer-use', HTMLInputElement).checked).toBe(false);
    expect(element('add-image-offer-preview', HTMLImageElement).src).toBe(
      'https://images.example/cream.jpg',
    );
    await field.apply('add', 'inv', 'Milk');
    expect(services.setItemImageFromBarcode).not.toHaveBeenCalled();
  });

  it('shows no offer for non-web image URLs', () => {
    field.open('add', {});

    field.offerProductPhoto('4006', 'javascript:alert(1)');

    expect(element('add-image-offer', HTMLElement).hidden).toBe(true);
  });

  it('previews an http product photo over https (HA pages are https: no mixed content)', () => {
    field.open('add', {});

    field.offerProductPhoto('4006', 'http://images.example/milk.jpg');

    expect(element('add-image-offer', HTMLElement).hidden).toBe(false);
    expect(element('add-image-offer-preview', HTMLImageElement).src).toBe(
      'https://images.example/milk.jpg',
    );
  });

  it('hides only the thumbnail when the preview fails; the offer is still saved', async () => {
    field.open('add', {});
    field.offerProductPhoto('4006', 'http://images.example/milk.jpg');
    const preview = element('add-image-offer-preview', HTMLImageElement);

    preview.dispatchEvent(new Event('error'));

    expect(preview.hidden).toBe(true);
    expect(element('add-image-offer', HTMLElement).hidden).toBe(false);
    expect(element('add-image-offer-use', HTMLInputElement).checked).toBe(true);
    await field.apply('add', 'inv', 'Milk');
    expect(services.setItemImageFromBarcode).toHaveBeenCalledWith('inv', 'Milk', '4006');
  });

  it('shows the thumbnail again for the next product photo', () => {
    field.open('add', {});
    field.offerProductPhoto('4006', 'https://images.example/milk.jpg');
    element('add-image-offer-preview', HTMLImageElement).dispatchEvent(new Event('error'));

    field.offerProductPhoto('4006', 'https://images.example/cream.jpg');

    expect(element('add-image-offer-preview', HTMLImageElement).hidden).toBe(false);
  });

  it("lets the user's own photo replace the offer", async () => {
    field.open('add', {});
    field.offerProductPhoto('4006', 'https://images.example/milk.jpg');

    choose('add', photoFile());
    field.offerProductPhoto('4006', 'https://images.example/milk.jpg');

    expect(element('add-image-offer', HTMLElement).hidden).toBe(true);
    await field.apply('add', 'inv', 'Milk');
    expect(services.setItemImageFromBarcode).not.toHaveBeenCalled();
    expect(services.uploadItemImage).toHaveBeenCalled();
  });

  it('forgets a staged photo when the sheet opens again', async () => {
    field.open('add', {});
    choose('add', photoFile());

    field.open('add', {});

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/1');
    expect(root.querySelector('#add-image-preview img')).toBeNull();
    await field.apply('add', 'inv', 'Milk');
    expect(services.uploadItemImage).not.toHaveBeenCalled();
  });
});
