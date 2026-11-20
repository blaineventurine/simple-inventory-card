import { ELEMENTS } from '../utils/constants';
import { TranslationData } from '@/types/translatableComponent';
import type { HomeAssistant } from '@/types/homeAssistant';
import { TranslationManager } from './translationManager';
import {
  chooseBarcodePhoto,
  isScannerActive,
  nativeScanner,
  scanSupport,
  startNativeScanner,
  startScanner,
  stopScanner,
} from './barcodeScanner';
import { nativeScanTexts, scannerText } from './scannerText';

function getBarcodes(hiddenInput: HTMLInputElement): string[] {
  return hiddenInput.value
    .split(',')
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

function updateHiddenInput(hiddenInput: HTMLInputElement, barcodes: string[]): void {
  hiddenInput.value = barcodes.join(', ');
}

/** Each sheet scanner's live camera start, keyed by its container, for `resumeBarcodeScanner`. */
const liveStarts = new WeakMap<HTMLElement, () => Promise<void>>();

function renderChips(
  container: HTMLElement,
  barcodes: string[],
  hiddenInput: HTMLInputElement,
  translations: TranslationData,
): void {
  container.innerHTML = '';
  for (const barcode of barcodes) {
    const chip = document.createElement('span');
    chip.className = 'barcode-chip';
    chip.textContent = barcode;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'barcode-chip-remove';
    removeBtn.textContent = '\u00d7';
    removeBtn.setAttribute(
      'aria-label',
      TranslationManager.localize(
        translations,
        'modal.remove_value',
        { value: barcode },
        `Remove ${barcode}`,
      ),
    );
    removeBtn.addEventListener('click', () => {
      const current = getBarcodes(hiddenInput);
      const updated = current.filter((b) => b !== barcode);
      updateHiddenInput(hiddenInput, updated);
      renderChips(container, updated, hiddenInput, translations);
    });

    chip.appendChild(removeBtn);
    container.appendChild(chip);
  }
}

function addBarcodeChip(
  code: string,
  hiddenInput: HTMLInputElement,
  chipsContainer: HTMLElement,
  translations: TranslationData,
  onBarcodeAdded?: (barcode: string) => void,
): boolean {
  const current = getBarcodes(hiddenInput);
  if (current.includes(code)) return false;

  current.push(code);
  updateHiddenInput(hiddenInput, current);
  renderChips(chipsContainer, current, hiddenInput, translations);
  if (onBarcodeAdded) {
    onBarcodeAdded(code);
  }
  return true;
}

export function initializeBarcodeTagInput(
  shadowRoot: ShadowRoot,
  prefix: string,
  translations: TranslationData,
  onBarcodeAdded?: (barcode: string) => void,
  /** The card's current hass, for the companion app's scanner. */
  getHass?: () => HomeAssistant | undefined,
): void {
  const hiddenInput = shadowRoot.getElementById(
    `${prefix}-${ELEMENTS.BARCODE}`,
  ) as HTMLInputElement | null;
  const visibleInput = shadowRoot.getElementById(
    `${prefix}-${ELEMENTS.BARCODE}-input`,
  ) as HTMLInputElement | null;
  const chipsContainer = shadowRoot.getElementById(`${prefix}-barcode-chips`) as HTMLElement | null;

  if (!hiddenInput || !visibleInput || !chipsContainer) {
    return;
  }

  const initial = getBarcodes(hiddenInput);
  renderChips(chipsContainer, initial, hiddenInput, translations);

  // The add/edit modal DOM is persistent and reopened without being
  // recreated, so guard against re-registering listeners on repeat opens.
  // Each independently-gated listener group below carries its own marker,
  // since the scanner elements may be absent even when the text input isn't.
  if (!visibleInput.hasAttribute('data-listeners-bound')) {
    visibleInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = visibleInput.value.trim();
        if (!value) return;

        if (addBarcodeChip(value, hiddenInput, chipsContainer, translations, onBarcodeAdded)) {
          visibleInput.value = '';
        } else {
          // Duplicate
          visibleInput.value = '';
        }
      }
    });
    visibleInput.setAttribute('data-listeners-bound', 'true');
  }

  // Camera scanner wiring
  const scanBtn = shadowRoot.getElementById(
    `${prefix}-${ELEMENTS.BARCODE_SCAN_BTN}`,
  ) as HTMLButtonElement | null;
  const scannerContainer = shadowRoot.getElementById(
    `${prefix}-${ELEMENTS.BARCODE_SCANNER}`,
  ) as HTMLElement | null;
  const viewport = shadowRoot.getElementById(
    `${prefix}-${ELEMENTS.BARCODE_VIEWPORT}`,
  ) as HTMLElement | null;
  const closeBtn = shadowRoot.getElementById(
    `${prefix}-${ELEMENTS.BARCODE_SCANNER_CLOSE}`,
  ) as HTMLButtonElement | null;
  const photo = shadowRoot.getElementById(`${prefix}-${ELEMENTS.BARCODE_PHOTO}`);
  const photoMessage = shadowRoot.getElementById(`${prefix}-${ELEMENTS.BARCODE_PHOTO_MESSAGE}`);
  const photoBtn = shadowRoot.getElementById(`${prefix}-${ELEMENTS.BARCODE_PHOTO_BTN}`);

  if (
    !scanBtn ||
    !scannerContainer ||
    !viewport ||
    !closeBtn ||
    !photo ||
    !photoMessage ||
    !photoBtn
  ) {
    return;
  }

  if (scanBtn.hasAttribute('data-listeners-bound')) {
    return;
  }

  const hideScanner = (): void => {
    stopScanner();
    scannerContainer.hidden = true;
  };

  const showError = (message: string): void => {
    const existing = scannerContainer.parentElement?.querySelector('.barcode-scanner-error');
    if (existing) existing.remove();

    const errorEl = document.createElement('div');
    errorEl.className = 'barcode-scanner-error';
    errorEl.textContent = message;
    scannerContainer.insertAdjacentElement('afterend', errorEl);
    setTimeout(() => errorEl.remove(), 3000);
  };

  /** Offers "Choose a photo" instead of the camera, saying why (`message`). */
  const offerPhoto = (message: string): void => {
    photoMessage.textContent = message;
    photoMessage.hidden = message === '';
    photo.hidden = false;
  };

  const addChip = (code: string): void => {
    addBarcodeChip(code, hiddenInput, chipsContainer, translations, onBarcodeAdded);
  };

  const startLive = async (): Promise<void> => {
    photo.hidden = true;
    scannerContainer.hidden = false;
    const error = await startScanner(viewport, (code: string) => {
      addChip(code);
      hideScanner();
    });

    if (error) {
      hideScanner();
      offerPhoto(scannerText(translations, error));
    }
  };
  liveStarts.set(scannerContainer, startLive);

  scanBtn.addEventListener('click', async () => {
    const external = nativeScanner(getHass?.());
    if (external) {
      photo.hidden = true;
      startNativeScanner(external, nativeScanTexts(translations), {
        onDetected: addChip,
        onChoosePhoto: () => offerPhoto(''),
      });
      return;
    }

    const support = scanSupport();
    if (support === 'photo') {
      const error = await chooseBarcodePhoto(addChip);
      if (error) {
        showError(scannerText(translations, 'no_barcode'));
      }
      return;
    }

    if (support === 'insecure') {
      offerPhoto(scannerText(translations, 'insecure'));
      return;
    }

    if (isScannerActive()) {
      hideScanner();
      return;
    }

    await startLive();
  });

  photoBtn.addEventListener('click', async () => {
    const error = await chooseBarcodePhoto((code) => {
      addChip(code);
      photo.hidden = true;
    });
    if (error) {
      offerPhoto(scannerText(translations, 'no_barcode'));
    }
  });

  closeBtn.addEventListener('click', () => {
    hideScanner();
  });

  scanBtn.setAttribute('data-listeners-bound', 'true');
}

/**
 * Card re-attached (the pause stopped the camera): the `prefix` sheet's scanner, if it was
 * showing its camera, starts it again. The caller decides whether that sheet is open.
 */
export function resumeBarcodeScanner(shadowRoot: ShadowRoot, prefix: string): void {
  const scannerContainer = shadowRoot.getElementById(`${prefix}-${ELEMENTS.BARCODE_SCANNER}`);
  if (!scannerContainer || scannerContainer.hidden) {
    return;
  }
  void liveStarts.get(scannerContainer)?.();
}

/** Stops the camera, one still opening included (the card was detached). */
export function stopAllBarcodeScanners(): void {
  stopScanner();
}

/**
 * The `prefix` sheet closed: stop its camera and hide its scanner, so a later re-open (and a
 * re-attach of the card) starts without it.
 */
export function closeBarcodeScanner(shadowRoot: ShadowRoot, prefix: string): void {
  stopScanner();
  for (const id of [ELEMENTS.BARCODE_SCANNER, ELEMENTS.BARCODE_PHOTO]) {
    const el = shadowRoot.getElementById(`${prefix}-${id}`);
    if (el) el.hidden = true;
  }
}
