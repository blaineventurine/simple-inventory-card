/**
 * Constants for Simple Inventory frontend components
 * Matches backend constants in const.py
 */

// Core Integration
export const DOMAIN = 'simple_inventory';

// Services (must match backend const.py)
export const SERVICES = {
  ADD_ITEM: 'add_item',
  REMOVE_ITEM: 'remove_item',
  INCREMENT_ITEM: 'increment_item',
  DECREMENT_ITEM: 'decrement_item',
  UPDATE_ITEM: 'update_item',
  UPDATE_ITEM_SETTINGS: 'update_item_settings',
};

// Service Parameters (must match backend)
export const PARAMS = {
  AMOUNT: 'amount',
  AUTO_ADD_ENABLED: 'auto_add_enabled',
  AUTO_ADD_TO_LIST_QUANTITY: 'auto_add_to_list_quantity',
  CATEGORY: 'category',
  EXPIRY_ALERT_DAYS: 'expiry_alert_days',
  EXPIRY_DATE: 'expiry_date',
  INVENTORY_ID: 'inventory_id',
  NAME: 'name',
  OLD_NAME: 'old_name',
  QUANTITY: 'quantity',
  TODO_LIST: 'todo_list',
  UNIT: 'unit',
};

export const ELEMENTS = {
  ADD_MODAL: 'add-modal',
  EDIT_MODAL: 'edit-modal',

  NAME: 'name',
  QUANTITY: 'quantity',
  UNIT: 'unit',
  CATEGORY: 'category',
  EXPIRY_DATE: 'expiry-date',
  EXPIRY_ALERT_DAYS: 'expiry-alert-days',
  AUTO_ADD_ENABLED: 'auto-add-enabled',
  AUTO_ADD_TO_LIST_QUANTITY: 'auto-add-to-list-quantity',
  TODO_LIST: 'todo-list',

  ADD_ITEM_BTN: 'add-item-btn',
  OPEN_ADD_MODAL: 'open-add-modal',

  SEARCH_INPUT: 'search-input',
  SORT_METHOD: 'sort-method',
  ADVANCED_SEARCH_TOGGLE: 'advanced-search-toggle',
  FILTER_CATEGORY: 'filter-category',
  FILTER_QUANTITY: 'filter-quantity',
  FILTER_EXPIRY: 'filter-expiry',
  APPLY_FILTERS: 'apply-filters',
  CLEAR_FILTERS: 'clear-filters',
  ACTIVE_FILTERS: 'active-filters',
  ACTIVE_FILTERS_LIST: 'active-filters-list',
};

export const CSS_CLASSES = {
  SHOW: 'show',
  SAVE_BTN: 'save-btn',
  CANCEL_BTN: 'cancel-btn',
  CLOSE_BTN: 'close-btn',
  MODAL_CONTENT: 'modal-content',
  CATEGORY_GROUP: 'category-group',
  CATEGORY_HEADER: 'category-header',
};

export const ACTIONS = {
  INCREMENT: 'increment',
  DECREMENT: 'decrement',
  REMOVE: 'remove',
  OPEN_EDIT_MODAL: 'open_edit',
  CLOSE_ADD_MODAL: 'close_add_modal',
};

export const DEFAULTS = {
  AUTO_ADD_ENABLED: false,
  AUTO_ADD_TO_LIST_QUANTITY: 0,
  CATEGORY: '',
  EXPIRY_DATE: '',
  EXPIRY_ALERT_DAYS: 1,
  QUANTITY: 1,
  SORT_METHOD: 'name',
  TODO_LIST: '',
  UNIT: '',
};

export const SORT_METHODS = {
  CATEGORY: 'category',
  EXPIRY: 'expiry',
  NAME: 'name',
  QUANTITY: 'quantity',
  QUANTITY_LOW: 'quantity-low',
  ZERO_LAST: 'zero-last',
};

export const FILTERS = {
  CATEGORY: 'category',
  EXPIRY: 'expiry',
  QUANTITY: 'quantity',
  SEARCH_TEXT: 'searchText',
  SHOW_ADVANCED: 'showAdvanced',
};

export const FILTER_VALUES = {
  QUANTITY: {
    ZERO: 'zero',
    NONZERO: 'nonzero',
  },
  EXPIRY: {
    NONE: 'none',
    EXPIRED: 'expired',
    SOON: 'soon',
    FUTURE: 'future',
  },
};

export const STORAGE_KEYS = {
  FILTERS: (entity: string) => `simple_inventory_filters_${entity}`,
};

export const MESSAGES = {
  CONFIRM_REMOVE: (name: string) => `Remove ${name} from inventory?`,
  ERROR_NO_NAME: 'Please enter an item name',
  LOADING: 'Loading...',
  NO_ITEMS: 'No items in inventory',
};

export const TIMING = {
  SEARCH_DEBOUNCE: 300,
  MODAL_FOCUS_DELAY: 100,
  ADD_ITEM_DELAY: 10,
};
export const DEFAULT_INVENTORY_NAME = 'Inventory';
