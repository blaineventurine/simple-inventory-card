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
  INVENTORY_ID: 'inventory_id',
  NAME: 'name',
  OLD_NAME: 'old_name',
  QUANTITY: 'quantity',
  UNIT: 'unit',
  CATEGORY: 'category',
  EXPIRY_DATE: 'expiry_date',
  AUTO_ADD_ENABLED: 'auto_add_enabled',
  THRESHOLD: 'threshold',
  TODO_LIST: 'todo_list',
  AMOUNT: 'amount',
};

export const ELEMENTS = {
  ADD_MODAL: 'add-modal',
  SETTINGS_MODAL: 'settings-modal',

  // Inputs - Add Modal
  ITEM_NAME: 'item-name',
  ITEM_QUANTITY: 'item-quantity',
  ITEM_UNIT: 'item-unit',
  ITEM_CATEGORY: 'item-category',
  ITEM_EXPIRY: 'item-expiry',
  ITEM_EXPIRY_THRESHOLD: 'item-expiry-threshold',
  ITEM_TODO_LIST: 'item-todo-list',
  ITEM_THRESHOLD: 'item-threshold',
  ITEM_AUTO_ADD: 'item-auto-add',

  // Inputs - Settings Modal
  MODAL_ITEM_NAME: 'modal-item-name',
  MODAL_ITEM_QUANTITY: 'modal-item-quantity',
  MODAL_ITEM_UNIT: 'modal-item-unit',
  MODAL_ITEM_CATEGORY: 'modal-item-category',
  MODAL_ITEM_EXPIRY: 'modal-item-expiry',
  MODAL_EXPIRY_THRESHOLD: 'modal-expiry-threshold',
  MODAL_AUTO_ADD: 'modal-auto-add',
  MODAL_THRESHOLD: 'modal-threshold',
  MODAL_TODO_LIST: 'modal-todo-list',

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
  OPEN_SETTINGS: 'open_settings',
  CLOSE_ADD_MODAL: 'close_add_modal',
};

export const DEFAULTS = {
  QUANTITY: 1,
  THRESHOLD: 0,
  UNIT: '',
  CATEGORY: '',
  EXPIRY_DATE: '',
  TODO_LIST: '',
  AUTO_ADD_ENABLED: false,
  SORT_METHOD: 'name',
};

export const SORT_METHODS = {
  NAME: 'name',
  CATEGORY: 'category',
  QUANTITY: 'quantity',
  QUANTITY_LOW: 'quantity-low',
  EXPIRY: 'expiry',
  ZERO_LAST: 'zero-last',
};

export const FILTERS = {
  SEARCH_TEXT: 'searchText',
  CATEGORY: 'category',
  QUANTITY: 'quantity',
  EXPIRY: 'expiry',
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
