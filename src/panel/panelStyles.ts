import { CSSResult, css } from 'lit-element';
import { tokenStyles } from '@/styles/tokens';
import { itemRowStyles } from '@/styles/itemRows';

export const panelStyles: CSSResult = css`
  ${tokenStyles}
  ${itemRowStyles}

  :host {
    display: block;
    min-height: 100vh;
    background: var(--primary-background-color);
    color: var(--primary-text-color);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--si-space-2);
    height: 56px;
    padding: 0 var(--si-space-3);
    background: var(--app-header-background-color, var(--primary-color));
    color: var(--app-header-text-color, var(--text-primary-color));
    font-size: 20px;
  }

  .toolbar .menu-btn,
  .toolbar .search-open-btn,
  .toolbar .search-close-btn {
    color: inherit;
  }

  .toolbar .search-open-btn {
    margin-left: auto;
  }

  .search-field {
    flex: 1 1 auto;
    min-width: 0;
    max-width: 560px;
    height: 40px;
    margin-left: auto;
    padding: 0 var(--si-space-3);
    border: none;
    border-radius: 20px;
    background: color-mix(in srgb, currentColor 15%, transparent);
    color: inherit;
    font: inherit;
    font-size: 16px;
  }

  .search-field::placeholder {
    color: inherit;
    opacity: 0.7;
  }

  .search-field:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 0;
  }

  .search-results,
  .search-footer {
    max-width: 760px;
    margin: 0 auto;
    padding: var(--si-space-2) var(--si-space-3);
    box-sizing: border-box;
  }

  .search-footer {
    color: var(--secondary-text-color);
    font-size: var(--si-font-secondary);
    text-align: center;
  }

  .title {
    margin: 0;
    font-size: inherit;
    font-weight: 400;
  }

  .tabs {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    background: var(--app-header-background-color, var(--primary-color));
    color: var(--app-header-text-color, var(--text-primary-color));
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: var(--si-space-2);
    flex-shrink: 0;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 12px 16px;
    min-height: var(--si-tap);
    white-space: nowrap;
    cursor: pointer;
  }

  .tab[aria-selected='true'] {
    border-bottom-color: currentColor;
    font-weight: 500;
  }

  .tab:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: -4px;
  }

  .content {
    max-width: 760px;
    margin: 0 auto;
    padding: var(--si-space-3);
  }

  /* Wide views use the room: Home, an inventory shown as tiles and an item page (the card
     mirrors its layout and view on its element). */
  .content.wide,
  .content:has(> simple-inventory-card[layout='tiles']:not([hidden])),
  .content:has(> simple-inventory-card[view='detail']:not([hidden])) {
    max-width: 1440px;
  }

  .home-summaries {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--si-space-2);
    margin-bottom: var(--si-space-4);
  }

  .home-summary {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--si-space-1);
    padding: var(--si-space-3);
    border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--card-background-color);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .home-summary:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .home-summary__head {
    display: flex;
    align-items: center;
    gap: var(--si-space-2);
    min-width: 0;
    font-weight: 500;
  }

  .home-summary__head ha-icon {
    flex-shrink: 0;
    color: var(--secondary-text-color);
  }

  .home-summary__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .home-summary__items,
  .home-summary__value {
    color: var(--secondary-text-color);
    font-size: var(--si-font-secondary);
  }

  .home-summary__badge {
    margin-top: var(--si-space-1);
  }

  /* 2 columns at wide widths, 1 below about 1,120 px (never wider than a phone screen). */
  .home-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(560px, 100%), 1fr));
    gap: var(--si-space-3) var(--si-space-4);
    align-items: start;
  }

  .home-section {
    min-width: 0;
  }

  .home-section__title {
    display: flex;
    align-items: center;
    gap: var(--si-space-2);
    margin: 0 0 var(--si-space-1);
    font-size: 16px;
    font-weight: 500;
  }

  .home-section__count {
    color: var(--secondary-text-color);
    font-weight: 400;
  }

  .home-show-all {
    margin: var(--si-space-1) 0 0 var(--si-space-2);
  }

  .home-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--si-space-2);
    padding: var(--si-space-4);
    color: var(--secondary-text-color);
    --mdc-icon-size: 48px;
  }

  .home-empty ha-icon {
    color: var(--success-color, #43a047);
  }

  .home-empty p {
    margin: 0;
  }

  .message {
    padding: var(--si-space-4);
    text-align: center;
    color: var(--secondary-text-color);
  }

  .scan-overlay {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background: var(--primary-background-color);
  }

  .scan-overlay[hidden] {
    display: none;
  }

  .scan-overlay__sheet {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-3);
    width: 100%;
    max-width: 560px;
    padding: var(--si-space-3);
    box-sizing: border-box;
  }

  .scan-overlay__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .scan-overlay__title {
    margin: 0;
    font-size: 20px;
    font-weight: 400;
  }

  .scan-overlay__loading {
    color: var(--secondary-text-color);
    text-align: center;
  }

  /* The one hard-coded colour the card allows: black behind the camera video. */
  .scan-overlay__viewport {
    max-height: 60vh;
    overflow: hidden;
    border-radius: var(--si-radius);
    background: #000;
  }

  .scan-overlay__viewport video {
    display: block;
    width: 100%;
  }

  .scan-overlay__file {
    align-self: center;
  }

  .scan-overlay__error {
    margin: 0;
    color: var(--error-color, #db4437);
    text-align: center;
  }
`;
