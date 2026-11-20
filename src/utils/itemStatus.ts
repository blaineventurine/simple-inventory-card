import { InventoryItem } from '@/types/inventory';
import { Tone } from '@/templates/primitives';
import { DEFAULTS } from '@/utils/constants';
import { DateUtils } from '@/utils/dateUtils';

export type ItemStatus = 'out' | 'expired' | 'warning' | 'normal';

export const STATUS_TONE: Record<ItemStatus, Tone> = {
  out: 'disabled',
  expired: 'error',
  warning: 'warning',
  normal: 'primary',
};

export const DEFAULT_ITEM_ICON = 'mdi:package-variant';

/**
 * Row status, first match wins: out of stock, expired (soonest batch expiry is past),
 * expiring within the item's alert window (same rule as the header count) or at/below
 * its auto-add threshold, else normal.
 */
export function itemStatus(item: InventoryItem): ItemStatus {
  if (item.quantity <= 0) {
    return 'out';
  }
  if (DateUtils.isExpired(item.expiry_date)) {
    return 'expired';
  }
  const threshold = item.expiry_alert_days ?? DEFAULTS.EXPIRY_ALERT_DAYS;
  if (
    DateUtils.isExpiringSoon(item.expiry_date, threshold) ||
    (item.auto_add_enabled && item.quantity <= (item.auto_add_to_list_quantity ?? 0))
  ) {
    return 'warning';
  }
  return 'normal';
}

/**
 * The item's own mdi icon, or the default when it has none (older integrations send none).
 * The value comes straight from the backend, so anything but a string counts as unset.
 */
export function itemIcon(item: InventoryItem): string {
  const icon: unknown = item.icon;
  return (typeof icon === 'string' && icon.trim()) || DEFAULT_ITEM_ICON;
}
