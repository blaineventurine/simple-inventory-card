import { Utilities } from '../utils/utilities';
import { DateUtils } from '../utils/dateUtils';
import { InventoryItem } from '../types/inventory';
import { ACTIONS, DEFAULTS, ELEMENTS, FILTER_VALUES } from '../utils/constants';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { chip, iconButton } from './primitives';

export function createInventoryHeader(
  inventoryName: string,
  allItems: InventoryItem[],
  translations: TranslationData,
  description?: string,
): string {
  const expiringCount = getExpiringItemsCount(allItems);
  const expiredCount = getExpiredItemsCount(allItems);
  const exportLabel = TranslationManager.localize(
    translations,
    'header.export',
    undefined,
    'Export',
  );
  const importLabel = TranslationManager.localize(
    translations,
    'header.import',
    undefined,
    'Import',
  );

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
          ${expiryIndicators(expiredCount, expiringCount, translations)}
          ${iconButton({
            icon: 'mdi:barcode-scan',
            label: TranslationManager.localize(
              translations,
              'header.scan_barcode',
              undefined,
              'Scan Barcode',
            ),
            className: 'header-scan-btn',
            attrs: { id: ELEMENTS.HEADER_SCAN_BTN, 'data-action': ACTIONS.OPEN_SCAN },
          })}
          <div class="overflow-menu-container">
            ${iconButton({
              icon: 'mdi:dots-vertical',
              label: TranslationManager.localize(
                translations,
                'header.more_options',
                undefined,
                'More options',
              ),
              className: 'overflow-menu-btn',
              attrs: {
                id: ELEMENTS.OVERFLOW_MENU_BTN,
                'data-action': ACTIONS.TOGGLE_OVERFLOW_MENU,
                'aria-haspopup': 'menu',
                'aria-expanded': 'false',
              },
            })}
            <div class="overflow-menu" id="${ELEMENTS.OVERFLOW_MENU}" role="menu" hidden>
              <button type="button" id="${ELEMENTS.EXPORT_INVENTORY}" class="overflow-menu-item" role="menuitem" data-action="${ACTIONS.EXPORT_INVENTORY}"><ha-icon icon="mdi:export" aria-hidden="true"></ha-icon><span>${exportLabel}</span></button>
              <button type="button" id="${ELEMENTS.IMPORT_INVENTORY}" class="overflow-menu-item" role="menuitem" data-action="${ACTIONS.IMPORT_INVENTORY}"><ha-icon icon="mdi:import" aria-hidden="true"></ha-icon><span>${importLabel}</span></button>
            </div>
          </div>
        </div>
      </div>
    `;
}

function expiryIndicators(
  expiredCount: number,
  expiringCount: number,
  translations: TranslationData,
): string {
  if (expiredCount <= 0 && expiringCount <= 0) {
    return '';
  }
  const expiredText = TranslationManager.localize(
    translations,
    'header.items_expired',
    { count: expiredCount },
    `${expiredCount} items expired`,
  );
  const expiringText = TranslationManager.localize(
    translations,
    'header.items_expiring_soon',
    { count: expiringCount },
    `${expiringCount} items expiring soon`,
  );

  return `
            <div class="expiry-indicators">
              ${
                expiredCount > 0
                  ? chip({
                      label: String(expiredCount),
                      icon: 'mdi:calendar-remove',
                      tone: 'error',
                      className: 'expired-badge',
                      attrs: {
                        id: ELEMENTS.HEADER_EXPIRED_BADGE,
                        'data-action': ACTIONS.FILTER_EXPIRY,
                        'data-expiry': FILTER_VALUES.EXPIRY.EXPIRED,
                        title: expiredText,
                        'aria-label': expiredText,
                      },
                    })
                  : ''
              }
              ${
                expiringCount > 0
                  ? chip({
                      label: String(expiringCount),
                      icon: 'mdi:calendar-alert',
                      tone: 'warning',
                      className: 'expiring-badge',
                      attrs: {
                        id: ELEMENTS.HEADER_EXPIRING_BADGE,
                        'data-action': ACTIONS.FILTER_EXPIRY,
                        'data-expiry': FILTER_VALUES.EXPIRY.SOON,
                        title: expiringText,
                        'aria-label': expiringText,
                      },
                    })
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
    const threshold = item.expiry_alert_days ?? DEFAULTS.EXPIRY_ALERT_DAYS;
    return DateUtils.isExpiringSoon(item.expiry_date, threshold);
  }).length;
}

function getExpiredItemsCount(items: InventoryItem[]): number {
  return items.filter((item) => {
    if (!item.expiry_date || (item.quantity ?? 0) <= 0) {
      return false;
    }
    return DateUtils.isExpired(item.expiry_date);
  }).length;
}
