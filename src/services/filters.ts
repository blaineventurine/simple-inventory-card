import { FILTER_VALUES, STORAGE_KEYS, ELEMENTS, SORT_METHODS } from '../utils/constants';
import { InventoryItem } from '../types/homeAssistant';
import { Utilities } from '../utils/utilities';
import { DEFAULTS } from '../utils/constants';
import { FilterState } from '../types/filterState';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';

export class Filters {
  private searchTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  private boundSearchHandler: ((event: Event) => void) | undefined = undefined;

  constructor(private shadowRoot: ShadowRoot) {}

  getCurrentFilters(entityId: string): FilterState {
    const savedFilters = localStorage.getItem(STORAGE_KEYS.FILTERS(entityId));

    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters) as FilterState;
        if (!parsed.sortMethod) {
          parsed.sortMethod = DEFAULTS.SORT_METHOD;
        }
        return parsed;
      } catch (error) {
        console.error('Error parsing saved filters:', error);
      }
    }

    return {
      searchText: '',
      category: '',
      quantity: '',
      expiry: '',
      showAdvanced: false,
      sortMethod: DEFAULTS.SORT_METHOD,
    };
  }

  saveFilters(entityId: string, filters: FilterState): void {
    localStorage.setItem(STORAGE_KEYS.FILTERS(entityId), JSON.stringify(filters));
  }

  clearFilters(entityId: string): void {
    localStorage.removeItem(STORAGE_KEYS.FILTERS(entityId));
  }

  filterItems(items: readonly InventoryItem[], filters: FilterState): InventoryItem[] {
    if (!filters || Object.keys(filters).length === 0) {
      return [...items];
    }

    return items.filter((item) => {
      if (filters.searchText && !this.matchesTextSearch(item, filters.searchText)) {
        return false;
      }

      if (filters.category && item.category !== filters.category) {
        return false;
      }

      if (filters.quantity && !this.matchesQuantityFilter(item, filters.quantity)) {
        return false;
      }

      if (filters.expiry && !this.matchesExpiryFilter(item, filters.expiry)) {
        return false;
      }

      return true;
    });
  }

  private matchesTextSearch(item: InventoryItem, searchText: string): boolean {
    const search = searchText.toLowerCase();
    const itemName = (item.name ?? '').toLowerCase();
    const itemCategory = (item.category ?? '').toLowerCase();
    const itemUnit = (item.unit ?? '').toLowerCase();

    return itemName.includes(search) || itemCategory.includes(search) || itemUnit.includes(search);
  }

  private matchesQuantityFilter(item: InventoryItem, quantityFilter: string): boolean {
    switch (quantityFilter) {
      case FILTER_VALUES.QUANTITY.ZERO: {
        return item.quantity === 0;
      }
      case FILTER_VALUES.QUANTITY.NONZERO: {
        return item.quantity > 0;
      }
      default: {
        return true;
      }
    }
  }

  private matchesExpiryFilter(item: InventoryItem, expiryFilter: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (expiryFilter) {
      case FILTER_VALUES.EXPIRY.NONE: {
        return !item.expiry_date;
      }

      case FILTER_VALUES.EXPIRY.EXPIRED: {
        if (!item.expiry_date || (item.quantity ?? 0) <= 0) {
          return false;
        }

        return Utilities.isExpired(item.expiry_date);
      }

      case FILTER_VALUES.EXPIRY.SOON: {
        if (!item.expiry_date || (item.quantity ?? 0) <= 0) {
          return false;
        }

        const itemThreshold = item.expiry_alert_days || 7;
        return Utilities.isExpiringSoon(item.expiry_date, itemThreshold);
      }

      case FILTER_VALUES.EXPIRY.FUTURE: {
        if (!item.expiry_date || (item.quantity ?? 0) <= 0) {
          return false;
        }

        const futureDate = new Date(item.expiry_date);
        const itemThreshold2 = item.expiry_alert_days || 7;
        const thresholdDate = new Date(today);
        thresholdDate.setDate(today.getDate() + itemThreshold2);

        return futureDate > thresholdDate;
      }
      default: {
        return true;
      }
    }
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

  setupSearchInput(entityId: string, onFilterChange: () => void): void {
    const searchInput = this.shadowRoot.getElementById(
      ELEMENTS.SEARCH_INPUT,
    ) as HTMLInputElement | null;

    if (searchInput) {
      searchInput.removeEventListener('input', this.boundSearchHandler as any);

      this.boundSearchHandler = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const value = target.value;

        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
          const filters = this.getCurrentFilters(entityId);
          filters.searchText = value;
          this.saveFilters(entityId, filters);
          onFilterChange();
        }, 300);
      };

      searchInput.addEventListener('input', this.boundSearchHandler);
    }
    // this.searchListenerSetup = true;
  }

  updateFilterIndicators(filters: FilterState, translations: TranslationData): void {
    const advancedToggle = this.shadowRoot.getElementById(
      ELEMENTS.ADVANCED_SEARCH_TOGGLE,
    ) as HTMLElement | null;

    if (advancedToggle) {
      if (Utilities.hasActiveFilters(filters)) {
        const hideText = TranslationManager.localize(
          translations,
          'filters.hide_filters',
          undefined,
          'Hide Filters',
        );
        const filtersText = TranslationManager.localize(
          translations,
          'filters.filters',
          undefined,
          'Filters',
        );
        const text = filters.showAdvanced ? `${hideText} ●` : `${filtersText} ●`;
        advancedToggle.textContent = text;
        advancedToggle.style.background = 'var(--warning-color, #ff9800)';
      } else {
        const hideText = TranslationManager.localize(
          translations,
          'filters.hide_filters',
          undefined,
          'Hide Filters',
        );
        const filtersText = TranslationManager.localize(
          translations,
          'filters.filters',
          undefined,
          'Filters',
        );
        const text = filters.showAdvanced ? hideText : filtersText;
        advancedToggle.textContent = text;
        advancedToggle.style.background = 'var(--primary-color)';
      }
    }

    this.updateActiveFiltersDisplay(filters, translations);
  }

  private updateActiveFiltersDisplay(filters: FilterState, translations: TranslationData): void {
    const activeFiltersDiv = this.shadowRoot.getElementById(
      ELEMENTS.ACTIVE_FILTERS,
    ) as HTMLElement | null;
    const activeFiltersList = this.shadowRoot.getElementById(
      ELEMENTS.ACTIVE_FILTERS_LIST,
    ) as HTMLElement | null;

    if (activeFiltersDiv && activeFiltersList) {
      const activeFilters: string[] = [];

      if (filters.searchText) {
        activeFilters.push(
          `${TranslationManager.localize(translations, 'active_filters.search', undefined, 'Search')}: "${filters.searchText}"`,
        );
      }
      if (filters.category) {
        activeFilters.push(
          `${TranslationManager.localize(translations, 'active_filters.category', undefined, 'Category')}: ${filters.category}`,
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
          `${TranslationManager.localize(translations, 'active_filters.quantity', undefined, 'Quantity')}: ${quantityLabel}`,
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
          `${TranslationManager.localize(translations, 'active_filters.expiry', undefined, 'Expiry')}: ${expiryLabel}`,
        );
      }

      if (activeFilters.length > 0) {
        activeFiltersList.textContent = activeFilters.join(', ');
        activeFiltersDiv.style.display = 'block';
      } else {
        activeFiltersDiv.style.display = 'none';
      }
    }
  }
}
