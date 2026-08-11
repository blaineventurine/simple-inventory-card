import { ELEMENTS } from '../utils/constants';

function getAliases(hiddenInput: HTMLInputElement): string[] {
  return hiddenInput.value
    .split(',')
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

function updateHiddenInput(hiddenInput: HTMLInputElement, aliases: string[]): void {
  hiddenInput.value = aliases.join(', ');
}

function renderChips(
  container: HTMLElement,
  aliases: string[],
  hiddenInput: HTMLInputElement,
): void {
  container.innerHTML = '';
  for (const alias of aliases) {
    const chip = document.createElement('span');
    chip.className = 'alias-chip';
    chip.textContent = alias;

    const removeBtn = document.createElement('span');
    removeBtn.className = 'alias-chip-remove';
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', () => {
      const current = getAliases(hiddenInput);
      const updated = current.filter((a) => a !== alias);
      updateHiddenInput(hiddenInput, updated);
      renderChips(container, updated, hiddenInput);
    });

    chip.appendChild(removeBtn);
    container.appendChild(chip);
  }
}

function addAliasChip(
  value: string,
  hiddenInput: HTMLInputElement,
  chipsContainer: HTMLElement,
): boolean {
  const current = getAliases(hiddenInput);
  if (current.includes(value)) return false;

  current.push(value);
  updateHiddenInput(hiddenInput, current);
  renderChips(chipsContainer, current, hiddenInput);
  return true;
}

export function initializeAliasTagInput(shadowRoot: ShadowRoot, prefix: string): void {
  const hiddenInput = shadowRoot.getElementById(
    `${prefix}-${ELEMENTS.ALIASES}`,
  ) as HTMLInputElement | null;
  const visibleInput = shadowRoot.getElementById(
    `${prefix}-${ELEMENTS.ALIASES}-input`,
  ) as HTMLInputElement | null;
  const chipsContainer = shadowRoot.getElementById(`${prefix}-alias-chips`) as HTMLElement | null;

  if (!hiddenInput || !visibleInput || !chipsContainer) {
    return;
  }

  const initial = getAliases(hiddenInput);
  renderChips(chipsContainer, initial, hiddenInput);

  visibleInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = visibleInput.value.trim();
      if (!value) return;

      for (const part of value.split(',')) {
        const alias = part.trim();
        if (alias) addAliasChip(alias, hiddenInput, chipsContainer);
      }
      visibleInput.value = '';
    }
  });
}
