export const controlStyles = `
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

  .search-row input.has-value {
    border-color: var(--warning-color, #ff9800);
    box-shadow: 0 0 0 1px var(--warning-color, #ff9800);
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
`;
