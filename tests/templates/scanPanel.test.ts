import { describe, it, expect, vi } from 'vitest';
import { createScanPanel } from '../../src/templates/scanPanel';
import { ACTIONS, ELEMENTS } from '../../src/utils/constants';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

describe('createScanPanel', () => {
  const mockTranslations: TranslationData = {};

  it('should render scanner viewport with correct ID', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_VIEWPORT}"`);
    expect(result).toContain(`id="${ELEMENTS.SCAN_PANEL}"`);
  });

  it('should render close button with correct ID', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_CLOSE}"`);
  });

  it('renders the close button as a labelled icon button over the viewport', () => {
    const container = document.createElement('div');
    container.innerHTML = createScanPanel(mockTranslations);
    const close = container.querySelector(`#${ELEMENTS.SCAN_CLOSE}`);

    expect(close?.classList.contains('si-icon-btn')).toBe(true);
    expect(close?.getAttribute('aria-label')).toBe('Close Scanner');
    expect(close?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:close');
    expect(close?.parentElement?.id).toBe(`${ELEMENTS.SCAN_VIEWPORT}-container`);
  });

  it('makes Go and Add filled and Cancel tonal, all in one button row', () => {
    const container = document.createElement('div');
    container.innerHTML = createScanPanel(mockTranslations);
    const row = container.querySelector('.scan-buttons-row');

    expect(
      row?.querySelector(`#${ELEMENTS.SCAN_GO_BTN}`)?.classList.contains('si-filled-btn'),
    ).toBe(true);
    expect(
      row?.querySelector(`#${ELEMENTS.SCAN_ADD_BTN}`)?.classList.contains('si-filled-btn'),
    ).toBe(true);
    expect(
      row?.querySelector(`#${ELEMENTS.SCAN_CANCEL_BTN}`)?.classList.contains('si-tonal-btn'),
    ).toBe(true);
  });

  it('should render action bar with correct ID', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_ACTION_BAR}"`);
  });

  it('should render action select with increment and decrement options', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_ACTION_SELECT}"`);
    expect(result).toContain('value="increment"');
    expect(result).toContain('value="decrement"');
  });

  it('should render amount input with correct attributes', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_AMOUNT_INPUT}"`);
    expect(result).toContain('type="number"');
    expect(result).toContain('value="1"');
    expect(result).toContain('min="0.1"');
  });

  it('should render go and cancel buttons', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_GO_BTN}"`);
    expect(result).toContain(`id="${ELEMENTS.SCAN_CANCEL_BTN}"`);
  });

  it('should render error area', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain('id="scan-panel-error"');
  });

  it('should be hidden by default', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_PANEL}" class="scan-panel" hidden>`);
  });

  it('should have action bar hidden by default', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_ACTION_BAR}" hidden>`);
  });

  it('should render scan-item-name element hidden by default', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_ITEM_NAME}"`);
    expect(result).toContain('class="scan-item-name" hidden>');
  });

  it('should render scan-add-btn element hidden by default', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_ADD_BTN}"`);
    expect(result).toContain(`id="${ELEMENTS.SCAN_ADD_BTN}" hidden`);
  });

  it('should wrap inc/dec controls in scan-existing-controls', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_EXISTING_CONTROLS}"`);
  });

  it('has no batch details unless the integration supports batches', () => {
    expect(createScanPanel(mockTranslations)).not.toContain(ELEMENTS.SCAN_BATCH_FIELDS);
  });

  it('offers collapsed batch details with the batch inputs when batches are enabled', () => {
    const container = document.createElement('div');
    container.innerHTML = createScanPanel(mockTranslations, true);
    const details = container.querySelector(`#${ELEMENTS.SCAN_BATCH_FIELDS}`);

    expect(details?.tagName).toBe('DETAILS');
    expect(details?.hasAttribute('open')).toBe(false);
    // Shown only once a known item is scanned for increment.
    expect(details?.hasAttribute('hidden')).toBe(true);
    const summary = details?.querySelector('summary');
    expect(summary?.textContent?.trim()).toBe('Batch details');
    // Disclosure marker: the CSS rotates it while the details are open.
    expect(
      summary?.querySelector('ha-icon.scan-batch-details__chevron')?.getAttribute('icon'),
    ).toBe('mdi:chevron-down');
    expect(details?.querySelectorAll('[data-batch-field]')).toHaveLength(4);
  });

  it('offers a hidden "Choose a photo" with a message and Cancel, for when the camera cannot be used', () => {
    const container = document.createElement('div');
    container.innerHTML = createScanPanel(mockTranslations);
    const photo = container.querySelector<HTMLElement>(`#${ELEMENTS.SCAN_PHOTO}`);
    const choose = photo?.querySelector(`[data-action="${ACTIONS.SCAN_CHOOSE_PHOTO}"]`);

    expect(photo?.hidden).toBe(true);
    expect(photo?.querySelector(`#${ELEMENTS.SCAN_PHOTO_MESSAGE}`)).not.toBeNull();
    expect(choose?.textContent).toContain('Choose a photo');
    expect(choose?.classList.contains('si-filled-btn')).toBe(true);
    expect(photo?.querySelector(`[data-action="${ACTIONS.CLOSE_SCAN}"]`)).not.toBeNull();
  });
});
