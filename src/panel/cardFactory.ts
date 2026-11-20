import { HomeAssistant } from '@/types/homeAssistant';
import { InventoryConfig } from '@/types/inventory';

/** The registered `<simple-inventory-card>` element, as the panel uses it. */
export interface EmbeddedCard extends HTMLElement {
  setConfig(config: InventoryConfig): void;
  hass: HomeAssistant | undefined;
  /** Opens an item's edit sheet (absent from card builds older than the panel search). */
  openItem?(name: string): void;
  /** Shows an item's page in place of the list (absent from card builds before item pages). */
  showItem?(id: string): void;
  /** Shows the list again. */
  showList?(): void;
}

function isEmbeddedCard(element: HTMLElement): element is EmbeddedCard {
  return 'setConfig' in element && typeof element.setConfig === 'function';
}

/**
 * A card for one inventory sensor, created through the element registry: whichever card build
 * registered `simple-inventory-card` first (dashboard resource or panel bundle) is used.
 * Undefined when no card element is registered.
 */
export function createInventoryCard(entity: string): EmbeddedCard | undefined {
  const element = document.createElement('simple-inventory-card');
  if (!isEmbeddedCard(element)) {
    return undefined;
  }
  element.setAttribute('embedded', '');
  element.setConfig({ type: 'custom:simple-inventory-card', entity });
  return element;
}
