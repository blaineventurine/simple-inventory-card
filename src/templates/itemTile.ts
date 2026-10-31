import { InventoryConfig, InventoryItem } from '@/types/inventory';
import { TodoList } from '@/types/todoList';
import { TranslationData } from '@/types/translatableComponent';
import { RowOptions } from '@/types/rowOptions';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '@/utils/utilities';
import { ACTIONS, DEFAULTS } from '@/utils/constants';
import { DateUtils } from '@/utils/dateUtils';
import { itemImagePath } from '@/utils/itemImage';
import { STATUS_TONE, ItemStatus, itemIcon, itemStatus } from '@/utils/itemStatus';
import { itemSecondaryLine, itemStepper } from './itemRow';
import { photo } from './primitives';

/**
 * Status badge label of tiles and the item page: expired, expiring soon or low stock; '' for
 * the other statuses.
 */
export function itemBadgeLabel(
  item: InventoryItem,
  status: ItemStatus,
  translations: TranslationData,
): string {
  if (status === 'expired') {
    return TranslationManager.localize(translations, 'filters.expired', undefined, 'Expired');
  }
  if (status !== 'warning') {
    return '';
  }
  const threshold = item.expiry_alert_days ?? DEFAULTS.EXPIRY_ALERT_DAYS;
  return DateUtils.isExpiringSoon(item.expiry_date, threshold)
    ? TranslationManager.localize(translations, 'filters.expiring_soon', undefined, 'Expiring soon')
    : TranslationManager.localize(translations, 'items.low_stock', undefined, 'Low stock');
}

/**
 * One item as a grid tile: the photo at tile size (or the status-tinted icon) with a status
 * badge, and the name (together one `open_item` target: the item page in the panel, the edit
 * sheet elsewhere), the row's secondary line
 * and the row's stepper. Photos appear only with `rowOptions.images` (`item_images`); they load
 * `?tile=1` with `rowOptions.tileImages`, the full image otherwise. `todoLists` is unused (tiles
 * show no auto-add details) but keeps the row template's signature.
 */
export function createItemTileTemplate(
  item: InventoryItem,
  _todoLists: TodoList[],
  translations: TranslationData,
  config?: InventoryConfig,
  rowOptions?: RowOptions,
): string {
  const status = itemStatus(item);
  const tone = STATUS_TONE[status];
  const images = rowOptions?.images;
  const photoPath =
    images && config?.show_icon !== false
      ? itemImagePath(item, rowOptions?.tileImages === true ? 'tile' : 'full')
      : null;
  const media = photoPath
    ? photo(photoPath, images?.cached(photoPath), 'si-tile__photo')
    : `<span class="si-tile__icon si-tint si-tone-${tone}"><ha-icon icon="${Utilities.sanitizeHtml(itemIcon(item))}"></ha-icon></span>`;
  const label = itemBadgeLabel(item, status, translations);
  const badge = label
    ? `<span class="si-tile__badge si-tone-${tone}">${Utilities.sanitizeHtml(label)}</span>`
    : '';
  const name = Utilities.sanitizeHtml(item.name);
  const itemId = item.id ? ` data-item-id="${Utilities.sanitizeHtml(item.id)}"` : '';

  return `
    <div class="item-row si-tile${status === 'out' ? ' zero-quantity' : ''}" data-status="${status}">
      <div class="si-tile__open" data-action="${ACTIONS.OPEN_ITEM}" data-name="${name}"${itemId} role="button" tabindex="0">
        <div class="si-tile__media">${media}${badge}</div>
        <div class="item-name si-tile__name">${name}</div>
      </div>
      ${itemSecondaryLine(item, translations, config)}
      ${itemStepper(item, translations)}
    </div>
  `;
}
