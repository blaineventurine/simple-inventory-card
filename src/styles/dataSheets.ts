import { CSSResult, css } from 'lit-element';

/** Content of the history and import result sheets; the frame itself is the sheet styles. */
export const dataSheetStyles: CSSResult = css`
  .history-tabs {
    display: flex;
    gap: var(--si-space-1);
    padding: var(--si-space-1);
    margin-bottom: var(--si-space-4);
    border-radius: var(--si-radius-pill);
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  }

  .history-tab {
    flex: 1;
    min-height: var(--si-tap);
    padding: 0 var(--si-space-3);
    border: none;
    border-radius: var(--si-radius-pill);
    font: inherit;
    font-size: var(--si-font-name);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color var(--si-motion) ease,
      color var(--si-motion) ease;
  }

  .history-tab:not(.si-tint) {
    background: transparent;
    color: var(--secondary-text-color);
  }

  .history-tab:not(.si-tint):hover {
    color: var(--primary-text-color);
  }

  .history-tab:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .history-timeline {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-1);
  }

  .history-event {
    display: flex;
    align-items: center;
    gap: var(--si-space-3);
    padding: var(--si-space-2) 0;
  }

  .history-event > .si-icon-circle {
    flex-shrink: 0;
  }

  .history-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .history-type {
    font-size: var(--si-font-name);
    font-weight: 500;
    color: var(--primary-text-color);
    text-transform: capitalize;
    overflow-wrap: anywhere;
  }

  .history-qty {
    font-variant-numeric: tabular-nums;
  }

  .history-empty,
  .consumption-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--si-space-2);
    padding: var(--si-space-4);
    text-align: center;
    color: var(--secondary-text-color);
  }

  .history-empty p {
    margin: 0;
    font-size: var(--si-font-name);
  }

  .consumption-empty-title {
    margin: 0;
    font-size: var(--si-font-name);
    font-weight: 600;
    color: var(--primary-text-color);
  }

  .consumption-empty-detail {
    margin: 0;
    font-size: var(--si-font-secondary);
  }

  .consumption-loading {
    padding: var(--si-space-4);
    text-align: center;
    color: var(--secondary-text-color);
  }

  .window-pills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--si-space-2);
  }

  .window-pill {
    cursor: pointer;
  }

  .consumption-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--si-space-2);
    margin-top: var(--si-space-4);
  }

  .metric-card {
    min-width: 0;
    padding: var(--si-space-3);
    border-radius: var(--si-radius);
  }

  .metric-value {
    font-size: var(--si-font-title);
    font-weight: 600;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .metric-label {
    margin-top: 2px;
    font-size: var(--si-font-secondary);
    color: var(--secondary-text-color);
  }

  .consumption-charts {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-3);
    margin-top: var(--si-space-4);
  }

  .chart-title {
    margin-bottom: var(--si-space-1);
    font-size: var(--si-font-secondary);
    font-weight: 600;
    color: var(--secondary-text-color);
  }

  .chart-svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .chart-line {
    stroke: var(--primary-color);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .chart-area {
    fill: var(--primary-color);
    opacity: 0.2;
  }

  .chart-bar {
    fill: var(--primary-color);
    opacity: 0.65;
  }

  .chart-label {
    fill: var(--secondary-text-color);
    font-size: 9px;
  }

  .chart-note,
  .chart-hint {
    margin: var(--si-space-1) 0 0;
    font-size: var(--si-font-secondary);
    color: var(--secondary-text-color);
    text-align: center;
  }

  .import-result__summary {
    display: flex;
    align-items: center;
    gap: var(--si-space-3);
  }

  .import-result__summary > .si-icon-circle {
    flex-shrink: 0;
  }

  .import-result__message {
    margin: 0;
    font-size: var(--si-font-name);
    color: var(--primary-text-color);
    overflow-wrap: anywhere;
  }

  .import-result__errors-title {
    margin: var(--si-space-4) 0 var(--si-space-1);
    font-size: var(--si-font-secondary);
    font-weight: 600;
    color: var(--primary-text-color);
  }

  .import-result__errors {
    margin: 0;
    padding-left: var(--si-space-4);
    font-size: var(--si-font-secondary);
    color: var(--secondary-text-color);
    overflow-wrap: anywhere;
  }

  .import-result__errors li + li {
    margin-top: var(--si-space-1);
  }

  .import-result__more {
    margin: var(--si-space-1) 0 0;
    font-size: var(--si-font-secondary);
    color: var(--secondary-text-color);
  }
`;
