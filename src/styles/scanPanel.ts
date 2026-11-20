import { CSSResult, css } from 'lit-element';

export const scanPanelStyles: CSSResult = css`
  .scan-panel {
    padding: var(--si-space-2) var(--si-space-4) var(--si-space-3);
  }

  .scan-panel-viewport-container {
    position: relative;
    border-radius: var(--si-radius);
    overflow: hidden;
  }

  .scan-panel-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    padding: var(--si-space-4);
    color: var(--secondary-text-color);
    font-size: var(--si-font-secondary);
    background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
  }

  /* The one hard-coded colour the spec allows: black behind the camera video. */
  .scan-panel-viewport {
    max-height: 250px;
    background: #000;
    overflow: hidden;
  }

  .scan-panel-viewport video {
    width: 100%;
    display: block;
  }

  .scan-panel-close {
    position: absolute;
    top: var(--si-space-2);
    right: var(--si-space-2);
    z-index: 1;
    color: var(--primary-text-color);
    background: color-mix(in srgb, var(--card-background-color, #fff) 80%, transparent);
  }

  .scan-panel-close:hover {
    background: var(--card-background-color, #fff);
  }

  .scan-action-bar {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--si-space-3);
    padding-top: var(--si-space-2);
  }

  .scan-info-row {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: var(--si-space-1) var(--si-space-2);
    min-width: 0;
  }

  .scan-barcode-label {
    font-size: var(--si-font-secondary);
    color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums;
  }

  .scan-item-name {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--si-font-name);
    font-weight: 500;
    color: var(--primary-text-color);
  }

  .scan-item-quantity {
    display: inline-block;
    font-size: var(--si-font-secondary);
    color: var(--secondary-text-color);
  }

  .scan-existing-controls {
    display: flex;
    align-items: center;
    gap: var(--si-space-2);
  }

  /* Same outlined look as the sheet's .si-field inputs. */
  .scan-existing-controls .scan-action-select,
  .scan-existing-controls .scan-amount-input {
    box-sizing: border-box;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.4));
    border-radius: 8px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font: inherit;
    font-size: 16px;
    line-height: 20px;
    transition:
      border-color var(--si-motion, 200ms) ease,
      box-shadow var(--si-motion, 200ms) ease;
  }

  .scan-existing-controls .scan-action-select:focus,
  .scan-existing-controls .scan-amount-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }

  .scan-existing-controls .scan-action-select {
    flex: 1;
    min-width: 0;
  }

  .scan-existing-controls .scan-amount-input {
    flex-shrink: 0;
    width: 96px;
  }

  /* flex drops the native marker; the chevron replaces it (same pattern as the row chevron). */
  .scan-batch-details summary {
    display: flex;
    align-items: center;
    gap: var(--si-space-1);
    min-height: var(--si-tap);
    list-style: none;
    cursor: pointer;
    font-size: var(--si-font-name);
    font-weight: 500;
    color: var(--primary-color);
  }

  .scan-batch-details summary::-webkit-details-marker {
    display: none;
  }

  .scan-batch-details__chevron {
    --mdc-icon-size: 20px;
    transition: transform var(--si-motion) ease;
  }

  .scan-batch-details[open] .scan-batch-details__chevron {
    transform: rotate(180deg);
  }

  .scan-batch-details summary:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .scan-batch-details .batch-fields {
    padding-top: var(--si-space-2);
  }

  .scan-buttons-row {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--si-space-2);
  }

  .scan-panel-error {
    padding: var(--si-space-2) 0;
    color: var(--error-color, #db4437);
    font-size: var(--si-font-secondary);
  }

  /* "Choose a photo" when the camera can't be used: its reason above the buttons. */
  .scan-photo {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-2);
    padding: var(--si-space-2) 0;
  }

  .scan-photo__message {
    margin: 0;
    color: var(--error-color, #db4437);
    font-size: var(--si-font-secondary);
  }

  .scan-photo__buttons {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--si-space-2);
  }
`;
