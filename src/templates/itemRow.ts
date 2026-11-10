import { valueFormatter } from '@/utils/currency';
import { InventoryConfig, InventoryItem } from '@/types/inventory';
import { TodoList } from '@/types/todoList';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '@/utils/utilities';
import { ACTIONS } from '@/utils/constants';
import { STATUS_TONE, itemIcon, itemStatus } from '@/utils/itemStatus';
import { expiryTone, getExpiryStatus } from './expiryStatus';
import { RowOptions } from '@/types/rowOptions';
import { createBatchPanel } from './batchList';
import {
  SecondaryPart,
  iconButton,
  iconCircle,
  photo,
  photoCircle,
  secondaryLine,
  stepper,
} from './primitives';
import { itemImagePath } from '@/utils/itemImage';

/** Fallback when no `formatValue` is supplied (isolated calls without `rowOptions`). */
const PLAIN_VALUE = valueFormatter('en', undefined);

/**
 * Id of an item's details panel, referenced by the chevron's `aria-controls`. Item names
 * are unique per inventory; every character outside `[A-Za-z0-9-]` is hex-encoded so the
 * id is a valid IDREF and distinct names never collide.
 */
function detailsPanelId(name: string): string {
  const encoded = Array.from(name, (char) =>
    /[A-Za-z0-9-]/.test(char) ? char : `_${(char.codePointAt(0) ?? 0).toString(16)}_`,
  ).join('');
  return `item-details-${encoded}`;
}

/** The `show_*` options an item's secondary line honours. */
export type SecondaryLineOptions = Pick<
  InventoryConfig,
  'show_location' | 'show_category' | 'show_expiry' | 'show_price'
>;

/**
 * An item's dot-separated secondary line, shared by rows, tiles and search results: the
 * optional `leading` parts, then locations, categories, expiry and total value, each honouring
 * its `show_*` option.
 */
export function itemSecondaryLine(
  item: InventoryItem,
  translations: TranslationData,
  config?: SecondaryLineOptions,
  leading: SecondaryPart[] = [],
  formatValue: (value: number) => string = PLAIN_VALUE,
): string {
  const locations =
    item.locations && item.locations.length > 0
      ? item.locations.filter((value) => value.trim() !== '').join(', ')
      : item.location;
  const categories =
    item.categories && item.categories.length > 0
      ? item.categories.filter((value) => value.trim() !== '').join(', ')
      : item.category;
  const expiry =
    config?.show_expiry !== false && item.expiry_date
      ? getExpiryStatus(item.expiry_date, translations, item.expiry_alert_days)
      : null;
  return secondaryLine([
    ...leading,
    { text: config?.show_location !== false ? locations || '' : '', className: 'location' },
    { text: config?.show_category !== false ? categories || '' : '', className: 'category' },
    ...(expiry
      ? [{ text: expiry.label, className: `expiry ${expiry.class}`, tone: expiryTone(expiry) }]
      : []),
    {
      text:
        config?.show_price !== false && item.price && item.price > 0
          ? formatValue(item.price * item.quantity)
          : '',
      className: 'item-price',
    },
  ]);
}

/** An item's quantity stepper (− / quantity + unit / +), shared by rows and tiles. */
export function itemStepper(item: InventoryItem, translations: TranslationData): string {
  return stepper({
    quantity: item.quantity,
    unit: item.unit || '',
    decrementLabel: TranslationManager.localize(
      translations,
      'items.decrement',
      { name: item.name },
      `Decrease ${item.name}`,
    ),
    incrementLabel: TranslationManager.localize(
      translations,
      'items.increment',
      { name: item.name },
      `Increase ${item.name}`,
    ),
    attrs: { 'data-name': item.name },
  });
}

/**
 * One item: status-tinted icon (or the item's photo) and name with a dot-separated secondary
 * line (one `open_edit` target), an optional details chevron, and the quantity stepper. The
 * chevron opens the details panel (image, description, auto-add rule, batches) and is shown
 * only when that panel has something to show. Photos appear only with `rowOptions.images`
 * (`item_images`).
 */
export function createItemRowTemplate(
  item: InventoryItem,
  todoLists: TodoList[],
  translations: TranslationData,
  config?: InventoryConfig,
  rowOptions?: RowOptions,
): string {
  const status = itemStatus(item);
  const showBatches = rowOptions?.batches === true;
  const expanded = rowOptions?.expanded.has(item.name) === true;
  const description = config?.show_description !== false ? (item.description || '').trim() : '';
  const showAutoAdd = config?.show_auto_add_info !== false && item.auto_add_enabled;
  const showIcon = config?.show_icon !== false;
  const images = rowOptions?.images;
  const thumbPath = images && showIcon ? itemImagePath(item, 'thumb') : null;
  const imagePath = images ? itemImagePath(item, 'full') : null;
  const hasDetails = showBatches || description !== '' || showAutoAdd || imagePath !== null;

  const secondary = itemSecondaryLine(
    item,
    translations,
    config,
    undefined,
    rowOptions?.formatValue ?? PLAIN_VALUE,
  );

  const chevron = hasDetails
    ? iconButton({
        icon: 'mdi:chevron-down',
        label: TranslationManager.localize(
          translations,
          'items.toggle_details',
          { name: item.name },
          `Details for ${item.name}`,
        ),
        className: 'batch-toggle si-row__chevron',
        row: true,
        attrs: {
          'data-action': ACTIONS.TOGGLE_BATCHES,
          'data-name': item.name,
          'aria-expanded': String(expanded),
          'aria-controls': detailsPanelId(item.name),
        },
      })
    : '';

  let autoAddText = '';
  if (showAutoAdd) {
    const list = todoLists.find((l) => l.entity_id === item.todo_list || l.id === item.todo_list);
    const listName = list ? list.name : item.todo_list || '';
    const threshold = item.auto_add_to_list_quantity || 0;
    const desired = item.desired_quantity || 0;
    autoAddText =
      desired > 0
        ? TranslationManager.localize(
            translations,
            'items.auto_add_desired_info',
            { quantity: threshold, desired, list: listName },
            `Auto-add at ≤ ${threshold}, up to ${desired} → ${listName}`,
          )
        : TranslationManager.localize(
            translations,
            'items.auto_add_info',
            { quantity: threshold, list: listName },
            `Auto-add at ≤ ${threshold} → ${listName}`,
          );
  }
  const details = hasDetails
    ? `<div class="item-details-panel si-details" id="${detailsPanelId(item.name)}"${expanded ? '' : ' hidden'}>
        ${
          imagePath
            ? `<button type="button" class="si-details__image-btn" data-action="${ACTIONS.VIEW_IMAGE}" data-name="${Utilities.sanitizeHtml(item.name)}" aria-label="${Utilities.sanitizeHtml(
                TranslationManager.localize(
                  translations,
                  'image.view_photo',
                  { name: item.name },
                  `View photo of ${item.name}`,
                ),
              )}">${photo(
                imagePath,
                images?.cached(imagePath),
                'si-details__image',
                TranslationManager.localize(
                  translations,
                  'items.image_alt',
                  { name: item.name },
                  `Photo of ${item.name}`,
                ),
              )}</button>`
            : ''
        }
        ${description ? `<p class="item-description si-details__description">${Utilities.sanitizeHtml(description)}</p>` : ''}
        ${autoAddText ? `<div class="auto-add-info si-details__auto-add"><ha-icon icon="mdi:cart-arrow-down"></ha-icon><span>${Utilities.sanitizeHtml(autoAddText)}</span></div>` : ''}
        ${showBatches ? createBatchPanel(item, translations, config, rowOptions?.transfers === true, rowOptions?.formatValue) : ''}
      </div>`
    : '';

  // Without the icon, or with a photo in its place, the status colour moves to a bar at the
  // row's left edge (CSS keys it off data-status), so expired and expiring/low rows stay visible.
  let rowModifier = '';
  let leading = '';
  if (thumbPath) {
    rowModifier = ' si-row--photo';
    leading = photoCircle(
      itemIcon(item),
      STATUS_TONE[status],
      thumbPath,
      images?.cached(thumbPath),
    );
  } else if (showIcon) {
    leading = iconCircle(itemIcon(item), STATUS_TONE[status]);
  } else {
    rowModifier = ' si-row--no-icon';
  }

  return `
    <div class="item-row si-row${rowModifier}${status === 'out' ? ' zero-quantity' : ''}" data-status="${status}">
      <div class="si-row__main">
        <div class="si-row__open" data-action="${ACTIONS.OPEN_EDIT_MODAL}" data-name="${Utilities.sanitizeHtml(item.name)}" role="button" tabindex="0">
          ${leading}
          <div class="si-row__text">
            <span class="item-name si-row__name">${Utilities.sanitizeHtml(item.name)}</span>
            ${secondary}
          </div>
        </div>
        ${chevron}
        ${itemStepper(item, translations)}
      </div>
      ${details}
    </div>
  `;
}
