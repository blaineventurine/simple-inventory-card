import { HomeAssistant } from '@/types/homeAssistant';
import { WS_COMMANDS } from '@/utils/constants';
import { LocatedItem } from '../search/searchClient';
import { wsErrorField } from '../wsError';

/** How many items of an inventory each attention section lists (each item counted once). */
export interface AttentionCounts {
  expired: number;
  expiring_soon: number;
  out_of_stock: number;
  low_stock: number;
}

/** One inventory's summary, as `simple_inventory/overview` reports it. */
export interface InventoryOverview {
  id: string;
  name: string;
  icon: string;
  total_items: number;
  total_value: number;
  attention: AttentionCounts;
}

/** Expired: the oldest expired batch's days overdue; count and quantity of expired batches. */
export interface ExpiredReason {
  days_overdue: number;
  batches: number;
  quantity: number;
}

/** Expiring soon: the soonest batch's days left; count and quantity of batches in the window. */
export interface ExpiringReason {
  days_until_expiry: number;
  batches: number;
  quantity: number;
}

/** Low stock: the item's threshold and how much is needed to restock it. */
export interface LowStockReason {
  threshold: number;
  quantity_needed: number;
}

/** One item in an attention section: the located item plus why it is listed. */
export interface OverviewEntry<Reason> extends LocatedItem {
  reason: Reason;
}

/** The `simple_inventory/overview` result; each item is in its most urgent section only. */
export interface Overview {
  inventories: InventoryOverview[];
  expired: Array<OverviewEntry<ExpiredReason>>;
  expiring_soon: Array<OverviewEntry<ExpiringReason>>;
  out_of_stock: Array<OverviewEntry<Record<string, never>>>;
  low_stock: Array<OverviewEntry<LowStockReason>>;
}

export type OverviewResult =
  { status: 'ok'; overview: Overview } | { status: 'error'; message: string };

/** The summaries and attention sections of every inventory (see the integration's README). */
export async function fetchOverview(hass: HomeAssistant): Promise<OverviewResult> {
  try {
    const overview = await hass.callWS<Overview>({ type: WS_COMMANDS.OVERVIEW });
    return { status: 'ok', overview };
  } catch (error) {
    return { status: 'error', message: wsErrorField(error, 'message') };
  }
}
