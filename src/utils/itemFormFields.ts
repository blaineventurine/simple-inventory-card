import { DEFAULTS, ELEMENTS, PARAMS } from './constants';
import { InventoryItem } from '@/types/inventory';
import { ItemData, RawFormData } from '@/types/inventoryItem';

/** The add and edit sheets render the same fields; their element ids differ only by prefix. */
export type ItemFormPrefix = 'add' | 'edit';

/**
 * One row of the item form. Element ids are `${prefix}-${element}`; the value a field holds in
 * the DOM is its `RawFormData` value (trimmed string, or `checked` for checkboxes).
 */
export interface ItemFormField<K extends ItemFormKey> {
  /** `ELEMENTS.*` id suffix. */
  element: string;
  /** `PARAMS.*` key of the add_item/update_item payload. */
  param: string;
  /** DOM → raw value; `undefined` leaves the key out of the form data. */
  read(element: HTMLInputElement | null): RawFormData[K];
  /** Item → the value the edit sheet shows. */
  format(item: InventoryItem): RawFormData[K];
  /** The value a cleared add sheet shows. */
  blank: RawFormData[K];
  /** Parse (raw → `ItemData`) and service-boundary sanitize rules, applied by `FormUtils`. */
  value: ItemFormValue;
  /** When the payload carries the field; default `always`. */
  send?: ItemFormSend;
}

/**
 * - boolean: `Boolean(raw)`.
 * - number: blank/unparsable → `fallback`, floored at 0; sanitize also caps at `max`.
 * - string: trimmed, blank → `fallback`; sanitize caps at `maxLength` (none: kept as is).
 */
export type ItemFormValue =
  | { type: 'boolean' }
  | { type: 'number'; fallback: number; max?: number }
  | { type: 'string'; fallback: string; maxLength?: number };

/**
 * - `whenSetOnAdd`: add_item leaves an empty value out; update_item always sends it (clears).
 * - `whenPresent`: only when the form rendered the field (feature-gated icon).
 */
export type ItemFormSend = 'always' | 'whenSetOnAdd' | 'whenPresent';

export type ItemFormKey = keyof RawFormData;

/** Mapped over a key alias (not `keyof RawFormData`) so the optional icon is still a required row. */
export type ItemFormFields = { [K in ItemFormKey]: ItemFormField<K> };

const readText = (element: HTMLInputElement | null): string => element?.value?.trim() ?? '';
const readChecked = (element: HTMLInputElement | null): boolean => element?.checked ?? false;
/** A number shown blank when it is 0 ("not set"). */
const blankWhenZero = (value: number): string => (value === 0 ? '' : value.toString());
/** Multi-value fields show every value; older items only carry the single scalar. */
const joined = (values: string[] | undefined, fallback: string): string =>
  values?.length ? values.join(', ') : fallback;

/**
 * Every field of the add/edit item form, in add_item/update_item payload order. Drives reading
 * both sheets, filling/clearing them, parsing and sanitizing (`FormUtils`) and the service data
 * (`itemPayload`). A new field is one row here plus its template markup and translations.
 *
 * Special fields keep their own code and are listed here for their value only:
 * - `aliases`, `barcode`: tag inputs (`aliasTagInput`, `barcodeTagInput`) write the hidden
 *   input this table reads.
 * - `category`, `location`: multi-selects (`modalMultiSelect`) over a hidden input.
 * - `icon`: `ha-icon-picker` or a text fallback (`iconFieldInput`), rendered only with the
 *   `item_icons` feature; without the element the key stays out of the form data, so the icon
 *   is never sent to an integration that does not know it.
 * Not in the table: the photo (`itemImageField`, its own upload service) and batches
 * (`batchEditor`, batch services) — neither is part of the add_item/update_item payload.
 */
export const ITEM_FORM_FIELDS: ItemFormFields = {
  autoAddEnabled: {
    element: ELEMENTS.AUTO_ADD_ENABLED,
    param: PARAMS.AUTO_ADD_ENABLED,
    value: { type: 'boolean' },
    read: readChecked,
    format: (item) => item.auto_add_enabled ?? false,
    blank: DEFAULTS.AUTO_ADD_ENABLED,
  },
  autoAddIdToDescriptionEnabled: {
    element: ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED,
    param: PARAMS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED,
    value: { type: 'boolean' },
    read: readChecked,
    format: (item) => item.auto_add_id_to_description_enabled ?? false,
    blank: DEFAULTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED,
  },
  autoAddToListQuantity: {
    element: ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY,
    param: PARAMS.AUTO_ADD_TO_LIST_QUANTITY,
    value: { type: 'number', fallback: DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY },
    read: readText,
    format: (item) =>
      (item.auto_add_to_list_quantity ?? DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY).toString(),
    blank: DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY.toString(),
  },
  category: {
    element: ELEMENTS.CATEGORY,
    param: PARAMS.CATEGORY,
    value: { type: 'string', fallback: DEFAULTS.CATEGORY, maxLength: 50 },
    read: readText,
    format: (item) => joined(item.categories, item.category ?? DEFAULTS.CATEGORY),
    blank: DEFAULTS.CATEGORY,
  },
  description: {
    element: ELEMENTS.DESCRIPTION,
    param: PARAMS.DESCRIPTION,
    value: { type: 'string', fallback: DEFAULTS.DESCRIPTION, maxLength: 500 },
    read: readText,
    format: (item) => item.description ?? DEFAULTS.DESCRIPTION,
    blank: DEFAULTS.DESCRIPTION,
  },
  desiredQuantity: {
    element: ELEMENTS.DESIRED_QUANTITY,
    param: PARAMS.DESIRED_QUANTITY,
    value: { type: 'number', fallback: DEFAULTS.DESIRED_QUANTITY },
    read: readText,
    format: (item) => blankWhenZero(item.desired_quantity ?? DEFAULTS.DESIRED_QUANTITY),
    blank: '',
  },
  expiryAlertDays: {
    element: ELEMENTS.EXPIRY_ALERT_DAYS,
    param: PARAMS.EXPIRY_ALERT_DAYS,
    value: { type: 'number', fallback: DEFAULTS.EXPIRY_ALERT_DAYS },
    read: readText,
    format: (item) => (item.expiry_alert_days ?? DEFAULTS.EXPIRY_ALERT_DAYS).toString(),
    blank: DEFAULTS.EXPIRY_ALERT_DAYS.toString(),
  },
  expiryDate: {
    element: ELEMENTS.EXPIRY_DATE,
    param: PARAMS.EXPIRY_DATE,
    value: { type: 'string', fallback: DEFAULTS.EXPIRY_DATE },
    read: readText,
    format: (item) => item.expiry_date ?? DEFAULTS.EXPIRY_DATE,
    blank: DEFAULTS.EXPIRY_DATE,
  },
  location: {
    element: ELEMENTS.LOCATION,
    param: PARAMS.LOCATION,
    value: { type: 'string', fallback: DEFAULTS.LOCATION, maxLength: 50 },
    read: readText,
    format: (item) => joined(item.locations, item.location ?? DEFAULTS.LOCATION),
    blank: DEFAULTS.LOCATION,
  },
  name: {
    element: ELEMENTS.NAME,
    param: PARAMS.NAME,
    value: { type: 'string', fallback: '', maxLength: 100 },
    read: readText,
    format: (item) => item.name ?? '',
    blank: '',
  },
  quantity: {
    element: ELEMENTS.QUANTITY,
    param: PARAMS.QUANTITY,
    value: { type: 'number', fallback: DEFAULTS.QUANTITY, max: 999_999 },
    read: readText,
    format: (item) => (item.quantity ?? DEFAULTS.QUANTITY).toString(),
    blank: DEFAULTS.QUANTITY.toString(),
  },
  todoList: {
    element: ELEMENTS.TODO_LIST,
    param: PARAMS.TODO_LIST,
    value: { type: 'string', fallback: DEFAULTS.TODO_LIST, maxLength: 100 },
    read: readText,
    format: (item) => item.todo_list ?? DEFAULTS.TODO_LIST,
    blank: DEFAULTS.TODO_LIST,
  },
  todoQuantityPlacement: {
    element: ELEMENTS.TODO_QUANTITY_PLACEMENT,
    param: PARAMS.TODO_QUANTITY_PLACEMENT,
    value: { type: 'string', fallback: DEFAULTS.TODO_QUANTITY_PLACEMENT, maxLength: 20 },
    read: readText,
    format: (item) => item.todo_quantity_placement ?? DEFAULTS.TODO_QUANTITY_PLACEMENT,
    blank: DEFAULTS.TODO_QUANTITY_PLACEMENT,
  },
  price: {
    element: ELEMENTS.PRICE,
    param: PARAMS.PRICE,
    value: { type: 'number', fallback: DEFAULTS.PRICE },
    read: readText,
    format: (item) => blankWhenZero(item.price ?? DEFAULTS.PRICE),
    blank: '',
  },
  unit: {
    element: ELEMENTS.UNIT,
    param: PARAMS.UNIT,
    value: { type: 'string', fallback: DEFAULTS.UNIT, maxLength: 20 },
    read: readText,
    format: (item) => item.unit ?? DEFAULTS.UNIT,
    blank: DEFAULTS.UNIT,
  },
  barcode: {
    element: ELEMENTS.BARCODE,
    param: PARAMS.BARCODE,
    value: { type: 'string', fallback: DEFAULTS.BARCODE, maxLength: 100 },
    send: 'whenSetOnAdd',
    read: readText,
    format: (item) => joined(item.barcodes, DEFAULTS.BARCODE),
    blank: DEFAULTS.BARCODE,
  },
  aliases: {
    element: ELEMENTS.ALIASES,
    param: PARAMS.ALIASES,
    value: { type: 'string', fallback: DEFAULTS.ALIASES, maxLength: 300 },
    send: 'whenSetOnAdd',
    read: readText,
    format: (item) => joined(item.aliases, DEFAULTS.ALIASES),
    blank: DEFAULTS.ALIASES,
  },
  icon: {
    element: ELEMENTS.ICON,
    param: PARAMS.ICON,
    value: { type: 'string', fallback: '', maxLength: 100 },
    send: 'whenPresent',
    // `ha-icon-picker` and the text fallback both expose `.value`.
    read: (element) => (element ? readText(element) : undefined),
    // Backend data: anything but a string counts as no icon.
    format: (item) => (typeof item.icon === 'string' ? item.icon : ''),
    blank: '',
  },
};

const isItemFormKey = (key: string): key is ItemFormKey => key in ITEM_FORM_FIELDS;

/** `RawFormData` keys in table (payload) order. */
export const ITEM_FORM_KEYS: readonly ItemFormKey[] =
  Object.keys(ITEM_FORM_FIELDS).filter(isItemFormKey);

/**
 * Builds one record over every form key, in table order; `undefined` leaves the key out (only
 * the optional icon ever is). `T` is a shape keyed like `RawFormData`.
 */
export function collectItemForm<T extends { [K in ItemFormKey]?: unknown }>(
  valueOf: (key: ItemFormKey) => unknown,
): T {
  const entries = ITEM_FORM_KEYS.map((key) => [key, valueOf(key)] as const).filter(
    ([, value]) => value !== undefined,
  );
  // Every key was visited and each row's value rule fixes its type (golden payload tests pin
  // the result), so the record is a complete T up to the keys left out on purpose.
  return Object.fromEntries(entries) as T;
}

/**
 * The add_item/update_item service data for an item: the address params (`inventory_id`, and
 * `old_name` for updates) plus one param per table row that `send` lets through.
 */
export function itemPayload(
  item: ItemData,
  mode: 'add' | 'update',
  address: Readonly<Record<string, string>>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...address };
  for (const key of ITEM_FORM_KEYS) {
    const { param, send = 'always' } = ITEM_FORM_FIELDS[key];
    const value = item[key];
    const sent =
      send === 'always' ||
      (send === 'whenPresent' && value !== undefined) ||
      (send === 'whenSetOnAdd' && (mode === 'update' || Boolean(value)));
    if (sent) {
      payload[param] = value;
    }
  }
  return payload;
}
