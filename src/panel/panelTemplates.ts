import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '@/utils/utilities';
import { InventorySummary } from './inventories';

/** A sanitized `panel.<key>` translation. */
export const t = (
  translations: TranslationData,
  key: string,
  fallback: string,
  params?: Record<string, string | number>,
): string =>
  Utilities.sanitizeHtml(
    TranslationManager.localize(translations, `panel.${key}`, params, fallback),
  );

/** The button that opens HA's sidebar (narrow screens, or the sidebar always hidden). */
export function menuButton(translations: TranslationData): string {
  return `<button class="menu-btn si-icon-btn" type="button" aria-label="${t(translations, 'open_sidebar', 'Open the sidebar')}"><ha-icon icon="mdi:menu"></ha-icon></button>`;
}

/** The toolbar: menu button when `narrow`, the title, and the magnifier when `search`. */
export function toolbar(translations: TranslationData, narrow: boolean, search = false): string {
  const open = search
    ? `<button class="search-open-btn si-icon-btn" type="button" aria-label="${t(translations, 'search.open', 'Search all inventories')}" title="${t(translations, 'search.open', 'Search all inventories')}"><ha-icon icon="mdi:magnify"></ha-icon></button>`
    : '';
  return `<header class="toolbar">${narrow ? menuButton(translations) : ''}<h1 class="title">${t(translations, 'title', 'Inventory')}</h1>${open}</header>`;
}

/** The id (and route path segment) of the Home tab. */
export const HOME_ID = 'home';

/**
 * The tab bar: Home first when `home` (the `overview` feature), then one tab per inventory.
 * `activeId` matching no tab (search) selects none.
 */
export function tabs(
  translations: TranslationData,
  inventories: InventorySummary[],
  activeId: string,
  home = false,
): string {
  const entries = [
    ...(home
      ? [
          {
            id: HOME_ID,
            icon: 'mdi:home-outline',
            name: TranslationManager.localize(translations, 'panel.home.tab', undefined, 'Home'),
          },
        ]
      : []),
    ...inventories,
  ];
  // With no tab selected (search), the first one takes the keyboard focus.
  const noneSelected = !entries.some((entry) => entry.id === activeId);
  const items = entries
    .map((entry, index) => {
      const selected = entry.id === activeId;
      const focusable = selected || (noneSelected && index === 0);
      const id = Utilities.sanitizeHtml(entry.id);
      const icon = entry.icon
        ? `<ha-icon icon="${Utilities.sanitizeHtml(entry.icon)}"></ha-icon>`
        : '';
      return `<button class="tab" type="button" role="tab" id="tab-${id}" data-id="${id}" aria-selected="${selected}" tabindex="${focusable ? 0 : -1}">${icon}<span>${Utilities.sanitizeHtml(entry.name)}</span></button>`;
    })
    .join('');
  return `<nav class="tabs" role="tablist" aria-label="${t(translations, 'tabs_label', 'Inventories')}">${items}</nav>`;
}

export function message(text: string, action = ''): string {
  return `<div class="message">${text}${action}</div>`;
}

export function loadingState(translations: TranslationData): string {
  return message(t(translations, 'loading', 'Loading inventories…'));
}

export function emptyState(translations: TranslationData): string {
  return message(
    t(
      translations,
      'empty',
      'No inventories yet. Add one under Settings → Devices & services → Simple Inventory.',
    ),
    ` <a href="/config/integrations/integration/simple_inventory">${t(translations, 'empty_link', 'Open Simple Inventory settings')}</a>`,
  );
}

export function outdatedState(translations: TranslationData): string {
  return message(
    t(
      translations,
      'outdated',
      'This Simple Inventory integration is too old for the panel; update it and restart Home Assistant.',
    ),
  );
}

export function errorState(translations: TranslationData, error: string): string {
  return message(
    t(translations, 'error', `Could not load the inventories: ${error}`, { message: error }),
    ` <button class="retry-btn si-text-btn" type="button">${t(translations, 'retry', 'Retry')}</button>`,
  );
}

export function sensorUnavailable(translations: TranslationData): string {
  return message(
    t(translations, 'sensor_unavailable', 'The sensor of this inventory is unavailable.'),
  );
}
