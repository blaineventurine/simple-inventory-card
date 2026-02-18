import { CSSResult, css } from 'lit-element';

export const modalStyles: CSSResult = css`
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
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
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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

  .modal-secondary-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--divider-color);
  }

  .history-link {
    background: transparent;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    font-size: 0.9em;
    padding: 4px 0;
    text-decoration: underline;
    transition: opacity 0.2s ease;
  }

  .history-link:hover {
    opacity: 0.8;
  }

  .delete-btn {
    background: transparent;
    border: 1px solid var(--error-color, #f44336);
    color: var(--error-color, #f44336);
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 500;
    padding: 6px 16px;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .delete-btn:hover {
    background: var(--error-color, #f44336);
    color: var(--text-primary-color, white);
  }

  .history-view h3 {
    font-size: 1.3em;
    font-weight: 700;
    color: var(--primary-text-color);
    margin: 0 0 16px;
  }

  .history-timeline {
    max-height: 400px;
    overflow-y: auto;
  }

  .history-event {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--divider-color);
  }

  .history-event:last-child {
    border-bottom: none;
  }

  .history-icon {
    font-size: 1.2em;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .history-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .history-type {
    font-weight: 600;
    font-size: 0.9em;
    color: var(--primary-text-color);
    text-transform: capitalize;
  }

  .history-qty {
    font-size: 0.85em;
    color: var(--secondary-text-color);
    font-family: monospace;
  }

  .history-time {
    font-size: 0.8em;
    color: var(--secondary-text-color);
    opacity: 0.8;
  }

  .history-empty {
    text-align: center;
    padding: 24px 16px;
    color: var(--secondary-text-color);
    font-style: italic;
  }

  .history-tabs {
    display: flex;
    border-bottom: 2px solid var(--divider-color);
    margin-bottom: 20px;
  }

  .history-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 8px 16px;
    margin-bottom: -2px;
    font-weight: 600;
    font-size: 0.95em;
    color: var(--secondary-text-color);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .history-tab:hover {
    color: var(--primary-text-color);
  }

  .history-tab.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  }

  .consumption-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
    margin-bottom: 24px;
  }

  .metric-card {
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
    border-radius: 10px;
    padding: 14px;
    text-align: center;
  }

  .metric-value {
    font-size: 1.6em;
    font-weight: 700;
    color: var(--primary-text-color);
  }

  .metric-label {
    font-size: 0.8em;
    color: var(--secondary-text-color);
    margin-top: 4px;
  }

  .depletion-critical {
    color: var(--error-color, #f44336);
  }

  .depletion-warning {
    color: var(--warning-color, #ff9800);
  }

  .depletion-safe {
    color: var(--success-color, #4caf50);
  }

  .window-pills {
    display: flex;
    justify-content: center;
    gap: 8px;
  }

  .window-pill {
    background: transparent;
    border: 1px solid var(--divider-color);
    border-radius: 16px;
    padding: 4px 12px;
    font-size: 0.8em;
    font-weight: 500;
    color: var(--secondary-text-color);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .window-pill:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .window-pill.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color, white);
  }

  .consumption-empty {
    text-align: center;
    padding: 32px 16px 24px;
    color: var(--secondary-text-color);
  }

  .consumption-empty-icon {
    font-size: 2.5em;
    margin-bottom: 12px;
  }

  .consumption-empty-title {
    font-weight: 600;
    font-size: 1.1em;
    color: var(--primary-text-color);
    margin: 0 0 8px;
  }

  .consumption-empty-detail {
    font-size: 0.9em;
    margin: 0;
  }

  .consumption-loading {
    text-align: center;
    padding: 32px 16px;
    color: var(--secondary-text-color);
  }
`;
