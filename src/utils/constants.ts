/**
 * Constants for Simple Inventory frontend components
 * Matches backend constants in const.py
 */

// Core Integration
export const DOMAIN = 'simple_inventory';

// Services (must match backend const.py)
export const SERVICES = {
  ADD_ITEM: 'add_item',
  DECREMENT_ITEM: 'decrement_item',
  INCREMENT_ITEM: 'increment_item',
  REMOVE_ITEM: 'remove_item',
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
  LOCATION: 'location',
  NAME: 'name',
  OLD_NAME: 'old_name',
  QUANTITY: 'quantity',
  TODO_LIST: 'todo_list',
  UNIT: 'unit',
};

export const ELEMENTS = {
  ADD_MODAL: 'add-modal',
  EDIT_MODAL: 'edit-modal',

  AUTO_ADD_ENABLED: 'auto-add-enabled',
  AUTO_ADD_TO_LIST_QUANTITY: 'auto-add-to-list-quantity',
  CATEGORY: 'category',
  EXPIRY_ALERT_DAYS: 'expiry-alert-days',
  EXPIRY_DATE: 'expiry-date',
  LOCATION: 'location',
  NAME: 'name',
  QUANTITY: 'quantity',
  TODO_LIST: 'todo-list',
  UNIT: 'unit',

  ADD_ITEM_BTN: 'add-item-btn',
  OPEN_ADD_MODAL: 'open-add-modal',

  ACTIVE_FILTERS: 'active-filters',
  ACTIVE_FILTERS_LIST: 'active-filters-list',
  ADVANCED_SEARCH_TOGGLE: 'advanced-search-toggle',
  APPLY_FILTERS: 'apply-filters',
  CLEAR_ALL_FILTERS: 'clear-all-filters',
  CLEAR_FILTERS: 'clear-filters',
  FILTER_CATEGORY: 'filter-category',
  FILTER_EXPIRY: 'filter-expiry',
  FILTER_LOCATION: 'filter-location',
  FILTER_QUANTITY: 'filter-quantity',
  SEARCH_INPUT: 'search-input',
  SORT_METHOD: 'sort-method',
};

export const CSS_CLASSES = {
  CANCEL_BTN: 'cancel-btn',
  CATEGORY_GROUP: 'category-group',
  CATEGORY_HEADER: 'category-header',
  CLOSE_BTN: 'close-btn',
  LOCATION_GROUP: 'location-group',
  LOCATION_HEADER: 'location-header',
  MODAL_CONTENT: 'modal-content',
  SAVE_BTN: 'save-btn',
  SHOW: 'show',
};

export const ACTIONS = {
  CLOSE_ADD_MODAL: 'close_add_modal',
  DECREMENT: 'decrement',
  INCREMENT: 'increment',
  OPEN_EDIT_MODAL: 'open_edit',
  REMOVE: 'remove',
};

export const DEFAULTS = {
  AUTO_ADD_ENABLED: false,
  AUTO_ADD_TO_LIST_QUANTITY: 0,
  CATEGORY: '',
  EXPIRY_ALERT_DAYS: 1,
  EXPIRY_DATE: '',
  LOCATION: '',
  QUANTITY: 1,
  SORT_METHOD: 'name',
  TODO_LIST: '',
  UNIT: '',
};

export const SORT_METHODS = {
  CATEGORY: 'category',
  EXPIRY: 'expiry',
  LOCATION: 'location',
  NAME: 'name',
  QUANTITY: 'quantity',
  QUANTITY_LOW: 'quantity-low',
  ZERO_LAST: 'zero-last',
};

export const FILTERS = {
  CATEGORY: 'category',
  EXPIRY: 'expiry',
  LOCATION: 'location',
  QUANTITY: 'quantity',
  SEARCH_TEXT: 'searchText',
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

export const TIMING = {
  SEARCH_DEBOUNCE: 300,
  MODAL_FOCUS_DELAY: 100,
  ADD_ITEM_DELAY: 10,
};
export const DEFAULT_INVENTORY_NAME = 'Inventory';
