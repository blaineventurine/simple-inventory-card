import { ACTIONS, ELEMENTS } from '../utils/constants';
import { FilterState } from '../types/filterState';
import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { chip } from './primitives';

/** One removable chip per active filter; `data-filter-remove` carries the filter key. */
export function createFilterBadges(filters: FilterState, translations: TranslationData): string[] {
  const badges: Array<{ key: string; text: string }> = [];

  if (filters.searchText) {
    const searchLabel = TranslationManager.localize(
      translations,
      'active_filters.search',
      undefined,
      'Search',
    );
    badges.push({ key: 'search', text: `${searchLabel}: "${filters.searchText}"` });
  }

  const addMultiSelectBadge = (
    values: string[] | undefined,
    key: string,
    labelKey: string,
    defaultLabel: string,
    valueLabel: (value: string) => string,
  ) => {
    if (values && values.length > 0) {
      const label = TranslationManager.localize(translations, labelKey, undefined, defaultLabel);
      const text =
        values.length > 1
          ? `${label}: ${values.length} ${TranslationManager.localize(translations, 'active_filters.selected', undefined, 'selected')}`
          : `${label}: ${valueLabel(values[0])}`;
      badges.push({ key, text });
    }
  };
  const rawValue = (value: string) => value;

  addMultiSelectBadge(
    filters.category,
    'category',
    'active_filters.category',
    'Category',
    rawValue,
  );
  addMultiSelectBadge(
    filters.location,
    'location',
    'active_filters.location',
    'Location',
    rawValue,
  );
  addMultiSelectBadge(
    filters.quantity,
    'quantity',
    'active_filters.quantity',
    'Quantity',
    rawValue,
  );
  addMultiSelectBadge(filters.expiry, 'expiry', 'active_filters.expiry', 'Expiry', (value) =>
    TranslationManager.localize(translations, `filters.${value}`, undefined, value),
  );

  return badges.map(({ key, text }) =>
    chip({
      label: text,
      tone: 'primary',
      className: `filter-badge ${key}`,
      remove: {
        label: TranslationManager.localize(
          translations,
          'active_filters.remove',
          { filter: text },
          `Remove ${text}`,
        ),
        attrs: { 'data-action': ACTIONS.REMOVE_FILTER, 'data-filter-remove': key },
      },
    }),
  );
}

export function createActiveFiltersDisplay(
  filters: FilterState,
  translations: TranslationData,
): string {
  const filterBadges = createFilterBadges(filters, translations);
  const shouldShow = filterBadges.length > 0;

  return `
    <div id="${ELEMENTS.ACTIVE_FILTERS}" class="active-filters"${shouldShow ? '' : ' hidden'}>
      <div id="${ELEMENTS.ACTIVE_FILTERS_LIST}" class="filter-badges-container">
        ${filterBadges.join('')}
      </div>
    </div>
  `;
}
