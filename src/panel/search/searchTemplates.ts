import { TranslationData } from '@/types/translatableComponent';
import { ImageLoader } from '@/services/imageLoader';
import { TranslationManager } from '@/services/translationManager';
import { itemSecondaryLine, itemStepper } from '@/templates/itemRow';
import { SecondaryPart, iconCircle, photoCircle } from '@/templates/primitives';
import { Utilities } from '@/utils/utilities';
import { foldCase } from '@/utils/foldCase';
import { itemImagePath } from '@/utils/itemImage';
import { ItemStatus, STATUS_TONE, itemIcon, itemStatus } from '@/utils/itemStatus';
import { menuButton, message, t } from '../panelTemplates';
import { LocatedItem, SearchMatch, SearchResultItem } from './searchClient';
import { SEARCH_MAX_LENGTH, SearchState } from './searchMode';

/** `data-action` of a result's open target (name and photo). */
export const SEARCH_OPEN_ACTION = 'search-open';

/** Fallbacks of the reasons other than name, alias and barcode (which show the matching value). */
const REASON_FALLBACK: Record<Exclude<SearchMatch, 'name' | 'alias' | 'barcode'>, string> = {
  category: 'category',
  location: 'location',
  description: 'description',
  unit: 'unit',
};

/**
 * The search toolbar: menu button when `narrow`, the title only when wide (on narrow screens the
 * field takes its place), the field, the scan button and ✕.
 */
export function searchToolbar(
  translations: TranslationData,
  narrow: boolean,
  query: string,
): string {
  const placeholder = t(translations, 'search.placeholder', 'Search all inventories…');
  const scan = t(translations, 'search.scan', 'Scan a barcode');
  const close = t(translations, 'search.close', 'Close search');
  const title = narrow ? '' : `<h1 class="title">${t(translations, 'title', 'Inventory')}</h1>`;
  return `<header class="toolbar toolbar--search">${narrow ? menuButton(translations) : ''}${title}<input class="search-field" type="search" enterkeyhint="search" autocomplete="off" maxlength="${SEARCH_MAX_LENGTH}" placeholder="${placeholder}" aria-label="${placeholder}" value="${Utilities.sanitizeHtml(query)}"><button class="search-scan-btn si-icon-btn" type="button" aria-label="${scan}" title="${scan}"><ha-icon icon="mdi:barcode-scan"></ha-icon></button><button class="search-close-btn si-icon-btn" type="button" aria-label="${close}" title="${close}"><ha-icon icon="mdi:close"></ha-icon></button></header>`;
}

/** The first of `values` containing `query` (case folded like the integration), else the first. */
function matchingValue(values: string[] | undefined, query: string): string {
  const needle = foldCase(query);
  return values?.find((value) => foldCase(value).includes(needle)) ?? values?.[0] ?? '';
}

/** Why a result matched, as the last part of its secondary line; none for a name match. */
function reasonPart(
  item: SearchResultItem,
  translations: TranslationData,
  query: string,
): SecondaryPart[] {
  const { matched } = item;
  if (matched === 'name') {
    return [];
  }
  // Unescaped: `secondaryLine` escapes its parts.
  let text: string;
  if (matched === 'alias' || matched === 'barcode') {
    const value = matchingValue(matched === 'alias' ? item.aliases : item.barcodes, query);
    text = TranslationManager.localize(
      translations,
      `panel.search.reason_${matched}`,
      { value },
      `${matched}: ${value}`,
    );
  } else {
    text = TranslationManager.localize(
      translations,
      `panel.search.reason_${matched}`,
      undefined,
      REASON_FALLBACK[matched],
    );
  }
  return [{ text, className: 'search-reason' }];
}

/** How a located item's row differs between search and Home. */
export interface LocatedRowOptions {
  /** Why the item is listed, right after the inventory (the line's end is cut off on phones). */
  reason: SecondaryPart[];
  images: ImageLoader | undefined;
  /** The status the row's tint, bar and dimming follow; default: the item's own (`itemStatus`). */
  status?: ItemStatus;
  /** Whether the line shows the expiry (Home's reasons already say it); default true. */
  showExpiry?: boolean;
}

/**
 * One item of any inventory (a search result, a Home row): the row's leading photo or tinted
 * icon, name and secondary line (inventory, reason, locations, expiry) as one open target, and
 * the stepper. No chevron, no details.
 */
export function locatedItemRow(
  item: LocatedItem,
  translations: TranslationData,
  options: LocatedRowOptions,
): string {
  const { images } = options;
  const status = options.status ?? itemStatus(item);
  const thumbPath = images ? itemImagePath(item, 'thumb') : null;
  const leading = thumbPath
    ? photoCircle(itemIcon(item), STATUS_TONE[status], thumbPath, images?.cached(thumbPath))
    : iconCircle(itemIcon(item), STATUS_TONE[status]);
  const secondary = itemSecondaryLine(
    item,
    translations,
    { show_category: false, show_price: false, show_expiry: options.showExpiry ?? true },
    [{ text: item.inventory_name, className: 'search-inventory' }, ...options.reason],
  );
  const inventory = Utilities.sanitizeHtml(item.inventory_id);
  const name = Utilities.sanitizeHtml(item.name);
  return `<div class="item-row si-row search-result${thumbPath ? ' si-row--photo' : ''}${status === 'out' ? ' zero-quantity' : ''}" role="listitem" data-status="${status}" data-inventory="${inventory}" data-name="${name}">
      <div class="si-row__main">
        <div class="si-row__open" data-action="${SEARCH_OPEN_ACTION}" data-inventory="${inventory}" data-name="${name}" role="button" tabindex="0">
          ${leading}
          <div class="si-row__text">
            <span class="item-name si-row__name">${name}</span>
            ${secondary}
          </div>
        </div>
        ${itemStepper(item, translations)}
      </div>
    </div>`;
}

/** One search result: its row with the match reason. */
export function searchResultRow(
  item: SearchResultItem,
  translations: TranslationData,
  query: string,
  images: ImageLoader | undefined,
): string {
  return locatedItemRow(item, translations, {
    reason: reasonPart(item, translations, query),
    images,
  });
}

/** The results area for a search state: hint, nothing yet, error with Retry, none, or the list. */
export function searchResults(
  translations: TranslationData,
  state: SearchState,
  images: ImageLoader | undefined,
): string {
  switch (state.status) {
    case 'hint':
      return message(t(translations, 'search.hint', 'Type at least 2 characters'));
    case 'loading':
      return '';
    case 'error':
      return message(
        t(translations, 'search.error', `Search failed: ${state.message}`, {
          message: state.message,
        }),
        ` <button class="search-retry-btn si-text-btn" type="button">${t(translations, 'search.retry', 'Retry')}</button>`,
      );
    case 'ok': {
      if (state.items.length === 0) {
        return message(
          t(translations, 'search.no_results', `No items match "${state.query}"`, {
            query: state.query,
          }),
        );
      }
      const rows = state.items
        .map((item) => searchResultRow(item, translations, state.query, images))
        .join('');
      const footer = state.truncated
        ? `<p class="search-footer">${t(
            translations,
            'search.truncated',
            `Showing the first ${state.items.length} matches; refine your search`,
            { count: state.items.length },
          )}</p>`
        : '';
      return `<div class="search-results" role="list">${rows}</div>${footer}`;
    }
  }
}
