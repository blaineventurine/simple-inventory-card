import { ELEMENTS } from '../utils/constants';
import { startScanner, stopScanner, isScannerActive } from './barcodeScanner';

function getBarcodes(hiddenInput: HTMLInputElement): string[] {
  return hiddenInput.value
    .split(',')
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

function updateHiddenInput(hiddenInput: HTMLInputElement, barcodes: string[]): void {
  hiddenInput.value = barcodes.join(', ');
}

function renderChips(
  container: HTMLElement,
  barcodes: string[],
  hiddenInput: HTMLInputElement,
): void {
  container.innerHTML = '';
  for (const barcode of barcodes) {
    const chip = document.createElement('span');
    chip.className = 'barcode-chip';
    chip.textContent = barcode;

    const removeBtn = document.createElement('span');
    removeBtn.className = 'barcode-chip-remove';
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', () => {
      const current = getBarcodes(hiddenInput);
      const updated = current.filter((b) => b !== barcode);
      updateHiddenInput(hiddenInput, updated);
      renderChips(container, updated, hiddenInput);
    });

    chip.appendChild(removeBtn);
    container.appendChild(chip);
  }
}

function addBarcodeChip(
  code: string,
  hiddenInput: HTMLInputElement,
  chipsContainer: HTMLElement,
  onBarcodeAdded?: (barcode: string) => void,
): boolean {
  const current = getBarcodes(hiddenInput);
  if (current.includes(code)) return false;

  current.push(code);
  updateHiddenInput(hiddenInput, current);
  renderChips(chipsContainer, current, hiddenInput);
  if (onBarcodeAdded) {
    onBarcodeAdded(code);
  }
  return true;
}

export function initializeBarcodeTagInput(
  shadowRoot: ShadowRoot,
  prefix: string,
  onBarcodeAdded?: (barcode: string) => void,
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

  // Render initial chips from hidden input value (populated by populateEditModal)
  const initial = getBarcodes(hiddenInput);
  renderChips(chipsContainer, initial, hiddenInput);

  visibleInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = visibleInput.value.trim();
      if (!value) return;

      if (addBarcodeChip(value, hiddenInput, chipsContainer, onBarcodeAdded)) {
        visibleInput.value = '';
      } else {
        // Duplicate
        visibleInput.value = '';
      }
    }
  });

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

  if (!scanBtn || !scannerContainer || !viewport || !closeBtn) {
    return;
  }

  const hideScanner = (): void => {
    stopScanner();
    scannerContainer.style.display = 'none';
  };

  const showError = (message: string): void => {
    // Remove any existing error
    const existing = scannerContainer.parentElement?.querySelector('.barcode-scanner-error');
    if (existing) existing.remove();

    const errorEl = document.createElement('div');
    errorEl.className = 'barcode-scanner-error';
    errorEl.textContent = message;
    scannerContainer.insertAdjacentElement('afterend', errorEl);
    setTimeout(() => errorEl.remove(), 3000);
  };

  scanBtn.addEventListener('click', async () => {
    if (isScannerActive()) {
      hideScanner();
      return;
    }

    scannerContainer.style.display = 'block';
    const error = await startScanner(viewport, (code: string) => {
      addBarcodeChip(code, hiddenInput, chipsContainer, onBarcodeAdded);
      hideScanner();
    });

    if (error) {
      hideScanner();
      const errorKey =
        error === 'permission_denied'
          ? 'modal.camera_permission_denied'
          : 'modal.camera_not_available';
      // Use a simple fallback since we don't have translations reference here
      const fallback =
        error === 'permission_denied' ? 'Camera access denied' : 'Camera not available';
      // Try to find a localized message from a data attribute, otherwise use fallback
      const localizedMsg = scanBtn.dataset[errorKey] || fallback;
      showError(localizedMsg);
    }
  });

  closeBtn.addEventListener('click', () => {
    hideScanner();
  });
}

export function stopAllBarcodeScanners(): void {
  if (isScannerActive()) {
    stopScanner();
  }
}
