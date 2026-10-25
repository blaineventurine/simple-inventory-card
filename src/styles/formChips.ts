import { CSSResult, css } from 'lit-element';

export const formChipStyles: CSSResult = css`
  .modal-multi-select-container {
    position: relative;
  }

  .modal-multi-select-trigger {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    padding: 6px 12px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: var(--card-background-color);
    cursor: pointer;
    box-sizing: border-box;
    transition: border-color var(--si-motion, 200ms) ease;
  }

  .modal-multi-select-trigger:hover {
    border-color: var(--primary-color);
  }

  .modal-multi-select-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .modal-multi-select-chip {
    --si-tone: var(--primary-color);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 2px 10px;
    border-radius: var(--si-radius-pill);
    color: var(--si-tone);
    background: color-mix(in srgb, var(--si-tone) 20%, transparent);
    font-size: var(--si-font-secondary);
    line-height: 1.6;
    white-space: nowrap;
  }

  .modal-multi-select-chip-remove {
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.1em;
    line-height: 1;
    padding: 0 2px;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .modal-multi-select-chip-remove:hover {
    opacity: 1;
  }

  .modal-multi-select-label {
    color: var(--secondary-text-color);
    font-size: 16px;
  }

  .modal-multi-select-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--card-background-color);
    border: 2px solid var(--divider-color);
    border-top: none;
    border-radius: 0 0 8px 8px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: var(--si-shadow-raised);
  }

  .modal-multi-select-option {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid var(--divider-color);
    gap: 12px;
  }

  .modal-multi-select-option:last-child {
    border-bottom: none;
  }

  .modal-multi-select-option:hover {
    background: var(--secondary-background-color);
  }

  .modal-multi-select-add-new {
    display: flex;
    padding: 8px;
    gap: 8px;
    border-top: 1px solid var(--divider-color);
  }

  .modal-multi-select-add-new input {
    flex: 1;
    min-width: 0;
  }

  .modal-multi-select-add-btn {
    flex-shrink: 0;
    padding: 8px 12px;
    border: 1px solid var(--primary-color);
    border-radius: 8px;
    background: transparent;
    color: var(--primary-color);
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition:
      background-color var(--si-motion, 200ms) ease,
      color var(--si-motion, 200ms) ease;
  }

  .modal-multi-select-add-btn:hover {
    background: var(--primary-color);
    color: var(--text-primary-color, white);
  }
`;
