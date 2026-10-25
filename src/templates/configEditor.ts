import { html, TemplateResult } from 'lit-element';
import { HomeAssistant } from '@/types/homeAssistant';
import { InventoryConfig } from '@/types/inventory';
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
  const itemCount = state?.attributes?.total_items || 0;

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
  'show_header',
  'show_search',
  'show_sort',
  'show_add_button',
  'show_description',
  'show_location',
  'show_category',
  'show_expiry',
  'show_auto_add_info',
  'show_price',
  'show_icon',
] as const;

const VISIBILITY_TOGGLE_FALLBACKS: Record<string, string> = {
  show_header: 'Show header',
  show_search: 'Show search & filters',
  show_sort: 'Show sort controls',
  show_add_button: 'Show add button',
  show_description: 'Show description',
  show_location: 'Show location',
  show_category: 'Show category',
  show_expiry: 'Show expiry date',
  show_auto_add_info: 'Show auto-add info',
  show_price: 'Show price',
  show_icon: 'Show item icons',
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

/**
 * "Show items as tiles": the `layout` option (`tiles` when on, `list` when off), below the
 * visibility switches. A layout picked with the card's toolbar toggle still wins in that browser.
 */
export function createLayoutToggle(
  config: InventoryConfig,
  onLayoutChanged: (tiles: boolean) => void,
  translations: TranslationData,
): TemplateResult {
  return html`
    <div class="visibility-toggles layout-toggle">
      <ha-formfield
        .label=${TranslationManager.localize(
          translations,
          'config.layout_tiles',
          undefined,
          'Show items as tiles',
        )}
      >
        <ha-switch
          .checked=${config.layout === 'tiles'}
          @change=${(e: Event) => {
            // ha-switch is a custom element with a boolean `checked`, not an <input>.
            const target = e.target;
            if (target && 'checked' in target && typeof target.checked === 'boolean') {
              onLayoutChanged(target.checked);
            }
          }}
        ></ha-switch>
      </ha-formfield>
    </div>
  `;
}
