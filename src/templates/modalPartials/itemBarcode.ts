import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';
import { button, iconButton } from '../primitives';

export function itemBarcode(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group si-field">
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
          ${iconButton({
            icon: 'mdi:barcode-scan',
            label: TranslationManager.localize(
              translations,
              'modal.scan_barcode',
              undefined,
              'Scan with Camera',
            ),
            className: 'barcode-scan-btn',
            row: true,
            attrs: { id: `${prefix}-${ELEMENTS.BARCODE_SCAN_BTN}` },
          })}
        </div>
        <div class="barcode-scanner-container" id="${prefix}-${ELEMENTS.BARCODE_SCANNER}" hidden>
          <div class="barcode-scanner-viewport" id="${prefix}-${ELEMENTS.BARCODE_VIEWPORT}"></div>
          ${iconButton({
            icon: 'mdi:close',
            label: TranslationManager.localize(
              translations,
              'modal.close_scanner',
              undefined,
              'Close Scanner',
            ),
            className: 'barcode-scanner-close',
            attrs: { id: `${prefix}-${ELEMENTS.BARCODE_SCANNER_CLOSE}` },
          })}
        </div>
        <div class="barcode-photo" id="${prefix}-${ELEMENTS.BARCODE_PHOTO}" hidden>
          <span class="barcode-photo__message" id="${prefix}-${ELEMENTS.BARCODE_PHOTO_MESSAGE}" hidden></span>
          ${button({
            kind: 'tonal',
            icon: 'mdi:image',
            label: TranslationManager.localize(
              translations,
              'scanner.choose_photo',
              undefined,
              'Choose a photo',
            ),
            className: 'barcode-photo-btn',
            attrs: { id: `${prefix}-${ELEMENTS.BARCODE_PHOTO_BTN}` },
          })}
        </div>
        <input type="hidden" id="${prefix}-${ELEMENTS.BARCODE}" />
      </div>
    </div>
  `;
}
