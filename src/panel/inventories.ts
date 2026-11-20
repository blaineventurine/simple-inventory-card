import { HomeAssistant } from '@/types/homeAssistant';
import { BackendInfo } from '@/types/backendInfo';
import { WS_COMMANDS } from '@/utils/constants';
import { wsErrorField } from './wsError';

/** One inventory as `simple_inventory/list_inventories` reports it. */
export interface InventorySummary {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** The inventory's sensor; null when the sensor is missing. */
  entity_id: string | null;
}

export type InventoriesResult =
  | { status: 'ok'; inventories: InventorySummary[] }
  | { status: 'outdated' }
  | { status: 'error'; message: string };

/** The integration's inventories; an integration without the command is `outdated`. */
export async function fetchInventories(hass: HomeAssistant): Promise<InventoriesResult> {
  try {
    const result = await hass.callWS<{ inventories: InventorySummary[] }>({
      type: WS_COMMANDS.LIST_INVENTORIES,
    });
    return { status: 'ok', inventories: result.inventories };
  } catch (error) {
    if (wsErrorField(error, 'code') === 'unknown_command') {
      return { status: 'outdated' };
    }
    return { status: 'error', message: wsErrorField(error, 'message') };
  }
}

/** The integration's optional features (`get_info`); none when it does not answer. */
export async function fetchFeatures(hass: HomeAssistant): Promise<string[]> {
  try {
    const info = await hass.callWS<BackendInfo>({ type: WS_COMMANDS.GET_INFO });
    return info.features;
  } catch (error) {
    console.warn('Simple Inventory: get_info failed; panel features stay off:', error);
    return [];
  }
}
