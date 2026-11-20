import { DEFAULTS } from '@/utils/constants';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { DateUtils } from '@/utils/dateUtils';
import { Tone } from './primitives';

export interface ExpiryStatus {
  class: string;
  label: string;
}

/** CSS class and label of an expiry badge; shared by item rows and batch rows. */
export function getExpiryStatus(
  expiryDate: string,
  translations: TranslationData,
  threshold: number = DEFAULTS.EXPIRY_ALERT_DAYS,
): ExpiryStatus {
  // Unparseable dates yield NaN, which falls through to the "safe" branch below.
  const daysUntilExpiry = DateUtils.daysUntilExpiry(expiryDate) ?? Number.NaN;

  if (daysUntilExpiry < 0) {
    const daysAgo = Math.abs(daysUntilExpiry);
    const key = daysAgo === 1 ? 'expiry.expired_day_ago' : 'expiry.expired_days_ago';
    return {
      class: 'expired',
      label: TranslationManager.localize(
        translations,
        key,
        { days: daysAgo },
        `Expired ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`,
      ),
    };
  } else if (daysUntilExpiry === 0) {
    return {
      class: 'expires-today',
      label: TranslationManager.localize(
        translations,
        'expiry.expires_today',
        undefined,
        'Expires today',
      ),
    };
  } else if (daysUntilExpiry <= threshold) {
    const key = daysUntilExpiry === 1 ? 'expiry.expires_in_day' : 'expiry.expires_in_days';
    return {
      class: 'expiring-soon',
      label: TranslationManager.localize(
        translations,
        key,
        { days: daysUntilExpiry },
        `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
      ),
    };
  } else {
    return { class: 'expiry-safe', label: `${expiryDate}` };
  }
}

/** Tone of an expiry label: error once expired, warning inside the alert window, else none. */
export function expiryTone(status: ExpiryStatus): Tone | undefined {
  if (status.class === 'expired') {
    return 'error';
  }
  if (status.class === 'expires-today' || status.class === 'expiring-soon') {
    return 'warning';
  }
  return undefined;
}
