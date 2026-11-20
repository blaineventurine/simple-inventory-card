import { CSSResult, css } from 'lit-element';

export const batchStyles: CSSResult = css`
  /* Batch panel (inside the item details panel) */
  .batch-panel {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--si-space-2);
  }

  .batch-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-self: stretch;
  }

  .batch-row {
    display: flex;
    flex-direction: column;
  }

  .batch-row__line {
    display: flex;
    align-items: center;
    gap: var(--si-space-2);
    min-height: var(--si-tap-row);
  }

  /* Batch lines wrap instead of truncating: they live in the opened details panel,
     where every part (expiry, price) matters more than a uniform row height. */
  .batch-row__line .si-secondary {
    flex: 1;
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .batch-row .batch-quantity {
    color: var(--primary-text-color);
    font-weight: 500;
  }

  .batch-row__actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-left: auto;
  }

  /* Restock / Move forms and every batch field grid (scan details, edit-sheet editor) */
  .restock-form,
  .move-form,
  .batch-fields,
  .batch-editor-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--si-space-3) var(--si-space-2);
  }

  .restock-form,
  .move-form {
    align-self: stretch;
    padding: var(--si-space-3);
    border-radius: var(--si-radius);
    background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
  }

  .move-form {
    margin-bottom: var(--si-space-2);
  }

  .batch-field {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-1);
    min-width: 0;
    font-size: var(--si-font-secondary);
    font-weight: 500;
    color: var(--secondary-text-color);
  }

  /* Same outlined look as the sheet's .si-field inputs. */
  .batch-field input:not([type='checkbox']) {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.4));
    border-radius: 8px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font: inherit;
    font-size: 16px;
    line-height: 20px;
    font-weight: 400;
    transition:
      border-color var(--si-motion, 200ms) ease,
      box-shadow var(--si-motion, 200ms) ease;
  }

  .batch-field input:not([type='checkbox']):focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }

  /* Actions last; an inline error appended by the event handler shows above them. */
  .restock-actions,
  .move-actions {
    grid-column: 1 / -1;
    order: 1;
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--si-space-2);
  }

  .restock-error,
  .move-error {
    grid-column: 1 / -1;
    color: var(--error-color, #db4437);
    font-size: var(--si-font-secondary);
  }

  .quantity-readonly-hint {
    display: block;
    margin-top: 2px;
    font-size: 0.8em;
    color: var(--secondary-text-color);
  }
`;
