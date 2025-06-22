import { InventoryItem } from '../types/homeAssistant';
import { TodoList } from '../types/todoList';

export function createItemRowTemplate(item: InventoryItem, todoLists: TodoList[]): string {
  const getTodoListName = (entityId: string): string => {
    const list = todoLists.find((l) => l.entity_id === entityId || l.id === entityId);
    return list ? list.name : entityId;
  };

  return `
    <div class="item-row ${item.quantity === 0 ? 'zero-quantity' : ''} ${item.auto_add_enabled ? 'auto-add-enabled' : ''}">
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-details">
          <span class="quantity">${item.quantity} ${item.unit || ''}</span>
          ${item.category ? `<span class="category">${item.category}</span>` : ''}
          ${item.expiry_date ? `<span class="expiry">Exp: ${item.expiry_date}</span>` : ''}
          ${item.auto_add_enabled ? `<span class="auto-add-info">Auto-add at ≤${item.auto_add_to_list_quantity || 0} → ${getTodoListName(item.todo_list || '')}</span>` : ''}
        </div>
      </div>
      <div class="item-controls">
        <button class="edit-btn" data-action="open_edit" data-name="${item.name}">⚙️</button>
        <button class="control-btn" data-action="decrement" data-name="${item.name}" ${item.quantity === 0 ? 'disabled' : ''}>➖</button>
        <button class="control-btn" data-action="increment" data-name="${item.name}">➕</button>
        <button class="control-btn" data-action="remove" data-name="${item.name}">❌</button>
      </div>
    </div>
  `;
}
