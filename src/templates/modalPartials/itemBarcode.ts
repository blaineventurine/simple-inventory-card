import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function itemBarcode(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.BARCODE}-input" class="form-label">
        ${TranslationManager.localize(translations, 'modal.barcode', undefined, 'Barcode')}
      </label>
      <div class="barcode-tag-container">
        <div class="barcode-chips" id="${prefix}-barcode-chips"></div>
        <div class="barcode-input-row">
          <input type="text" id="${prefix}-${ELEMENTS.BARCODE}-input" placeholder="${TranslationManager.localize(
            translations,
            'modal.barcode_input_placeholder',
            undefined,
            'Type barcode and press Enter',
          )}" />
          <button type="button" class="barcode-scan-btn" id="${prefix}-${ELEMENTS.BARCODE_SCAN_BTN}" title="${TranslationManager.localize(translations, 'modal.scan_barcode', undefined, 'Scan with Camera')}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="16" x2="17" y2="16"/></svg>
          </button>
        </div>
        <div class="barcode-scanner-container" id="${prefix}-${ELEMENTS.BARCODE_SCANNER}" style="display:none;">
          <div class="barcode-scanner-viewport" id="${prefix}-${ELEMENTS.BARCODE_VIEWPORT}"></div>
          <button type="button" class="barcode-scanner-close" id="${prefix}-${ELEMENTS.BARCODE_SCANNER_CLOSE}">
            ${TranslationManager.localize(translations, 'modal.close_scanner', undefined, 'Close Scanner')}
          </button>
        </div>
        <input type="hidden" id="${prefix}-${ELEMENTS.BARCODE}" />
      </div>
    </div>
  `;
}
