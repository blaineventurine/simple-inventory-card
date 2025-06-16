import { TemplateResult, CSSResult, LitElement, html, css } from 'lit-element';
import { HomeAssistant, InventoryConfig } from '../types/home-assistant';

class ConfigEditor extends LitElement {
  public hass?: HomeAssistant;
  private _config?: InventoryConfig;

  constructor() {
    super();
    this._config = { entity: '', type: '' };
  }

  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
    };
  }

  setConfig(config: InventoryConfig): void {
    this._config = { ...config };
  }

  get _entity(): string {
    return this._config?.entity || '';
  }

  render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html`<div>Loading...</div>`;
    }

    const inventoryEntities = Object.keys(this.hass?.states || {})
      .filter((entityId) => {
        // Check if it's a sensor entity
        if (!entityId.startsWith('sensor.')) {
          return false;
        }

        // Check if it has inventory in the name or has items attribute
        const hasInventoryInName = entityId.includes('inventory');
        const hasItemsAttribute = this.hass?.states[entityId]?.attributes?.items !== undefined;

        return hasInventoryInName || hasItemsAttribute;
      })
      .sort();
    return html`
      <div class="card-config">
        <div class="option">
          <div class="row">
            <div class="col">
              <ha-combo-box
                .hass=${this.hass}
                .label=${'Inventory Entity (Required)'}
                .items=${inventoryEntities.map((entity) => ({
                  value: entity,
                  label: this.hass!.states[entity]?.attributes?.friendly_name || entity,
                }))}
                .value=${this._entity}
                @value-changed=${this._valueChanged}
              ></ha-combo-box>
            </div>
          </div>
        </div>

        ${this._entity
          ? html`
              <div class="entity-info">
                <div class="info-header">Selected Inventory:</div>
                <div class="info-content">
                  <strong
                    >${this.hass.states[this._entity]?.attributes?.friendly_name ||
                    this._entity}</strong
                  >
                  <br />
                  <small>${this._entity}</small>
                  <br />
                  <small
                    >Items: ${this.hass.states[this._entity]?.attributes?.items?.length || 0}</small
                  >
                </div>
              </div>
            `
          : html`
              <div class="no-entity">
                <ha-icon icon="mdi:information-outline"></ha-icon>
                <div>Please select an inventory entity above</div>
              </div>
            `}
      </div>
    `;
  }

  /**
   * Handles value changes in the editor
   * @param ev - The custom event
   * @private
   */
  private _valueChanged(ev: CustomEvent): void {
    if (!this._config) {
      return;
    }

    const value = ev.detail?.value;

    if (this._entity === value) {
      return;
    }

    const newConfig: InventoryConfig = {
      ...this._config,
      entity: value,
    };

    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: newConfig },
        bubbles: true,
        composed: true,
      })
    );
  }

  static get styles(): CSSResult {
    return css`
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
    `;
  }
}

export { ConfigEditor };
