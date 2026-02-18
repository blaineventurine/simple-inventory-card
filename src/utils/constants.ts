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
export const WS_COMMANDS = {
  EXPORT: `${DOMAIN}/export`,
  GET_HISTORY: `${DOMAIN}/get_history`,
  GET_ITEM_CONSUMPTION_RATES: `${DOMAIN}/get_item_consumption_rates`,
  GET_ITEM: `${DOMAIN}/get_item`,
  IMPORT: `${DOMAIN}/import`,
  LIST_ITEMS: `${DOMAIN}/list_items`,
  SUBSCRIBE: `${DOMAIN}/subscribe`,
};

export const PARAMS = {
  AMOUNT: 'amount',
  AUTO_ADD_ENABLED: 'auto_add_enabled',
  AUTO_ADD_ID_TO_DESCRIPTION_ENABLED: 'auto_add_id_to_description_enabled',
  AUTO_ADD_TO_LIST_QUANTITY: 'auto_add_to_list_quantity',
  BARCODE: 'barcode',
  CATEGORY: 'category',
  DESCRIPTION: 'description',
  DESIRED_QUANTITY: 'desired_quantity',
  EXPIRY_ALERT_DAYS: 'expiry_alert_days',
  EXPIRY_DATE: 'expiry_date',
  INVENTORY_ID: 'inventory_id',
  LOCATION: 'location',
  NAME: 'name',
  OLD_NAME: 'old_name',
  QUANTITY: 'quantity',
  TODO_LIST: 'todo_list',
  TODO_QUANTITY_PLACEMENT: 'todo_quantity_placement',
  UNIT: 'unit',
};

export const ELEMENTS = {
  ADD_MODAL: 'add-modal',
  EDIT_MODAL: 'edit-modal',

  AUTO_ADD_ENABLED: 'auto-add-enabled',
  AUTO_ADD_ID_TO_DESCRIPTION_ENABLED: 'auto-add-id-to-description-enabled',
  AUTO_ADD_TO_LIST_QUANTITY: 'auto-add-to-list-quantity',
  BARCODE: 'barcode',
  CATEGORY: 'category',
  DESCRIPTION: 'description',
  DESIRED_QUANTITY: 'desired-quantity',
  EXPIRY_ALERT_DAYS: 'expiry-alert-days',
  EXPIRY_DATE: 'expiry-date',
  LOCATION: 'location',
  NAME: 'name',
  QUANTITY: 'quantity',
  TODO_LIST: 'todo-list',
  TODO_QUANTITY_PLACEMENT: 'todo-quantity-placement',
  UNIT: 'unit',

  ADD_ITEM_BTN: 'add-item-btn',
  EXPORT_INVENTORY: 'export-inventory',
  HISTORY_MODAL: 'history-modal',
  IMPORT_INVENTORY: 'import-inventory',
  OPEN_ADD_MODAL: 'open-add-modal',
  OVERFLOW_MENU_BTN: 'overflow-menu-btn',
  OVERFLOW_MENU: 'overflow-menu',
  EDIT_HISTORY_BTN: 'edit-history-btn',
  EDIT_DELETE_BTN: 'edit-delete-btn',
  HISTORY_TAB_HISTORY: 'history-tab-history',
  HISTORY_TAB_CONSUMPTION: 'history-tab-consumption',
  HISTORY_TAB_CONTENT: 'history-tab-content',

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
  DELETE_BTN: 'delete-btn',
  HISTORY_LINK: 'history-link',
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
  VIEW_HISTORY: 'view_history',
};

export const DEFAULTS = {
  AUTO_ADD_ENABLED: false,
  AUTO_ADD_ID_TO_DESCRIPTION_ENABLED: false,
  AUTO_ADD_TO_LIST_QUANTITY: 0,
  BARCODE: '',
  CATEGORY: '',
  DESCRIPTION: '',
  DESIRED_QUANTITY: 0,
  EXPIRY_ALERT_DAYS: 1,
  EXPIRY_DATE: '',
  LOCATION: '',
  QUANTITY: 1,
  SORT_METHOD: 'name',
  TODO_LIST: '',
  TODO_QUANTITY_PLACEMENT: 'name',
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
export const VISIBLE_FIELDS_DEFAULTS = {
  show_header: true,
  show_search: true,
  show_sort: true,
  show_add_button: true,
  show_description: true,
  show_location: true,
  show_category: true,
  show_expiry: true,
  show_auto_add_info: true,
};

export const DEFAULT_INVENTORY_NAME = 'Inventory';
