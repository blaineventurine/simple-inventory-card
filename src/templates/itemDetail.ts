import { InventoryConfig, InventoryItem } from '@/types/inventory';
import { TranslationData } from '@/types/translatableComponent';
import { ImageLoader } from '@/services/imageLoader';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '@/utils/utilities';
import { ACTIONS } from '@/utils/constants';
import { itemImagePath } from '@/utils/itemImage';
import { STATUS_TONE, itemIcon, itemStatus } from '@/utils/itemStatus';
import { createBatchPanel } from './batchList';
import { expiryTone, getExpiryStatus } from './expiryStatus';
import { itemStepper } from './itemRow';
import { itemBadgeLabel } from './itemTile';
import { Tone, button, chip, iconButton, photo } from './primitives';

/** What the item page shows beyond the item: the integration's features and the formats. */
export interface ItemDetailOptions {
  /** Item photos (`item_images`); the status-tinted icon without. */
  images: ImageLoader | undefined;
  /** The integration tracks batches: the page lists them with Restock and Move. */
  batches: boolean;
  /** The integration moves stock between locations: batch rows offer Move. */
  transfers: boolean;
  /** HA's to-do lists, for the auto-add rule's list name. */
  todoLists: ReadonlyArray<{ id: string; name: string }>;
  /** Formats a price (HA's currency). */
  formatValue: (value: number) => string;
}

/** A `detail.<key>` text, escaped. */
function t(
  translations: TranslationData,
  key: string,
  fallback: string,
  params?: Record<string, string | number>,
): string {
  return Utilities.sanitizeHtml(
    TranslationManager.localize(translations, `detail.${key}`, params, fallback),
  );
}

/** A text of another section of the translations, escaped (labels the page reuses). */
function label(translations: TranslationData, key: string, fallback: string): string {
  return Utilities.sanitizeHtml(
    TranslationManager.localize(translations, key, undefined, fallback),
  );
}

/** One fact: its label and its (already escaped) value; '' when the value is. */
function fact(name: string, title: string, value: string, tone?: Tone): string {
  if (value === '') {
    return '';
  }
  return `<div class="si-detail__fact" data-fact="${name}"><dt>${title}</dt><dd${tone ? ` class="si-tone-${tone}"` : ''}>${value}</dd></div>`;
}

function backButton(translations: TranslationData, className: string): string {
  return iconButton({
    icon: 'mdi:arrow-left',
    label: TranslationManager.localize(translations, 'detail.back', undefined, 'Back'),
    className,
    attrs: { 'data-action': ACTIONS.DETAIL_BACK },
  });
}

/** Back arrow, name, status badge and Edit. */
function header(item: InventoryItem, translations: TranslationData): string {
  const status = itemStatus(item);
  const badgeText =
    status === 'out'
      ? TranslationManager.localize(translations, 'detail.out_of_stock', undefined, 'Out of stock')
      : itemBadgeLabel(item, status, translations);
  const badge = badgeText
    ? chip({ label: badgeText, tone: STATUS_TONE[status], className: 'si-detail__badge' })
    : '';
  return `<header class="si-detail__header">
      ${backButton(translations, 'si-detail__back')}
      <h2 class="si-detail__name">${Utilities.sanitizeHtml(item.name)}</h2>
      ${badge}
      ${button({
        kind: 'tonal',
        icon: 'mdi:pencil',
        label: TranslationManager.localize(translations, 'detail.edit', undefined, 'Edit'),
        className: 'si-detail__edit',
        attrs: { 'data-action': ACTIONS.OPEN_EDIT_MODAL, 'data-name': item.name },
      })}
    </header>`;
}

/** The full photo (tap: the photo viewer), or the status-tinted icon. */
function media(item: InventoryItem, translations: TranslationData, images?: ImageLoader): string {
  const path = images ? itemImagePath(item, 'full') : null;
  if (path === null) {
    const tone = STATUS_TONE[itemStatus(item)];
    return `<div class="si-detail__media"><span class="si-detail__icon si-tint si-tone-${tone}"><ha-icon icon="${Utilities.sanitizeHtml(itemIcon(item))}"></ha-icon></span></div>`;
  }
  const view = TranslationManager.localize(
    translations,
    'image.view_photo',
    { name: item.name },
    `View photo of ${item.name}`,
  );
  const alt = TranslationManager.localize(
    translations,
    'items.image_alt',
    { name: item.name },
    `Photo of ${item.name}`,
  );
  return `<div class="si-detail__media"><button type="button" class="si-detail__photo-btn" data-action="${ACTIONS.VIEW_IMAGE}" data-name="${Utilities.sanitizeHtml(item.name)}" aria-label="${Utilities.sanitizeHtml(view)}">${photo(path, images?.cached(path), 'si-detail__photo', alt)}</button></div>`;
}

function chips(values: readonly string[] | undefined): string {
  return (values ?? [])
    .filter((value) => value.trim() !== '')
    .map((value) => chip({ label: value }))
    .join('');
}

/** The values of a multi-value field, falling back to its single legacy value. */
function joined(values: readonly string[] | undefined, single: string): string {
  const all = values && values.length > 0 ? values : [single];
  return Utilities.sanitizeHtml(all.filter((value) => value.trim() !== '').join(', '));
}

/**
 * Where the item is: its batches' distinct locations, in batch order (`stocked_locations`),
 * else its own locations (older integrations, or no batch has a location).
 */
function locations(item: InventoryItem): string {
  const stocked = (item.stocked_locations ?? []).filter((location) => location.trim() !== '');
  return stocked.length > 0
    ? Utilities.sanitizeHtml(stocked.join(', '))
    : joined(item.locations, item.location);
}

function autoAddRule(
  item: InventoryItem,
  translations: TranslationData,
  todoLists: ItemDetailOptions['todoLists'],
): string {
  if (!item.auto_add_enabled) {
    return '';
  }
  const list =
    todoLists.find((candidate) => candidate.id === item.todo_list)?.name ?? item.todo_list;
  const threshold = item.auto_add_to_list_quantity ?? 0;
  const desired = item.desired_quantity ?? 0;
  return desired > 0
    ? t(
        translations,
        'auto_add_desired',
        `At ${threshold} or less, add up to ${desired} to ${list}`,
        { threshold, desired, list },
      )
    : t(translations, 'auto_add', `At ${threshold} or less, add to ${list}`, { threshold, list });
}

/** The facts, each left out when empty: stepper, places, price, expiry, auto-add, names. */
function facts(
  item: InventoryItem,
  translations: TranslationData,
  options: ItemDetailOptions,
): string {
  const price = item.price ?? 0;
  const priceText =
    price > 0
      ? t(
          translations,
          'price_value',
          `${options.formatValue(price)} each · ${options.formatValue(price * item.quantity)} in total`,
          {
            price: options.formatValue(price),
            total: options.formatValue(price * item.quantity),
          },
        )
      : '';
  const expiry = item.expiry_date
    ? getExpiryStatus(item.expiry_date, translations, item.expiry_alert_days)
    : undefined;
  const expiryText = expiry
    ? Utilities.sanitizeHtml(
        expiry.class === 'expiry-safe' ? item.expiry_date : `${item.expiry_date} · ${expiry.label}`,
      )
    : '';
  return `<dl class="si-detail__facts">
      ${fact('quantity', label(translations, 'modal.quantity', 'Quantity'), itemStepper(item, translations))}
      ${fact('locations', t(translations, 'locations', 'Locations'), locations(item))}
      ${fact('categories', t(translations, 'categories', 'Categories'), joined(item.categories, item.category))}
      ${fact('price', label(translations, 'modal.price', 'Unit Price'), priceText)}
      ${fact('expiry', label(translations, 'filters.expiry', 'Expiry'), expiryText, expiry ? expiryTone(expiry) : undefined)}
      ${fact('auto_add', t(translations, 'auto_add_title', 'Auto-add'), autoAddRule(item, translations, options.todoLists))}
      ${fact('barcodes', t(translations, 'barcodes', 'Barcodes'), chips(item.barcodes))}
      ${fact('aliases', label(translations, 'modal.aliases', 'Aliases'), chips(item.aliases))}
      ${fact('description', label(translations, 'modal.description', 'Description'), Utilities.sanitizeHtml(item.description.trim()))}
    </dl>`;
}

/**
 * The item page: header, then photo and facts beside batches and history (one column on narrow
 * cards). The history section is an empty slot; the view keeps its own history element there.
 */
export function itemDetailTemplate(
  item: InventoryItem,
  translations: TranslationData,
  config: InventoryConfig | undefined,
  options: ItemDetailOptions,
): string {
  const batches = options.batches
    ? `<section class="si-detail__section si-detail__batches">
        <h3>${t(translations, 'section_batches', 'Batches')}</h3>
        ${createBatchPanel(item, translations, config, options.transfers, options.formatValue)}
      </section>`
    : '';
  return `${header(item, translations)}
    <div class="si-detail__grid">
      <div class="si-detail__column">
        ${media(item, translations, options.images)}
        ${facts(item, translations, options)}
      </div>
      <div class="si-detail__column">
        ${batches}
        <section class="si-detail__section si-detail__history">
          <h3>${t(translations, 'section_history', 'History')}</h3>
          <div class="si-detail__history-slot"></div>
        </section>
      </div>
    </div>`;
}

/** The page of an item that does not exist (deleted, or an unknown id): a note and a way back. */
export function itemGoneTemplate(translations: TranslationData): string {
  return `<div class="si-detail__gone">
      <p>${t(translations, 'gone', 'This item no longer exists')}</p>
      ${button({
        kind: 'tonal',
        icon: 'mdi:arrow-left',
        label: TranslationManager.localize(
          translations,
          'detail.back_to_list',
          undefined,
          'Back to the list',
        ),
        attrs: { 'data-action': ACTIONS.DETAIL_BACK },
      })}
    </div>`;
}

/** Loading text of the history slot before the first load answered. */
export function historyLoading(translations: TranslationData): string {
  return `<p class="consumption-empty">${t(translations, 'history_loading', 'Loading history…')}</p>`;
}
