import { TemplateResult, CSSResult, LitElement, html } from 'lit-element';
import { HomeAssistant, InventoryConfig } from '../types/homeAssistant';
import { Utilities } from '../utils/utilities';
import {
  createEntitySelector,
  createEntityInfo,
  createNoEntityMessage,
  createVisibilityToggles,
} from '../templates/configEditor';
import { configEditorStyles } from '../styles/configEditor';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';

class ConfigEditor extends LitElement {
  public hass?: HomeAssistant;
  private _config?: InventoryConfig;
  private _translations: TranslationData = {};
  private _configSetExternally = false;

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

  async firstUpdated() {
    await this._loadTranslations();
  }

  async updated(changedProps: Map<string | number | symbol, unknown>) {
    if (changedProps.has('hass') && this.hass) {
      const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
      if (
        !oldHass ||
        oldHass.language !== this.hass.language ||
        oldHass.selectedLanguage !== this.hass.selectedLanguage
      ) {
        await this._loadTranslations();
      }
    }

    // Auto-select the first available inventory entity for new cards.
    // Guarded by _configSetExternally so this never fires before setConfig is called,
    // which prevents stripping saved show_* toggle values on editor open.
    if (this._configSetExternally && this.hass && this._config && !this._config.entity) {
      const inventoryEntities = Utilities.findInventoryEntities(this.hass);
      if (inventoryEntities.length > 0) {
        const config: InventoryConfig = {
          ...this._config,
          type: this._config.type || 'custom:simple-inventory-card',
          entity: inventoryEntities[0],
        };
        this._config = config;
        this.dispatchEvent(
          new CustomEvent('config-changed', {
            detail: { config },
            bubbles: true,
            composed: true,
          }),
        );
      }
    }
  }

  private async _loadTranslations(): Promise<void> {
    const language = this.hass?.language || this.hass?.selectedLanguage || 'en';
    try {
      this._translations = await TranslationManager.loadTranslations(language);
      this.requestUpdate();
    } catch (error) {
      console.warn('Failed to load translations:', error);
      this._translations = {};
    }
  }

  setConfig(config: InventoryConfig): void {
    this._config = { ...config };
    this._configSetExternally = true;
  }

  get _entity(): string {
    return this._config?.entity || '';
  }

  render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html`<div>
        ${TranslationManager.localize(
          this._translations,
          'common.loading',
          undefined,
          'Loading...',
        )}
      </div>`;
    }
    const inventoryEntities = Utilities.findInventoryEntities(this.hass);
    const entityOptions = Utilities.createEntityOptions(this.hass, inventoryEntities);

    return html`
      <div class="card-config">
        ${createEntitySelector(
          this.hass,
          entityOptions,
          this._entity,
          this._valueChanged.bind(this),
          this._translations,
        )}
        ${this._entity
          ? createEntityInfo(this.hass, this._entity, this._translations)
          : createNoEntityMessage(this._translations)}
        ${this._entity
          ? createVisibilityToggles(
              this._config,
              this._toggleChanged.bind(this),
              this._translations,
            )
          : ''}
      </div>
    `;
  }

  private _toggleChanged(key: string, checked: boolean): void {
    if (!this._config) {
      return;
    }

    const config: InventoryConfig = {
      ...this._config,
      [key]: checked,
    };

    this._config = config;
    this.requestUpdate();

    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _valueChanged(event_: CustomEvent): void {
    if (!this._config) {
      return;
    }

    const value = event_.detail?.value;

    if (!value || this._entity === value) {
      return;
    }

    const config: InventoryConfig = {
      ...this._config,
      entity: value,
      type: this._config.type || 'custom:simple-inventory-card',
    };

    this._config = config;

    this.requestUpdate();

    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: config },
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
