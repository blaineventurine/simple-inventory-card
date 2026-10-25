import { ELEMENTS } from '../utils/constants';
import { DEFAULT_ITEM_ICON } from '../utils/itemStatus';

/**
 * Keeps the fallback icon input's preview circle on the typed icon (the default icon when empty).
 * Does nothing when the field is absent (no `item_icons`) or is Home Assistant's icon picker,
 * which previews by itself. Call on every open, after the edit sheet has been populated.
 */
export function initializeIconField(shadowRoot: ShadowRoot, prefix: string): void {
  const input = shadowRoot.getElementById(`${prefix}-${ELEMENTS.ICON}`);
  const previewIcon = shadowRoot
    .getElementById(`${prefix}-${ELEMENTS.ICON}-preview`)
    ?.querySelector('ha-icon');
  if (!(input instanceof HTMLInputElement) || !previewIcon) {
    return;
  }

  const sync = (): void => {
    previewIcon.setAttribute('icon', input.value.trim() || DEFAULT_ITEM_ICON);
  };
  sync();

  // The sheet DOM persists between opens; bind once per rendered input.
  if (input.hasAttribute('data-listeners-bound')) {
    return;
  }
  input.setAttribute('data-listeners-bound', 'true');
  input.addEventListener('input', sync);
}
