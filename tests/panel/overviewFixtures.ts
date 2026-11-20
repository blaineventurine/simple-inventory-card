import {
  ExpiredReason,
  ExpiringReason,
  InventoryOverview,
  LowStockReason,
  Overview,
  OverviewEntry,
} from '../../src/panel/home/overviewClient';
import { InventoryItem } from '../../src/types/inventory';

/** An item of `inventory` as `list_items` lists it. */
function listItem(name: string, overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: name.toLowerCase().replace(/\W+/g, '-'),
    name,
    quantity: 2,
    unit: '',
    description: '',
    category: '',
    location: '',
    expiry_date: '',
    todo_list: '',
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    ...overrides,
  };
}

/** One overview entry: the `list_items` item plus where it is and why it is listed. */
export function entry<R>(
  name: string,
  inventory: { id: string; name: string },
  reason: R,
  overrides: Partial<InventoryItem> = {},
): OverviewEntry<R> {
  return {
    ...listItem(name, overrides),
    inventory_id: inventory.id,
    inventory_name: inventory.name,
    reason,
  };
}

export function expired(days: number, batches = 1, quantity = 1): ExpiredReason {
  return { days_overdue: days, batches, quantity };
}

export function expiring(days: number, batches = 1, quantity = 1): ExpiringReason {
  return { days_until_expiry: days, batches, quantity };
}

export function low(threshold: number, needed: number): LowStockReason {
  return { threshold, quantity_needed: needed };
}

export function summary(
  inventory: { id: string; name: string; icon?: string },
  overrides: Partial<InventoryOverview> = {},
): InventoryOverview {
  return {
    id: inventory.id,
    name: inventory.name,
    icon: inventory.icon ?? '',
    total_items: 0,
    total_value: 0,
    attention: { expired: 0, expiring_soon: 0, out_of_stock: 0, low_stock: 0 },
    ...overrides,
  };
}

export function overview(overrides: Partial<Overview> = {}): Overview {
  return {
    inventories: [],
    expired: [],
    expiring_soon: [],
    out_of_stock: [],
    low_stock: [],
    ...overrides,
  };
}
