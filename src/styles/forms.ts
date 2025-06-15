import { CSSResult, css } from 'lit-element';

export const formStyles: CSSResult = css`
  .validation-message {
    background: var(--error-color, #f44336);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 0.9em;
    display: none;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
    border-left: 4px solid rgba(255, 255, 255, 0.3);
    position: relative;
  }

  .validation-message.show {
    display: flex;
    animation: slideInDown 0.3s ease-out;
  }

  .validation-message::before {
    content: '⚠️';
    font-size: 1.1em;
    flex-shrink: 0;
  }

  .validation-text {
    flex: 1;
    line-height: 1.4;
    font-weight: 500;
  }

  @keyframes slideInDown {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .input-error {
    border-color: var(--error-color, #f44336) !important;
    box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.2) !important;
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

  .add-item-form {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 2px solid var(--divider-color);
  }

  .form-header {
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 16px;
    color: var(--primary-text-color);
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--primary-text-color);
    font-size: 0.9em;
  }

  .form-row {
    display: flex;
    gap: 16px;
    margin-bottom: 0;
    flex-wrap: wrap;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 120px;
  }

  .input-group label {
    font-size: 0.85em;
    color: var(--secondary-text-color);
    font-weight: 500;
  }

  input:not([type='checkbox']),
  select {
    padding: 14px 16px;
    border: 2px solid var(--divider-color);
    border-radius: 8px;
    font-size: 16px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100%;
    box-sizing: border-box;
  }

  input:not([type='checkbox']):focus,
  select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
    transform: translateY(-1px);
  }

  input::placeholder {
    color: var(--secondary-text-color);
    opacity: 0.7;
  }

  input[type='checkbox'] {
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

  input[type='checkbox']:checked {
    background: var(--primary-color) !important;
    border-color: var(--primary-color) !important;
    transform: scale(1.05) !important;
  }

  input[type='checkbox']:checked::after {
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

  input[type='checkbox']:hover {
    border-color: var(--primary-color) !important;
    box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color, 25, 118, 210), 0.1) !important;
  }

  .checkbox-label {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.95em;
    color: var(--primary-text-color);
    font-weight: 500;
    margin: 0;
    line-height: 1.5;
    padding: 4px 0;
  }

  .auto-add-section {
    border-top: 1px solid var(--divider-color);
    padding-top: 20px;
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }

  .auto-add-section .checkbox-label {
    cursor: pointer;
    font-size: 0.95em;
    color: var(--primary-text-color);
    font-weight: 500;
    margin: 0;
    line-height: 1.5;
    flex: 1;
  }

  .auto-add-section .auto-add-controls {
    flex-basis: 100%;
    margin-top: 8px;
  }

  .auto-add-controls {
    display: none;
    margin-top: 16px;
    padding: 20px;
    background: var(--secondary-background-color, rgba(var(--rgb-primary-color), 0.05));
    border-radius: 12px;
    border: 1px solid var(--divider-color, #e9ecef);
  }

  .auto-add-controls::before {
    content: 'Auto-add Settings';
    display: block;
    font-size: 0.85em;
    font-weight: 600;
    color: var(--primary-color);
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  input[type='checkbox']:checked + label + .auto-add-controls,
  input[type='checkbox']:checked ~ .auto-add-controls {
    display: block !important;
  }

  #item-auto-add:checked ~ .auto-add-controls,
  #modal-auto-add:checked ~ .auto-add-controls,
  [id$='auto-add']:checked ~ .auto-add-controls,
  [id$='AUTO_ADD']:checked ~ .auto-add-controls {
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

  .auto-add-controls.has-errors {
    border-color: var(--error-color, #f44336);
    background: rgba(244, 67, 54, 0.05);
  }

  .input-error:focus {
    animation: none; /* Stop shake when user focuses to fix */
  }
`;
