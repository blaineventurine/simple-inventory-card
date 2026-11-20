import { TranslationData } from '@/types/translatableComponent';
import { ImageLoader } from '@/services/imageLoader';
import { TranslationManager } from '@/services/translationManager';
import { SecondaryPart, formatQuantity } from '@/templates/primitives';
import { Utilities } from '@/utils/utilities';
import { ItemStatus } from '@/utils/itemStatus';
import { message, t } from '../panelTemplates';
import { locatedItemRow } from '../search/searchTemplates';
import { HOME_SECTIONS, HomeSection, HomeState } from './homeMode';
import {
  ExpiredReason,
  ExpiringReason,
  InventoryOverview,
  LowStockReason,
  Overview,
  OverviewEntry,
} from './overviewClient';

/** Rows a section shows until "Show all". */
export const HOME_SECTION_ROWS = 5;

/** Each section's title key and English fallback, and the status its rows' tint follows. */
const SECTION_VIEW: Record<HomeSection, { key: string; title: string; status: ItemStatus }> = {
  expired: { key: 'title_expired', title: 'Expired', status: 'expired' },
  expiring_soon: { key: 'title_expiring', title: 'Expiring soon', status: 'warning' },
  out_of_stock: { key: 'title_out_of_stock', title: 'Out of stock', status: 'out' },
  low_stock: { key: 'title_low_stock', title: 'Low stock', status: 'warning' },
};

/** Inventories without an icon of their own. */
const DEFAULT_INVENTORY_ICON = 'mdi:archive-outline';

export interface HomeViewOptions {
  /** Sections showing all their rows. */
  expanded: ReadonlySet<HomeSection>;
  /** Item photos (`item_images`); none without the feature. */
  images?: ImageLoader;
  /** Formats an inventory's total value (see `valueFormatter`). */
  formatValue: (value: number) => string;
}

/** A `panel.home.<key>` text, unescaped (for secondary-line parts, which escape their text). */
function raw(
  translations: TranslationData,
  key: string,
  fallback: string,
  params?: Record<string, string | number>,
): string {
  return TranslationManager.localize(translations, `panel.home.${key}`, params, fallback);
}

/** " · k of m batches" when only some of the item's batches are concerned. */
function batchShare(
  entry: OverviewEntry<ExpiredReason | ExpiringReason>,
  translations: TranslationData,
): SecondaryPart[] {
  const total = entry.batches?.length ?? 0;
  const concerned = entry.reason.batches;
  if (total <= 1 || concerned >= total) {
    return [];
  }
  return [
    {
      text: raw(translations, 'batches', `${concerned} of ${total} batches`, {
        k: concerned,
        m: total,
      }),
      className: 'home-batches',
    },
  ];
}

function expiredReason(
  entry: OverviewEntry<ExpiredReason>,
  translations: TranslationData,
): SecondaryPart[] {
  const days = entry.reason.days_overdue;
  let text: string;
  if (days <= 0) {
    text = raw(translations, 'expired_today', 'Expired today');
  } else if (days === 1) {
    text = raw(translations, 'expired_one_day', 'Expired 1 day ago');
  } else {
    text = raw(translations, 'expired_days', `Expired ${days} days ago`, { n: days });
  }
  return [{ text, className: 'home-reason' }, ...batchShare(entry, translations)];
}

function expiringReason(
  entry: OverviewEntry<ExpiringReason>,
  translations: TranslationData,
): SecondaryPart[] {
  const days = entry.reason.days_until_expiry;
  let text: string;
  if (days <= 0) {
    text = raw(translations, 'expires_today', 'Expires today');
  } else if (days === 1) {
    text = raw(translations, 'expires_tomorrow', 'Expires tomorrow');
  } else {
    text = raw(translations, 'expires_days', `Expires in ${days} days`, { n: days });
  }
  return [{ text, className: 'home-reason' }, ...batchShare(entry, translations)];
}

function lowReason(
  entry: OverviewEntry<LowStockReason>,
  translations: TranslationData,
): SecondaryPart[] {
  const quantity = formatQuantity(entry.quantity);
  const needed = formatQuantity(entry.reason.quantity_needed);
  return [
    {
      text: raw(translations, 'low', `Low: ${quantity} left, need ${needed}`, { quantity, needed }),
      className: 'home-reason',
    },
  ];
}

/** A section's rows, each with its reason, in the integration's order. */
function sectionRows(
  overview: Overview,
  section: HomeSection,
  translations: TranslationData,
): Array<{ entry: OverviewEntry<unknown>; reason: SecondaryPart[] }> {
  switch (section) {
    case 'expired':
      return overview.expired.map((entry) => ({
        entry,
        reason: expiredReason(entry, translations),
      }));
    case 'expiring_soon':
      return overview.expiring_soon.map((entry) => ({
        entry,
        reason: expiringReason(entry, translations),
      }));
    case 'out_of_stock':
      return overview.out_of_stock.map((entry) => ({
        entry,
        reason: [
          { text: raw(translations, 'out_of_stock', 'Out of stock'), className: 'home-reason' },
        ],
      }));
    case 'low_stock':
      return overview.low_stock.map((entry) => ({ entry, reason: lowReason(entry, translations) }));
  }
}

/** An inventory's card: icon and name, item count, value above 0, attention badge; opens its tab. */
function summaryCard(
  summary: InventoryOverview,
  translations: TranslationData,
  formatValue: (value: number) => string,
): string {
  const { expired, expiring_soon, out_of_stock, low_stock } = summary.attention;
  const attention = expired + expiring_soon + out_of_stock + low_stock;
  const count = summary.total_items;
  const items = t(translations, 'home.items', count === 1 ? '1 item' : `${count} items`, { count });
  const value =
    summary.total_value > 0
      ? `<span class="home-summary__value">${Utilities.sanitizeHtml(formatValue(summary.total_value))}</span>`
      : '';
  const badge =
    attention > 0
      ? `<span class="home-summary__badge si-chip si-tone-${expired > 0 ? 'error' : 'warning'}">${t(
          translations,
          'home.need_attention',
          `${attention} need attention`,
          { count: attention },
        )}</span>`
      : '';
  const icon = Utilities.sanitizeHtml(summary.icon || DEFAULT_INVENTORY_ICON);
  return `<button type="button" class="home-summary" data-inventory="${Utilities.sanitizeHtml(summary.id)}">
      <span class="home-summary__head"><ha-icon icon="${icon}"></ha-icon><span class="home-summary__name">${Utilities.sanitizeHtml(summary.name)}</span></span>
      <span class="home-summary__items">${items}</span>
      ${value}
      ${badge}
    </button>`;
}

/** One attention section: title and count, its first rows (all once expanded), Show all. */
function sectionView(
  overview: Overview,
  section: HomeSection,
  translations: TranslationData,
  options: HomeViewOptions,
): string {
  const rows = sectionRows(overview, section, translations);
  if (rows.length === 0) {
    return '';
  }
  const view = SECTION_VIEW[section];
  const expanded = options.expanded.has(section);
  const shown = expanded ? rows : rows.slice(0, HOME_SECTION_ROWS);
  const list = shown
    .map(({ entry, reason }) =>
      locatedItemRow(entry, translations, {
        reason,
        images: options.images,
        status: view.status,
        showExpiry: false,
      }),
    )
    .join('');
  const showAll =
    shown.length < rows.length
      ? `<button type="button" class="home-show-all si-text-btn" data-section="${section}">${t(
          translations,
          'home.show_all',
          `Show all (${rows.length})`,
          { count: rows.length },
        )}</button>`
      : '';
  return `<section class="home-section" data-section="${section}" aria-labelledby="home-section-${section}">
      <h2 class="home-section__title" id="home-section-${section}">${t(translations, `home.${view.key}`, view.title)} <span class="home-section__count">${rows.length}</span></h2>
      <div class="home-rows" role="list">${list}</div>
      ${showAll}
    </section>`;
}

/** Home for a state: loading, the error with Retry, or the summaries and attention sections. */
export function homeView(
  translations: TranslationData,
  state: HomeState,
  options: HomeViewOptions,
): string {
  switch (state.status) {
    case 'loading':
      return message(t(translations, 'home.loading', 'Loading the overview…'));
    case 'error':
      return message(
        t(translations, 'home.error', `Could not load the overview: ${state.message}`, {
          message: state.message,
        }),
        ` <button class="home-retry-btn si-text-btn" type="button">${t(translations, 'retry', 'Retry')}</button>`,
      );
    case 'ok': {
      const { overview } = state;
      const summaries = overview.inventories
        .map((summary) => summaryCard(summary, translations, options.formatValue))
        .join('');
      const sections = HOME_SECTIONS.map((section) =>
        sectionView(overview, section, translations, options),
      ).join('');
      const body =
        sections === ''
          ? `<div class="home-empty"><ha-icon icon="mdi:check-circle-outline"></ha-icon><p>${t(
              translations,
              'home.empty',
              'Everything is stocked and fresh',
            )}</p></div>`
          : `<div class="home-sections">${sections}</div>`;
      return `<div class="home-summaries">${summaries}</div>${body}`;
    }
  }
}
