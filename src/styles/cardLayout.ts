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
`;
