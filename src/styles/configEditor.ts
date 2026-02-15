import { CSSResult, css } from 'lit-element';

export const configEditorStyles: CSSResult = css`
  .card-config {
    padding: 16px;
  }

  .option {
    margin-bottom: 16px;
  }

  .row {
    display: flex;
    margin-bottom: 10px;
    align-items: center;
  }

  .col {
    flex: 1;
    margin-right: 15px;
  }

  .col:last-child {
    margin-right: 0;
  }

  ha-entity-picker {
    width: 100%;
  }

  .entity-info {
    background: var(--secondary-background-color);
    border-radius: 8px;
    padding: 16px;
    margin-top: 16px;
  }

  .info-header {
    font-weight: bold;
    margin-bottom: 8px;
    color: var(--primary-color);
  }

  .info-content {
    color: var(--primary-text-color);
  }

  .no-entity {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: var(--warning-color);
    color: white;
    border-radius: 8px;
    margin-top: 16px;
  }

  .visibility-section {
    margin-top: 16px;
  }

  .section-header {
    font-weight: bold;
    margin-bottom: 8px;
    color: var(--primary-color);
  }

  .visibility-toggles {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .visibility-toggles ha-formfield {
    display: flex;
    align-items: center;
  }
`;
