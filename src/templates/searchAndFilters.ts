import { ACTIONS, ELEMENTS, FILTER_VALUES } from '../utils/constants';
import { FilterState } from '@/types/filterState';
import { Utilities } from '../utils/utilities';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { createMultiSelect } from './multiSelect';
import { button, iconButton } from './primitives';

/** Toolbar row 1 (left part): pill search field + filter icon button. */
export function createSearchRow(filters: FilterState, translations: TranslationData): string {
  const toggleLabel = filters.showAdvanced
    ? TranslationManager.localize(translations, 'filters.hide_filters', undefined, 'Hide Filters')
    : TranslationManager.localize(translations, 'filters.filters', undefined, 'Filters');

  return `
    <div class="search-row">
      <div class="si-search">
        <ha-icon class="si-search__icon" icon="mdi:magnify" aria-hidden="true"></ha-icon>
        <input
          type="text"
          id="${ELEMENTS.SEARCH_INPUT}"
          placeholder="${TranslationManager.localize(
            translations,
            'filters.search_placeholder',
            undefined,
            'Search items...',
          )}"
          aria-label="${TranslationManager.localize(
            translations,
            'active_filters.search',
            undefined,
            'Search',
          )}"
          value="${Utilities.sanitizeHtml(filters.searchText || '')}"
          class="search-input ${filters.searchText ? 'has-value' : ''}"
        />
      </div>
      ${iconButton({
        icon: 'mdi:filter-variant',
        label: toggleLabel,
        className: Utilities.hasActiveFilters(filters)
          ? 'si-filter-btn has-active-filters'
          : 'si-filter-btn',
        attrs: {
          id: ELEMENTS.ADVANCED_SEARCH_TOGGLE,
          'data-action': ACTIONS.TOGGLE_ADVANCED_FILTERS,
          'aria-expanded': filters.showAdvanced ? 'true' : 'false',
          'aria-controls': 'advanced-filters',
        },
      })}
    </div>
`;
}

/** The collapsible filter panel (toggled by the filter icon button). */
export function createFilterPanel(
  filters: FilterState,
  categories: string[],
  locations: string[],
  translations: TranslationData,
): string {
  return `
    <div id="advanced-filters" class="advanced-filters"${filters.showAdvanced ? '' : ' hidden'}>
      ${categoryFilters(filters, categories, translations)}
      ${locationFilters(filters, locations, translations)}
      ${quantityFilters(filters, translations)}
      ${expiryFilters(filters, translations)}
      ${filterActions(translations)}
    </div>
`;
}

function filterActions(translations: TranslationData): string {
  return `
    <div class="filter-actions">
      ${button({
        kind: 'text',
        label: TranslationManager.localize(
          translations,
          'filters.clear_all_filters',
          undefined,
          'Clear All Filters',
        ),
        attrs: { id: ELEMENTS.CLEAR_FILTERS, 'data-action': ACTIONS.CLEAR_FILTERS },
      })}
      ${button({
        kind: 'tonal',
        label: TranslationManager.localize(translations, 'filters.apply', undefined, 'Apply'),
        attrs: { id: ELEMENTS.APPLY_FILTERS, 'data-action': ACTIONS.TOGGLE_ADVANCED_FILTERS },
      })}
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
          options: Object.values(FILTER_VALUES.EXPIRY),
          selected: filters.expiry,
          placeholder: TranslationManager.localize(
            translations,
            'filters.all_items',
            undefined,
            'All Items',
          ),
          labels: {
            [FILTER_VALUES.EXPIRY.NONE]: TranslationManager.localize(
              translations,
              'filters.no_expiry',
              undefined,
              'No Expiry',
            ),
            [FILTER_VALUES.EXPIRY.EXPIRED]: TranslationManager.localize(
              translations,
              'filters.expired',
              undefined,
              'Expired',
            ),
            [FILTER_VALUES.EXPIRY.SOON]: TranslationManager.localize(
              translations,
              'filters.expiring_soon',
              undefined,
              'Expiring Soon',
            ),
            [FILTER_VALUES.EXPIRY.FUTURE]: TranslationManager.localize(
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
          options: Object.values(FILTER_VALUES.QUANTITY),
          selected: filters.quantity,
          placeholder: TranslationManager.localize(
            translations,
            'filters.all_quantities',
            undefined,
            'All Quantities',
          ),
          labels: {
            [FILTER_VALUES.QUANTITY.ZERO]: TranslationManager.localize(
              translations,
              'filters.zero',
              undefined,
              'Zero',
            ),
            [FILTER_VALUES.QUANTITY.NONZERO]: TranslationManager.localize(
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
      </div>
    </div>
`;
}
