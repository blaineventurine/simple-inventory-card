import { ImportResult } from '@/types/serviceResult';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '../utils/utilities';
import { ELEMENTS } from '../utils/constants';
import { Tone, button, iconCircle } from './primitives';
import { sheet } from './sheet';

export const MAX_IMPORT_ERRORS_SHOWN = 5;

/** What an import attempt produced: the backend's result, or an already-localized failure. */
export type ImportOutcome = { result: ImportResult } | { error: string };

function summary(icon: string, tone: Tone, message: string): string {
  return `
    <div class="import-result__summary">
      ${iconCircle(icon, tone)}
      <p class="import-result__message">${Utilities.sanitizeHtml(message)}</p>
    </div>`;
}

function resultBody(result: ImportResult, translations: TranslationData): string {
  const errors = result.errors ?? [];
  const counts = TranslationManager.localize(
    translations,
    'actions.import_result',
    { added: result.added, updated: result.updated, skipped: result.skipped },
    `Import complete: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped`,
  );
  if (errors.length === 0) {
    return summary('mdi:check', 'success', counts);
  }

  const errorsTitle = TranslationManager.localize(
    translations,
    'actions.import_errors',
    { count: errors.length },
    `${errors.length} errors:`,
  );
  const remaining = errors.length - MAX_IMPORT_ERRORS_SHOWN;
  const more =
    remaining > 0
      ? `<p class="import-result__more">${Utilities.sanitizeHtml(
          TranslationManager.localize(
            translations,
            'actions.import_errors_more',
            { count: remaining },
            `…and ${remaining} more`,
          ),
        )}</p>`
      : '';

  return `
    ${summary('mdi:alert-outline', 'warning', counts)}
    <p class="import-result__errors-title">${Utilities.sanitizeHtml(errorsTitle)}</p>
    <ul class="import-result__errors">
      ${errors
        .slice(0, MAX_IMPORT_ERRORS_SHOWN)
        .map((error) => `<li>${Utilities.sanitizeHtml(error)}</li>`)
        .join('')}
    </ul>
    ${more}`;
}

export function createImportResultSheet(
  outcome: ImportOutcome,
  translations: TranslationData,
): string {
  const closeLabel = TranslationManager.localize(translations, 'modal.close', undefined, 'Close');
  return sheet({
    id: ELEMENTS.IMPORT_RESULT_MODAL,
    title: TranslationManager.localize(translations, 'actions.import_title', undefined, 'Import'),
    closeLabel,
    bodyHtml:
      'error' in outcome
        ? summary('mdi:alert-circle-outline', 'error', outcome.error)
        : resultBody(outcome.result, translations),
    actionsHtml: button({
      kind: 'tonal',
      label: closeLabel,
      attrs: { id: ELEMENTS.IMPORT_RESULT_CLOSE },
    }),
  });
}
