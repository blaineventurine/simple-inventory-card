import { CSSResult, css } from 'lit-element';

export const formTagInputStyles: CSSResult = css`
  .barcode-tag-container {
    padding: 4px 8px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: var(--card-background-color);
    transition: border-color var(--si-motion, 200ms) ease;
  }

  .barcode-tag-container:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }

  .barcode-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .barcode-chip {
    --si-tone: var(--primary-color);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 2px 10px;
    border-radius: var(--si-radius-pill);
    color: var(--si-tone);
    background: color-mix(in srgb, var(--si-tone) 20%, transparent);
    font-size: var(--si-font-secondary);
    line-height: 1.6;
    white-space: nowrap;
  }

  .barcode-chip-remove {
    background: transparent;
    border: none;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    opacity: 0.8;
    font-size: 1.1em;
    line-height: 1;
    padding: 0 2px;
    transition: opacity 0.2s ease;
  }

  .barcode-chip-remove:hover {
    opacity: 1;
  }

  .barcode-input-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  }

  /* Bare inputs inside the bordered tag containers, which show the focus ring. */
  .barcode-input-row input,
  .alias-input-row input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    padding: 8px;
    border: none;
    background: transparent;
    color: var(--primary-text-color);
    font: inherit;
    font-size: 16px;
  }

  .barcode-input-row input:focus,
  .alias-input-row input:focus {
    outline: none;
  }

  .barcode-scanner-container {
    position: relative;
    background: #000;
    border-radius: 8px;
    margin-top: 8px;
    overflow: hidden;
  }

  .barcode-scanner-viewport {
    max-height: 250px;
    overflow: hidden;
  }

  .barcode-scanner-viewport video {
    width: 100%;
    display: block;
  }

  .barcode-scanner-viewport canvas {
    display: none;
  }

  /* Same round close as the header scan panel, over the camera video. */
  .barcode-scanner-close {
    position: absolute;
    top: var(--si-space-2);
    right: var(--si-space-2);
    z-index: 1;
    color: var(--primary-text-color);
    background: color-mix(in srgb, var(--card-background-color, #fff) 80%, transparent);
  }

  .barcode-scanner-close:hover {
    background: var(--card-background-color, #fff);
  }

  .barcode-scanner-error {
    color: var(--error-color, #f44336);
    font-size: 0.8em;
    margin-top: 4px;
    padding: 0 4px;
  }

  /* "Choose a photo" when the camera can't be used, after its reason. */
  .barcode-photo {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--si-space-2);
    margin-top: var(--si-space-2);
  }

  .barcode-photo__message {
    flex: 1 1 12em;
    color: var(--error-color, #f44336);
    font-size: 0.8em;
    padding: 0 4px;
  }

  .alias-tag-container {
    padding: 4px 8px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: var(--card-background-color);
    transition: border-color var(--si-motion, 200ms) ease;
  }

  .alias-tag-container:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }

  .alias-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .alias-chip {
    --si-tone: var(--primary-color);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 2px 10px;
    border-radius: var(--si-radius-pill);
    color: var(--si-tone);
    background: color-mix(in srgb, var(--si-tone) 20%, transparent);
    font-size: var(--si-font-secondary);
    line-height: 1.6;
    white-space: nowrap;
  }

  .alias-chip-remove {
    background: transparent;
    border: none;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    opacity: 0.8;
    font-size: 1.1em;
    line-height: 1;
    padding: 0 2px;
    transition: opacity 0.2s ease;
  }

  .alias-chip-remove:hover {
    opacity: 1;
  }

  .alias-input-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  }

  .product-picker {
    margin-top: 8px;
    background: var(--secondary-background-color, rgba(var(--rgb-primary-color), 0.05));
    border-radius: 8px;
    padding: 12px;
  }

  .product-picker-label {
    font-size: 0.85em;
    color: var(--secondary-text-color);
    margin-bottom: 8px;
    font-weight: 500;
  }

  .product-picker-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .product-picker-item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    cursor: pointer;
    background: var(--card-background-color);
    transition: all 0.2s ease;
  }

  .product-picker-item:hover {
    border-color: var(--primary-color);
    background: color-mix(in srgb, currentColor 8%, transparent);
  }

  .product-picker-provider {
    font-size: 0.75em;
    background: var(--primary-color);
    color: var(--text-primary-color, white);
    border-radius: 10px;
    padding: 2px 8px;
    white-space: nowrap;
    font-weight: 500;
  }

  .product-picker-name {
    font-weight: 600;
    font-size: 0.95em;
    color: var(--primary-text-color);
  }

  .product-picker-detail {
    font-size: 0.8em;
    color: var(--secondary-text-color);
    flex-basis: 100%;
  }
`;
