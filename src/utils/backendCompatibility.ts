import { Services } from '../services/services';
import { TranslationManager } from '../services/translationManager';
import { TranslationData } from '@/types/translatableComponent';
import { BackendInfo } from '@/types/backendInfo';
import { Utilities } from './utilities';

/**
 * Lowest backend `api_version` this card works with, and the integration release
 * that introduced it. The backend bumps `api_version` only for breaking changes.
 */
export const MIN_API_VERSION = 2;
export const MIN_INTEGRATION_VERSION = '0.7.0';

export type BackendCompatibility =
  | { status: 'ok'; info: BackendInfo }
  | { status: 'outdated'; version: string | null }
  | { status: 'unknown' };

/**
 * Ask the integration which API it speaks. Backends older than 0.7.0 don't have
 * `get_info` at all (`unknown_command`); any other failure (dropped connection, …)
 * is "unknown" and must not be shown to the user as an outdated integration.
 */
export async function checkBackendCompatibility(services: Services): Promise<BackendCompatibility> {
  try {
    const info = await services.getInfo();
    return info.api_version >= MIN_API_VERSION
      ? { status: 'ok', info }
      : { status: 'outdated', version: info.version };
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'unknown_command'
    ) {
      return { status: 'outdated', version: null };
    }
    console.warn('Simple Inventory: could not check the integration version:', error);
    return { status: 'unknown' };
  }
}

/** Markup for the persistent "integration too old" banner; empty unless outdated. */
export function createCompatibilityBanner(
  compatibility: BackendCompatibility,
  translations: TranslationData,
): string {
  if (compatibility.status !== 'outdated') return '';

  const version =
    compatibility.version ??
    TranslationManager.localize(
      translations,
      'compatibility.unknown_version',
      { minimum: MIN_INTEGRATION_VERSION },
      `older than ${MIN_INTEGRATION_VERSION}`,
    );
  const message = TranslationManager.localize(
    translations,
    'compatibility.backend_outdated',
    { version, minimum: MIN_INTEGRATION_VERSION },
    `Simple Inventory integration ${version} is too old for this card; update to ${MIN_INTEGRATION_VERSION} or newer.`,
  );
  return `<div id="compat-banner" class="compat-banner" role="alert">${Utilities.sanitizeHtml(message)}</div>`;
}
