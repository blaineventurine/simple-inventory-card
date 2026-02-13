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
    margin-bottom: 20px;
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
  select,
  textarea {
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

  textarea {
    font-family: inherit;
    resize: vertical;
  }

  input:not([type='checkbox']):focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
    transform: translateY(-1px);
  }

  input::placeholder,
  textarea::placeholder {
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

  .auto-add-id-container {
    display: flex;
    align-items: center;
    gap: 12px;
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

  .auto-add-header {
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

  .autocomplete-container {
    position: relative;
  }

  .autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--card-background-color);
    border: 2px solid var(--divider-color);
    border-top: none;
    border-radius: 0 0 8px 8px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .autocomplete-option {
    padding: 14px 16px;
    cursor: pointer;
    color: var(--primary-text-color);
    font-size: 16px;
    transition: background-color 0.2s ease;
    border-bottom: 1px solid var(--divider-color);
  }

  .autocomplete-option:last-child {
    border-bottom: none;
  }

  .autocomplete-option:hover,
  .autocomplete-option.selected {
    background: var(--secondary-background-color, rgba(var(--rgb-primary-color), 0.05));
  }

  .autocomplete-option.selected {
    background: var(--primary-color);
    color: var(--text-primary-color, white);
  }

  .autocomplete-container input {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4l3 3 3-3' stroke='%23666' stroke-width='2' fill='none'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 16px center;
    padding-right: 48px;
  }

  .autocomplete-container input:focus {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4l3 3 3-3' stroke='var(--primary-color)' stroke-width='2' fill='none'/%3E%3C/svg%3E");
  }

  .modal-multi-select-container {
    position: relative;
  }

  .modal-multi-select-trigger {
    padding: 10px 16px;
    border: 2px solid var(--divider-color);
    border-radius: 8px;
    background: var(--card-background-color);
    cursor: pointer;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    min-height: 48px;
    gap: 4px;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }

  .modal-multi-select-trigger:hover {
    border-color: var(--primary-color);
  }

  .modal-multi-select-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .modal-multi-select-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--primary-color);
    color: var(--text-primary-color, white);
    border-radius: 16px;
    padding: 2px 8px;
    font-size: 0.85em;
    line-height: 1.4;
    white-space: nowrap;
  }

  .modal-multi-select-chip-remove {
    background: transparent;
    border: none;
    color: var(--text-primary-color, white);
    cursor: pointer;
    font-size: 1.1em;
    line-height: 1;
    padding: 0 2px;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .modal-multi-select-chip-remove:hover {
    opacity: 1;
  }

  .modal-multi-select-label {
    color: var(--secondary-text-color);
    font-size: 16px;
  }

  .modal-multi-select-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--card-background-color);
    border: 2px solid var(--divider-color);
    border-top: none;
    border-radius: 0 0 8px 8px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .modal-multi-select-option {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid var(--divider-color);
    gap: 12px;
  }

  .modal-multi-select-option:last-child {
    border-bottom: none;
  }

  .modal-multi-select-option:hover {
    background: var(--secondary-background-color);
  }

  .modal-multi-select-add-new {
    display: flex;
    padding: 8px;
    gap: 8px;
    border-top: 1px solid var(--divider-color);
  }

  .modal-multi-select-add-new input {
    flex: 1;
    min-width: 0;
  }

  .modal-multi-select-add-btn {
    flex-shrink: 0;
    padding: 8px 12px;
    border: 1px solid var(--primary-color);
    border-radius: 6px;
    background: transparent;
    color: var(--primary-color);
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .modal-multi-select-add-btn:hover {
    background: var(--primary-color);
    color: var(--text-primary-color, white);
  }

  .multi-select-container {
    position: relative;
  }

  .multi-select-trigger {
    padding: 14px 16px;
    border: 2px solid var(--divider-color);
    border-radius: 8px;
    background: var(--card-background-color);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.3s ease;
  }

  .multi-select-trigger:hover {
    border-color: var(--primary-color);
  }

  .multi-select-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--card-background-color);
    border: 2px solid var(--divider-color);
    border-top: none;
    border-radius: 0 0 8px 8px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .multi-select-option {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid var(--divider-color);
    gap: 12px;
  }

  .multi-select-option:last-child {
    border-bottom: none;
  }

  .multi-select-option:hover {
    background: var(--secondary-background-color);
  }

  .multi-select-option input[type='checkbox'] {
    margin: 0;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .multi-select-option span {
    flex: 1;
    user-select: none;
  }

  .multi-select-arrow {
    transition: transform 0.3s ease;
    margin-left: 8px;
  }

  .multi-select-trigger.open .multi-select-arrow {
    transform: rotate(180deg);
  }
`;
