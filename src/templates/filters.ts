import { ELEMENTS } from '../utils/constants';
import { FilterState } from '../types/filterState';
import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';

export function createFilterBadges(filters: FilterState, translations: TranslationData): string[] {
  const filterBadges: string[] = [];

  if (filters.searchText) {
    const searchLabel = TranslationManager.localize(
      translations,
      'active_filters.search',
      undefined,
      'Search',
    );
    filterBadges.push(
      `<span class="filter-badge search">
        ${searchLabel}: "${filters.searchText}"
      </span>`,
    );
  }

  const addMultiSelectBadge = (
    filterArray: string[] | undefined,
    labelKey: string,
    className: string,
    defaultLabel: string,
  ) => {
    if (filterArray && filterArray.length > 0) {
      const label = TranslationManager.localize(translations, labelKey, undefined, defaultLabel);
      const text =
        filterArray.length > 1
          ? `${label}: ${filterArray.length} ${TranslationManager.localize(translations, 'active_filters.selected', undefined, 'selected')}`
          : `${label}: ${filterArray[0]}`;
      filterBadges.push(`<span class="filter-badge ${className}">${text}</span>`);
    }
  };

  addMultiSelectBadge(filters.category, 'active_filters.category', 'category', 'Category');
  addMultiSelectBadge(filters.location, 'active_filters.location', 'location', 'Location');
  addMultiSelectBadge(filters.quantity, 'active_filters.quantity', 'quantity', 'Quantity');

  // Expiry needs special handling for translation
  if (filters.expiry && filters.expiry.length > 0) {
    const expiryLabel = TranslationManager.localize(
      translations,
      'active_filters.expiry',
      undefined,
      'Expiry',
    );
    let expiryText: string;
    if (filters.expiry.length > 1) {
      expiryText = `${expiryLabel}: ${filters.expiry.length} ${TranslationManager.localize(translations, 'active_filters.selected', undefined, 'selected')}`;
    } else {
      const expiryValue = TranslationManager.localize(
        translations,
        `filters.${filters.expiry[0]}`,
        undefined,
        filters.expiry[0],
      );
      expiryText = `${expiryLabel}: ${expiryValue}`;
    }
    filterBadges.push(`<span class="filter-badge expiry">${expiryText}</span>`);
  }

  return filterBadges;
}

export function createActiveFiltersDisplay(
  filters: FilterState,
  translations: TranslationData,
): string {
  const filterBadges = createFilterBadges(filters, translations);
  const shouldShow = filterBadges.length > 0;

  return `
    <div id="${ELEMENTS.ACTIVE_FILTERS}" class="active-filters" style="display: ${shouldShow ? 'block' : 'none'};">
      <div id="${ELEMENTS.ACTIVE_FILTERS_LIST}" class="filter-badges-container">
        ${filterBadges.join('')}
      </div>
    </div>
  `;
}
