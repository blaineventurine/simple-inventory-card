import { html, TemplateResult } from 'lit-element';
import { HomeAssistant } from '../types/homeAssistant';

export function createEntitySelector(
  hass: HomeAssistant,
  entityOptions: Array<{ value: string; label: string }>,
  selectedEntity: string,
  onValueChanged: (event_: CustomEvent) => void,
): TemplateResult {
  return html`
    <div class="option">
      <div class="row">
        <div class="col">
          <ha-combo-box
            .hass=${hass}
            .label=${'Inventory Entity (Required)'}
            .items=${entityOptions}
            .value=${selectedEntity}
            @value-changed=${onValueChanged}
          ></ha-combo-box>
        </div>
      </div>
    </div>
  `;
}

export function createEntityInfo(hass: HomeAssistant, entityId: string): TemplateResult {
  const state = hass.states[entityId];
  const friendlyName = state?.attributes?.friendly_name || entityId;
  const itemCount = state?.attributes?.items?.length || 0;

  return html`
    <div class="entity-info">
      <div class="info-header">Selected Inventory:</div>
      <div class="info-content">
        <strong>${friendlyName}</strong>
        <br />
        <small>${entityId}</small>
        <br />
        <small>Items: ${itemCount}</small>
      </div>
    </div>
  `;
}

export function createNoEntityMessage(): TemplateResult {
  return html`
    <div class="no-entity">
      <ha-icon icon="mdi:information-outline"></ha-icon>
      <div>Please select an inventory entity above</div>
    </div>
  `;
}
