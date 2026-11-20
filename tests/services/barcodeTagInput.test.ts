import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  closeBarcodeScanner,
  initializeBarcodeTagInput,
  resumeBarcodeScanner,
  stopAllBarcodeScanners,
} from '../../src/services/barcodeTagInput';
import {
  scanSupport,
  chooseBarcodePhoto,
  startScanner,
  nativeScanner,
  startNativeScanner,
  NativeScanHandlers,
} from '../../src/services/barcodeScanner';
import { createMockHomeAssistant, must } from '../testHelpers';

// quagga2 is globally mocked in tests/setup.ts

vi.mock('../../src/services/barcodeScanner', () => ({
  startScanner: vi.fn().mockResolvedValue(null),
  stopScanner: vi.fn(),
  isScannerActive: vi.fn().mockReturnValue(false),
  scanSupport: vi.fn().mockReturnValue('live'),
  chooseBarcodePhoto: vi.fn().mockResolvedValue(null),
  nativeScanner: vi.fn(),
  startNativeScanner: vi.fn(),
}));

vi.mock('../../src/utils/constants', () => ({
  ELEMENTS: {
    BARCODE: 'barcode',
    BARCODE_SCAN_BTN: 'barcode-scan-btn',
    BARCODE_SCANNER: 'barcode-scanner',
    BARCODE_VIEWPORT: 'barcode-viewport',
    BARCODE_SCANNER_CLOSE: 'barcode-scanner-close',
    BARCODE_PHOTO: 'barcode-photo',
    BARCODE_PHOTO_MESSAGE: 'barcode-photo-message',
    BARCODE_PHOTO_BTN: 'barcode-photo-btn',
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

function createRootWithScanner(prefix: string): ShadowRoot {
  const root = createMockShadowRoot(prefix);
  const container = root as unknown as HTMLElement;
  const scanBtn = document.createElement('button');
  scanBtn.id = `${prefix}-barcode-scan-btn`;
  container.appendChild(scanBtn);
  const scannerContainer = document.createElement('div');
  scannerContainer.id = `${prefix}-barcode-scanner`;
  container.appendChild(scannerContainer);
  const viewport = document.createElement('div');
  viewport.id = `${prefix}-barcode-viewport`;
  container.appendChild(viewport);
  const closeBtn = document.createElement('button');
  closeBtn.id = `${prefix}-barcode-scanner-close`;
  const photo = document.createElement('div');
  photo.id = `${prefix}-barcode-photo`;
  photo.hidden = true;
  container.appendChild(photo);
  const photoMessage = document.createElement('span');
  photoMessage.id = `${prefix}-barcode-photo-message`;
  photo.appendChild(photoMessage);
  const photoBtn = document.createElement('button');
  photoBtn.id = `${prefix}-barcode-photo-btn`;
  photo.appendChild(photoBtn);
  container.appendChild(closeBtn);
  return root;
}

describe('barcodeTagInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do nothing if elements are missing', () => {
    const root = document.createElement('div');
    (root as any).getElementById = () => null;
    expect(() => initializeBarcodeTagInput(root as unknown as ShadowRoot, 'add', {})).not.toThrow();
  });

  it('should render initial chips from hidden input value', () => {
    const root = createMockShadowRoot('add', 'ABC123, DEF456');
    initializeBarcodeTagInput(root, 'add', {});

    const chips = must((root as unknown as HTMLElement).querySelector('#add-barcode-chips'));
    const chipElements = chips.querySelectorAll('.barcode-chip');
    expect(chipElements).toHaveLength(2);
    expect(chipElements[0].textContent).toContain('ABC123');
    expect(chipElements[1].textContent).toContain('DEF456');
  });

  it('should add barcode chip on Enter', () => {
    const root = createMockShadowRoot('add');
    initializeBarcodeTagInput(root, 'add', {});

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

    const chips = must((root as unknown as HTMLElement).querySelector('#add-barcode-chips'));
    expect(chips.querySelectorAll('.barcode-chip')).toHaveLength(1);
  });

  it('should prevent duplicate barcodes', () => {
    const root = createMockShadowRoot('add', 'ABC123');
    initializeBarcodeTagInput(root, 'add', {});

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode',
    ) as HTMLInputElement;

    visibleInput.value = 'ABC123';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(hiddenInput.value).toBe('ABC123');
    const chips = must((root as unknown as HTMLElement).querySelector('#add-barcode-chips'));
    expect(chips.querySelectorAll('.barcode-chip')).toHaveLength(1);
  });

  it('should ignore empty input on Enter', () => {
    const root = createMockShadowRoot('add');
    initializeBarcodeTagInput(root, 'add', {});

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
    initializeBarcodeTagInput(root, 'add', {});

    const chips = must((root as unknown as HTMLElement).querySelector('#add-barcode-chips'));
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode',
    ) as HTMLInputElement;

    // Click remove on first chip
    const removeBtn = chips.querySelector('.barcode-chip-remove') as HTMLElement;
    removeBtn.click();

    expect(hiddenInput.value).toBe('DEF');
    expect(chips.querySelectorAll('.barcode-chip')).toHaveLength(1);
  });

  it('makes each remove × a labelled button that the keyboard can reach', () => {
    const root = createMockShadowRoot('add', 'ABC, DEF');
    document.body.appendChild(root as unknown as HTMLElement);
    initializeBarcodeTagInput(root, 'add', { modal: { remove_value: 'Entfernen {value}' } });

    const removeBtn = (root as unknown as HTMLElement).querySelector('.barcode-chip-remove');
    if (!(removeBtn instanceof HTMLButtonElement)) throw new Error('remove × is not a button');
    expect(removeBtn.type).toBe('button');
    expect(removeBtn.getAttribute('aria-label')).toBe('Entfernen ABC');
    removeBtn.focus();
    expect(document.activeElement).toBe(removeBtn);

    // Enter and Space on a native button fire click.
    removeBtn.click();
    expect(
      (root as unknown as HTMLElement).querySelector<HTMLInputElement>('#add-barcode')?.value,
    ).toBe('DEF');
    (root as unknown as HTMLElement).remove();
  });

  it('labels the remove × in English without translations', () => {
    const root = createMockShadowRoot('add', 'ABC');
    initializeBarcodeTagInput(root, 'add', {});

    expect(
      (root as unknown as HTMLElement)
        .querySelector('.barcode-chip-remove')
        ?.getAttribute('aria-label'),
    ).toBe('Remove ABC');
  });

  it('should call onBarcodeAdded callback when a new barcode is added', () => {
    const root = createMockShadowRoot('add');
    const callback = vi.fn();
    initializeBarcodeTagInput(root, 'add', {}, callback);

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
    initializeBarcodeTagInput(root, 'add', {}, callback);

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-barcode-input',
    ) as HTMLInputElement;

    visibleInput.value = 'ABC123';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(callback).not.toHaveBeenCalled();
  });

  it('should not react to non-Enter keys', () => {
    const root = createMockShadowRoot('add');
    initializeBarcodeTagInput(root, 'add', {});

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

    initializeBarcodeTagInput(root, 'add', {});

    expect(container.querySelector('#add-barcode-scan-btn')).toBeTruthy();
  });

  it('should allow stopAllBarcodeScanners to be called without error when no scanner is active', () => {
    expect(() => stopAllBarcodeScanners()).not.toThrow();
  });

  describe('duplicate initialization safety (modal reopen)', () => {
    it('registers the Enter keydown handler only once across repeated initializations, so dispatching Enter fires it exactly once', () => {
      const root = createMockShadowRoot('add');
      const visibleInput = (root as unknown as HTMLElement).querySelector(
        '#add-barcode-input',
      ) as HTMLInputElement;
      const addEventListenerSpy = vi.spyOn(visibleInput, 'addEventListener');

      initializeBarcodeTagInput(root, 'add', {});
      initializeBarcodeTagInput(root, 'add', {}); // simulate modal reopen

      const keydownRegistrations = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'keydown',
      );
      expect(keydownRegistrations).toHaveLength(1);

      // A single dispatch therefore invokes the surviving handler exactly once.
      visibleInput.value = '12345';
      visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      const hiddenInput = (root as unknown as HTMLElement).querySelector(
        '#add-barcode',
      ) as HTMLInputElement;
      expect(hiddenInput.value).toBe('12345');
    });

    it('registers the scan button click handler only once across repeated initializations', () => {
      const root = createRootWithScanner('add');
      const scanBtn = must(root.getElementById('add-barcode-scan-btn'));
      const closeBtn = must(root.getElementById('add-barcode-scanner-close'));

      const scanBtnSpy = vi.spyOn(scanBtn, 'addEventListener');
      const closeBtnSpy = vi.spyOn(closeBtn, 'addEventListener');

      initializeBarcodeTagInput(root, 'add', {});
      initializeBarcodeTagInput(root, 'add', {}); // simulate modal reopen

      expect(scanBtnSpy.mock.calls.filter((call) => call[0] === 'click')).toHaveLength(1);
      expect(closeBtnSpy.mock.calls.filter((call) => call[0] === 'click')).toHaveLength(1);

      scanBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(startScanner).toHaveBeenCalledTimes(1);
    });

    it('still renders freshly populated chips on a second call (e.g. editing a different item)', () => {
      const root = createMockShadowRoot('edit', 'FIRST123');
      initializeBarcodeTagInput(root, 'edit', {});

      const hiddenInput = (root as unknown as HTMLElement).querySelector(
        '#edit-barcode',
      ) as HTMLInputElement;
      const chips = must((root as unknown as HTMLElement).querySelector('#edit-barcode-chips'));

      // Simulate populateEditModal writing a different item's barcodes before reopening.
      hiddenInput.value = 'SECOND456';
      initializeBarcodeTagInput(root, 'edit', {});

      const chipElements = chips.querySelectorAll('.barcode-chip');
      expect(chipElements).toHaveLength(1);
      expect(chipElements[0].textContent).toContain('SECOND456');
    });

    it('marks the visible input as bound after the first call', () => {
      const root = createMockShadowRoot('add');
      initializeBarcodeTagInput(root, 'add', {});

      const visibleInput = (root as unknown as HTMLElement).querySelector(
        '#add-barcode-input',
      ) as HTMLInputElement;
      expect(visibleInput.hasAttribute('data-listeners-bound')).toBe(true);
    });
  });
});

describe('barcodeTagInput photo fallback (no live scanning)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scanSupport).mockReturnValue('photo');
    vi.mocked(chooseBarcodePhoto).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.mocked(scanSupport).mockReturnValue('live');
  });

  it('opens the photo chooser when the scan button is clicked', () => {
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {});

    must(root.getElementById('add-barcode-scan-btn')).click();

    expect(chooseBarcodePhoto).toHaveBeenCalledOnce();
    expect(startScanner).not.toHaveBeenCalled();
  });

  it('adds a barcode chip for a decoded photo', () => {
    const root = createRootWithScanner('add');
    const callback = vi.fn();
    initializeBarcodeTagInput(root, 'add', {}, callback);

    must(root.getElementById('add-barcode-scan-btn')).click();
    vi.mocked(chooseBarcodePhoto).mock.calls[0]?.[0]('9780201379624');

    const hiddenInput = must(root.getElementById('add-barcode'));
    expect(hiddenInput instanceof HTMLInputElement && hiddenInput.value).toBe('9780201379624');
    expect(callback).toHaveBeenCalledWith('9780201379624');
  });

  it('shows an error when the photo has no barcode', async () => {
    vi.useFakeTimers();
    vi.mocked(chooseBarcodePhoto).mockResolvedValue('not_found');
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {});

    must(root.getElementById('add-barcode-scan-btn')).click();
    await vi.advanceTimersByTimeAsync(0);

    const container = root as unknown as HTMLElement;
    expect(container.querySelector('.barcode-scanner-error')?.textContent).toBe(
      'No barcode found in photo',
    );
    vi.useRealTimers();
  });
});

describe('barcodeTagInput when the camera cannot be used', () => {
  const photo = (root: ShadowRoot): HTMLElement => must(root.getElementById('add-barcode-photo'));
  const photoMessage = (root: ShadowRoot): string =>
    root.getElementById('add-barcode-photo-message')?.textContent ?? '';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(scanSupport).mockReturnValue('live');
    vi.mocked(chooseBarcodePhoto).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.mocked(startScanner).mockResolvedValue(null);
    vi.mocked(scanSupport).mockReturnValue('live');
    vi.useRealTimers();
  });

  it('keeps the camera error and offers "Choose a photo" when the camera does not start', async () => {
    vi.mocked(startScanner).mockResolvedValue('permission_denied');
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {});

    must(root.getElementById('add-barcode-scan-btn')).click();
    await vi.advanceTimersByTimeAsync(5000);

    expect(must(root.getElementById('add-barcode-scanner')).hidden).toBe(true);
    expect(photo(root).hidden).toBe(false);
    expect(photoMessage(root)).toBe('Camera access denied');
  });

  it('says the camera is not available for other camera errors', async () => {
    vi.mocked(startScanner).mockResolvedValue('not_available');
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {});

    must(root.getElementById('add-barcode-scan-btn')).click();
    await vi.advanceTimersByTimeAsync(0);

    expect(photoMessage(root)).toBe('Camera not available');
  });

  it('adds the barcode of the chosen photo and drops the offer', async () => {
    vi.mocked(startScanner).mockResolvedValue('permission_denied');
    const root = createRootWithScanner('add');
    const callback = vi.fn();
    initializeBarcodeTagInput(root, 'add', {}, callback);
    must(root.getElementById('add-barcode-scan-btn')).click();
    await vi.advanceTimersByTimeAsync(0);

    must(root.getElementById('add-barcode-photo-btn')).click();
    vi.mocked(chooseBarcodePhoto).mock.calls[0]?.[0]('4006381333931');

    expect(callback).toHaveBeenCalledWith('4006381333931');
    expect(photo(root).hidden).toBe(true);
  });

  it('keeps offering a photo, saying none had a barcode', async () => {
    vi.mocked(startScanner).mockResolvedValue('permission_denied');
    vi.mocked(chooseBarcodePhoto).mockResolvedValue('not_found');
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {});
    must(root.getElementById('add-barcode-scan-btn')).click();
    await vi.advanceTimersByTimeAsync(0);

    must(root.getElementById('add-barcode-photo-btn')).click();
    await vi.advanceTimersByTimeAsync(0);

    expect(photo(root).hidden).toBe(false);
    expect(photoMessage(root)).toBe('No barcode found in photo');
  });

  it('on HTTP explains the HTTPS requirement and offers a photo, never starting the camera', () => {
    vi.mocked(scanSupport).mockReturnValue('insecure');
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {});

    must(root.getElementById('add-barcode-scan-btn')).click();

    expect(startScanner).not.toHaveBeenCalled();
    expect(chooseBarcodePhoto).not.toHaveBeenCalled();
    expect(photo(root).hidden).toBe(false);
    expect(photoMessage(root)).toBe(
      'The camera needs a secure (HTTPS) connection to Home Assistant',
    );
  });

  it('uses the translated texts', async () => {
    vi.mocked(startScanner).mockResolvedValue('permission_denied');
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {
      modal: { camera_permission_denied: 'Acceso a cámara denegado' },
    });

    must(root.getElementById('add-barcode-scan-btn')).click();
    await vi.advanceTimersByTimeAsync(0);

    expect(photoMessage(root)).toBe('Acceso a cámara denegado');
  });

  it('a new scan and closing the sheet drop the offer', async () => {
    vi.mocked(startScanner).mockResolvedValueOnce('permission_denied');
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {});
    must(root.getElementById('add-barcode-scan-btn')).click();
    await vi.advanceTimersByTimeAsync(0);

    must(root.getElementById('add-barcode-scan-btn')).click();
    expect(photo(root).hidden).toBe(true);
    await vi.advanceTimersByTimeAsync(0);

    photo(root).hidden = false;
    closeBarcodeScanner(root, 'add');
    expect(photo(root).hidden).toBe(true);
  });
});

describe('barcodeTagInput with the companion app scanner', () => {
  const external = { config: { hasBarCodeScanner: 1 }, fireMessage: vi.fn() };
  const hass = createMockHomeAssistant();
  const handlers = (): NativeScanHandlers => must(vi.mocked(startNativeScanner).mock.calls[0])[2];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nativeScanner).mockReturnValue(external);
  });

  afterEach(() => {
    vi.mocked(nativeScanner).mockReturnValue(undefined);
  });

  it("opens the app's scanner instead of the camera and adds the barcode it reads", () => {
    const root = createRootWithScanner('add');
    const callback = vi.fn();
    initializeBarcodeTagInput(root, 'add', {}, callback, () => hass);

    must(root.getElementById('add-barcode-scan-btn')).click();

    expect(nativeScanner).toHaveBeenCalledWith(hass);
    expect(startNativeScanner).toHaveBeenCalledWith(
      external,
      {
        title: 'Scan barcode',
        description: "Point the camera at the item's barcode",
        alternativeOptionLabel: 'Choose a photo',
      },
      expect.any(Object),
    );
    expect(startScanner).not.toHaveBeenCalled();

    handlers().onDetected('4006381333931');
    expect(callback).toHaveBeenCalledWith('4006381333931');
  });

  it('"Choose a photo" in the app offers the photo chooser, without a message', () => {
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {}, undefined, () => hass);
    must(root.getElementById('add-barcode-scan-btn')).click();

    handlers().onChoosePhoto();

    expect(must(root.getElementById('add-barcode-photo')).hidden).toBe(false);
    expect(must(root.getElementById('add-barcode-photo-message')).hidden).toBe(true);
  });

  it('uses the camera without hass', () => {
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {});
    vi.mocked(nativeScanner).mockReturnValue(undefined);

    must(root.getElementById('add-barcode-scan-btn')).click();

    expect(nativeScanner).toHaveBeenCalledWith(undefined);
    expect(startScanner).toHaveBeenCalledOnce();
  });
});

describe('resumeBarcodeScanner (card re-attached; the pause stopped the camera)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scanSupport).mockReturnValue('live');
    vi.mocked(startScanner).mockResolvedValue(null);
  });

  function element(root: ShadowRoot, id: string): HTMLElement {
    const el = root.getElementById(id);
    if (!(el instanceof HTMLElement)) throw new Error(`no #${id}`);
    return el;
  }

  it("restarts the sheet's scanner that was showing its camera, still adding chips", async () => {
    const root = createRootWithScanner('add');
    const onBarcodeAdded = vi.fn();
    initializeBarcodeTagInput(root, 'add', {}, onBarcodeAdded);
    element(root, 'add-barcode-scan-btn').click();
    await Promise.resolve();
    stopAllBarcodeScanners();
    vi.mocked(startScanner).mockClear();

    resumeBarcodeScanner(root, 'add');

    expect(startScanner).toHaveBeenCalledOnce();
    const [viewport, onDetected] = vi.mocked(startScanner).mock.calls[0] ?? [];
    expect(viewport).toBe(element(root, 'add-barcode-viewport'));
    onDetected?.('4006381333931');
    expect(onBarcodeAdded).toHaveBeenCalledWith('4006381333931');
    expect(element(root, 'add-barcode-scanner').hidden).toBe(true);
  });

  it('leaves a closed scanner closed', () => {
    const root = createRootWithScanner('add');
    initializeBarcodeTagInput(root, 'add', {});
    element(root, 'add-barcode-scanner').hidden = true;

    resumeBarcodeScanner(root, 'add');

    expect(startScanner).not.toHaveBeenCalled();
  });

  it('does nothing without the scanner in the sheet', () => {
    const root = createMockShadowRoot('add');

    expect(() => resumeBarcodeScanner(root, 'add')).not.toThrow();
    expect(startScanner).not.toHaveBeenCalled();
  });
});
