export const styles = `
  ha-card {
    padding: 16px;
  }

  .card-header {
    padding: 16px;
    border-bottom: 1px solid var(--divider-color);
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
    align-items: flex-end;
    margin-bottom: 16px;
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

  .add-new-btn {
    width: 100%;
    padding: 16px;
    margin-top: 16px;
    background: var(--primary-color);
    color: var(--text-primary-color, white);
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-new-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
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
  
  .settings-btn {
    padding: 6px 8px;
    font-size: 12px;
    min-width: auto;
    min-height: auto;
    background: var(--secondary-color, #f0f0f0);
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }
  
  .settings-btn:hover {
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
    margin-bottom: 16px;
  }
  
  .form-label {
    display: block;
    font-weight: bold;
    margin-bottom: 4px;
    color: var(--primary-text-color);
    font-size: 0.9em;
  }
  
  .form-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  
  input, select {
    padding: 12px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    flex: 1;
    min-width: 0;
    font-size: 16px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--rgb-primary-color), 0.2);
  }
  
  input[type="checkbox"] {
    width: auto;
    flex: none;
    margin-right: 8px;
  }
  
  input[type="number"].small {
    width: 100px;
    flex: none;
  }
  
  button {
    padding: 12px 16px;
    background: var(--primary-color);
    color: var(--text-primary-color);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    white-space: nowrap;
    transition: all 0.2s ease;
  }
  
  button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
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
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9em;
    color: var(--primary-text-color);
    cursor: pointer;
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .input-group label {
    font-size: 0.8em;
    color: var(--secondary-text-color);
    font-weight: normal;
  }
  
  /* Modal Styles */
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
  }
  
  .modal.show {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-content {
    background-color: var(--card-background-color);
    padding: 20px;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--divider-color);
  }
  
  .modal-title {
    font-size: 1.3em;
    font-weight: bold;
    color: var(--primary-text-color);
  }
  
 .close-btn {
    background: transparent;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--secondary-text-color);
    padding: 4px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    transform: none;
  }
   
  .modal-buttons {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    justify-content: flex-end;
  }
  
 .modal-buttons button {
    padding: 12px 20px;
    min-width: 80px;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
 
  .cancel-btn {
    background: var(--secondary-background-color, #f0f0f0);
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color, #e0e0e0);
  }

  .cancel-btn:hover {
    background: var(--primary-background-color);
    color: var(--primary-text-color);
    transform: translateY(-1px);
  }

  .search-controls {
    margin-bottom: 20px; /* Increased space after search controls */
    padding: 12px;
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 8px;
  }

  .search-row {
    display: flex;
    gap: 12px; /* More space between search input and filters button */
    align-items: center;
    margin-bottom: 0;
  }

  .search-row input {
    flex: 1;
    min-width: 0; /* Allows the input to shrink properly */
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
    gap: 16px; /* More space between filter groups */
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
`;
