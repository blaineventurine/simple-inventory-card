import { ELEMENTS } from '../utils/constants';
import { FilterState } from '../types/filterState';
import { Utils } from '../utils/utils';

export function createSearchAndFilters(filters: FilterState, categories: string[]): string {
  return `
    <div class="search-row">
      <input 
        type="text" 
        id="${ELEMENTS.SEARCH_INPUT}" 
        placeholder="Search items..." 
        value="${filters.searchText || ''}"
        class="search-input ${filters.searchText ? 'has-value' : ''}"
      />
      <button id="${ELEMENTS.ADVANCED_SEARCH_TOGGLE}" 
        class="toggle-btn ${Utils.hasActiveFilters(filters) ? 'has-active-filters' : ''}">
        ${filters.showAdvanced ? 'Hide Filters' : 'Filters'}
      </button>
    </div>
    
    <div id="advanced-filters" class="advanced-filters" 
         style="display: ${filters.showAdvanced ? 'block' : 'none'}">
      <div class="filter-row">
        <div class="filter-group">
          <label>Category</label>
          <select id="${ELEMENTS.FILTER_CATEGORY}">
            <option value="">All Categories</option>
            ${createCategoryOptions(categories, filters.category)}
          </select>
        </div>
        
        <div class="filter-group">
          <label>Quantity</label>
          <select id="${ELEMENTS.FILTER_QUANTITY}">
            <option value="">All Quantities</option>
            <option value="zero" ${filters.quantity === 'zero' ? 'selected' : ''}>Zero</option>
            <option value="nonzero" ${filters.quantity === 'nonzero' ? 'selected' : ''}>Non-zero</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Expiry</label>
          <select id="${ELEMENTS.FILTER_EXPIRY}">
            <option value="">All Items</option>
            <option value="none" ${filters.expiry === 'none' ? 'selected' : ''}>No Expiry</option>
            <option value="expired" ${filters.expiry === 'expired' ? 'selected' : ''}>Expired</option>
            <option value="soon" ${filters.expiry === 'soon' ? 'selected' : ''}>Expiring Soon</option>
            <option value="future" ${filters.expiry === 'future' ? 'selected' : ''}>Future</option>
          </select>
        </div>
      </div>
      
      <div class="filter-actions">
        <button id="${ELEMENTS.CLEAR_FILTERS}" class="clear-only-btn">Clear All Filters</button>
      </div>
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
