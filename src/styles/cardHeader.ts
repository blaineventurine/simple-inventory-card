import { CSSResult, css } from 'lit-element';

export const cardHeaderStyles: CSSResult = css`
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px 16px;
    gap: 8px;
    border-bottom: 1px solid var(--divider-color);
    background-color: var(--card-background-color);
  }

  .header-content {
    flex: 1;
    min-width: 0; /* Allows text to wrap */
  }

  .inventory-title {
    margin: 0 0 2px 0;
    font-size: 1em;
    font-weight: 500;
    color: var(--primary-text-color);
    line-height: 1.2;
  }

  .inventory-description {
    margin: 2px 0 0 0;
    font-size: 0.75em;
    color: var(--secondary-text-color);
    line-height: 1.2;
    opacity: 0.8;
    max-width: 300px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .overflow-menu-container {
    position: relative;
  }

  .overflow-menu-btn {
    background: transparent;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--primary-text-color);
    padding: 4px 8px;
    border-radius: 4px;
    line-height: 1;
    transition: background-color 0.2s ease;
  }

  .overflow-menu-btn:hover {
    background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
  }

  .overflow-menu {
    position: absolute;
    right: 0;
    top: 100%;
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    min-width: 140px;
    overflow: hidden;
  }

  .overflow-menu-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 10px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.9em;
    color: var(--primary-text-color);
    transition: background-color 0.2s ease;
    text-align: left;
  }

  .overflow-menu-item:hover {
    background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
  }

  .overflow-menu-item + .overflow-menu-item {
    border-top: 1px solid var(--divider-color);
  }

  .expiry-indicators {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .expiring-badge,
  .expired-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: 500;
    white-space: nowrap;
  }

  .expiring-badge {
    background-color: rgba(255, 152, 0, 0.12);
    color: var(--warning-color, #e68900);
  }

  .expired-badge {
    background-color: rgba(244, 67, 54, 0.12);
    color: var(--error-color, #d32f2f);
  }

  .expiring-badge ha-icon,
  .expired-badge ha-icon {
    --mdc-icon-size: 13px;
  }

  .header-scan-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--primary-text-color);
    padding: 4px 8px;
    border-radius: 4px;
    line-height: 1;
    display: flex;
    align-items: center;
    transition: background-color 0.2s ease;
  }

  .header-scan-btn:hover {
    background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
  }

  .header-scan-btn svg,
  .header-scan-btn svg * {
    pointer-events: none;
    display: block;
  }

  .scan-panel {
    border-bottom: 1px solid var(--divider-color);
    padding: 8px 16px;
  }

  .scan-panel-viewport-container {
    position: relative;
  }

  .scan-panel-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: var(--secondary-text-color);
    font-size: 0.85em;
  }

  .scan-panel-viewport {
    max-height: 250px;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
  }

  .scan-panel-viewport video {
    width: 100%;
    display: block;
  }

  .scan-panel-close {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 0.8em;
  }

  .scan-action-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    flex-wrap: wrap;
  }

  .scan-barcode-label {
    font-weight: 500;
    font-size: 0.9em;
    color: var(--primary-text-color);
    margin-right: 4px;
  }

  .scan-action-select,
  .scan-amount-input {
    padding: 4px 8px;
    border: 1px solid var(--divider-color);
    border-radius: 4px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 0.85em;
  }

  .scan-amount-input {
    width: 60px;
  }

  .scan-go-btn {
    padding: 4px 16px;
    border: none;
    border-radius: 4px;
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 500;
  }

  .scan-go-btn:hover {
    opacity: 0.9;
  }

  .scan-cancel-btn {
    padding: 4px 12px;
    border: 1px solid var(--divider-color);
    border-radius: 4px;
    background: transparent;
    color: var(--primary-text-color);
    cursor: pointer;
    font-size: 0.85em;
  }

  .scan-cancel-btn:hover {
    background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
  }

  .scan-panel-error {
    color: var(--error-color, #d32f2f);
    font-size: 0.85em;
    padding: 4px 0;
  }

  @media (max-width: 600px) {
    .card-header {
      padding: 10px 12px;
    }

    .inventory-description {
      max-width: none;
    }
  }

  @media (max-width: 480px) {
    .card-header {
      padding: 8px 12px;
    }

    .inventory-title {
      font-size: 0.95em;
    }

    .inventory-description {
      font-size: 0.7em;
    }

    .expiring-badge,
    .expired-badge {
      padding: 2px 6px;
      font-size: 0.7em;
    }

    .expiring-badge ha-icon,
    .expired-badge ha-icon {
      --mdc-icon-size: 11px;
    }
  }
`;
