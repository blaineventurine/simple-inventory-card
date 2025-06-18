import { TemplateResult, CSSResult, LitElement, html } from 'lit-element';
import { HomeAssistant, InventoryConfig } from '../types/home-assistant';
import { Utils } from '../utils/utils';
import {
  createEntitySelector,
  createEntityInfo,
  createNoEntityMessage,
} from '../templates/configEditor';
import { configEditorStyles } from '../styles/configEditor';

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

    const inventoryEntities = Utils.findInventoryEntities(this.hass);
    const entityOptions = Utils.createEntityOptions(this.hass, inventoryEntities);

    return html`
      <div class="card-config">
        ${createEntitySelector(
          this.hass,
          entityOptions,
          this._entity,
          this._valueChanged.bind(this),
        )}
        ${this._entity ? createEntityInfo(this.hass, this._entity) : createNoEntityMessage()}
      </div>
    `;
  }

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
      }),
    );
  }

  static get styles(): CSSResult {
    return configEditorStyles;
  }
}

export { ConfigEditor };
