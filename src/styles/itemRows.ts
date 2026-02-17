import { CSSResult, css } from 'lit-element';

export const itemRowStyles: CSSResult = css`
  .item-row {
    display: flex;
    flex-direction: column;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid var(--divider-color, #e8e8e8);
    border-radius: 8px;
    gap: 8px;
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
    min-width: 0;
    max-width: calc(100% - 200px); /* Reserve space for buttons */
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .item-name {
    font-weight: bold;
    font-size: 1.1em;
  }

  .category {
    font-style: italic;
    font-size: 0.9em;
    opacity: 0.7;
  }

  .location {
    font-size: 0.9em;
    font-style: italic;
    opacity: 0.7;
  }

  .location-category {
    font-size: 0.9em;
    font-style: italic;
    opacity: 0.7;
  }

  .item-footer {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 4px;
  }

  .item-footer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 8px;
  }

  .item-name-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
    max-width: 100%;
  }

  .item-name-line .item-name {
    flex: 0 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-name-line .category {
    flex-shrink: 0;
    font-size: 0.9em;
    opacity: 0.7;
    font-style: italic;
    white-space: nowrap;
    margin-left: auto;
  }

  .item-details {
    color: var(--secondary-text-color);
    font-size: 0.9em;
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .item-controls {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    align-items: center;
  }

  .quantity {
    font-weight: bold;
    background: var(--primary-color);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.85em;
  }

  .expiry {
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .expiry.expired {
    color: var(--error-color, #dc3545);
    background-color: rgba(220, 53, 69, 0.1);
  }

  .expiry.expires-today {
    color: var(--warning-color, #ff9800);
    background-color: rgba(255, 152, 0, 0.1);
    font-weight: 600;
  }

  .expiry.expiring-soon {
    color: var(--warning-color, #ff9800);
    background-color: rgba(255, 152, 0, 0.05);
  }

  .expiry.expiry-safe {
    color: var(--success-color, #4caf50);
    background-color: rgba(76, 175, 80, 0.05);
  }

  .auto-add-info {
    font-size: 0.8em;
    color: var(--success-color);
    font-weight: bold;
    width: 100%;
  }

  .category-group {
    margin-bottom: 20px;
  }

  .location-group {
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

  .location-header {
    font-weight: bold;
    font-size: 1.1em;
    color: var(--primary-color);
    margin-bottom: 8px;
    padding: 8px 12px;
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 6px;
    border-left: 4px solid var(--primary-color);
  }
`;
