import { Utilities } from '../utils/utilities';
import { InventoryItem } from '../types/homeAssistant';
import { DEFAULTS } from '../utils/constants';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';

export function createInventoryHeader(
  inventoryName: string,
  allItems: InventoryItem[],
  translations: TranslationData,
  description?: string,
): string {
  const expiringCount = getExpiringItemsCount(allItems);
  const expiredCount = getExpiredItemsCount(allItems);

  return `
      <div class="card-header">
        <div class="header-content">
          <h2 class="inventory-title">${Utilities.sanitizeHtml(inventoryName)}</h2>
          ${
            description && description.trim()
              ? `<p class="inventory-description">${Utilities.sanitizeHtml(description)}</p>`
              : ''
          }
        </div>
        ${
          expiredCount > 0 || expiringCount > 0
            ? `
          <div class="expiry-indicators">
            ${
              expiredCount > 0
                ? `
                <span class="expired-badge" title="${TranslationManager.localize(
                  translations,
                  'header.items_expired',
                  { count: expiredCount },
                  `${expiredCount} items expired`,
                )}">
                <ha-icon icon="mdi:calendar-remove"></ha-icon>
                ${expiredCount}
              </span>
            `
                : ''
            }
            ${
              expiringCount > 0
                ? `
                <span class="expiring-badge" title="${TranslationManager.localize(
                  translations,
                  'header.items_expiring_soon',
                  { count: expiringCount },
                  `${expiringCount} items expiring soon`,
                )}">
                <ha-icon icon="mdi:calendar-alert"></ha-icon>
                ${expiringCount}
              </span>
            `
                : ''
            }
          </div>
        `
            : ''
        }
      </div>
    `;
}

function getExpiringItemsCount(items: InventoryItem[]): number {
  return items.filter((item) => {
    if (!item.expiry_date || (item.quantity ?? 0) <= 0) {
      return false;
    }
    const threshold = item.expiry_alert_days || DEFAULTS.EXPIRY_ALERT_DAYS;
    return Utilities.isExpiringSoon(item.expiry_date, threshold);
  }).length;
}

function getExpiredItemsCount(items: InventoryItem[]): number {
  return items.filter((item) => {
    if (!item.expiry_date || (item.quantity ?? 0) <= 0) {
      return false;
    }
    return Utilities.isExpired(item.expiry_date);
  }).length;
}
