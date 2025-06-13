import { cardHeaderStyles } from './cardHeader';

export const styles = `
  ha-card {
    padding: 16px;
  }

  .inventory-title {
    margin: 0;
    font-size: 1.3em;
    font-weight: bold;
    color: var(--primary-text-color);
  }

  .controls-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .controls-row .sorting-controls {
    flex: 1;
    margin-bottom: 0;
  }

  .add-new-btn {
    padding: 12px 16px;
    background: var(--primary-color);
    color: var(--text-primary-color, white);
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-new-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .add-new-btn:active {
    transform: translateY(0);
  }

  .item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid var(--divider-color, #e8e8e8);
    border-radius: 8px;
    gap: 12px;
  }
  
  .item-row.zero-quantity {
    opacity: 0.6;
    background: var(--secondary-background-color, #f5f5f5);
  }
  
  .item-row.auto-add-enabled {
    border-left: 4px solid var(--success-color, #4caf50);
  }
  
  .item-info {
    flex: 1;
  }
  
  .item-name {
    font-weight: bold;
    font-size: 1.1em;
    margin-bottom: 4px;
  }
  
  .item-details {
    color: var(--secondary-text-color);
    font-size: 0.9em;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .item-controls {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    align-items: center;
  }
  
  .quantity {
    font-weight: bold;
    color: var(--primary-color);
  }
  
  .category {
    font-style: italic;
  }
  
  .expiry {
    color: var(--error-color);
  }
  
  .auto-add-info {
    font-size: 0.8em;
    color: var(--success-color);
    font-weight: bold;
  }
  
  .edit-btn {
    padding: 6px 8px;
    font-size: 12px;
    min-width: auto;
    min-height: auto;
    background: var(--secondary-color, #f0f0f0);
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }
  
  .editbtn:hover {
    background: var(--primary-color);
    color: var(--text-primary-color);
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
  
  input:not([type="checkbox"]), select {
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
  
  input:not([type="checkbox"]):focus, select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
    transform: translateY(-1px);
  }
  
  input::placeholder {
    color: var(--secondary-text-color);
    opacity: 0.7;
  }

  input[type="checkbox"] {
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

  input[type="checkbox"]:checked {
    background: var(--primary-color) !important;
    border-color: var(--primary-color) !important;
    transform: scale(1.05) !important;
  }

  input[type="checkbox"]:checked::after {
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
    0% { transform: translate(-50%, -50%) scale(0); }
    50% { transform: translate(-50%, -50%) scale(1.2); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }

  input[type="checkbox"]:hover {
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
    content: "Auto-add Settings";
    display: block;
    font-size: 0.85em;
    font-weight: 600;
    color: var(--primary-color);
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  input[type="checkbox"]:checked + label + .auto-add-controls,
  input[type="checkbox"]:checked ~ .auto-add-controls {
    display: block !important;
  }

  #item-auto-add:checked ~ .auto-add-controls,
  #modal-auto-add:checked ~ .auto-add-controls,
  [id$="auto-add"]:checked ~ .auto-add-controls,
  [id$="AUTO_ADD"]:checked ~ .auto-add-controls {
    display: block !important;
  }

  .auto-add-required {
    border-color: var(--primary-color) !important;
  }

  .auto-add-controls label:has(+ .auto-add-required)::after,
  .auto-add-controls .input-group:has(.auto-add-required) label::after {
    content: " *";
    color: var(--error-color, #f44336);
    font-weight: bold;
  }
  
  button {
    padding: 14px 24px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-height: 48px;
  }
  
  .primary-btn, .save-btn {
    background: var(--primary-color);
    color: var(--text-primary-color, white);
  }
  
  .primary-btn:hover, .save-btn:hover {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--rgb-primary-color), 0.3);
  }
  
  .control-btn {
    padding: 8px 12px;
    font-size: 16px;
    font-weight: bold;
    min-width: 40px;
    min-height: 40px;
    background: var(--primary-color);
    color: var(--text-primary-color);
    border: none;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .control-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    background: var(--disabled-color, #ccc);
    transform: none;
    box-shadow: none;
  }
  
  .add-btn {
    width: 100%;
    margin-top: 8px;
    padding: 16px;
    font-size: 16px;
    font-weight: bold;
  }
  
  .no-items {
    text-align: center;
    color: var(--secondary-text-color);
    padding: 20px;
  }
  
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
  }
  
  .modal.show {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-content {
    background-color: var(--card-background-color);
    padding: 32px;
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    position: relative;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--divider-color);
  }
  
  .modal-header h3 {
    font-size: 1.5em;
    font-weight: 700;
    color: var(--primary-text-color);
    margin: 0;
  }
  
  .modal-title {
    font-size: 1.5em;
    font-weight: 700;
    color: var(--primary-text-color);
  }
  
  .close-btn {
    background: transparent;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: var(--secondary-text-color);
    padding: 8px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
    min-height: auto;
  }

  .close-btn:hover {
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
  }
   
  .modal-buttons {
    display: flex;
    gap: 16px;
    margin-top: 32px;
    justify-content: flex-end;
  }
  
  .modal-buttons button {
    padding: 12px 24px;
    min-width: 100px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
 
  .cancel-btn {
    background: var(--secondary-background-color, #f0f0f0);
    color: var(--primary-text-color);
    border: 2px solid var(--divider-color, #e0e0e0);
  }

  .cancel-btn:hover {
    background: var(--primary-background-color);
    transform: translateY(-1px);
  }

  .search-controls {
    margin-bottom: 20px;
    padding: 12px;
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 8px;
  }

  .search-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 0;
  }

  .search-row input {
    flex: 1;
    min-width: 0;
  }

  .toggle-btn {
    padding: 12px 16px;
    background: var(--primary-color);
    color: var(--text-primary-color, white);
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .toggle-btn:hover {
    opacity: 0.9;
  }

  .sorting-controls {
    margin-bottom: 20px;
    padding: 12px;
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .sorting-controls label {
    font-weight: bold;
    color: var(--primary-text-color);
    white-space: nowrap;
    margin-bottom: 0;
  }
  
  .sorting-controls select {
    flex: 1;
    max-width: 200px;
  }
  
  .category-group {
    margin-bottom: 20px;
  }
  
  .category-header {
    font-weight: bold;
    font-size: 1.1em;
    color: var(--primary-color);
    margin-bottom: 8px;
    padding: 8px 12px;
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 6px;
    border-left: 4px solid var(--primary-color);
  }

  .advanced-filters {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--divider-color);
  }

  .filter-row {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 120px;
    flex: 1;
  }

  .filter-group label {
    font-size: 0.9em;
    font-weight: 500;
    color: var(--secondary-text-color);
  }

  .filter-actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
  }

  .filter-actions button {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  #apply-filters {
    background: var(--primary-color);
    color: var(--text-primary-color, white);
    border: none;
  }

  #clear-filters {
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }

  #apply-filters:hover,
  #clear-filters:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .toggle-btn.has-active-filters {
    background: var(--warning-color, #ff9800) !important;
    position: relative;
  }

  .toggle-btn.has-active-filters::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background: var(--error-color, #f44336);
    border-radius: 50%;
    border: 2px solid var(--card-background-color, white);
  }

  .search-row input.has-value {
    border-color: var(--warning-color, #ff9800);
    box-shadow: 0 0 0 1px var(--warning-color, #ff9800);
  }

  @media (max-width: 768px) {
    .controls-row {
      flex-direction: column;
      align-items: stretch;
    }
    
    .add-new-btn {
      width: 100%;
      margin-top: 8px;
    }

    .modal-content {
      padding: 24px;
      margin: 16px;
      width: calc(100% - 32px);
      border-radius: 12px;
    }

    .form-row {
      flex-direction: column;
      gap: 12px;
    }

    .modal-buttons {
      flex-direction: column-reverse;
    }

    .modal-buttons button {
      width: 100%;
    }
  }
  
  @media (min-width: 768px) {
    .item-row {
      flex-wrap: nowrap;
    }
    
    .add-btn {
      width: auto;
      margin-top: 0;
    }
  }
${cardHeaderStyles}
`;
