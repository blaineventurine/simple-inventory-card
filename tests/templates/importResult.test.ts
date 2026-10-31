import { describe, it, expect } from 'vitest';
import { MAX_IMPORT_ERRORS_SHOWN, createImportResultSheet } from '../../src/templates/importResult';
import { ELEMENTS } from '../../src/utils/constants';

function renderSheet(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  const sheetElement = container.querySelector<HTMLElement>(`#${ELEMENTS.IMPORT_RESULT_MODAL}`);
  if (!sheetElement) {
    throw new Error('import result sheet not rendered');
  }
  return sheetElement;
}

function text(element: Element | null): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('createImportResultSheet', () => {
  it('shows the counts with a success icon when nothing failed', () => {
    const sheetElement = renderSheet(
      createImportResultSheet({ result: { added: 2, updated: 1, skipped: 3, errors: [] } }, {}),
    );

    expect(sheetElement.classList.contains('si-sheet')).toBe(true);
    expect(text(sheetElement.querySelector('.si-sheet__title'))).toBe('Import');
    expect(text(sheetElement.querySelector('.import-result__message'))).toBe(
      'Import complete: 2 added, 1 updated, 3 skipped',
    );
    const circle = sheetElement.querySelector('.import-result__summary .si-icon-circle');
    expect(circle?.classList.contains('si-tone-success')).toBe(true);
    expect(circle?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:check');
    expect(sheetElement.querySelector('.import-result__errors')).toBeNull();
    expect(text(sheetElement.querySelector(`#${ELEMENTS.IMPORT_RESULT_CLOSE}`))).toBe('Close');
  });

  it('lists the first errors, counts the rest and uses a warning icon', () => {
    const errors = Array.from(
      { length: MAX_IMPORT_ERRORS_SHOWN + 2 },
      (_, index) => `Item ${index + 1} (Widget): bad quantity`,
    );
    const sheetElement = renderSheet(
      createImportResultSheet({ result: { added: 1, updated: 0, skipped: 2, errors } }, {}),
    );

    expect(text(sheetElement.querySelector('.import-result__errors-title'))).toBe('7 errors:');
    const listed = Array.from(sheetElement.querySelectorAll('.import-result__errors li')).map(
      (item) => item.textContent,
    );
    expect(listed).toEqual(errors.slice(0, MAX_IMPORT_ERRORS_SHOWN));
    expect(text(sheetElement.querySelector('.import-result__more'))).toBe('…and 2 more');
    expect(
      sheetElement
        .querySelector('.import-result__summary .si-icon-circle')
        ?.classList.contains('si-tone-warning'),
    ).toBe(true);
  });

  it('omits the remainder line when every error is listed', () => {
    const sheetElement = renderSheet(
      createImportResultSheet(
        { result: { added: 0, updated: 0, skipped: 1, errors: ['Item 1: bad'] } },
        {},
      ),
    );
    expect(sheetElement.querySelectorAll('.import-result__errors li')).toHaveLength(1);
    expect(sheetElement.querySelector('.import-result__more')).toBeNull();
  });

  it('escapes backend error text', () => {
    const sheetElement = renderSheet(
      createImportResultSheet(
        { result: { added: 0, updated: 0, skipped: 1, errors: ['<img src=x onerror=1>'] } },
        {},
      ),
    );
    expect(sheetElement.querySelector('img')).toBeNull();
    expect(text(sheetElement.querySelector('.import-result__errors li'))).toBe(
      '<img src=x onerror=1>',
    );
  });

  it('shows a failure with an error icon and no counts', () => {
    const sheetElement = renderSheet(
      createImportResultSheet({ error: 'Import failed: <boom>' }, {}),
    );

    expect(text(sheetElement.querySelector('.import-result__message'))).toBe(
      'Import failed: <boom>',
    );
    const circle = sheetElement.querySelector('.import-result__summary .si-icon-circle');
    expect(circle?.classList.contains('si-tone-error')).toBe(true);
    expect(circle?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:alert-circle-outline');
    expect(sheetElement.querySelector('.import-result__errors')).toBeNull();
  });
});
