import { describe, it, expect } from 'vitest';

import { imageFieldIds, itemImage } from '../../src/templates/modalPartials/itemImage';
import { createAddModal, createEditModal } from '../../src/templates/modalTemplates';
import { TranslationData } from '@/types/translatableComponent';

const translations: TranslationData = {
  image: {
    label: 'Image',
    choose: 'Photo',
    media: 'Media',
    remove: 'Remove image',
    use_product_photo: 'Use product photo',
  },
};

function render(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('itemImage', () => {
  it('names its controls after the sheet prefix', () => {
    expect(imageFieldIds('edit')).toEqual({
      field: 'edit-image',
      preview: 'edit-image-preview',
      file: 'edit-image-file',
      choose: 'edit-image-choose',
      remove: 'edit-image-remove',
      media: 'edit-image-media',
      status: 'edit-image-status',
      offer: 'edit-image-offer',
      offerUse: 'edit-image-offer-use',
      offerPreview: 'edit-image-offer-preview',
    });
  });

  it('renders a labelled group with a preview and a hidden file input', () => {
    const host = render(itemImage('edit', translations));
    const group = host.querySelector('#edit-image');

    expect(group?.getAttribute('role')).toBe('group');
    expect(host.querySelector(`#${group?.getAttribute('aria-labelledby')}`)?.textContent).toBe(
      'Image',
    );
    expect(
      host.querySelector('#edit-image-preview .si-icon-circle ha-icon')?.getAttribute('icon'),
    ).toBe('mdi:image-outline');
    const file = host.querySelector('#edit-image-file');
    expect(file?.getAttribute('type')).toBe('file');
    expect(file?.getAttribute('accept')).toBe('image/*');
    expect(file?.hasAttribute('hidden')).toBe(true);
    expect(host.querySelector('#edit-image-status')?.getAttribute('role')).toBe('status');
  });

  it('keeps the preview visible to assistive tech: a photo in it opens the viewer', () => {
    const host = render(itemImage('edit', translations));

    expect(host.querySelector('#edit-image-preview')?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('puts preview, Photo, Media and Remove in one row, in that order', () => {
    const host = render(itemImage('edit', translations));
    const row = host.querySelector('.si-image-field__row');

    const order = Array.from(row?.querySelectorAll('[id]') ?? [], (el) => el.id).filter(
      (id) => id !== 'edit-image-file',
    );
    expect(order).toEqual([
      'edit-image-preview',
      'edit-image-choose',
      'edit-image-media',
      'edit-image-remove',
    ]);
  });

  it('has tonal Photo and Media buttons; Media is hidden until HA has its media picker', () => {
    const host = render(itemImage('edit', translations));

    const choose = host.querySelector('#edit-image-choose');
    expect(choose?.tagName).toBe('BUTTON');
    expect(choose?.classList.contains('si-tonal-btn')).toBe(true);
    expect(choose?.textContent).toBe('Photo');
    expect(choose?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:camera');

    const media = host.querySelector('#edit-image-media');
    expect(media?.tagName).toBe('BUTTON');
    expect(media?.classList.contains('si-tonal-btn')).toBe(true);
    expect(media?.textContent).toBe('Media');
    expect(media?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:folder-image');
    expect(media?.hasAttribute('hidden')).toBe(true);
    expect(media?.children).toHaveLength(1);
  });

  it('has a hidden Remove icon button in the error tone, labelled for screen readers', () => {
    const remove = render(itemImage('edit', translations)).querySelector('#edit-image-remove');

    expect(remove?.tagName).toBe('BUTTON');
    expect(remove?.classList.contains('si-icon-btn')).toBe(true);
    expect(remove?.classList.contains('si-tone-error')).toBe(true);
    expect(remove?.getAttribute('aria-label')).toBe('Remove image');
    expect(remove?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:delete');
    expect(remove?.hasAttribute('hidden')).toBe(true);
  });

  it('shows the status line under the row, then the offer', () => {
    const add = render(itemImage('add', translations));

    expect(add.querySelector('.si-image-field__row')?.nextElementSibling?.id).toBe(
      'add-image-status',
    );
    expect(add.querySelector('#add-image-status')?.nextElementSibling?.id).toBe('add-image-offer');
  });

  it('has the hidden product photo offer, checked, in the add sheet only', () => {
    const add = render(itemImage('add', translations));
    const offer = add.querySelector('#add-image-offer');

    expect(offer?.hasAttribute('hidden')).toBe(true);
    expect(offer?.textContent?.trim()).toBe('Use product photo');
    const use = add.querySelector('#add-image-offer-use');
    expect(use instanceof HTMLInputElement && use.checked).toBe(true);
    expect(add.querySelector('#add-image-offer-preview')?.getAttribute('referrerpolicy')).toBe(
      'no-referrer',
    );
    expect(render(itemImage('edit', translations)).querySelector('#edit-image-offer')).toBeNull();
  });

  it('is part of the item sheets, under the icon, only with item_images', () => {
    const add = render(createAddModal([], translations, [], [], false, true, true));
    const edit = render(createEditModal([], translations, [], [], false, false, true));

    expect(add.querySelector('#add-icon')?.closest('.si-field')?.nextElementSibling?.id).toBe(
      'add-image',
    );
    expect(edit.querySelector('#edit-image')).not.toBeNull();
    expect(
      render(createAddModal([], translations, [], [], false, true)).querySelector('#add-image'),
    ).toBeNull();
  });
});
