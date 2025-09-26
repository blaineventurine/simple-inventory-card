import { ELEMENTS } from '../utils/constants';
import { FilterState } from '../types/filterState';
import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';

export function createActiveFiltersDisplay(
  filters: FilterState,
  translations: TranslationData,
): string {
  const activeFilters: string[] = [];

  if (filters.searchText) {
    activeFilters.push(
      `${TranslationManager.localize(
        translations,
        'active_filters.search',
        undefined,
        'Search',
      )}: "${filters.searchText}"`,
    );
  }

  if (filters.category && filters.category.length > 0) {
    activeFilters.push(
      `${TranslationManager.localize(
        translations,
        'active_filters.category',
        undefined,
        'Category',
      )}: ${filters.category}`,
    );
  }

  if (filters.quantity) {
    const quantityLabel = TranslationManager.localize(
      translations,
      `filters.${filters.quantity}`,
      undefined,
      filters.quantity,
    );
    activeFilters.push(
      `${TranslationManager.localize(
        translations,
        'active_filters.quantity',
        undefined,
        'Quantity',
      )}: ${quantityLabel}`,
    );
  }

  if (filters.expiry) {
    const expiryLabel = TranslationManager.localize(
      translations,
      `filters.${filters.expiry}`,
      undefined,
      filters.expiry,
    );

    activeFilters.push(
      `${TranslationManager.localize(
        translations,
        'active_filters.expiry',
        undefined,
        'Expiry',
      )}: ${expiryLabel}`,
    );
  }

  if (filters.location && filters.location.length > 0) {
    activeFilters.push(
      `${TranslationManager.localize(
        translations,
        'active_filters.location',
        undefined,
        'Location',
      )}: ${filters.location}`,
    );
  }

  const shouldShow = activeFilters.length > 0;

  return `
    <div id="${ELEMENTS.ACTIVE_FILTERS}" class="active-filters" style="display: ${shouldShow ? 'block' : 'none'};">
      <span>${TranslationManager.localize(
        translations,
        'active_filters.label',
        undefined,
        'Active filters:',
      )}</span>
      <span id="${ELEMENTS.ACTIVE_FILTERS_LIST}">${activeFilters.join(', ')}</span>
    </div>
  `;
}
