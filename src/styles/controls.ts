import { CSSResult, css } from 'lit-element';

export const controlStyles: CSSResult = css`
  .si-toolbar {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-2);
    margin-bottom: var(--si-space-3);
  }

  .si-toolbar__row {
    display: flex;
    align-items: center;
    gap: var(--si-space-2);
  }

  .si-toolbar__row .search-row {
    flex: 1;
    min-width: 0;
  }

  .si-add-btn {
    flex-shrink: 0;
    margin-left: auto;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: var(--si-space-1);
  }

  .si-search {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .si-search__icon {
    position: absolute;
    top: 50%;
    left: var(--si-space-3);
    transform: translateY(-50%);
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color);
    pointer-events: none;
  }

  .search-row .search-input {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--si-tap);
    padding: 0 var(--si-space-4) 0 40px;
    border: 1px solid transparent;
    border-radius: var(--si-radius-pill);
    background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
    color: var(--primary-text-color);
    font-size: 16px;
  }

  .search-row .search-input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .search-row .search-input.has-value {
    border-color: color-mix(in srgb, var(--primary-color) 50%, transparent);
  }

  .si-filter-btn {
    position: relative;
    flex-shrink: 0;
    color: var(--primary-text-color);
  }

  .si-filter-btn.has-active-filters {
    color: var(--primary-color);
  }

  .si-filter-btn.has-active-filters::after {
    content: '';
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary-color);
    box-shadow: 0 0 0 2px var(--card-background-color, var(--ha-card-background, transparent));
  }

  .si-chip-row {
    display: flex;
    align-items: center;
    gap: var(--si-space-2);
    margin: 0 calc(-1 * var(--si-space-4));
    padding: var(--si-space-1) var(--si-space-4);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .si-chip-row::-webkit-scrollbar {
    display: none;
  }

  .si-chip-row > *,
  .filter-badges-container > * {
    flex-shrink: 0;
  }

  .active-filters,
  .filter-badges-container {
    gap: var(--si-space-2);
  }

  .active-filters,
  .filter-badges-container {
    display: flex;
  }

  .filter-badge {
    white-space: nowrap;
  }

  .si-sort-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--si-space-1);
    white-space: nowrap;
  }

  .si-sort-chip ha-icon {
    --mdc-icon-size: 18px;
  }

  .si-sort-chip select {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: none;
    opacity: 0;
    font-size: 16px;
    cursor: pointer;
    appearance: none;
  }

  .si-sort-chip:has(select:focus-visible) {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .si-sort-chip__a11y {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .advanced-filters {
    padding: var(--si-space-3);
    border-radius: var(--si-radius);
    background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
  }

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--si-space-3);
    margin-bottom: var(--si-space-3);
  }

  .filter-group {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--si-space-1);
    min-width: 160px;
  }

  .filter-group > label {
    color: var(--secondary-text-color);
    font-size: var(--si-font-secondary);
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .multi-select-container {
    position: relative;
  }

  .multi-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--si-space-2);
    min-height: var(--si-tap);
    padding: 0 var(--si-space-3) 0 var(--si-space-4);
    border-radius: var(--si-radius-pill);
    background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
    color: var(--primary-text-color);
    font-size: var(--si-font-name);
    cursor: pointer;
    user-select: none;
  }

  .multi-select-trigger:hover {
    background: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
  }

  .multi-select-arrow {
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color);
  }

  .multi-select-dropdown {
    padding-top: var(--si-space-2);
  }

  .multi-select-option.si-toggle-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--si-space-1);
    margin: 0 var(--si-space-2) var(--si-space-2) 0;
    cursor: pointer;
    user-select: none;
  }

  .si-toggle-chip input[type='checkbox'] {
    position: absolute !important;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    border: none !important;
    border-radius: inherit !important;
    background: transparent !important;
    box-shadow: none !important;
    opacity: 0;
    cursor: pointer !important;
  }

  .si-toggle-chip:has(input:checked) {
    --si-tone: var(--primary-color);
    color: var(--si-tone);
    background: color-mix(in srgb, var(--si-tone) 20%, transparent);
  }

  .si-toggle-chip:has(input:focus-visible) {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .si-toggle-chip__check {
    display: none;
    --mdc-icon-size: 16px;
  }

  .si-toggle-chip input:checked ~ .si-toggle-chip__check {
    display: inline-flex;
  }

  .filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--si-space-2);
    margin-top: var(--si-space-1);
  }
`;
