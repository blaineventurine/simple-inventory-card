import { ACTIONS, ELEMENTS } from '../utils/constants';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { batchFields } from './modalPartials/batchFields';
import { button, iconButton } from './primitives';

export function createScanPanel(translations: TranslationData, batchesEnabled = false): string {
  const label = (key: string, fallback: string): string =>
    TranslationManager.localize(translations, key, undefined, fallback);
  return `
    <div id="${ELEMENTS.SCAN_PANEL}" class="scan-panel" hidden>
      <div class="scan-panel-viewport-container" id="${ELEMENTS.SCAN_VIEWPORT}-container">
        <div class="scan-panel-loading" id="scan-panel-loading">
          ${label('scanner.starting_camera', 'Starting camera...')}
        </div>
        <div class="scan-panel-viewport" id="${ELEMENTS.SCAN_VIEWPORT}"></div>
        ${iconButton({ icon: 'mdi:close', label: label('modal.close_scanner', 'Close Scanner'), className: 'scan-panel-close', attrs: { id: ELEMENTS.SCAN_CLOSE, 'data-action': ACTIONS.CLOSE_SCAN } })}
      </div>
      <div class="scan-photo" id="${ELEMENTS.SCAN_PHOTO}" hidden>
        <p class="scan-photo__message" id="${ELEMENTS.SCAN_PHOTO_MESSAGE}" hidden></p>
        <div class="scan-photo__buttons">
          ${button({ kind: 'tonal', label: label('scanner.cancel', 'Cancel'), className: 'scan-cancel-btn', attrs: { 'data-action': ACTIONS.CLOSE_SCAN } })}
          ${button({ kind: 'filled', label: label('scanner.choose_photo', 'Choose a photo'), icon: 'mdi:image', className: 'scan-photo-btn', attrs: { 'data-action': ACTIONS.SCAN_CHOOSE_PHOTO } })}
        </div>
      </div>
      <div class="scan-action-bar" id="${ELEMENTS.SCAN_ACTION_BAR}" hidden>
        <div class="scan-info-row">
          <span class="scan-barcode-label" id="scan-barcode-label"></span>
          <span id="${ELEMENTS.SCAN_ITEM_NAME}" class="scan-item-name" hidden></span>
          <span id="${ELEMENTS.SCAN_ITEM_QUANTITY}" class="scan-item-quantity" hidden></span>
        </div>
        <span id="${ELEMENTS.SCAN_EXISTING_CONTROLS}" class="scan-existing-controls">
          <select id="${ELEMENTS.SCAN_ACTION_SELECT}" class="scan-action-select">
            <option value="increment">${label('scanner.increment', 'Increment')}</option>
            <option value="decrement">${label('scanner.decrement', 'Decrement')}</option>
          </select>
          <input type="number" id="${ELEMENTS.SCAN_AMOUNT_INPUT}" class="scan-amount-input" value="1" min="0.1" step="0.1" />
        </span>
        ${
          batchesEnabled
            ? `<details id="${ELEMENTS.SCAN_BATCH_FIELDS}" class="scan-batch-details" hidden>
          <summary>${label('batches.details', 'Batch details')}<ha-icon class="scan-batch-details__chevron" icon="mdi:chevron-down"></ha-icon></summary>
          <div class="batch-fields">${batchFields(translations)}</div>
        </details>`
            : ''
        }
        <div class="scan-buttons-row">
          ${button({ kind: 'tonal', label: label('scanner.cancel', 'Cancel'), className: 'scan-cancel-btn', attrs: { id: ELEMENTS.SCAN_CANCEL_BTN, 'data-action': ACTIONS.CLOSE_SCAN } })}
          ${button({ kind: 'filled', label: label('scanner.add_new_item', 'Add Item'), icon: 'mdi:plus', className: 'scan-add-btn', attrs: { id: ELEMENTS.SCAN_ADD_BTN, hidden: true, 'data-action': ACTIONS.SCAN_ADD_ITEM } })}
          ${button({ kind: 'filled', label: label('scanner.go', 'Go'), className: 'scan-go-btn', attrs: { id: ELEMENTS.SCAN_GO_BTN, hidden: true, 'data-action': ACTIONS.SCAN_GO } })}
        </div>
      </div>
      <div class="scan-panel-error" id="scan-panel-error" hidden></div>
    </div>
  `;
}
