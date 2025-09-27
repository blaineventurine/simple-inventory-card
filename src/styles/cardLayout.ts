import { CSSResult, css } from 'lit-element';

export const cardLayoutStyles: CSSResult = css`
  ha-card {
    padding: 16px;
  }

  .inventory-title {
    margin: 0;
    font-size: 1.3em;
    font-weight: bold;
    color: var(--primary-text-color);
  }

  .no-items {
    text-align: center;
    color: var(--secondary-text-color);
    padding: 20px;
  }

  .active-filters {
    display: block;
    padding: 8px 16px;
  }

  .filter-badges-container {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .filter-badge {
    display: inline-block;
    padding: 4px 12px;
    margin: 2px;
    color: white;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .filter-badge.search {
    background: var(--purple-color, #9c27b0);
  }

  .filter-badge.category {
    background: var(--orange-color, #ff9800);
  }

  .filter-badge.location {
    background: var(--blue-color, #2196f3);
  }

  .filter-badge.category,
  .filter-badge.location {
    font-style: normal !important;
    opacity: 1 !important;
  }

  .filter-badge.quantity {
    background: var(--green-color, #4caf50);
    color: white !important;
  }

  .filter-badge.expiry {
    background: var(--red-color, #ff5722);
    border-radius: 12px !important;
  }
`;
