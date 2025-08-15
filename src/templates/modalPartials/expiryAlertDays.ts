import { TranslationManager } from '@/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function expiryAlertDays(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group expiry-threshold-section">
      <label for="${prefix}-${ELEMENTS.EXPIRY_ALERT_DAYS}" class="form-label">
        ${TranslationManager.localize(
          translations,
          'modal.expiry_alert_threshold',
          undefined,
          'Expiry Alert Threshold',
        )}
        <span class="optional">
          ${TranslationManager.localize(
            translations,
            'modal.days_before_expiry',
            undefined,
            '(days before expiry)',
          )}
        </span>
      </label>
      <input 
        type="number" 
        id="${prefix}-${ELEMENTS.EXPIRY_ALERT_DAYS}" 
        min="1" 
        max="365"
        placeholder="${TranslationManager.localize(
          translations,
          'modal.set_expiry_first',
          undefined,
          'Set expiry date first',
        )}"
        disabled
      />
      <small class="help-text">
        ${TranslationManager.localize(
          translations,
          'modal.expiry_help_text',
          undefined,
          'How many days before expiry to show alerts',
        )}
      </small>
    </div>
  `;
}
