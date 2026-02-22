import { Utilities } from '../utils/utilities';
import { InventoryItem } from '../types/homeAssistant';
import { DEFAULTS, ELEMENTS } from '../utils/constants';
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
        <div class="header-actions">
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
          <button id="${ELEMENTS.HEADER_SCAN_BTN}" class="header-scan-btn" title="${TranslationManager.localize(translations, 'header.scan_barcode', undefined, 'Scan Barcode')}">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="16" x2="17" y2="16"/></svg>
          </button>
          <div class="overflow-menu-container">
            <button id="${ELEMENTS.OVERFLOW_MENU_BTN}" class="overflow-menu-btn" title="${TranslationManager.localize(translations, 'header.more_options', undefined, 'More options')}">&#8942;</button>
            <div class="overflow-menu" id="${ELEMENTS.OVERFLOW_MENU}" style="display: none;">
              <button id="${ELEMENTS.EXPORT_INVENTORY}" class="overflow-menu-item">${TranslationManager.localize(translations, 'header.export', undefined, 'Export')}</button>
              <button id="${ELEMENTS.IMPORT_INVENTORY}" class="overflow-menu-item">${TranslationManager.localize(translations, 'header.import', undefined, 'Import')}</button>
            </div>
          </div>
        </div>
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
