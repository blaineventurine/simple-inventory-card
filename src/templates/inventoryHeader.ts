import { Utils } from '../utils/utils';
import { InventoryItem } from '../types/home-assistant';

export function createInventoryHeader(
  inventoryName: string,
  allItems: InventoryItem[],
  description?: string
): string {
  const expiringCount = getExpiringItemsCount(allItems);
  const expiredCount = getExpiredItemsCount(allItems);

  return `
      <div class="card-header">
        <div class="header-content">
          <h2 class="inventory-title">${Utils.sanitizeHtml(inventoryName)}</h2>
          ${
            description && description.trim()
              ? `<p class="inventory-description">${Utils.sanitizeHtml(description)}</p>`
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
              <span class="expired-badge" title="${expiredCount} items expired">
                <ha-icon icon="mdi:calendar-remove"></ha-icon>
                ${expiredCount}
              </span>
            `
                : ''
            }
            ${
              expiringCount > 0
                ? `
              <span class="expiring-badge" title="${expiringCount} items expiring soon">
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
    const threshold = item.expiry_alert_days || 7;
    return Utils.isExpiringSoon(item.expiry_date, threshold);
  }).length;
}

function getExpiredItemsCount(items: InventoryItem[]): number {
  return items.filter((item) => {
    if (!item.expiry_date || (item.quantity ?? 0) <= 0) {
      return false;
    }
    return Utils.isExpired(item.expiry_date);
  }).length;
}
