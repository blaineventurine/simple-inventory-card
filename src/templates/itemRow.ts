import { DEFAULTS } from '@/utils/constants';
import { InventoryConfig, InventoryItem } from '@/types/homeAssistant';
import { TodoList } from '@/types/todoList';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '@/utils/utilities';

export function createItemRowTemplate(
  item: InventoryItem,
  todoLists: TodoList[],
  translations: TranslationData,
  config?: InventoryConfig,
): string {
  const getTodoListName = (entityId: string): string => {
    const list = todoLists.find((l) => l.entity_id === entityId || l.id === entityId);
    return list ? list.name : entityId;
  };

  const getExpiryStatus = (
    expiryDate: string,
    threshold: number = DEFAULTS.EXPIRY_ALERT_DAYS,
  ): { class: string; label: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate + 'T00:00:00');

    const daysUntilExpiry = Math.floor(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) {
      const daysAgo = Math.abs(daysUntilExpiry);
      const key = daysAgo === 1 ? 'expiry.expired_day_ago' : 'expiry.expired_days_ago';
      return {
        class: 'expired',
        label: TranslationManager.localize(
          translations,
          key,
          { days: daysAgo },
          `Expired ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`,
        ),
      };
    } else if (daysUntilExpiry === 0) {
      return {
        class: 'expires-today',
        label: TranslationManager.localize(
          translations,
          'expiry.expires_today',
          undefined,
          'Expires today',
        ),
      };
    } else if (daysUntilExpiry <= threshold) {
      const key = daysUntilExpiry === 1 ? 'expiry.expires_in_day' : 'expiry.expires_in_days';
      return {
        class: 'expiring-soon',
        label: TranslationManager.localize(
          translations,
          key,
          { days: daysUntilExpiry },
          `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
        ),
      };
    } else {
      return { class: 'expiry-safe', label: `${expiryDate}` };
    }
  };

  const expiryInfo = item.expiry_date
    ? getExpiryStatus(item.expiry_date, item.expiry_alert_days)
    : null;

  const showLocation = config?.show_location !== false;
  const showCategory = config?.show_category !== false;

  const renderLocationAndCategory = () => {
    const locationText =
      showLocation && item.locations && item.locations.length > 0
        ? item.locations.join(', ')
        : showLocation
          ? item.location
          : '';
    const categoryText =
      showCategory && item.categories && item.categories.length > 0
        ? item.categories.join(', ')
        : showCategory
          ? item.category
          : '';

    const safeLocation = Utilities.sanitizeHtml(locationText || '');
    const safeCategory = Utilities.sanitizeHtml(categoryText || '');

    if (locationText && categoryText) {
      return `<span class="location-category">${safeLocation} | ${safeCategory}</span>`;
    } else if (locationText) {
      return `<span class="location">${safeLocation}</span>`;
    } else if (categoryText) {
      return `<span class="category">${safeCategory}</span>`;
    } else {
      return '';
    }
  };

  const safeName = Utilities.sanitizeHtml(item.name);
  const safeDescription = Utilities.sanitizeHtml(item.description || '');
  const safeUnit = Utilities.sanitizeHtml(item.unit || '');

  return `
    <div class="item-row ${item.quantity === 0 ? 'zero-quantity' : ''} ${item.auto_add_enabled ? 'auto-add-enabled' : ''}">
      <div class="item-header">
        <span class="item-name" data-action="open_edit" data-name="${safeName}" role="button" tabindex="0">${safeName}</span>
        ${renderLocationAndCategory()}
      </div>
      ${
        config?.show_description !== false
          ? `<div class="item-description">
        <span>${safeDescription}</span>
      </div>`
          : ''
      }
      <div class="item-footer">
        <div class="item-footer-row">
          <div class="item-details">
            <span class="quantity">${item.quantity} ${safeUnit}</span>
            ${config?.show_price !== false && item.price && item.price > 0 ? `<span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>` : ''}
            ${config?.show_expiry !== false && expiryInfo ? `<span class="expiry ${expiryInfo.class}">${expiryInfo.label}</span>` : ''}
          </div>
          <div class="item-controls">
            <button class="control-btn" data-action="decrement" data-name="${safeName}" ${item.quantity === 0 ? 'disabled' : ''}>➖</button>
            <button class="control-btn" data-action="increment" data-name="${safeName}">➕</button>
          </div>
        </div>
        ${
          config?.show_auto_add_info !== false && item.auto_add_enabled
            ? `<div class="auto-add-info">${TranslationManager.localize(
                translations,
                'items.auto_add_info',
                {
                  quantity: item.auto_add_to_list_quantity || 0,
                  list: getTodoListName(item.todo_list || ''),
                },
                `Auto-add at ≤ ${item.auto_add_to_list_quantity || 0} → ${getTodoListName(item.todo_list || '')}`,
              )}</div>`
            : ''
        }
      </div>
    </div>
  `;
}
