import { HomeAssistant } from './homeAssistant';
import { InventoryConfig, InventoryItem } from './inventory';
import { TranslationData } from './translatableComponent';
import { BACKEND_FEATURES } from '../utils/constants';

/** Optional integration features the card adapts to (`features` of `simple_inventory/get_info`). */
export interface Capabilities {
  /** Item batches: details panels list them, restock forms and the edit sheet take them. */
  readonly batches: boolean;
  /** Batch rows offer Move… between locations. */
  readonly transfers: boolean;
  /** Items carry their own icon. */
  readonly itemIcons: boolean;
  /** Items carry a photo. */
  readonly itemImages: boolean;
  /** The integration stores a 384px tile size (`?tile=1`); without it tiles use the full image. */
  readonly tileImages: boolean;
}

/** Before (or without a successful) get_info handshake: no optional feature. */
export const NO_CAPABILITIES: Capabilities = {
  batches: false,
  transfers: false,
  itemIcons: false,
  itemImages: false,
  tileImages: false,
};

export function capabilitiesFrom(features: readonly string[]): Capabilities {
  return {
    batches: features.includes(BACKEND_FEATURES.BATCHES),
    transfers: features.includes(BACKEND_FEATURES.TRANSFERS),
    itemIcons: features.includes(BACKEND_FEATURES.ITEM_ICONS),
    itemImages: features.includes(BACKEND_FEATURES.ITEM_IMAGES),
    tileImages: features.includes(BACKEND_FEATURES.TILE_IMAGES),
  };
}

/**
 * Everything the card's services read about the card's current state. Always read it through a
 * `GetCardContext` at the moment it is needed (never keep one): hass, translations, items and
 * capabilities change over the card's life.
 */
export interface CardContext {
  hass: HomeAssistant;
  config: InventoryConfig;
  translations: TranslationData;
  /** The inventory's items as last fetched or pushed (not yet normalized). */
  items: InventoryItem[];
  capabilities: Capabilities;
}

export type GetCardContext = () => CardContext;
