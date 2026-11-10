import { CSSResult, css } from 'lit-element';

export const cardLayoutStyles: CSSResult = css`
  ha-card {
    padding: 16px;
  }

  /* Inside the Inventory panel the page is the frame. */
  :host([embedded]) ha-card {
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: none;
  }

  .compat-banner {
    margin: -16px -16px 12px;
    padding: 10px 16px;
    background: var(--warning-color, #ff9800);
    color: var(--text-primary-color, #fff);
    font-weight: 500;
    border-radius: var(--ha-card-border-radius, 12px) var(--ha-card-border-radius, 12px) 0 0;
  }

  .category-group,
  .location-group {
    margin-bottom: var(--si-space-2);
  }

  .category-header,
  .location-header {
    display: flex;
    align-items: baseline;
    gap: var(--si-space-1);
    padding: var(--si-space-3) var(--si-space-1) var(--si-space-1);
    color: var(--secondary-text-color);
    font-size: var(--si-font-secondary);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .si-group__count::before {
    content: '· ';
  }

  .si-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--si-space-3);
    padding: 32px var(--si-space-4);
    color: var(--secondary-text-color);
    text-align: center;
  }

  .si-empty__text {
    margin: 0;
    font-size: var(--si-font-name);
  }
`;
