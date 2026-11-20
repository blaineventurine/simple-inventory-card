import { describe, it, expect, vi } from 'vitest';

import { initializeIconField } from '../../src/services/iconFieldInput';
import { itemIcon } from '../../src/templates/modalPartials/itemIcon';
import { DEFAULT_ITEM_ICON } from '../../src/utils/itemStatus';

function renderIconField(prefix: string, markup = itemIcon(prefix, {})): ShadowRoot {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = markup;
  return root;
}

function getInput(root: ShadowRoot, prefix: string): HTMLInputElement {
  const input = root.getElementById(`${prefix}-icon`);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('icon input missing');
  }
  return input;
}

function previewIcon(root: ShadowRoot, prefix: string): string | null | undefined {
  return root
    .getElementById(`${prefix}-icon-preview`)
    ?.querySelector('ha-icon')
    ?.getAttribute('icon');
}

function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('initializeIconField', () => {
  it('previews the typed icon and falls back to the default when cleared', () => {
    const root = renderIconField('add');
    initializeIconField(root, 'add');
    const input = getInput(root, 'add');

    typeInto(input, ' mdi:apple ');
    expect(previewIcon(root, 'add')).toBe('mdi:apple');

    typeInto(input, '');
    expect(previewIcon(root, 'add')).toBe(DEFAULT_ITEM_ICON);
  });

  it('shows the value already in the field (populated edit sheet)', () => {
    const root = renderIconField('edit');
    getInput(root, 'edit').value = 'mdi:fridge';

    initializeIconField(root, 'edit');

    expect(previewIcon(root, 'edit')).toBe('mdi:fridge');
  });

  it('binds the input listener once across repeated opens', () => {
    const root = renderIconField('add');
    const input = getInput(root, 'add');
    const addListener = vi.spyOn(input, 'addEventListener');

    initializeIconField(root, 'add');
    initializeIconField(root, 'add');

    expect(addListener).toHaveBeenCalledTimes(1);
  });

  it('does nothing without the field or for the icon picker', () => {
    expect(() => initializeIconField(renderIconField('add', ''), 'add')).not.toThrow();

    const pickerRoot = renderIconField('add', '<ha-icon-picker id="add-icon"></ha-icon-picker>');
    initializeIconField(pickerRoot, 'add');

    expect(pickerRoot.getElementById('add-icon')?.hasAttribute('data-listeners-bound')).toBe(false);
  });
});
