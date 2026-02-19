import { ELEMENTS } from '../utils/constants';

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

export function initializeBarcodeTagInput(shadowRoot: ShadowRoot, prefix: string): void {
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

      const current = getBarcodes(hiddenInput);
      if (current.includes(value)) {
        visibleInput.value = '';
        return;
      }

      current.push(value);
      updateHiddenInput(hiddenInput, current);
      renderChips(chipsContainer, current, hiddenInput);
      visibleInput.value = '';
    }
  });
}
