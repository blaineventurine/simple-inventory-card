import { FILTER_VALUES, STORAGE_KEYS, ELEMENTS, SORT_METHODS, TIMING } from '../utils/constants';
import { InventoryItem } from '@/types/inventory';
import { Utilities } from '../utils/utilities';
import { DateUtils } from '../utils/dateUtils';
import { foldCase } from '../utils/foldCase';
import { DEFAULTS } from '../utils/constants';
import { FilterState } from '@/types/filterState';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';
import { createFilterBadges } from '@/templates/filters';

export class Filters {
  private searchTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

  constructor(private shadowRoot: ShadowRoot) {}

  getCurrentFilters(entityId: string): FilterState {
    const savedFilters = localStorage.getItem(STORAGE_KEYS.FILTERS(entityId));

    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);

        // Migrate old single-value format to array format
        if (typeof parsed.category === 'string') {
          parsed.category = parsed.category ? [parsed.category] : [];
        }
        if (typeof parsed.location === 'string') {
          parsed.location = parsed.location ? [parsed.location] : [];
        }
        if (typeof parsed.expiry === 'string') {
          parsed.expiry = parsed.expiry ? [parsed.expiry] : [];
        }
        if (typeof parsed.quantity === 'string') {
          parsed.quantity = parsed.quantity ? [parsed.quantity] : [];
        }

        parsed.category = Array.isArray(parsed.category) ? parsed.category : [];
        parsed.location = Array.isArray(parsed.location) ? parsed.location : [];
        parsed.quantity = Array.isArray(parsed.quantity) ? parsed.quantity : [];
        parsed.expiry = Array.isArray(parsed.expiry) ? parsed.expiry : [];

        parsed.searchText = parsed.searchText || '';
        parsed.showAdvanced = !!parsed.showAdvanced;
        parsed.sortMethod = parsed.sortMethod || DEFAULTS.SORT_METHOD;

        return parsed;
      } catch (error) {
        console.error('Error parsing saved filters:', error);
      }
    }

    return {
      category: [],
      expiry: [],
      location: [],
      quantity: [],
      searchText: '',
      showAdvanced: false,
      sortMethod: DEFAULTS.SORT_METHOD,
    };
  }

  saveFilters(entityId: string, filters: FilterState): void {
    localStorage.setItem(STORAGE_KEYS.FILTERS(entityId), JSON.stringify(filters));
  }

  clearFilters(entityId: string): void {
    const current = this.getCurrentFilters(entityId);
    const cleared: FilterState = {
      category: [],
      expiry: [],
      location: [],
      quantity: [],
      searchText: '',
      showAdvanced: current.showAdvanced,
      sortMethod: current.sortMethod ?? DEFAULTS.SORT_METHOD,
    };
    this.saveFilters(entityId, cleared);
  }

  filterItems(items: readonly InventoryItem[], filters: FilterState): InventoryItem[] {
    if (!filters || Object.keys(filters).length === 0) {
      return [...items];
    }

    return items.filter((item) => {
      if (filters.searchText && !this.matchesTextSearch(item, filters.searchText)) {
        return false;
      }

      if (filters.category && filters.category.length > 0) {
        const itemCategories =
          Array.isArray(item.categories) && item.categories.length > 0
            ? item.categories
            : [item.category || ''];
        if (!itemCategories.some((c) => filters.category.includes(c))) {
          return false;
        }
      }

      if (filters.location && filters.location.length > 0) {
        const usualLocations =
          Array.isArray(item.locations) && item.locations.length > 0
            ? item.locations
            : [item.location || ''];
        // Stock can sit somewhere that isn't a usual location (e.g. after a move).
        const itemLocations = [...usualLocations, ...(item.stocked_locations ?? [])];
        if (!itemLocations.some((l) => filters.location.includes(l))) {
          return false;
        }
      }

      if (
        filters.quantity &&
        filters.quantity.length > 0 &&
        !this.matchesQuantityFilter(item, filters.quantity)
      ) {
        return false;
      }

      if (
        filters.expiry &&
        filters.expiry.length > 0 &&
        !this.matchesExpiryFilter(item, filters.expiry)
      ) {
        return false;
      }

      return true;
    });
  }

  /** Case-insensitive substring match on the item's texts, case folded like the integration. */
  private matchesTextSearch(item: InventoryItem, searchText: string): boolean {
    const search = foldCase(searchText);
    const itemName = foldCase(item.name ?? '');
    const itemUnit = foldCase(item.unit ?? '');
    const itemDescription = foldCase(item.description ?? '');

    if (
      itemName.includes(search) ||
      itemUnit.includes(search) ||
      itemDescription.includes(search)
    ) {
      return true;
    }

    if ((item.barcodes ?? []).some((barcode) => foldCase(barcode).includes(search))) {
      return true;
    }

    const aliasTexts = Array.isArray(item.aliases) ? item.aliases : [];
    if (aliasTexts.some((a) => foldCase(a).includes(search))) {
      return true;
    }

    const categoryTexts =
      Array.isArray(item.categories) && item.categories.length > 0
        ? item.categories
        : [item.category ?? ''];
    if (categoryTexts.some((c) => foldCase(c).includes(search))) {
      return true;
    }

    const locationTexts =
      Array.isArray(item.locations) && item.locations.length > 0
        ? item.locations
        : [item.location ?? ''];
    if (locationTexts.some((l) => foldCase(l).includes(search))) {
      return true;
    }

    return false;
  }

  private matchesQuantityFilter(item: InventoryItem, quantityFilter: string[]): boolean {
    return quantityFilter.some((filter) => {
      switch (filter) {
        case FILTER_VALUES.QUANTITY.ZERO:
          return item.quantity === 0;
        case FILTER_VALUES.QUANTITY.NONZERO:
          return item.quantity > 0;
        default:
          return true;
      }
    });
  }

  private matchesExpiryFilter(item: InventoryItem, expiryFilter: string[]): boolean {
    return expiryFilter.some((filter) => {
      switch (filter) {
        case FILTER_VALUES.EXPIRY.NONE: {
          return !item.expiry_date;
        }

        case FILTER_VALUES.EXPIRY.EXPIRED: {
          if (!item.expiry_date || (item.quantity ?? 0) <= 0) {
            return false;
          }

          return DateUtils.isExpired(item.expiry_date);
        }

        case FILTER_VALUES.EXPIRY.SOON: {
          if (!item.expiry_date || (item.quantity ?? 0) <= 0) {
            return false;
          }

          const itemThreshold = item.expiry_alert_days ?? DEFAULTS.EXPIRY_ALERT_DAYS;
          return DateUtils.isExpiringSoon(item.expiry_date, itemThreshold);
        }

        case FILTER_VALUES.EXPIRY.FUTURE: {
          if (!item.expiry_date || (item.quantity ?? 0) <= 0) {
            return false;
          }

          const days = DateUtils.daysUntilExpiry(item.expiry_date);
          const itemThreshold2 = item.expiry_alert_days ?? DEFAULTS.EXPIRY_ALERT_DAYS;
          return days !== null && days > itemThreshold2;
        }

        default: {
          return true;
        }
      }
    });
  }

  sortItems(
    items: readonly InventoryItem[],
    method: string,
    translations: TranslationData,
  ): InventoryItem[] {
    const sortedItems = [...items]; // Create a copy to avoid mutating original

    switch (method) {
      case SORT_METHODS.NAME: {
        return this.sortByName(sortedItems);
      }

      case SORT_METHODS.CATEGORY: {
        return this.sortByCategory(sortedItems, translations);
      }

      case SORT_METHODS.LOCATION: {
        return this.sortByLocation(sortedItems, translations);
      }

      case SORT_METHODS.QUANTITY: {
        return this.sortByQuantity(sortedItems, false);
      }

      case SORT_METHODS.QUANTITY_LOW: {
        return this.sortByQuantity(sortedItems, true);
      }

      case SORT_METHODS.EXPIRY: {
        return this.sortByExpiry(sortedItems);
      }

      case SORT_METHODS.ZERO_LAST: {
        return this.sortZeroLast(sortedItems);
      }

      default: {
        return sortedItems;
      }
    }
  }

  private sortByName(items: InventoryItem[]): InventoryItem[] {
    return items.sort((a, b) => {
      const nameA = (a.name ?? '').toLowerCase().trim();
      const nameB = (b.name ?? '').toLowerCase().trim();
      return nameA.localeCompare(nameB, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }

  private sortByLocation(items: InventoryItem[], translations: TranslationData): InventoryItem[] {
    return items.sort((a, b) => {
      const noLocation = TranslationManager.localize(
        translations,
        'common.no_location',
        undefined,
        'No Location',
      );
      const locationA = (a.location ?? noLocation).toLowerCase().trim();
      const locationB = (b.location ?? noLocation).toLowerCase().trim();

      // First sort by location
      const locationCompare = locationA.localeCompare(locationB);
      if (locationCompare !== 0) {
        return locationCompare;
      }
      // Then sort by name within the same location
      return this.compareNames(a.name, b.name);
    });
  }

  private sortByCategory(items: InventoryItem[], translations: TranslationData): InventoryItem[] {
    return items.sort((a, b) => {
      const uncategorized = TranslationManager.localize(
        translations,
        'common.uncategorized',
        undefined,
        'Uncategorized',
      );
      const categoryA = (a.category ?? uncategorized).toLowerCase().trim();
      const categoryB = (b.category ?? uncategorized).toLowerCase().trim();

      // First sort by category
      const categoryCompare = categoryA.localeCompare(categoryB);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }

      // Then sort by name within the same category
      return this.compareNames(a.name, b.name);
    });
  }

  private sortByQuantity(items: InventoryItem[], lowToHigh = false): InventoryItem[] {
    return items.sort((a, b) => {
      const quantityDiff = lowToHigh
        ? (a.quantity ?? 0) - (b.quantity ?? 0)
        : (b.quantity ?? 0) - (a.quantity ?? 0);

      if (quantityDiff !== 0) {
        return quantityDiff;
      }

      return this.compareNames(a.name, b.name);
    });
  }

  private sortByExpiry(items: InventoryItem[]): InventoryItem[] {
    return items.sort((a, b) => {
      const dateA = a.expiry_date ?? '9999-12-31'; // Items without expiry go to end
      const dateB = b.expiry_date ?? '9999-12-31';

      const dateCompare = dateA.localeCompare(dateB);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return this.compareNames(a.name, b.name);
    });
  }

  private sortZeroLast(items: InventoryItem[]): InventoryItem[] {
    return items.sort((a, b) => {
      const aHasQuantity = (a.quantity ?? 0) > 0;
      const bHasQuantity = (b.quantity ?? 0) > 0;

      if (aHasQuantity && !bHasQuantity) {
        return -1; // a comes first
      }
      if (!aHasQuantity && bHasQuantity) {
        return 1; // b comes first
      }

      // If both have same quantity status, sort alphabetically
      return this.compareNames(a.name, b.name);
    });
  }

  private compareNames(nameA: string | undefined, nameB: string | undefined): number {
    const a = (nameA ?? '').toLowerCase().trim();
    const b = (nameB ?? '').toLowerCase().trim();
    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  /**
   * Live search: saves `value` as the search text and calls `onFilterChange` once typing has
   * paused for 300ms. Fed by the card's delegated `input` listener, so it serves whichever
   * search box the latest render created.
   */
  scheduleSearch(entityId: string, value: string, onFilterChange: () => void): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      const filters = this.getCurrentFilters(entityId);
      filters.searchText = value;
      this.saveFilters(entityId, filters);
      onFilterChange();
    }, TIMING.SEARCH_DEBOUNCE);
  }

  /** Drops a live search still waiting for the typing pause (the card was detached). */
  cancelScheduledSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = undefined;
  }

  updateFilterIndicators(filters: FilterState, translations: TranslationData): void {
    const advancedToggle = this.shadowRoot.getElementById(ELEMENTS.ADVANCED_SEARCH_TOGGLE);

    if (advancedToggle) {
      advancedToggle.classList.toggle('has-active-filters', Utilities.hasActiveFilters(filters));
      advancedToggle.setAttribute('aria-expanded', String(filters.showAdvanced));
    }

    this.updateActiveFiltersDisplay(filters, translations);
  }

  private updateActiveFiltersDisplay(filters: FilterState, translations: TranslationData): void {
    const activeFiltersDiv = this.shadowRoot.getElementById(ELEMENTS.ACTIVE_FILTERS);
    const activeFiltersList = this.shadowRoot.getElementById(ELEMENTS.ACTIVE_FILTERS_LIST);

    if (activeFiltersDiv && activeFiltersList) {
      const filterBadges = createFilterBadges(filters, translations);
      activeFiltersList.innerHTML = filterBadges.join('');
      activeFiltersDiv.hidden = filterBadges.length === 0;

      // The toolbar chip row also holds the sort chip; hide it only when it would be empty.
      const chipRow = activeFiltersDiv.parentElement;
      if (chipRow?.classList.contains('si-chip-row')) {
        chipRow.hidden = filterBadges.length === 0 && !chipRow.querySelector('.si-sort-chip');
      }
    }
  }
}
