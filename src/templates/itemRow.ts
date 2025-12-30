import { DEFAULTS } from '@/utils/constants';
import { InventoryItem } from '../types/homeAssistant';
import { TodoList } from '../types/todoList';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';

export function createItemRowTemplate(
  item: InventoryItem,
  todoLists: TodoList[],
  translations: TranslationData,
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

  const renderLocationAndCategory = () => {
    if (item.location && item.category) {
      return `<span class="location-category">${item.location} | ${item.category}</span>`;
    } else if (item.location) {
      return `<span class="location">${item.location}</span>`;
    } else if (item.category) {
      return `<span class="category">${item.category}</span>`;
    } else {
      return '';
    }
  };

  return `
    <div class="item-row ${item.quantity === 0 ? 'zero-quantity' : ''} ${item.auto_add_enabled ? 'auto-add-enabled' : ''}">
      <div class="item-header">
        <span class="item-name">${item.name}</span>
        ${renderLocationAndCategory()}
      </div>
      <div class="item-description">
        <span>${item.description || ''}</span>
      </div>
      <div class="item-footer">
        <div class="item-details">
          <span class="quantity">${item.quantity} ${item.unit || ''}</span>
          ${expiryInfo ? `<span class="expiry ${expiryInfo.class}">${expiryInfo.label}</span>` : ''}
          ${
            item.auto_add_enabled
              ? `<span class="auto-add-info">${TranslationManager.localize(
                  translations,
                  'items.auto_add_info',
                  {
                    quantity: item.auto_add_to_list_quantity || 0,
                    list: getTodoListName(item.todo_list || ''),
                  },
                  `Auto-add at ≤ ${item.auto_add_to_list_quantity || 0} → ${getTodoListName(item.todo_list || '')}`,
                )}</span>`
              : ''
          }

        </div>
        <div class="item-controls">
          <button class="edit-btn" data-action="open_edit" data-name="${item.name}">⚙️</button>
          <button class="control-btn" data-action="decrement" data-name="${item.name}" ${item.quantity === 0 ? 'disabled' : ''}>➖</button>
          <button class="control-btn" data-action="increment" data-name="${item.name}">➕</button>
          <button class="control-btn" data-action="remove" data-name="${item.name}">❌</button>
        </div>
      </div>
    </div>
  `;
}
