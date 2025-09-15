import { ELEMENTS } from '../utils/constants';
import { FilterState } from '../types/filterState';
import { Utilities } from '../utils/utilities';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';

export function createSearchAndFilters(
  filters: FilterState,
  categories: string[],
  locations: string[],
  translations: TranslationData,
): string {
  return `
    ${searchRow(filters, translations)}
    ${advancedFilters(filters, categories, locations, translations)}
  `;
}

function advancedFilters(
  filters: FilterState,
  categories: string[],
  locations: string[],
  translations: TranslationData,
): string {
  return `
    <div id="advanced-filters" class="advanced-filters" style="display: ${filters.showAdvanced ? 'block' : 'none'}">
      ${categoryFilters(filters, categories, translations)}
      ${locationFilters(filters, locations, translations)}
      ${quantityFilters(filters, translations)}
      ${expiryFilters(filters, translations)}
      ${clearFiltersButton(translations)}
    </div>
`;
}

function clearFiltersButton(translations: TranslationData): string {
  return `
    <div class="filter-actions">
      <button id="${ELEMENTS.CLEAR_FILTERS}" class="clear-only-btn">
        ${TranslationManager.localize(
          translations,
          'filters.clear_all_filters',
          undefined,
          'Clear All Filters',
        )}
      </button>
    </div>
`;
}

function expiryFilters(filters: FilterState, translations: TranslationData): string {
  return `
    <div class="filter-row">
      <div class="filter-group">
        <label>
          ${TranslationManager.localize(translations, 'filters.expiry', undefined, 'Expiry')}
        </label>
        <select id="${ELEMENTS.FILTER_EXPIRY}">
          <option value="">
            ${TranslationManager.localize(translations, 'filters.all_items', undefined, 'All Items')}
          </option>

          <option value="none" ${filters.expiry === 'none' ? 'selected' : ''}>
            ${TranslationManager.localize(translations, 'filters.no_expiry', undefined, 'No Expiry')}
          </option>

          <option value="expired" ${filters.expiry === 'expired' ? 'selected' : ''}>
            ${TranslationManager.localize(translations, 'filters.expired', undefined, 'Expired')}
          </option>

          <option value="soon" ${filters.expiry === 'soon' ? 'selected' : ''}>
            ${TranslationManager.localize(
              translations,
              'filters.expiring_soon',
              undefined,
              'Expiring Soon',
            )}
          </option>

          <option value="future" ${filters.expiry === 'future' ? 'selected' : ''}>
            ${TranslationManager.localize(translations, 'filters.future', undefined, 'Future')}
          </option>
        </select>
      </div>
    </div>
`;
}

function quantityFilters(filters: FilterState, translations: TranslationData): string {
  return `
    <div class="filter-row">
      <div class="filter-group">
        <label>
          ${TranslationManager.localize(translations, 'filters.quantity', undefined, 'Quantity')}
        </label>
        <select id="${ELEMENTS.FILTER_QUANTITY}">
          <option value="">
            ${TranslationManager.localize(
              translations,
              'filters.all_quantities',
              undefined,
              'All Quantities',
            )}
          </option>

          <option value="zero" ${filters.quantity === 'zero' ? 'selected' : ''}>
            ${TranslationManager.localize(translations, 'filters.zero', undefined, 'Zero')}
          </option>

          <option value="nonzero" ${filters.quantity === 'nonzero' ? 'selected' : ''}>
            ${TranslationManager.localize(translations, 'filters.non_zero', undefined, 'Non-zero')}
          </option>
        </select>
      </div>
    </div>
`;
}

function categoryFilters(
  filters: FilterState,
  categories: string[],
  translations: TranslationData,
): string {
  return `
    <div class="filter-row">
      <div class="filter-group">
        <label>
          ${TranslationManager.localize(translations, 'filters.category', undefined, 'Category')}
        </label>
        <select id="${ELEMENTS.FILTER_CATEGORY}">
          <option value="">
            ${TranslationManager.localize(
              translations,
              'filters.all_categories',
              undefined,
              'All Categories',
            )}
          </option>
          ${createCategoryOptions(categories, filters.category)}
        </select>
      </div>
    </div>
`;
}

function locationFilters(
  filters: FilterState,
  locations: string[],
  translations: TranslationData,
): string {
  return `
    <div class="filter-row">
      <div class="filter-group">
        <label>
          ${TranslationManager.localize(translations, 'filters.location', undefined, 'Location')}
        </label>
        <select id="${ELEMENTS.FILTER_LOCATION}">
          <option value="">
            ${TranslationManager.localize(
              translations,
              'filters.all_locations',
              undefined,
              'All Locations',
            )}
          </option>
          ${createLocationOptions(locations, filters.location)}
        </select>
      </div>
    </div>
`;
}

function searchRow(filters: FilterState, translations: TranslationData): string {
  return `
    <div class="search-row">
      <input 
        type="text" 
        id="${ELEMENTS.SEARCH_INPUT}" 
        placeholder="${TranslationManager.localize(
          translations,
          'filters.search_placeholder',
          undefined,
          'Search items...',
        )}" 
        value="${filters.searchText || ''}"
        class="search-input ${filters.searchText ? 'has-value' : ''}"
      />
      <button id="${ELEMENTS.ADVANCED_SEARCH_TOGGLE}" 
        class="toggle-btn ${Utilities.hasActiveFilters(filters) ? 'has-active-filters' : ''}">
        ${
          filters.showAdvanced
            ? TranslationManager.localize(
                translations,
                'filters.hide_filters',
                undefined,
                'Hide Filters',
              )
            : TranslationManager.localize(translations, 'filters.filters', undefined, 'Filters')
        }
      </button>
    </div>
`;
}

function createCategoryOptions(categories: string[], selectedCategory: string): string {
  return categories
    .map(
      (category) =>
        `<option value="${category}" ${category === selectedCategory ? 'selected' : ''}>${category}</option>`,
    )
    .join('');
}

function createLocationOptions(locations: string[], selectedLocation: string): string {
  return locations
    .map(
      (location) =>
        `<option value="${location}" ${location === selectedLocation ? 'selected' : ''}>${location}</option>`,
    )
    .join('');
}
