import { ELEMENTS } from '../utils/constants';
import { FilterState } from '../types/filterState';

export function createActiveFiltersDisplay(filters: FilterState): string {
  const activeFilters: string[] = [];

  if (filters.searchText) {
    activeFilters.push(`Search: "${filters.searchText}"`);
  }
  if (filters.category) {
    activeFilters.push(`Category: ${filters.category}`);
  }
  if (filters.quantity) {
    activeFilters.push(`Quantity: ${filters.quantity}`);
  }
  if (filters.expiry) {
    activeFilters.push(`Expiry: ${filters.expiry}`);
  }

  const shouldShow = activeFilters.length > 0;

  return `
    <div id="${ELEMENTS.ACTIVE_FILTERS}" class="active-filters" style="display: ${shouldShow ? 'block' : 'none'};">
      <span>Active filters: </span>
      <span id="${ELEMENTS.ACTIVE_FILTERS_LIST}">${activeFilters.join(', ')}</span>
    </div>
  `;
}
