import { HomeAssistant } from '@/types/homeAssistant';
import { InventoryItem } from '@/types/inventory';
import { WS_COMMANDS } from '@/utils/constants';
import { wsErrorField } from '../wsError';

/** Why an item matched a search, as `simple_inventory/search` reports it (its best reason). */
export type SearchMatch =
  'name' | 'alias' | 'barcode' | 'category' | 'location' | 'description' | 'unit';

/** An item as `list_items` lists it, plus the inventory it is in (search, Home). */
export interface LocatedItem extends InventoryItem {
  inventory_id: string;
  inventory_name: string;
}

/** One search result: the item, where it is and why it matched. */
export interface SearchResultItem extends LocatedItem {
  matched: SearchMatch;
}

export type SearchResult =
  | { status: 'ok'; items: SearchResultItem[]; truncated: boolean }
  | { status: 'error'; message: string };

/** Items of every inventory matching `query`, best match first (see the integration's README). */
export async function searchItems(
  hass: HomeAssistant,
  query: string,
  limit?: number,
): Promise<SearchResult> {
  try {
    const result = await hass.callWS<{ items: SearchResultItem[]; truncated: boolean }>({
      type: WS_COMMANDS.SEARCH,
      query,
      ...(limit === undefined ? {} : { limit }),
    });
    return { status: 'ok', items: result.items, truncated: result.truncated };
  } catch (error) {
    return { status: 'error', message: wsErrorField(error, 'message') };
  }
}

/**
 * Subscribes to the updates of every inventory (`subscribe` without `inventory_id`); resolves to
 * the unsubscribe once the integration accepted it, rejects when it refused or there is no
 * websocket connection.
 */
export async function subscribeUpdates(
  hass: HomeAssistant,
  onUpdate: () => void,
): Promise<() => void> {
  if (!hass.connection) {
    throw new Error('Simple Inventory: no websocket connection for search updates');
  }
  const unsubscribe = await hass.connection.subscribeMessage(onUpdate, {
    type: WS_COMMANDS.SUBSCRIBE,
  });
  return () => {
    unsubscribe().catch(() => undefined);
  };
}
