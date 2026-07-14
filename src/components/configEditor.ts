import { TemplateResult, CSSResult, LitElement, html } from 'lit-element';
import { HomeAssistant, InventoryConfig } from '@/types/homeAssistant';
import { InventoryResolver } from '../utils/inventoryResolver';
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
  // `declare` prevents TS (useDefineForClassFields: true) from emitting real class
  // fields, which would shadow the reactive accessors Lit creates from
  // `static get properties()` and silently disable all re-renders on assignment.
  declare public hass?: HomeAssistant;
  declare private _config?: InventoryConfig;
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

  connectedCallback(): void {
    super.connectedCallback();
    void ConfigEditor._ensureHaComponents().then(() => this.requestUpdate());
  }

  private static _haComponentsPromise?: Promise<void>;

  /**
   * ha-combo-box / ha-formfield / ha-switch are lazily registered by the HA
   * frontend; in a fresh session nothing has loaded them before this editor
   * renders, so they'd stay as undefined custom elements and display nothing.
   * Instantiating the entities-card editor via the card helpers forces HA to
   * import and register them (standard custom-card workaround).
   */
  private static _ensureHaComponents(): Promise<void> {
    if (
      customElements.get('ha-combo-box') &&
      customElements.get('ha-formfield') &&
      customElements.get('ha-switch')
    ) {
      return Promise.resolve();
    }
    this._haComponentsPromise ??= (async () => {
      try {
        const helpers = await window.loadCardHelpers?.();
        if (!helpers) {
          return;
        }
        const card = await helpers.createCardElement({ type: 'entities', entities: [] });
        // getConfigElement is a static whose dynamic import registers the ha-* elements
        const ctor = card?.constructor as
          | { getConfigElement?: () => HTMLElement | Promise<HTMLElement> }
          | undefined;
        await ctor?.getConfigElement?.();
      } catch (error) {
        console.debug('Failed to preload HA editor components:', error);
      }
    })();
    return this._haComponentsPromise;
  }

  async firstUpdated() {
    await this._loadTranslations();
  }

  async updated(changedProps: Map<string | number | symbol, unknown>) {
    // Auto-select the first available inventory entity for new cards.
    // Guarded by _configSetExternally so this never fires before setConfig is called,
    // which prevents stripping saved show_* toggle values on editor open.
    // Runs before any await so the selection is never delayed behind translation fetches.
    if (this._configSetExternally && this.hass && this._config && !this._config.entity) {
      const inventoryEntities = InventoryResolver.findInventoryEntities(this.hass);
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
    const inventoryEntities = InventoryResolver.findInventoryEntities(this.hass);
    const entityOptions = InventoryResolver.createEntityOptions(this.hass, inventoryEntities);

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
