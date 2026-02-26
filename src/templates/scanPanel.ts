import { ELEMENTS } from '../utils/constants';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';

export function createScanPanel(translations: TranslationData): string {
  return `
    <div id="${ELEMENTS.SCAN_PANEL}" class="scan-panel" style="display:none;">
      <div class="scan-panel-viewport-container" id="${ELEMENTS.SCAN_VIEWPORT}-container">
        <div class="scan-panel-loading" id="scan-panel-loading">
          ${TranslationManager.localize(translations, 'scanner.starting_camera', undefined, 'Starting camera...')}
        </div>
        <div class="scan-panel-viewport" id="${ELEMENTS.SCAN_VIEWPORT}"></div>
        <button type="button" class="scan-panel-close" id="${ELEMENTS.SCAN_CLOSE}">
          ${TranslationManager.localize(translations, 'modal.close_scanner', undefined, 'Close Scanner')}
        </button>
      </div>
      <div class="scan-action-bar" id="${ELEMENTS.SCAN_ACTION_BAR}" style="display:none;">
        <div class="scan-info-row">
          <span class="scan-barcode-label" id="scan-barcode-label"></span>
          <span id="${ELEMENTS.SCAN_ITEM_NAME}" class="scan-item-name" style="display:none;"></span>
          <span id="${ELEMENTS.SCAN_ITEM_QUANTITY}" class="scan-item-quantity" style="display:none;"></span>
        </div>
        <span id="${ELEMENTS.SCAN_EXISTING_CONTROLS}" class="scan-existing-controls">
          <select id="${ELEMENTS.SCAN_ACTION_SELECT}" class="scan-action-select">
            <option value="increment">${TranslationManager.localize(translations, 'scanner.increment', undefined, 'Increment')}</option>
            <option value="decrement">${TranslationManager.localize(translations, 'scanner.decrement', undefined, 'Decrement')}</option>
          </select>
          <input type="number" id="${ELEMENTS.SCAN_AMOUNT_INPUT}" class="scan-amount-input" value="1" min="0.1" step="0.1" />
        </span>
        <button type="button" class="scan-add-btn" id="${ELEMENTS.SCAN_ADD_BTN}" style="display:none;">${TranslationManager.localize(translations, 'scanner.add_new_item', undefined, 'Add Item')}</button>
        <div class="scan-buttons-row">
          <button type="button" class="scan-go-btn" id="${ELEMENTS.SCAN_GO_BTN}" style="display:none;">${TranslationManager.localize(translations, 'scanner.go', undefined, 'Go')}</button>
          <button type="button" class="scan-cancel-btn" id="${ELEMENTS.SCAN_CANCEL_BTN}">${TranslationManager.localize(translations, 'scanner.cancel', undefined, 'Cancel')}</button>
        </div>
      </div>
      <div class="scan-panel-error" id="scan-panel-error" style="display:none;"></div>
    </div>
  `;
}
