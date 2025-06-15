import { CSSResult, css } from 'lit-element';

export const cardHeaderStyles: CSSResult = css`
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px;
    border-bottom: 1px solid var(--divider-color);
    background-color: var(--card-background-color);
  }

  .header-content {
    flex: 1;
    min-width: 0; /* Allows text to wrap */
  }

  .inventory-title {
    margin: 0 0 2px 0;
    font-size: 1.1em; /* Reduced from 1.2em */
    font-weight: 500;
    color: var(--primary-text-color);
    line-height: 1.1;
  }

  .inventory-description {
    margin: 0;
    font-size: 0.75em; /* Reduced from 0.8em */
    color: var(--secondary-text-color);
    line-height: 1.2;
    opacity: 0.8;
    max-width: 300px;
  }

  .expiry-indicators {
    display: flex;
    flex-direction: row; /* Changed from column to row */
    gap: 6px; /* Increased gap for horizontal layout */
    margin-left: 16px;
    flex-shrink: 0;
  }

  .expiring-badge,
  .expired-badge {
    display: inline-flex;
    align-items: center;
    gap: 2px; /* Reduced from 3px */
    padding: 2px 5px; /* Reduced from 2px 6px */
    border-radius: 6px; /* Reduced from 8px */
    font-size: 0.65em; /* Reduced from 0.7em */
    font-weight: 500;
    white-space: nowrap;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
  }

  .expiring-badge:hover,
  .expired-badge:hover {
    transform: translateY(-1px);
  }

  .expiring-badge {
    background-color: var(--warning-color, #ff9800);
    color: var(--text-primary-color, white);
  }

  .expired-badge {
    background-color: var(--error-color, #f44336);
    color: var(--text-primary-color, white);
  }

  .expiring-badge ha-icon,
  .expired-badge ha-icon {
    --mdc-icon-size: 11px; /* Reduced from 12px */
  }

  @media (max-width: 600px) {
    .card-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .expiry-indicators {
      margin-left: 0;
      align-self: flex-end;
      gap: 6px;
    }

    .inventory-description {
      max-width: none;
    }
  }

  @media (max-width: 480px) {
    .card-header {
      padding: 12px;
    }

    .inventory-title {
      font-size: 1em; /* Further reduced for mobile */
    }

    .inventory-description {
      font-size: 0.7em; /* Further reduced for mobile */
    }

    .expiring-badge,
    .expired-badge {
      padding: 2px 4px; /* Even more compact on mobile */
      font-size: 0.6em; /* Smaller text on mobile */
    }

    .expiring-badge ha-icon,
    .expired-badge ha-icon {
      --mdc-icon-size: 10px; /* Smaller icon on mobile */
    }
  }
`;
