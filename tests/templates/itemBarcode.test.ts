import { describe, it, expect, vi, beforeEach } from 'vitest';

import { itemBarcode } from '../../src/templates/modalPartials/itemBarcode';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

vi.mock('../../src/utils/constants', () => ({
  ELEMENTS: {
    BARCODE: 'barcode',
    BARCODE_SCANNER_CLOSE: 'barcode-scanner-close',
    BARCODE_PHOTO: 'barcode-photo',
    BARCODE_PHOTO_MESSAGE: 'barcode-photo-message',
    BARCODE_PHOTO_BTN: 'barcode-photo-btn',
  },
}));

describe('itemBarcode', () => {
  let mockTranslations: TranslationData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTranslations = {
      modal: {
        barcode: 'Barcode',
        barcode_input_placeholder: 'Type barcode and press Enter',
      },
    };
  });

  it('should render the barcode label', () => {
    const result = itemBarcode('add', mockTranslations);
    expect(result).toContain('Barcode');
    expect(result).toContain('class="form-label"');
  });

  it('should render the hidden input with correct id', () => {
    const result = itemBarcode('add', mockTranslations);
    expect(result).toContain('type="hidden"');
    expect(result).toContain('id="add-barcode"');
  });

  it('should render the visible input with correct id', () => {
    const result = itemBarcode('add', mockTranslations);
    expect(result).toContain('id="add-barcode-input"');
    expect(result).toContain('Type barcode and press Enter');
  });

  it('should render the chips container', () => {
    const result = itemBarcode('add', mockTranslations);
    expect(result).toContain('id="add-barcode-chips"');
    expect(result).toContain('class="barcode-chips"');
  });

  it('should render the tag container', () => {
    const result = itemBarcode('add', mockTranslations);
    expect(result).toContain('class="barcode-tag-container"');
  });

  it('should use the correct prefix for edit modal', () => {
    const result = itemBarcode('edit', mockTranslations);
    expect(result).toContain('id="edit-barcode"');
    expect(result).toContain('id="edit-barcode-input"');
    expect(result).toContain('id="edit-barcode-chips"');
  });

  it('closes the camera with a round icon button labelled like the header scan panel', () => {
    const host = document.createElement('div');
    host.innerHTML = itemBarcode('add', mockTranslations);
    const close = host.querySelector('#add-barcode-scanner-close');

    expect(close?.classList.contains('si-icon-btn')).toBe(true);
    expect(close?.classList.contains('barcode-scanner-close')).toBe(true);
    expect(close?.getAttribute('aria-label')).toBe('Close Scanner');
    expect(close?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:close');
  });

  it('offers a hidden "Choose a photo" with a message, for when the camera cannot be used', () => {
    const container = document.createElement('div');
    container.innerHTML = itemBarcode('edit', mockTranslations);
    const photo = container.querySelector<HTMLElement>('#edit-barcode-photo');

    expect(photo?.hidden).toBe(true);
    expect(photo?.querySelector('#edit-barcode-photo-message')).not.toBeNull();
    const choose = photo?.querySelector('#edit-barcode-photo-btn');
    expect(choose?.getAttribute('type')).toBe('button');
    expect(choose?.textContent).toContain('Choose a photo');
  });
});
