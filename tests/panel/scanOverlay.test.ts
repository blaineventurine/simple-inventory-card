import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { ScanOverlay } from '../../src/panel/search/scanOverlay';
import {
  chooseBarcodePhoto,
  nativeScanner,
  NativeScanHandlers,
  scanSupport,
  startNativeScanner,
  startScanner,
  stopScanner,
} from '../../src/services/barcodeScanner';
import { createMockHomeAssistant, must } from '../testHelpers';

vi.mock('../../src/services/barcodeScanner', () => ({
  startScanner: vi.fn(async () => null),
  stopScanner: vi.fn(),
  isScannerActive: vi.fn(() => false),
  scanSupport: vi.fn(() => 'live'),
  chooseBarcodePhoto: vi.fn(async () => null),
  nativeScanner: vi.fn(() => undefined),
  startNativeScanner: vi.fn(),
}));
vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

describe('ScanOverlay', () => {
  let host: HTMLElement;
  let scanButton: HTMLButtonElement;
  let onCode: Mock<(code: string) => void>;
  let overlay: ScanOverlay;
  const hass = createMockHomeAssistant();

  const photoButton = (): HTMLElement | null =>
    host.querySelector<HTMLElement>('.scan-overlay__file');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(startScanner).mockClear();
    vi.mocked(stopScanner).mockClear();
    vi.mocked(chooseBarcodePhoto).mockReset().mockResolvedValue(null);
    vi.mocked(scanSupport).mockReturnValue('live');
    vi.mocked(nativeScanner).mockReturnValue(undefined);
    vi.mocked(startNativeScanner).mockClear();
    host = document.createElement('div');
    scanButton = document.createElement('button');
    document.body.append(scanButton, host);
    onCode = vi.fn();
    overlay = new ScanOverlay({
      host,
      getTranslations: () => ({}),
      getHass: () => hass,
      onCode,
      returnFocus: () => scanButton,
    });
  });

  afterEach(() => {
    overlay.close();
    host.remove();
    scanButton.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("with the companion app's native scanner", () => {
    const external = { config: { hasBarCodeScanner: 1 }, fireMessage: vi.fn() };
    const handlers = (): NativeScanHandlers => must(vi.mocked(startNativeScanner).mock.calls[0])[2];

    beforeEach(() => {
      vi.mocked(nativeScanner).mockReturnValue(external);
    });

    it('opens the app scanner and stays hidden itself', () => {
      overlay.open();

      expect(nativeScanner).toHaveBeenCalledWith(hass);
      expect(startNativeScanner).toHaveBeenCalledWith(
        external,
        {
          title: 'Scan barcode',
          description: "Point the camera at the item's barcode",
          alternativeOptionLabel: 'Choose a photo',
        },
        expect.any(Object),
      );
      expect(overlay.isOpen).toBe(true);
      expect(host.hidden).toBe(true);
      expect(startScanner).not.toHaveBeenCalled();
    });

    it('a barcode from the app closes the overlay and reports the code', () => {
      overlay.open();

      handlers().onDetected('4006381333931');

      expect(onCode).toHaveBeenCalledWith('4006381333931');
      expect(overlay.isOpen).toBe(false);
    });

    it('"Choose a photo" in the app shows the overlay with the photo button', () => {
      overlay.open();

      handlers().onChoosePhoto();

      expect(host.hidden).toBe(false);
      expect(photoButton()?.textContent).toContain('Choose a photo');
      expect(document.activeElement).toBe(host.querySelector('.scan-overlay__close'));
      photoButton()?.click();
      expect(chooseBarcodePhoto).toHaveBeenCalledOnce();
    });

    it('closing the app scanner closes the overlay and returns the focus', () => {
      overlay.open();

      handlers().onCancel?.();

      expect(overlay.isOpen).toBe(false);
      expect(document.activeElement).toBe(scanButton);
    });

    it('ignores the app once the overlay closed (Escape, leaving search)', () => {
      overlay.open();
      overlay.close();
      expect(stopScanner).toHaveBeenCalledOnce();

      handlers().onDetected('123');
      handlers().onChoosePhoto();

      expect(onCode).not.toHaveBeenCalled();
      expect(host.hidden).toBe(true);
    });
  });

  it('starts the camera in its viewport when live scanning is available', async () => {
    expect(host.hidden).toBe(true);

    overlay.open();
    await vi.advanceTimersByTimeAsync(0);

    const viewport = host.querySelector('.scan-overlay__viewport');
    expect(host.hidden).toBe(false);
    expect(overlay.isOpen).toBe(true);
    expect(viewport).not.toBeNull();
    expect(startScanner).toHaveBeenCalledWith(viewport, expect.any(Function));
    expect(host.textContent).toContain('Scan a barcode');
    expect(chooseBarcodePhoto).not.toHaveBeenCalled();
  });

  it('shows the camera error and offers "Choose a photo" when the camera does not start', async () => {
    vi.mocked(startScanner).mockResolvedValueOnce('permission_denied');

    overlay.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(host.textContent).toContain('Camera access denied');
    expect(host.querySelector('.scan-overlay__viewport')).toBeNull();
    expect(photoButton()?.textContent).toContain('Choose a photo');
    expect(overlay.isOpen).toBe(true);
    expect(chooseBarcodePhoto).not.toHaveBeenCalled();

    photoButton()?.click();
    vi.mocked(chooseBarcodePhoto).mock.calls[0]?.[0]('4006381333931');

    expect(onCode).toHaveBeenCalledWith('4006381333931');
    expect(overlay.isOpen).toBe(false);
  });

  it('says the camera is not available for other camera errors', async () => {
    vi.mocked(startScanner).mockResolvedValueOnce('not_available');

    overlay.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(host.textContent).toContain('Camera not available');
    expect(photoButton()).not.toBeNull();
  });

  it('on HTTP explains the HTTPS requirement and offers a photo, never starting the camera', () => {
    vi.mocked(scanSupport).mockReturnValue('insecure');

    overlay.open();

    expect(startScanner).not.toHaveBeenCalled();
    expect(chooseBarcodePhoto).not.toHaveBeenCalled();
    expect(host.textContent).toContain(
      'The camera needs a secure (HTTPS) connection to Home Assistant',
    );
    expect(photoButton()?.textContent).toContain('Choose a photo');

    photoButton()?.click();
    expect(chooseBarcodePhoto).toHaveBeenCalledTimes(1);
  });

  it('offers a photo instead when live scanning is unavailable', () => {
    vi.mocked(scanSupport).mockReturnValue('photo');

    overlay.open();

    expect(startScanner).not.toHaveBeenCalled();
    expect(photoButton()).not.toBeNull();
    expect(chooseBarcodePhoto).toHaveBeenCalledTimes(1);

    photoButton()?.click();
    expect(chooseBarcodePhoto).toHaveBeenCalledTimes(2);
  });

  it('a detected code closes the overlay, stops the camera and reports the code', async () => {
    overlay.open();
    await vi.advanceTimersByTimeAsync(0);
    const onDetected = vi.mocked(startScanner).mock.calls[0][1];

    onDetected('4006381333931');

    expect(stopScanner).toHaveBeenCalledTimes(1);
    expect(overlay.isOpen).toBe(false);
    expect(host.hidden).toBe(true);
    expect(onCode).toHaveBeenCalledWith('4006381333931');
  });

  it('a code decoded from a photo does the same', async () => {
    vi.mocked(scanSupport).mockReturnValue('photo');
    overlay.open();

    vi.mocked(chooseBarcodePhoto).mock.calls[0]?.[0]('0041333424019');
    await vi.advanceTimersByTimeAsync(0);

    expect(onCode).toHaveBeenCalledWith('0041333424019');
    expect(overlay.isOpen).toBe(false);
    expect(stopScanner).toHaveBeenCalledTimes(1);
  });

  it('says so when a photo has no barcode, and stays open', async () => {
    vi.mocked(scanSupport).mockReturnValue('photo');
    vi.mocked(chooseBarcodePhoto).mockResolvedValueOnce('not_found');
    overlay.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(host.textContent).toContain('No barcode found in photo');
    expect(overlay.isOpen).toBe(true);
    expect(onCode).not.toHaveBeenCalled();
  });

  it('ignores a photo decoded after the overlay closed', async () => {
    vi.mocked(scanSupport).mockReturnValue('photo');
    overlay.open();
    overlay.close();

    vi.mocked(chooseBarcodePhoto).mock.calls[0]?.[0]('0041333424019');

    expect(onCode).not.toHaveBeenCalled();
  });

  it('✕ closes it and stops the camera; a late detection is ignored', async () => {
    overlay.open();
    await vi.advanceTimersByTimeAsync(0);
    const onDetected = vi.mocked(startScanner).mock.calls[0][1];

    host.querySelector<HTMLElement>('.scan-overlay__close')?.click();
    // Closing twice (e.g. leaving search right after) does not stop the camera twice.
    overlay.close();

    expect(stopScanner).toHaveBeenCalledTimes(1);
    expect(host.hidden).toBe(true);
    onDetected('123');
    expect(onCode).not.toHaveBeenCalled();
  });

  it('closing returns the focus to the scan button', async () => {
    overlay.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.activeElement).toBe(host.querySelector('.scan-overlay__close'));

    host.querySelector<HTMLElement>('.scan-overlay__close')?.click();

    expect(document.activeElement).toBe(scanButton);
  });

  it('a read code leaves the focus to its receiver, not the scan button', async () => {
    const field = document.createElement('input');
    document.body.append(field);
    onCode.mockImplementation(() => field.focus());
    overlay.open();
    await vi.advanceTimersByTimeAsync(0);

    vi.mocked(startScanner).mock.calls[0][1]('123');

    expect(document.activeElement).toBe(field);
    field.remove();
  });

  it('close() without an open overlay leaves the camera alone', () => {
    overlay.close();

    expect(stopScanner).not.toHaveBeenCalled();
  });
});
