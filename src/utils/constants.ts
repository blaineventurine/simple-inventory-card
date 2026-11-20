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
  REMOVE_BATCH: 'remove_batch',
  REMOVE_ITEM: 'remove_item',
  SET_ITEM_IMAGE_FROM_BARCODE: 'set_item_image_from_barcode',
  SET_ITEM_IMAGE_FROM_MEDIA: 'set_item_image_from_media',
  TRANSFER_ITEM: 'transfer_item',
  UPDATE_BATCH: 'update_batch',
  UPDATE_ITEM: 'update_item',
  SCAN_BARCODE: 'scan_barcode',
};

// Service Parameters (must match backend)
export const PANEL_ELEMENT = 'simple-inventory-panel';

/**
 * Events an embedded card sends its panel (composed, bubbling): `OPEN` a tile's item page
 * (`{inventory_id, item_id}`), `CLOSE` it from its back arrow (`{inventory_id}`).
 */
export const ITEM_EVENTS = {
  OPEN: 'si-open-item',
  CLOSE: 'si-close-item',
};

export const WS_COMMANDS = {
  EXPORT: `${DOMAIN}/export`,
  GET_HISTORY: `${DOMAIN}/get_history`,
  GET_INFO: `${DOMAIN}/get_info`,
  GET_ITEM_CONSUMPTION_RATES: `${DOMAIN}/get_item_consumption_rates`,
  GET_ITEM: `${DOMAIN}/get_item`,
  IMPORT: `${DOMAIN}/import`,
  LIST_INVENTORIES: `${DOMAIN}/list_inventories`,
  LIST_ITEMS: `${DOMAIN}/list_items`,
  LOOKUP_BARCODE_PRODUCT: `${DOMAIN}/lookup_barcode_product`,
  LOOKUP_BY_BARCODE: `${DOMAIN}/lookup_by_barcode`,
  OVERVIEW: `${DOMAIN}/overview`,
  SEARCH: `${DOMAIN}/search`,
  SUBSCRIBE: `${DOMAIN}/subscribe`,
};

export const PARAMS = {
  ALIASES: 'aliases',
  AMOUNT: 'amount',
  AUTO_ADD_ENABLED: 'auto_add_enabled',
  AUTO_ADD_ID_TO_DESCRIPTION_ENABLED: 'auto_add_id_to_description_enabled',
  AUTO_ADD_TO_LIST_QUANTITY: 'auto_add_to_list_quantity',
  BARCODE: 'barcode',
  BATCH_ID: 'batch_id',
  CATEGORY: 'category',
  DESCRIPTION: 'description',
  DESIRED_QUANTITY: 'desired_quantity',
  EXPIRY_ALERT_DAYS: 'expiry_alert_days',
  EXPIRY_DATE: 'expiry_date',
  ICON: 'icon',
  INVENTORY_ID: 'inventory_id',
  LOCATION: 'location',
  LOOKUP_BARCODE: 'lookup_barcode',
  MEDIA_CONTENT_ID: 'media_content_id',
  NAME: 'name',
  OLD_NAME: 'old_name',
  PRICE: 'price',
  PURCHASED_AT: 'purchased_at',
  QUANTITY: 'quantity',
  TODO_LIST: 'todo_list',
  TODO_QUANTITY_PLACEMENT: 'todo_quantity_placement',
  TO_LOCATION: 'to_location',
  UNIT: 'unit',
  UNIT_PRICE: 'unit_price',
};

export const ELEMENTS = {
  ADD_MODAL: 'add-modal',
  EDIT_MODAL: 'edit-modal',

  ALIASES: 'aliases',
  AUTO_ADD_ENABLED: 'auto-add-enabled',
  AUTO_ADD_ID_TO_DESCRIPTION_ENABLED: 'auto-add-id-to-description-enabled',
  AUTO_ADD_TO_LIST_QUANTITY: 'auto-add-to-list-quantity',
  BARCODE: 'barcode',
  CATEGORY: 'category',
  DESCRIPTION: 'description',
  DESIRED_QUANTITY: 'desired-quantity',
  EXPIRY_ALERT_DAYS: 'expiry-alert-days',
  EXPIRY_DATE: 'expiry-date',
  ICON: 'icon',
  IMAGE: 'image',
  /** The full-screen photo viewer overlay (`ImageViewer`). */
  IMAGE_VIEWER: 'image-viewer',
  LOCATION: 'location',
  NAME: 'name',
  PRICE: 'price',
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
  /** The edit sheet's ⋮ `<details>`; `sheet()` names it `${id}-menu`. */
  EDIT_MENU: 'edit-modal-menu',
  EDIT_BATCH_EDITOR: 'edit-batch-editor',
  BATCH_LOCATION_OPTIONS: 'batch-location-options',
  ADD_DUPLICATE_BATCH: 'add-duplicate-batch',
  ADD_DUPLICATE_BATCH_BTN: 'add-duplicate-batch-btn',
  ADD_DUPLICATE_BATCH_NOTE: 'add-duplicate-batch-note',
  HISTORY_TAB_HISTORY: 'history-tab-history',
  HISTORY_TAB_CONSUMPTION: 'history-tab-consumption',
  HISTORY_TAB_CONTENT: 'history-tab-content',
  HISTORY_CLOSE: 'close-history-modal',
  IMPORT_RESULT_MODAL: 'import-result-modal',
  IMPORT_RESULT_CLOSE: 'import-result-close',

  PRODUCT_PICKER: 'product-picker',
  PRODUCT_PICKER_LIST: 'product-picker-list',

  BARCODE_SCAN_BTN: 'barcode-scan-btn',
  BARCODE_SCANNER: 'barcode-scanner',
  BARCODE_VIEWPORT: 'barcode-viewport',
  BARCODE_SCANNER_CLOSE: 'barcode-scanner-close',
  /** The "Choose a photo" offer shown when the camera can't be used, with its message. */
  BARCODE_PHOTO: 'barcode-photo',
  BARCODE_PHOTO_MESSAGE: 'barcode-photo-message',
  BARCODE_PHOTO_BTN: 'barcode-photo-btn',

  HEADER_EXPIRED_BADGE: 'header-expired-badge',
  HEADER_EXPIRING_BADGE: 'header-expiring-badge',
  HEADER_SCAN_BTN: 'header-scan-btn',
  SCAN_PANEL: 'scan-panel',
  SCAN_VIEWPORT: 'scan-viewport',
  SCAN_CLOSE: 'scan-close',
  SCAN_ACTION_BAR: 'scan-action-bar',
  SCAN_ACTION_SELECT: 'scan-action-select',
  SCAN_AMOUNT_INPUT: 'scan-amount-input',
  SCAN_GO_BTN: 'scan-go-btn',
  SCAN_ITEM_NAME: 'scan-item-name',
  SCAN_ITEM_QUANTITY: 'scan-item-quantity',
  SCAN_ADD_BTN: 'scan-add-btn',
  SCAN_EXISTING_CONTROLS: 'scan-existing-controls',
  SCAN_CANCEL_BTN: 'scan-cancel-btn',
  SCAN_BATCH_FIELDS: 'scan-batch-fields',
  /** The "Choose a photo" offer shown when the camera can't be used, with its message. */
  SCAN_PHOTO: 'scan-photo',
  SCAN_PHOTO_MESSAGE: 'scan-photo-message',

  ACTIVE_FILTERS: 'active-filters',
  ACTIVE_FILTERS_LIST: 'active-filters-list',
  ADVANCED_SEARCH_TOGGLE: 'advanced-search-toggle',
  APPLY_FILTERS: 'apply-filters',
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

/**
 * Every clickable control's `data-action`; `EventHandler` dispatches on it (see
 * `services/actionRegistry.ts`). The payload rides on other `data-*` attributes, noted here.
 */
export const ACTIONS = {
  // Item rows and their details panel (data-name: the item; batch ones also data-batch-id).
  CANCEL_MOVE: 'cancel_move',
  CANCEL_RESTOCK: 'cancel_restock',
  DECREMENT: 'decrement',
  DECREMENT_BATCH: 'decrement_batch',
  INCREMENT: 'increment',
  OPEN_EDIT_MODAL: 'open_edit',
  OPEN_MOVE: 'open_move',
  OPEN_RESTOCK: 'open_restock',
  REMOVE: 'remove',
  SUBMIT_MOVE: 'submit_move',
  SUBMIT_RESTOCK: 'submit_restock',
  TOGGLE_BATCHES: 'toggle_batches',
  VIEW_HISTORY: 'view_history',
  VIEW_IMAGE: 'view_image',

  // Header, toolbar and filters.
  CLEAR_FILTERS: 'clear_filters',
  EXPORT_INVENTORY: 'export_inventory',
  /** data-expiry: the expiry filter value the header chip toggles. */
  FILTER_EXPIRY: 'filter_expiry',
  IMPORT_INVENTORY: 'import_inventory',
  OPEN_ADD_MODAL: 'open_add_modal',
  /** data-filter-remove: the filter key the active-filter chip clears. */
  REMOVE_FILTER: 'remove_filter',
  TOGGLE_ADVANCED_FILTERS: 'toggle_advanced_filters',
  TOGGLE_FILTER_DROPDOWN: 'toggle_filter_dropdown',
  /** Switches the item list between rows and tiles (saved per inventory). */
  TOGGLE_LAYOUT: 'toggle_layout',
  /** The item page's back arrow (the panel decides where back goes). */
  DETAIL_BACK: 'detail_back',
  /** A tile: the item page in the panel (data-item-id), the edit sheet on a dashboard. */
  OPEN_ITEM: 'open_item',
  TOGGLE_OVERFLOW_MENU: 'toggle_overflow_menu',

  // Header scan panel.
  CLOSE_SCAN: 'close_scan',
  OPEN_SCAN: 'open_scan',
  SCAN_CHOOSE_PHOTO: 'scan_choose_photo',
  SCAN_ADD_ITEM: 'scan_add_item',
  SCAN_GO: 'scan_go',

  // Add and edit sheets.
  ADD_AS_BATCH: 'add_as_batch',
  ADD_ITEM: 'add_item',
  CLOSE_ADD_MODAL: 'close_add_modal',
  CLOSE_EDIT_MODAL: 'close_edit_modal',
  EDIT_DELETE: 'edit_delete',
  EDIT_HISTORY: 'edit_history',
  SAVE_EDIT: 'save_edit',

  // Edit sheet batch editor.
  ADD_BATCH_ROW: 'add_batch_row',
  /** data-batch-discard: the unsaved row's key. */
  DISCARD_BATCH_ROW: 'discard_batch_row',
  /** data-batch-remove: the saved batch's id. */
  TOGGLE_BATCH_REMOVED: 'toggle_batch_removed',
} as const;

/** A `data-action` value. */
export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

export const DEFAULTS = {
  ALIASES: '',
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
  PRICE: 0,
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
  LAYOUT: (entity: string) => `simple_inventory_layout_${entity}`,
};

export const TIMING = {
  SEARCH_DEBOUNCE: 300,
  MODAL_FOCUS_DELAY: 100,
};

/** Optional capabilities reported by `simple_inventory/get_info` (`features`). */
export const BACKEND_FEATURES = {
  BATCHES: 'batches',
  ITEM_ICONS: 'item_icons',
  ITEM_IMAGES: 'item_images',
  OVERVIEW: 'overview',
  SEARCH: 'search',
  TILE_IMAGES: 'tile_images',
  TRANSFERS: 'transfers',
};

/** `data-batch-field` names of the shared batch inputs (see templates/modalPartials/batchFields). */
export const BATCH_FIELDS = {
  AMOUNT: 'amount',
  EXPIRY_DATE: 'expiry_date',
  LOCATION: 'location',
  PURCHASED_AT: 'purchased_at',
  QUANTITY: 'quantity',
  UNIT_PRICE: 'unit_price',
};

/** The integration's item image endpoint (`item_images`): GET/POST/DELETE `${IMAGE_API_PATH}/<item id>`. */
export const IMAGE_API_PATH = '/api/simple_inventory/image';

/** Largest image the integration accepts for upload (10 MB). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const DEFAULT_INVENTORY_NAME = 'Inventory';
