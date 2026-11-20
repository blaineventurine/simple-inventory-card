import { CSSResult, css } from 'lit-element';

export const formSwitchStyles: CSSResult = css`
  input[type='checkbox']:not(.si-switch) {
    appearance: none !important;
    width: 20px !important;
    height: 20px !important;
    border: 2px solid var(--primary-color) !important;
    border-radius: 4px !important;
    background: var(--card-background-color) !important;
    cursor: pointer !important;
    position: relative !important;
    margin: 0 !important;
    padding: 0 !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    flex-shrink: 0 !important;
  }

  input[type='checkbox']:not(.si-switch):checked {
    background: var(--primary-color) !important;
    border-color: var(--primary-color) !important;
    transform: scale(1.05) !important;
  }

  input[type='checkbox']:not(.si-switch):checked::after {
    content: '✓' !important;
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) scale(1) !important;
    color: var(--text-primary-color, white) !important;
    font-size: 12px !important;
    font-weight: bold !important;
    animation: checkmark 0.2s ease-in-out !important;
  }

  @keyframes checkmark {
    0% {
      transform: translate(-50%, -50%) scale(0);
    }
    50% {
      transform: translate(-50%, -50%) scale(1.2);
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
    }
  }

  input[type='checkbox']:not(.si-switch):hover {
    border-color: var(--primary-color) !important;
  }

  input[type='checkbox'].si-switch {
    appearance: none;
    position: relative;
    flex-shrink: 0;
    width: 36px;
    height: 20px;
    margin: 0;
    border-radius: var(--si-radius-pill);
    background: color-mix(in srgb, var(--primary-text-color) 24%, transparent);
    cursor: pointer;
    transition: background-color var(--si-motion, 200ms) ease;
  }

  input[type='checkbox'].si-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--switch-unchecked-button-color, var(--card-background-color));
    transition: transform var(--si-motion, 200ms) ease;
  }

  input[type='checkbox'].si-switch:checked {
    background: color-mix(
      in srgb,
      var(--switch-checked-track-color, var(--primary-color)) 50%,
      transparent
    );
  }

  input[type='checkbox'].si-switch:checked::after {
    background: var(--switch-checked-button-color, var(--primary-color));
    transform: translateX(16px);
  }

  input[type='checkbox'].si-switch:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    flex: 1;
    min-height: 44px;
    margin: 0;
    cursor: pointer;
    font-size: 14px;
    line-height: 1.4;
    color: var(--primary-text-color);
  }

  .auto-add-id-container {
    display: flex;
    align-items: center;
    gap: var(--si-space-3);
  }

  .si-form-section.auto-add-section {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    column-gap: var(--si-space-3);
    row-gap: 0;
  }

  .auto-add-section > .si-form-section__label {
    flex-basis: 100%;
    margin-bottom: var(--si-space-1);
  }

  .auto-add-controls {
    display: none;
    flex-basis: 100%;
    margin-top: var(--si-space-2);
    padding: var(--si-space-3);
    border-radius: var(--si-radius);
    background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
  }

  .auto-add-controls > .si-field-row + .si-field-row {
    margin-top: var(--si-space-3);
  }

  .auto-add-header {
    margin-bottom: var(--si-space-3);
    font-size: var(--si-font-secondary);
    font-weight: 600;
    color: var(--secondary-text-color);
  }

  input[type='checkbox']:checked + label + .auto-add-controls,
  input[type='checkbox']:checked ~ .auto-add-controls {
    display: block !important;
  }

  [id$='auto-add']:checked ~ .auto-add-controls {
    display: block !important;
  }

  .auto-add-required {
    border-color: var(--primary-color) !important;
  }

  .auto-add-controls label:has(+ .auto-add-required)::after,
  .auto-add-controls .input-group:has(.auto-add-required) label::after {
    content: ' *';
    color: var(--error-color, #f44336);
    font-weight: bold;
  }
`;
