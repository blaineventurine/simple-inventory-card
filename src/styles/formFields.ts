import { CSSResult, css } from 'lit-element';

export const formFieldStyles: CSSResult = css`
  .validation-message {
    display: none;
    align-items: flex-start;
    gap: var(--si-space-2);
    margin-bottom: var(--si-space-3);
    padding: var(--si-space-3);
    border-radius: var(--si-radius);
    font-size: 14px;
    line-height: 1.4;
  }

  .validation-message.show {
    display: flex;
  }

  .validation-message ha-icon {
    flex-shrink: 0;
    --mdc-icon-size: 20px;
  }

  .validation-text {
    flex: 1;
    font-weight: 500;
    color: var(--primary-text-color);
  }

  .input-error {
    border-color: var(--error-color, #f44336) !important;
    box-shadow: 0 0 0 1px var(--error-color, #f44336) !important;
    animation: shake 0.3s ease-in-out;
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-2px);
    }
    75% {
      transform: translateX(2px);
    }
  }

  .input-error:focus {
    animation: none; /* Stop shake when user focuses to fix */
  }

  .si-form-section {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-3);
    margin: 0;
    padding: var(--si-space-2) 0 var(--si-space-4);
  }

  .si-form-section__label {
    margin: 0;
    font-size: var(--si-font-secondary);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--secondary-text-color);
  }

  .si-field {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-1);
    min-width: 0;
  }

  .si-field > label {
    font-size: var(--si-font-secondary);
    font-weight: 500;
    color: var(--secondary-text-color);
  }

  .si-field > label .optional {
    font-weight: 400;
  }

  .si-field__help {
    margin: 0;
    font-size: var(--si-font-secondary);
    color: var(--secondary-text-color);
  }

  .si-field-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--si-space-3);
    align-items: start;
  }

  .si-field > input:not([type='checkbox']):not([type='hidden']),
  .si-icon-field > input,
  .modal-multi-select-add-new input,
  .si-field > select,
  .si-field > textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    font-size: 16px;
    line-height: 20px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    transition:
      border-color var(--si-motion, 200ms) ease,
      box-shadow var(--si-motion, 200ms) ease;
  }

  .si-field > input:not([type='checkbox']):not([type='hidden']):focus,
  .si-icon-field > input:focus,
  .modal-multi-select-add-new input:focus,
  .si-field > select:focus,
  .si-field > textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }

  .si-field > textarea {
    font-family: inherit;
    resize: vertical;
  }

  .si-field > input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Batch-tracked quantity: as specific as the field rule above, so it keeps the read-only look. */
  .si-field > input[readonly]:not([type='checkbox']):not([type='hidden']) {
    background: transparent;
    border-style: dashed;
    color: var(--secondary-text-color);
    cursor: default;
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--secondary-text-color);
    opacity: 0.7;
  }

  .si-icon-field {
    display: flex;
    align-items: center;
    gap: var(--si-space-3);
  }

  .si-icon-field input {
    flex: 1;
    min-width: 0;
  }

  .si-icon-field__preview {
    display: inline-flex;
    flex-shrink: 0;
  }

  /*
   * Outlined like the other fields. HA's picker field draws a filled box with an underline from
   * these theme variables (no parts are exposed); its dropdown is a top-layer popover, so
   * overflow: hidden does not clip it.
   */
  .si-field ha-icon-picker {
    display: block;
    box-sizing: border-box;
    width: 100%;
    overflow: hidden;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    transition:
      border-color var(--si-motion, 200ms) ease,
      box-shadow var(--si-motion, 200ms) ease;
    --ha-color-form-background: transparent;
    --ha-color-border-neutral-loud: transparent;
    --ha-border-radius-sm: 8px;
  }

  .si-field ha-icon-picker:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }

  /* Image field (item_images): one row — preview square, Photo, Media, Remove — that wraps. */
  .si-image-field__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--si-space-2);
  }

  .si-image-field__preview {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    overflow: hidden;
    border-radius: 8px;
  }

  .si-image-field__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* A photo in the preview opens the photo viewer; the preview clips, so the ring sits inside. */
  .si-image-field__open {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: inherit;
    background: none;
    cursor: zoom-in;
  }

  .si-image-field__open * {
    pointer-events: none;
  }

  .si-image-field__open:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  .si-image-field__row .si-tone-error {
    color: var(--si-tone);
  }

  .si-image-field__status:empty {
    display: none;
  }

  .si-image-offer {
    display: flex;
    align-items: center;
    gap: var(--si-space-2);
    color: var(--primary-text-color);
    font-size: var(--si-font-secondary);
    cursor: pointer;
  }

  .si-image-offer__img {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
  }
`;
