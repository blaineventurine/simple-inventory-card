import { html, TemplateResult } from 'lit-element';
import { HomeAssistant, InventoryConfig } from '../types/homeAssistant';
import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';

export function createEntitySelector(
  hass: HomeAssistant,
  entityOptions: Array<{ value: string; label: string }>,
  selectedEntity: string,
  onValueChanged: (event_: CustomEvent) => void,
  translations: TranslationData,
): TemplateResult {
  return html`
    <div class="option">
      <div class="row">
        <div class="col">
          <ha-combo-box
            .hass=${hass}
            .label=${TranslationManager.localize(
              translations,
              'config.inventory_entity_required',
              undefined,
              'Inventory Entity (Required)',
            )}
            .items=${entityOptions}
            .value=${selectedEntity}
            @value-changed=${onValueChanged}
          ></ha-combo-box>
        </div>
      </div>
    </div>
  `;
}

export function createEntityInfo(
  hass: HomeAssistant,
  entityId: string,
  translations: TranslationData,
): TemplateResult {
  const state = hass.states[entityId];
  const friendlyName = state?.attributes?.friendly_name || entityId;
  const itemCount = state?.attributes?.items?.length || 0;

  return html`
    <div class="entity-info">
      <div class="info-header">
        ${TranslationManager.localize(
          translations,
          'config.selected_inventory',
          undefined,
          'Selected Inventory:',
        )}
      </div>
      <div class="info-content">
        <strong>${friendlyName}</strong>
        <br />
        <small>${entityId}</small>
        <br />
        <small>
          ${TranslationManager.localize(translations, 'config.items_count', undefined, 'Items')}:
          ${itemCount}
        </small>
      </div>
    </div>
  `;
}

export function createNoEntityMessage(translations: TranslationData): TemplateResult {
  return html`
    <div class="no-entity">
      <ha-icon icon="mdi:information-outline"></ha-icon>
      <div>
        ${TranslationManager.localize(
          translations,
          'config.select_entity_message',
          undefined,
          'Please select an inventory entity above',
        )}
      </div>
    </div>
  `;
}

const VISIBILITY_TOGGLE_KEYS = [
  'show_description',
  'show_location',
  'show_category',
  'show_expiry',
  'show_auto_add_info',
] as const;

const VISIBILITY_TOGGLE_FALLBACKS: Record<string, string> = {
  show_description: 'Show description',
  show_location: 'Show location',
  show_category: 'Show category',
  show_expiry: 'Show expiry date',
  show_auto_add_info: 'Show auto-add info',
};

export function createVisibilityToggles(
  config: InventoryConfig,
  onToggleChanged: (key: string, checked: boolean) => void,
  translations: TranslationData,
): TemplateResult {
  return html`
    <div class="visibility-section">
      <div class="section-header">
        ${TranslationManager.localize(
          translations,
          'config.display_options',
          undefined,
          'Display Options',
        )}
      </div>
      <div class="visibility-toggles">
        ${VISIBILITY_TOGGLE_KEYS.map(
          (key) => html`
            <ha-formfield
              .label=${TranslationManager.localize(
                translations,
                `config.${key}`,
                undefined,
                VISIBILITY_TOGGLE_FALLBACKS[key],
              )}
            >
              <ha-switch
                .checked=${config[key] !== false}
                @change=${(e: Event) =>
                  onToggleChanged(key, (e.target as HTMLInputElement).checked)}
              ></ha-switch>
            </ha-formfield>
          `,
        )}
      </div>
    </div>
  `;
}
