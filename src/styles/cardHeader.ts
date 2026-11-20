import { CSSResult, css } from 'lit-element';

export const cardHeaderStyles: CSSResult = css`
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--si-space-2);
    padding: 0 0 var(--si-space-3);
  }

  .header-content {
    flex: 1;
    min-width: 0;
  }

  .inventory-title {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    color: var(--primary-text-color);
    font-size: var(--si-font-title);
    font-weight: 600;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  .inventory-description {
    margin: 2px 0 0;
    color: var(--secondary-text-color);
    font-size: var(--si-font-secondary);
    line-height: 1.3;
  }

  .header-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--si-space-1);
    color: var(--primary-text-color);
  }

  .expiry-indicators {
    display: flex;
    align-items: center;
    gap: var(--si-space-1);
    margin-right: var(--si-space-1);
  }

  .expiry-indicators .si-chip {
    cursor: pointer;
  }

  .expiry-indicators .si-chip ha-icon {
    --mdc-icon-size: 16px;
  }

  .header-scan-btn,
  .overflow-menu-btn {
    color: inherit;
  }

  .overflow-menu-container {
    position: relative;
  }

  .overflow-menu {
    position: absolute;
    top: calc(100% + var(--si-space-1));
    right: 0;
    z-index: 100;
    min-width: 180px;
    padding: var(--si-space-1) 0;
    overflow: hidden;
    border: 1px solid var(--divider-color);
    border-radius: var(--si-radius);
    background: var(--card-background-color, var(--ha-card-background));
    box-shadow: var(--si-shadow-raised);
  }

  .overflow-menu-item {
    display: flex;
    align-items: center;
    gap: var(--si-space-3);
    width: 100%;
    min-height: 44px;
    margin: 0;
    padding: 0 var(--si-space-4);
    border: none;
    border-radius: 0;
    background: transparent;
    color: var(--primary-text-color);
    font: inherit;
    font-size: var(--si-font-name);
    font-weight: 400;
    text-align: left;
    cursor: pointer;
  }

  .overflow-menu-item ha-icon {
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color);
  }

  .overflow-menu-item:hover {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }

  .overflow-menu-item:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`;
