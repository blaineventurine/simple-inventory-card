import { ELEMENTS, CSS_CLASSES, ACTIONS, DEFAULTS, MESSAGES } from './utils/constants';
import { InventoryItem } from './types/home-assistant';
import { TodoList } from './types/todoList';
import { FilterState } from './types/filterState';
import { Utils } from './utils/utils';

interface ModalConfig {
  id: string;
  title: string;
  primaryButtonText: string;
  primaryButtonId?: string;
  closeAction?: string;
  elements: {
    name: string;
    quantity: string;
    unit: string;
    category: string;
    expiry: string;
    autoAdd: string;
    threshold: string;
    todoList: string;
  };
  defaults?: {
    quantity?: number;
    threshold?: number;
  };
}

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
          ${item.auto_add_enabled ? `<span class="auto-add-info">Auto-add at ≤${item.threshold || 0} → ${getTodoListName(item.todo_list || '')}</span>` : ''}
        </div>
      </div>
      <div class="item-controls">
        <button class="settings-btn" data-action="open_settings" data-name="${item.name}">⚙️</button>
        <button class="control-btn" data-action="decrement" data-name="${item.name}" ${item.quantity === 0 ? 'disabled' : ''}>➖</button>
        <button class="control-btn" data-action="increment" data-name="${item.name}">➕</button>
        <button class="control-btn" data-action="remove" data-name="${item.name}">❌</button>
      </div>
    </div>
  `;
}

export function createSearchAndFilters(filters: FilterState, categories: string[]): string {
  return `
    <div class="search-row">
      <input 
        type="text" 
        id="${ELEMENTS.SEARCH_INPUT}" 
        placeholder="Search items..." 
        value="${filters.searchText || ''}"
        class="search-input ${filters.searchText ? 'has-value' : ''}"
      />
      <button id="${ELEMENTS.ADVANCED_SEARCH_TOGGLE}" 
        class="toggle-btn ${Utils.hasActiveFilters(filters) ? 'has-active-filters' : ''}">
        ${filters.showAdvanced ? 'Hide Filters' : 'Filters'}
      </button>
    </div>
    
    <div id="advanced-filters" class="advanced-filters" 
         style="display: ${filters.showAdvanced ? 'block' : 'none'}">
      <div class="filter-row">
        <div class="filter-group">
          <label>Category</label>
          <select id="${ELEMENTS.FILTER_CATEGORY}">
            <option value="">All Categories</option>
            ${createCategoryOptions(categories, filters.category)}
          </select>
        </div>
        
        <div class="filter-group">
          <label>Quantity</label>
          <select id="${ELEMENTS.FILTER_QUANTITY}">
            <option value="">All Quantities</option>
            <option value="zero" ${filters.quantity === 'zero' ? 'selected' : ''}>Zero</option>
            <option value="nonzero" ${filters.quantity === 'nonzero' ? 'selected' : ''}>Non-zero</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Expiry</label>
          <select id="${ELEMENTS.FILTER_EXPIRY}">
            <option value="">All Items</option>
            <option value="none" ${filters.expiry === 'none' ? 'selected' : ''}>No Expiry</option>
            <option value="expired" ${filters.expiry === 'expired' ? 'selected' : ''}>Expired</option>
            <option value="soon" ${filters.expiry === 'soon' ? 'selected' : ''}>Expiring Soon</option>
            <option value="future" ${filters.expiry === 'future' ? 'selected' : ''}>Future</option>
          </select>
        </div>
      </div>
      
      <div class="filter-actions">
        <button id="${ELEMENTS.APPLY_FILTERS}">Apply</button>
        <button id="${ELEMENTS.CLEAR_FILTERS}">Clear</button>
      </div>
    </div>
  `;
}

export function createCategoryOptions(categories: string[], selectedCategory: string): string {
  return categories
    .map(
      (category) =>
        `<option value="${category}" ${category === selectedCategory ? 'selected' : ''}>${category}</option>`
    )
    .join('');
}

export function createSortOptions(sortMethod: string): string {
  return `
    <label for="${ELEMENTS.SORT_METHOD}">Sort by:</label> 
    <select id="${ELEMENTS.SORT_METHOD}">
      <option value="name" ${sortMethod === 'name' ? 'selected' : ''}>Name</option>
      <option value="category" ${sortMethod === 'category' ? 'selected' : ''}>Category</option>
      <option value="quantity" ${sortMethod === 'quantity' ? 'selected' : ''}>Quantity (High)</option>
      <option value="quantity-low" ${sortMethod === 'quantity-low' ? 'selected' : ''}>Quantity (Low)</option>
      <option value="expiry" ${sortMethod === 'expiry' ? 'selected' : ''}>Expiry Date</option>
      <option value="zero-last" ${sortMethod === 'zero-last' ? 'selected' : ''}>Zero Last</option>
    </select>
  `;
}

export function createActiveFiltersDisplay(filters: FilterState): string {
  const activeFilters: string[] = [];

  if (filters.searchText) {
    activeFilters.push(`Search: "${filters.searchText}"`);
  }
  if (filters.category) {
    activeFilters.push(`Category: ${filters.category}`);
  }
  if (filters.quantity) {
    activeFilters.push(`Quantity: ${filters.quantity}`);
  }
  if (filters.expiry) {
    activeFilters.push(`Expiry: ${filters.expiry}`);
  }

  const shouldShow = activeFilters.length > 0;

  return `
    <div id="${ELEMENTS.ACTIVE_FILTERS}" class="active-filters" style="display: ${shouldShow ? 'block' : 'none'};">
      <span>Active filters: </span>
      <span id="${ELEMENTS.ACTIVE_FILTERS_LIST}">${activeFilters.join(', ')}</span>
    </div>
  `;
}

export function createItemsList(
  items: InventoryItem[],
  sortMethod: string,
  todoLists: TodoList[]
): string {
  if (items.length === 0) {
    return `<div class="no-items">${MESSAGES.NO_ITEMS}</div>`;
  }

  if (sortMethod === 'category') {
    return createItemsByCategory(items, todoLists);
  }

  return items.map((item) => createItemRowTemplate(item, todoLists)).join('');
}

export function createItemsByCategory(items: InventoryItem[], todoLists: TodoList[]): string {
  const grouped = Utils.groupItemsByCategory(items);
  const sortedCategories = Object.keys(grouped).sort();

  return sortedCategories
    .map(
      (category) => `
        <div class="${CSS_CLASSES.CATEGORY_GROUP}">
          <div class="${CSS_CLASSES.CATEGORY_HEADER}">${category}</div>
          ${grouped[category].map((item) => createItemRowTemplate(item, todoLists)).join('')}
        </div>
      `
    )
    .join('');
}

export function createUnifiedModal(todoLists: TodoList[], config: ModalConfig): string {
  return `
    <div id="${config.id}" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${config.title}</h3>
          <button class="${CSS_CLASSES.CLOSE_BTN}" ${config.closeAction ? `data-action="${config.closeAction}"` : ''}>×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="${config.elements.name}" class="form-label">Name *</label>
            <input type="text" id="${config.elements.name}" required />
          </div>
          
          <div class="form-row">
            <div class="input-group">
              <label for="${config.elements.quantity}">Quantity</label>
              <input type="number" id="${config.elements.quantity}" ${config.defaults?.quantity ? `value="${config.defaults.quantity}"` : ''} min="0" />
            </div>
            
            <div class="input-group">
              <label for="${config.elements.unit}">Unit</label>
              <input type="text" id="${config.elements.unit}" placeholder="kg, pcs, etc." />
            </div>
          </div>
          
          <div class="form-group">
            <label for="${config.elements.category}" class="form-label">Category</label>
            <input type="text" id="${config.elements.category}" placeholder="Food, Cleaning, etc." />
          </div>
          
          <div class="form-group">
            <label for="${config.elements.expiry}" class="form-label">Expiry Date</label>
            <input type="date" id="${config.elements.expiry}" />
          </div>
          
          <div class="form-group auto-add-section">
            <input type="checkbox" id="${config.elements.autoAdd}" class="auto-add-checkbox" />
            <label for="${config.elements.autoAdd}" class="checkbox-label">
              Auto-add to todo list when low
            </label>
            
            <div class="auto-add-controls">
              <div class="form-row">
                <div class="input-group">
                  <label for="${config.elements.threshold}">Threshold *</label>
                  <input 
                    type="number" 
                    id="${config.elements.threshold}" 
                    ${config.defaults?.threshold ? `value="${config.defaults.threshold}"` : ''} 
                    min="0"
                    class="auto-add-required"
                  />
                </div>
                
                <div class="input-group">
                  <label for="${config.elements.todoList}">Todo List *</label>
                  <select id="${config.elements.todoList}" class="auto-add-required">
                    <option value="">Select list...</option>
                    ${todoLists
                      .map((list) => `<option value="${list.id}">${list.name}</option>`)
                      .join('')}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-buttons">
          <button ${config.primaryButtonId ? `id="${config.primaryButtonId}"` : ''} class="primary-btn">${config.primaryButtonText}</button>
          <button class="cancel-btn" ${config.closeAction ? `data-action="${config.closeAction}"` : ''}>Cancel</button>
        </div>
      </div>
    </div>
  `;
}

export function createAddModal(todoLists: TodoList[]): string {
  return createUnifiedModal(todoLists, {
    id: ELEMENTS.ADD_MODAL,
    title: 'Add Item',
    primaryButtonText: 'Add Item',
    primaryButtonId: ELEMENTS.ADD_ITEM_BTN,
    closeAction: ACTIONS.CLOSE_ADD_MODAL,
    elements: {
      name: ELEMENTS.ITEM_NAME,
      quantity: ELEMENTS.ITEM_QUANTITY,
      unit: ELEMENTS.ITEM_UNIT,
      category: ELEMENTS.ITEM_CATEGORY,
      expiry: ELEMENTS.ITEM_EXPIRY,
      autoAdd: ELEMENTS.ITEM_AUTO_ADD,
      threshold: ELEMENTS.ITEM_THRESHOLD,
      todoList: ELEMENTS.ITEM_TODO_LIST,
    },
    defaults: {
      quantity: DEFAULTS.QUANTITY,
      threshold: DEFAULTS.THRESHOLD,
    },
  });
}

export function createSettingsModal(todoLists: TodoList[]): string {
  return createUnifiedModal(todoLists, {
    id: ELEMENTS.SETTINGS_MODAL,
    title: 'Edit Item',
    primaryButtonText: 'Save Changes',
    elements: {
      name: ELEMENTS.MODAL_ITEM_NAME,
      quantity: ELEMENTS.MODAL_ITEM_QUANTITY,
      unit: ELEMENTS.MODAL_ITEM_UNIT,
      category: ELEMENTS.MODAL_ITEM_CATEGORY,
      expiry: ELEMENTS.MODAL_ITEM_EXPIRY,
      autoAdd: ELEMENTS.MODAL_AUTO_ADD,
      threshold: ELEMENTS.MODAL_THRESHOLD,
      todoList: ELEMENTS.MODAL_TODO_LIST,
    },
  });
}
