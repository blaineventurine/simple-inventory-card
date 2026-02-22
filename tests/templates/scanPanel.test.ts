import { describe, it, expect, vi } from 'vitest';
import { createScanPanel } from '../../src/templates/scanPanel';
import { ELEMENTS } from '../../src/utils/constants';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn((_translations: any, _key: string, _params: any, fallback: string) => {
      return fallback;
    }),
  },
}));

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

    expect(result).toContain(
      `id="${ELEMENTS.SCAN_PANEL}" class="scan-panel" style="display:none;"`,
    );
  });

  it('should have action bar hidden by default', () => {
    const result = createScanPanel(mockTranslations);

    expect(result).toContain(`id="${ELEMENTS.SCAN_ACTION_BAR}" style="display:none;"`);
  });
});
