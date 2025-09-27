import { ELEMENTS } from '../utils/constants';
import { FilterState } from '../types/filterState';
import { Utilities } from '../utils/utilities';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { createMultiSelect } from './multiSelect';

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
        ${createMultiSelect({
          id: ELEMENTS.FILTER_EXPIRY,
          options: ['none', 'expired', 'soon', 'future'],
          selected: filters.expiry,
          placeholder: TranslationManager.localize(
            translations,
            'filters.all_items',
            undefined,
            'All Items',
          ),
          labels: {
            none: TranslationManager.localize(
              translations,
              'filters.no_expiry',
              undefined,
              'No Expiry',
            ),
            expired: TranslationManager.localize(
              translations,
              'filters.expired',
              undefined,
              'Expired',
            ),
            soon: TranslationManager.localize(
              translations,
              'filters.expiring_soon',
              undefined,
              'Expiring Soon',
            ),
            future: TranslationManager.localize(
              translations,
              'filters.future',
              undefined,
              'Future',
            ),
          },
        })}
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
        ${createMultiSelect({
          id: ELEMENTS.FILTER_QUANTITY,
          options: ['zero', 'nonzero'],
          selected: filters.quantity,
          placeholder: TranslationManager.localize(
            translations,
            'filters.all_quantities',
            undefined,
            'All Quantities',
          ),
          labels: {
            zero: TranslationManager.localize(translations, 'filters.zero', undefined, 'Zero'),
            nonzero: TranslationManager.localize(
              translations,
              'filters.non_zero',
              undefined,
              'Non-zero',
            ),
          },
        })}
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
        ${createMultiSelect({
          id: ELEMENTS.FILTER_CATEGORY,
          options: categories,
          selected: filters.category,
          placeholder: TranslationManager.localize(
            translations,
            'filters.all_categories',
            undefined,
            'All Categories',
          ),
        })}
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
        ${createMultiSelect({
          id: ELEMENTS.FILTER_LOCATION,
          options: locations,
          selected: filters.location,
          placeholder: TranslationManager.localize(
            translations,
            'filters.all_locations',
            undefined,
            'All Locations',
          ),
        })}
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
