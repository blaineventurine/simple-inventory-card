import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  initializeBarcodeTagInput,
  stopAllBarcodeScanners,
} from '../../src/services/barcodeTagInput';

// quagga2 is globally mocked in tests/setup.ts

vi.mock('../../src/utils/constants', () => ({
  ELEMENTS: {
    BARCODE: 'barcode',
    BARCODE_SCAN_BTN: 'barcode-scan-btn',
    BARCODE_SCANNER: 'barcode-scanner',
    BARCODE_VIEWPORT: 'barcode-viewport',
    BARCODE_SCANNER_CLOSE: 'barcode-scanner-close',
  },
}));

function createMockShadowRoot(prefix: string, initialValue = ''): ShadowRoot {
  const container = document.createElement('div');

  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.id = `${prefix}-barcode`;
  hiddenInput.value = initialValue;
  container.appendChild(hiddenInput);

  const visibleInput = document.createElement('input');
  visibleInput.type = 'text';
  visibleInput.id = `${prefix}-barcode-input`;
  container.appendChild(visibleInput);

  const chipsContainer = document.createElement('div');
  chipsContainer.id = `${prefix}-barcode-chips`;
  container.appendChild(chipsContainer);

  // ShadowRoot has getElementById — delegate to querySelector
  (container as any).getElementById = (id: string) => container.querySelector(`#${id}`);

  return container as unknown as ShadowRoot;
}

describe('barcodeTagInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do nothing if elements are missing', () => {
    const root = document.createElement('div');
    (root as any).getElementById = () => null;
    expect(() => initializeBarcodeTagInput(root as unknown as ShadowRoot, 'add')).not.toThrow();
  });

  it('should render initial chips from hidden input value', () => {
    const root = createMockShadowRoot('add', 'ABC123, DEF456');
    initializeBarcodeTagInput(root, 'add');

    const chips = (root as unknown as HTMLElement).querySelector('#add-barcode-chips')!;
    const chipElements = chips.querySelectorAll('.barcode-chip');
    expect(chipElements).toHaveLength(2);
    expect(chipElements[0].textContent).toContain('ABC123');
    expect(chipElements[1].textContent).toContain('DEF456');
  });

  it('should add barcode chip on Enter', () => {
    const root = createMockShadowRoot('add');
    initializeBarcodeTagInput(root, 'add');

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode',
    ) as HTMLInputElement;

    visibleInput.value = '12345';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(hiddenInput.value).toBe('12345');
    expect(visibleInput.value).toBe('');

    const chips = (root as unknown as HTMLElement).querySelector('#add-barcode-chips')!;
    expect(chips.querySelectorAll('.barcode-chip')).toHaveLength(1);
  });

  it('should prevent duplicate barcodes', () => {
    const root = createMockShadowRoot('add', 'ABC123');
    initializeBarcodeTagInput(root, 'add');

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode',
    ) as HTMLInputElement;

    visibleInput.value = 'ABC123';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(hiddenInput.value).toBe('ABC123');
    const chips = (root as unknown as HTMLElement).querySelector('#add-barcode-chips')!;
    expect(chips.querySelectorAll('.barcode-chip')).toHaveLength(1);
  });

  it('should ignore empty input on Enter', () => {
    const root = createMockShadowRoot('add');
    initializeBarcodeTagInput(root, 'add');

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode',
    ) as HTMLInputElement;

    visibleInput.value = '   ';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(hiddenInput.value).toBe('');
  });

  it('should remove chip when remove button clicked', () => {
    const root = createMockShadowRoot('add', 'ABC, DEF');
    initializeBarcodeTagInput(root, 'add');

    const chips = (root as unknown as HTMLElement).querySelector('#add-barcode-chips')!;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode',
    ) as HTMLInputElement;

    // Click remove on first chip
    const removeBtn = chips.querySelector('.barcode-chip-remove') as HTMLElement;
    removeBtn.click();

    expect(hiddenInput.value).toBe('DEF');
    expect(chips.querySelectorAll('.barcode-chip')).toHaveLength(1);
  });

  it('should call onBarcodeAdded callback when a new barcode is added', () => {
    const root = createMockShadowRoot('add');
    const callback = vi.fn();
    initializeBarcodeTagInput(root, 'add', callback);

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode-input',
    ) as HTMLInputElement;

    visibleInput.value = '12345';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(callback).toHaveBeenCalledWith('12345');
  });

  it('should not call onBarcodeAdded callback for duplicate barcodes', () => {
    const root = createMockShadowRoot('add', 'ABC123');
    const callback = vi.fn();
    initializeBarcodeTagInput(root, 'add', callback);

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode-input',
    ) as HTMLInputElement;

    visibleInput.value = 'ABC123';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(callback).not.toHaveBeenCalled();
  });

  it('should not react to non-Enter keys', () => {
    const root = createMockShadowRoot('add');
    initializeBarcodeTagInput(root, 'add');

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode',
    ) as HTMLInputElement;

    visibleInput.value = '12345';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    expect(hiddenInput.value).toBe('');
  });

  it('should render scan button in DOM after initialization', () => {
    const root = createMockShadowRoot('add');
    // Add scanner elements to mock DOM
    const container = root as unknown as HTMLElement;
    const scanBtn = document.createElement('button');
    scanBtn.id = 'add-barcode-scan-btn';
    container.appendChild(scanBtn);
    const scannerContainer = document.createElement('div');
    scannerContainer.id = 'add-barcode-scanner';
    container.appendChild(scannerContainer);
    const viewport = document.createElement('div');
    viewport.id = 'add-barcode-viewport';
    container.appendChild(viewport);
    const closeBtn = document.createElement('button');
    closeBtn.id = 'add-barcode-scanner-close';
    container.appendChild(closeBtn);

    initializeBarcodeTagInput(root, 'add');

    expect(container.querySelector('#add-barcode-scan-btn')).toBeTruthy();
  });

  it('should allow stopAllBarcodeScanners to be called without error when no scanner is active', () => {
    expect(() => stopAllBarcodeScanners()).not.toThrow();
  });
});
