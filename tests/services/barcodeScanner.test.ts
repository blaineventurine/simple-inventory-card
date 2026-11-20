import { describe, it, expect, vi, beforeEach, afterEach, Mock, MockInstance } from 'vitest';
import Quagga from '@ericblade/quagga2';
import {
  startScanner,
  stopScanner,
  isScannerActive,
  scanSupport,
  decodeFromFile,
  chooseBarcodePhoto,
  nativeScanner,
  startNativeScanner,
} from '../../src/services/barcodeScanner';
import { BarCodeCommand, BarCodeMessage, ExternalMessaging } from '../../src/types/externalBus';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { createMockHomeAssistant, must } from '../testHelpers';

// quagga2 is globally mocked in tests/setup.ts
const mockDecodeSingle = vi.mocked(Quagga.decodeSingle);
const mockInit = vi.mocked(Quagga.init);
const mockStart = vi.mocked(Quagga.start);
const mockStop = vi.mocked(Quagga.stop);
const mockOnDetected = vi.mocked(Quagga.onDetected);
const mockOffDetected = vi.mocked(Quagga.offDetected);

describe('barcodeScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset active state by stopping if active
    if (isScannerActive()) {
      stopScanner();
    }
    vi.clearAllMocks();
  });

  it('should call Quagga.init and Quagga.start on success', async () => {
    mockInit.mockImplementation((_config: any, cb: any) => {
      cb(null);
      return Promise.resolve();
    });

    const target = document.createElement('div');
    const onDetected = vi.fn();
    const result = await startScanner(target, onDetected);

    expect(result).toBeNull();
    expect(mockInit).toHaveBeenCalledOnce();
    expect(mockStart).toHaveBeenCalledOnce();
    expect(isScannerActive()).toBe(true);
  });

  it('asks the camera for 1920×1080 at the back, settling for the closest mode it has', async () => {
    mockInit.mockImplementation((_config, cb) => {
      cb?.(null);
      return Promise.resolve();
    });

    await startScanner(document.createElement('div'), vi.fn());

    expect(mockInit.mock.calls[0]?.[0].inputStream?.constraints).toEqual({
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    });
  });

  it('should call Quagga.stop on stopScanner', async () => {
    mockInit.mockImplementation((_config: any, cb: any) => {
      cb(null);
      return Promise.resolve();
    });

    const target = document.createElement('div');
    await startScanner(target, vi.fn());

    vi.clearAllMocks();
    stopScanner();

    expect(mockStop).toHaveBeenCalledOnce();
    expect(mockOffDetected).toHaveBeenCalledOnce();
    expect(isScannerActive()).toBe(false);
  });

  it('should be safe to call stopScanner when not running', () => {
    expect(isScannerActive()).toBe(false);
    expect(() => stopScanner()).not.toThrow();
    expect(mockStop).not.toHaveBeenCalled();
  });

  describe('a camera that is still opening', () => {
    /** `Quagga.init` callbacks not answered yet, oldest first. */
    let pending: Array<(err: Error | null) => void>;

    /** Lets queued starts reach `Quagga.init`. */
    async function settle(): Promise<void> {
      for (let i = 0; i < 3; i += 1) {
        await Promise.resolve();
      }
    }

    beforeEach(() => {
      pending = [];
      mockInit.mockImplementation((_config, cb) => {
        pending.push((err) => cb?.(err));
        return Promise.resolve();
      });
    });

    it('is released when it finishes opening after a stop', async () => {
      const started = startScanner(document.createElement('div'), vi.fn());
      await settle();
      stopScanner();
      pending.shift()?.(null);

      expect(await started).toBeNull();
      expect(mockStart).not.toHaveBeenCalled();
      expect(mockStop).toHaveBeenCalledOnce();
      expect(isScannerActive()).toBe(false);
    });

    it('is released before a newer start opens its own (quagga2 holds one stream)', async () => {
      const older = startScanner(document.createElement('div'), vi.fn());
      await settle();
      const newer = startScanner(document.createElement('div'), vi.fn());
      await settle();
      expect(mockInit).toHaveBeenCalledOnce();

      pending.shift()?.(null);
      expect(await older).toBeNull();
      expect(mockStop).toHaveBeenCalledOnce();
      await settle();
      expect(mockInit).toHaveBeenCalledTimes(2);

      pending.shift()?.(null);
      expect(await newer).toBeNull();
      expect(mockStart).toHaveBeenCalledOnce();
      expect(isScannerActive()).toBe(true);
    });

    it('keeps a queued start that was stopped from opening a camera at all', async () => {
      const older = startScanner(document.createElement('div'), vi.fn());
      await settle();
      const newer = startScanner(document.createElement('div'), vi.fn());
      stopScanner();
      pending.shift()?.(null);

      expect(await older).toBeNull();
      expect(await newer).toBeNull();
      expect(mockInit).toHaveBeenCalledOnce();
      expect(mockStart).not.toHaveBeenCalled();
      expect(isScannerActive()).toBe(false);
    });
  });

  it('should fire callback for barcode with good confidence', async () => {
    let detectedHandler: ((result: any) => void) | undefined;
    mockInit.mockImplementation((_config: any, cb: any) => {
      cb(null);
      return Promise.resolve();
    });
    mockOnDetected.mockImplementation((handler: any) => {
      detectedHandler = handler;
    });

    const target = document.createElement('div');
    const onDetected = vi.fn();
    await startScanner(target, onDetected);

    must(detectedHandler)({
      codeResult: {
        code: '1234567890128',
        decodedCodes: [{ error: 0.01 }, { error: 0.02 }, { error: 0.03 }],
      },
    });

    expect(onDetected).toHaveBeenCalledWith('1234567890128');
  });

  it('should ignore barcode with poor confidence', async () => {
    let detectedHandler: ((result: any) => void) | undefined;
    mockInit.mockImplementation((_config: any, cb: any) => {
      cb(null);
      return Promise.resolve();
    });
    mockOnDetected.mockImplementation((handler: any) => {
      detectedHandler = handler;
    });

    const target = document.createElement('div');
    const onDetected = vi.fn();
    await startScanner(target, onDetected);

    must(detectedHandler)({
      codeResult: {
        code: '1234567890128',
        decodedCodes: [{ error: 0.5 }, { error: 0.6 }, { error: 0.7 }],
      },
    });

    expect(onDetected).not.toHaveBeenCalled();
  });

  it('should return permission_denied on permission error', async () => {
    mockInit.mockImplementation((_config: any, cb: any) => {
      cb(new Error('NotAllowedError: Permission denied'));
      return Promise.resolve();
    });

    const target = document.createElement('div');
    const result = await startScanner(target, vi.fn());

    expect(result).toBe('permission_denied');
    expect(isScannerActive()).toBe(false);
  });

  it('should return not_available on other errors', async () => {
    mockInit.mockImplementation((_config: any, cb: any) => {
      cb(new Error('NotFoundError: No camera detected'));
      return Promise.resolve();
    });

    const target = document.createElement('div');
    const result = await startScanner(target, vi.fn());

    expect(result).toBe('not_available');
    expect(isScannerActive()).toBe(false);
  });
});

describe('native scanner (Home Assistant companion app)', () => {
  let fireMessage: Mock<(message: BarCodeMessage) => void>;
  let external: ExternalMessaging;
  let hass: HomeAssistant;
  /** HA's own `window.externalBus` (ExternalMessaging.receiveMessage). */
  let haReceive: Mock<(message: unknown) => void>;
  let handlers: {
    onDetected: Mock<(code: string) => void>;
    onChoosePhoto: Mock<() => void>;
    onCancel: Mock<() => void>;
    onEnd: Mock<() => void>;
  };

  const texts = {
    title: 'Scan barcode',
    description: "Point the camera at the item's barcode",
    alternativeOptionLabel: 'Choose a photo',
  };

  /** The app delivers a command, as HA's Android/iOS bridges do. */
  function appSends(command: BarCodeCommand['command'], payload: Record<string, unknown>): void {
    must(window.externalBus)({ id: 7, type: 'command', command, payload });
  }

  const sent = (): BarCodeMessage[] => fireMessage.mock.calls.map(([message]) => message);

  beforeEach(() => {
    fireMessage = vi.fn();
    external = { config: { hasBarCodeScanner: 1 }, fireMessage };
    hass = { ...createMockHomeAssistant(), auth: { external } };
    haReceive = vi.fn();
    window.externalBus = haReceive;
    handlers = {
      onDetected: vi.fn(),
      onChoosePhoto: vi.fn(),
      onCancel: vi.fn(),
      onEnd: vi.fn(),
    };
  });

  afterEach(() => {
    stopScanner();
    Reflect.deleteProperty(window, 'externalBus');
  });

  describe('availability', () => {
    it("follows the app's hasBarCodeScanner", () => {
      expect(nativeScanner(hass)).toBe(external);

      external.config = { hasBarCodeScanner: 0 };
      expect(nativeScanner(hass)).toBeUndefined();

      external.config = {};
      expect(nativeScanner(hass)).toBeUndefined();

      Reflect.deleteProperty(external, 'config');
      expect(nativeScanner(hass)).toBeUndefined();
    });

    it('is unavailable outside the app (no hass.auth.external) or without hass', () => {
      expect(nativeScanner(createMockHomeAssistant())).toBeUndefined();
      expect(nativeScanner({ ...createMockHomeAssistant(), auth: {} })).toBeUndefined();
      expect(nativeScanner(undefined)).toBeUndefined();
    });

    it('is unavailable when hass.auth.external is not an ExternalMessaging', () => {
      const config = { hasBarCodeScanner: 1 };
      expect(nativeScanner({ ...hass, auth: { external: { config } } })).toBeUndefined();
      expect(nativeScanner({ ...hass, auth: { external: 'app' } })).toBeUndefined();
    });

    it('is unavailable when window.externalBus is not a function', () => {
      Reflect.deleteProperty(window, 'externalBus');
      expect(nativeScanner(hass)).toBeUndefined();
    });
  });

  it('start asks the app for its scanner, with "Choose a photo" as its alternative', () => {
    startNativeScanner(external, texts, handlers);

    expect(sent()).toEqual([
      {
        type: 'bar_code/scan',
        payload: {
          title: 'Scan barcode',
          description: "Point the camera at the item's barcode",
          alternative_option_label: 'Choose a photo',
        },
      },
    ]);
  });

  it('a scan result passes through to HA and to onDetected, then closes the app scanner', () => {
    startNativeScanner(external, texts, handlers);
    fireMessage.mockClear();

    appSends('bar_code/scan_result', { rawValue: 'https://example.com/qr', format: 'qr_code' });

    expect(handlers.onDetected).toHaveBeenCalledWith('https://example.com/qr');
    expect(haReceive).toHaveBeenCalledWith({
      id: 7,
      type: 'command',
      command: 'bar_code/scan_result',
      payload: { rawValue: 'https://example.com/qr', format: 'qr_code' },
    });
    expect(sent()).toEqual([{ type: 'bar_code/close' }]);
    expect(must(handlers.onDetected.mock.invocationCallOrder[0])).toBeLessThan(
      must(fireMessage.mock.invocationCallOrder[0]),
    );
    expect(handlers.onEnd).toHaveBeenCalledOnce();

    // The session is over: a later result is HA's alone.
    appSends('bar_code/scan_result', { rawValue: '123', format: 'ean_13' });
    expect(handlers.onDetected).toHaveBeenCalledOnce();
    expect(haReceive).toHaveBeenCalledTimes(2);
  });

  it('"Choose a photo" in the app scanner asks for the photo chooser', () => {
    startNativeScanner(external, texts, handlers);
    fireMessage.mockClear();

    appSends('bar_code/aborted', { reason: 'alternative_options' });

    expect(handlers.onChoosePhoto).toHaveBeenCalledOnce();
    expect(handlers.onCancel).not.toHaveBeenCalled();
    expect(handlers.onEnd).toHaveBeenCalledOnce();
    expect(haReceive).toHaveBeenCalledOnce();
    expect(sent()).toEqual([]);
  });

  it('closing the app scanner ends the session quietly', () => {
    startNativeScanner(external, texts, handlers);
    fireMessage.mockClear();

    appSends('bar_code/aborted', { reason: 'canceled' });

    expect(handlers.onCancel).toHaveBeenCalledOnce();
    expect(handlers.onDetected).not.toHaveBeenCalled();
    expect(handlers.onChoosePhoto).not.toHaveBeenCalled();
    expect(handlers.onEnd).toHaveBeenCalledOnce();
    expect(haReceive).toHaveBeenCalledOnce();
    expect(sent()).toEqual([]);

    stopScanner();
    expect(sent()).toEqual([]);
  });

  it('stop closes the app scanner and ends the session once', () => {
    startNativeScanner(external, texts, handlers);
    fireMessage.mockClear();

    stopScanner();
    stopScanner();

    expect(sent()).toEqual([{ type: 'bar_code/close' }]);
    expect(handlers.onEnd).toHaveBeenCalledOnce();
    appSends('bar_code/scan_result', { rawValue: '123', format: 'ean_13' });
    expect(handlers.onDetected).not.toHaveBeenCalled();
  });

  it('a newer scan replaces one still open', () => {
    const newer = { ...handlers, onDetected: vi.fn(), onEnd: vi.fn() };
    startNativeScanner(external, texts, handlers);
    startNativeScanner(external, texts, newer);

    expect(handlers.onEnd).toHaveBeenCalledOnce();
    appSends('bar_code/scan_result', { rawValue: '123', format: 'ean_13' });
    expect(handlers.onDetected).not.toHaveBeenCalled();
    expect(newer.onDetected).toHaveBeenCalledWith('123');
  });

  it('wraps window.externalBus once, and again only after HA replaced it', () => {
    startNativeScanner(external, texts, handlers);
    const observer = window.externalBus;
    expect(observer).not.toBe(haReceive);
    stopScanner();
    startNativeScanner(external, texts, handlers);
    expect(window.externalBus).toBe(observer);

    appSends('bar_code/aborted', { reason: 'canceled' });
    expect(haReceive).toHaveBeenCalledOnce();

    const reattached = vi.fn();
    window.externalBus = reattached;
    startNativeScanner(external, texts, handlers);
    appSends('bar_code/scan_result', { rawValue: '123', format: 'ean_13' });
    expect(reattached).toHaveBeenCalledOnce();
    expect(haReceive).toHaveBeenCalledOnce();
    expect(handlers.onDetected).toHaveBeenCalledWith('123');
  });

  it('passes every message through and ignores bar code commands while no scan is active', () => {
    startNativeScanner(external, texts, handlers);
    stopScanner();
    fireMessage.mockClear();

    appSends('bar_code/scan_result', { rawValue: '123', format: 'ean_13' });
    must(window.externalBus)({ id: 8, type: 'command', command: 'sidebar/show' });
    must(window.externalBus)({ id: 9, type: 'result', success: true, result: null });

    expect(haReceive).toHaveBeenCalledTimes(3);
    expect(handlers.onDetected).not.toHaveBeenCalled();
    expect(sent()).toEqual([]);
  });

  it('still hands the message to HA when a handler throws', () => {
    handlers.onDetected.mockImplementation(() => {
      throw new Error('boom');
    });
    startNativeScanner(external, texts, handlers);

    expect(() => appSends('bar_code/scan_result', { rawValue: '1', format: 'ean_13' })).toThrow(
      'boom',
    );
    expect(haReceive).toHaveBeenCalledOnce();
  });

  it('takes any abort reason other than canceled as the alternative option (like ha-qr-scanner)', () => {
    startNativeScanner(external, texts, handlers);
    fireMessage.mockClear();

    appSends('bar_code/aborted', { reason: 'other' });

    expect(handlers.onChoosePhoto).toHaveBeenCalledOnce();
    expect(handlers.onCancel).not.toHaveBeenCalled();
    expect(handlers.onEnd).toHaveBeenCalledOnce();
    expect(haReceive).toHaveBeenCalledOnce();

    handlers.onChoosePhoto.mockClear();
    startNativeScanner(external, texts, handlers);
    must(window.externalBus)({ id: 8, type: 'command', command: 'bar_code/aborted' });
    expect(handlers.onChoosePhoto).toHaveBeenCalledOnce();
  });

  it('ignores a scan result without a value, keeping the scan open', () => {
    startNativeScanner(external, texts, handlers);

    appSends('bar_code/scan_result', { format: 'ean_13' });

    expect(haReceive).toHaveBeenCalledOnce();
    expect(handlers.onDetected).not.toHaveBeenCalled();
    expect(handlers.onEnd).not.toHaveBeenCalled();
  });

  it('ignores messages that are not bar code commands during a scan, passing them through', () => {
    startNativeScanner(external, texts, handlers);

    must(window.externalBus)({ id: 8, type: 'command', command: 'sidebar/show' });
    must(window.externalBus)({ id: 9, type: 'result', command: 'bar_code/aborted' });
    must(window.externalBus)('not a message');
    must(window.externalBus)(null);

    expect(haReceive).toHaveBeenCalledTimes(4);
    expect(handlers.onDetected).not.toHaveBeenCalled();
    expect(handlers.onChoosePhoto).not.toHaveBeenCalled();
    expect(handlers.onEnd).not.toHaveBeenCalled();
  });

  describe('two copies of the module (the card and the panel bundle)', () => {
    /**
     * Two independent instances of the scanner module, as the two bundles each carry one. Dynamic
     * imports after `vi.resetModules` are the only way to get a second instance.
     */
    async function twoCopies() {
      vi.resetModules();
      const card = await import('../../src/services/barcodeScanner');
      vi.resetModules();
      const panel = await import('../../src/services/barcodeScanner');
      return { card, panel };
    }

    it('share one window.externalBus wrapper, both getting messages and HA each once', async () => {
      const { card, panel } = await twoCopies();
      expect(card.startNativeScanner).not.toBe(panel.startNativeScanner);
      const cardDetected = vi.fn();
      const panelDetected = vi.fn();
      const start = (copy: typeof card, onDetected: (code: string) => void): void =>
        copy.startNativeScanner(external, texts, { onDetected, onChoosePhoto: vi.fn() });

      start(card, cardDetected);
      const wrapper = window.externalBus;
      expect(wrapper).not.toBe(haReceive);
      // Alternating starts never wrap the wrapper.
      start(panel, panelDetected);
      card.stopScanner();
      start(card, cardDetected);
      panel.stopScanner();
      start(panel, panelDetected);
      expect(window.externalBus).toBe(wrapper);

      appSends('bar_code/scan_result', { rawValue: '4006381333931', format: 'ean_13' });

      expect(haReceive).toHaveBeenCalledOnce();
      expect(cardDetected).toHaveBeenCalledWith('4006381333931');
      expect(panelDetected).toHaveBeenCalledWith('4006381333931');

      appSends('bar_code/aborted', { reason: 'canceled' });
      expect(haReceive).toHaveBeenCalledTimes(2);
    });

    it('a copy wraps again only after HA replaced the bus with its own function', async () => {
      const { card, panel } = await twoCopies();
      const panelDetected = vi.fn();
      card.startNativeScanner(external, texts, { onDetected: vi.fn(), onChoosePhoto: vi.fn() });

      const reattached = vi.fn();
      window.externalBus = reattached;
      panel.startNativeScanner(external, texts, {
        onDetected: panelDetected,
        onChoosePhoto: vi.fn(),
      });
      const wrapper = window.externalBus;
      expect(wrapper).not.toBe(reattached);
      card.startNativeScanner(external, texts, { onDetected: vi.fn(), onChoosePhoto: vi.fn() });
      expect(window.externalBus).toBe(wrapper);

      appSends('bar_code/scan_result', { rawValue: '1', format: 'ean_13' });
      expect(reattached).toHaveBeenCalledOnce();
      expect(haReceive).not.toHaveBeenCalled();
      expect(panelDetected).toHaveBeenCalledWith('1');
    });

    it('a throwing copy still lets the other copy and HA get the message', async () => {
      const { card, panel } = await twoCopies();
      const panelDetected = vi.fn();
      card.startNativeScanner(external, texts, {
        onDetected: () => {
          throw new Error('boom');
        },
        onChoosePhoto: vi.fn(),
      });
      panel.startNativeScanner(external, texts, {
        onDetected: panelDetected,
        onChoosePhoto: vi.fn(),
      });

      expect(() => appSends('bar_code/scan_result', { rawValue: '1', format: 'ean_13' })).toThrow(
        'boom',
      );
      expect(panelDetected).toHaveBeenCalledWith('1');
      expect(haReceive).toHaveBeenCalledOnce();
    });
  });
});

describe('scanSupport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is live when navigator.mediaDevices.getUserMedia is a function', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      writable: true,
      configurable: true,
    });
    expect(scanSupport()).toBe('live');
  });

  it('is photo only when navigator.mediaDevices is undefined', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(scanSupport()).toBe('photo');
  });

  it('is insecure on a page that is not a secure context (HTTP), whatever the camera API says', () => {
    vi.stubGlobal('isSecureContext', false);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      writable: true,
      configurable: true,
    });
    expect(scanSupport()).toBe('insecure');
  });
});

describe('chooseBarcodePhoto', () => {
  let detect: Mock<() => Promise<Array<{ rawValue: string }>>>;
  let click: MockInstance<() => void>;

  const fileInputs = (): HTMLInputElement[] => [
    ...document.body.querySelectorAll<HTMLInputElement>('input[type="file"]'),
  ];

  /** Chooses `files` in the input, as the browser does after the user picked. */
  function choose(input: HTMLInputElement | undefined, files: File[]): void {
    if (!input) throw new Error('no photo input');
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  beforeEach(() => {
    detect = vi.fn(async () => [{ rawValue: '4006381333931' }]);
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ close: vi.fn() })),
    );
    vi.stubGlobal(
      'BarcodeDetector',
      vi.fn(function () {
        return { detect };
      }),
    );
    click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    fileInputs().forEach((input) => input.remove());
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens an off-screen photo input that lets phones take a photo or pick one', () => {
    void chooseBarcodePhoto(vi.fn());

    const [input] = fileInputs();
    expect(input?.accept).toBe('image/*');
    // No `capture`: it would skip the photo library and open the camera only.
    expect(input?.hasAttribute('capture')).toBe(false);
    // Off-screen, not display:none: iOS WKWebView may not fire change on a hidden input.
    expect(input?.style.position).toBe('fixed');
    expect(input?.style.display).not.toBe('none');
    expect(click).toHaveBeenCalledOnce();
  });

  it('decodes the chosen photo into onDetected and removes the input', async () => {
    const onDetected = vi.fn();
    const chosen = chooseBarcodePhoto(onDetected);

    choose(fileInputs()[0], [new File(['x'], 'photo.jpg', { type: 'image/jpeg' })]);

    expect(await chosen).toBeNull();
    expect(onDetected).toHaveBeenCalledWith('4006381333931');
    expect(fileInputs()).toHaveLength(0);
  });

  it('resolves not_found for a photo without a barcode', async () => {
    detect.mockResolvedValue([]);
    const onDetected = vi.fn();
    const chosen = chooseBarcodePhoto(onDetected);

    choose(fileInputs()[0], [new File(['x'], 'photo.jpg')]);

    expect(await chosen).toBe('not_found');
    expect(onDetected).not.toHaveBeenCalled();
  });

  it('resolves null without decoding when nothing was chosen', async () => {
    const chosen = chooseBarcodePhoto(vi.fn());

    choose(fileInputs()[0], []);

    expect(await chosen).toBeNull();
    expect(detect).not.toHaveBeenCalled();
    expect(fileInputs()).toHaveLength(0);
  });

  it('resolves null and removes the input when the picker is cancelled', async () => {
    const chosen = chooseBarcodePhoto(vi.fn());

    fileInputs()[0]?.dispatchEvent(new Event('cancel'));

    expect(await chosen).toBeNull();
    expect(fileInputs()).toHaveLength(0);
  });

  it('a newer choice replaces one still open', async () => {
    const older = chooseBarcodePhoto(vi.fn());
    void chooseBarcodePhoto(vi.fn());

    expect(await older).toBeNull();
    expect(fileInputs()).toHaveLength(1);
  });
});

describe('decodeFromFile', () => {
  let mockFileReader: {
    readAsDataURL: ReturnType<typeof vi.fn>;
    onload: ((e: any) => void) | null;
    onerror: (() => void) | null;
  };

  beforeEach(() => {
    mockFileReader = {
      readAsDataURL: vi.fn(),
      onload: null,
      onerror: null,
    };
    vi.stubGlobal('FileReader', function () {
      return mockFileReader;
    });
    // Mock Image so resizeToDataUrl resolves without a real browser
    vi.stubGlobal(
      'Image',
      vi.fn().mockImplementation(function () {
        const imgMock: any = {
          naturalWidth: 100,
          naturalHeight: 100,
          onload: null as (() => void) | null,
          onerror: null as (() => void) | null,
        };
        Object.defineProperty(imgMock, 'src', {
          set(_: string) {
            // Fire onload asynchronously (after img.onload is assigned)
            Promise.resolve().then(() => imgMock.onload?.());
          },
          get() {
            return '';
          },
        });
        return imgMock;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls onDetected and resolves null for a successful high-confidence decode', async () => {
    mockDecodeSingle.mockImplementation((_config: any, cb: any) => {
      cb({
        codeResult: {
          code: '1234567890128',
          decodedCodes: [{ error: 0.01 }, { error: 0.02 }],
        },
      });
      return Promise.resolve({} as any);
    });

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    const onDetected = vi.fn();
    const resultPromise = decodeFromFile(file, onDetected);

    must(mockFileReader.onload)({ target: { result: 'data:image/jpeg;base64,abc' } });

    const result = await resultPromise;
    expect(result).toBeNull();
    expect(onDetected).toHaveBeenCalledWith('1234567890128');
  });

  it('resolves not_found when decodeSingle returns no result', async () => {
    mockDecodeSingle.mockImplementation((_config: any, cb: any) => {
      cb(null);
      return Promise.resolve({} as any);
    });

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    const onDetected = vi.fn();
    const resultPromise = decodeFromFile(file, onDetected);

    must(mockFileReader.onload)({ target: { result: 'data:image/jpeg;base64,abc' } });

    const result = await resultPromise;
    expect(result).toBe('not_found');
    expect(onDetected).not.toHaveBeenCalled();
  });

  it('resolves not_found when confidence is too low (avgError >= 0.2)', async () => {
    mockDecodeSingle.mockImplementation((_config: any, cb: any) => {
      cb({
        codeResult: {
          code: '1234567890128',
          decodedCodes: [{ error: 0.5 }, { error: 0.6 }],
        },
      });
      return Promise.resolve({} as any);
    });

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    const onDetected = vi.fn();
    const resultPromise = decodeFromFile(file, onDetected);

    must(mockFileReader.onload)({ target: { result: 'data:image/jpeg;base64,abc' } });

    const result = await resultPromise;
    expect(result).toBe('not_found');
    expect(onDetected).not.toHaveBeenCalled();
  });

  it('resolves not_found when decodeSingle throws inside onload', async () => {
    mockDecodeSingle.mockImplementation(() => {
      throw new Error('Quagga internal error');
    });

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    const onDetected = vi.fn();
    const resultPromise = decodeFromFile(file, onDetected);

    must(mockFileReader.onload)({ target: { result: 'data:image/jpeg;base64,abc' } });

    const result = await resultPromise;
    expect(result).toBe('not_found');
    expect(onDetected).not.toHaveBeenCalled();
  });

  it('resolves not_found on FileReader error', async () => {
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    const onDetected = vi.fn();
    const resultPromise = decodeFromFile(file, onDetected);

    must(mockFileReader.onerror)();

    const result = await resultPromise;
    expect(result).toBe('not_found');
    expect(onDetected).not.toHaveBeenCalled();
  });

  describe('BarcodeDetector path', () => {
    let mockDetect: ReturnType<typeof vi.fn>;
    let mockBitmap: { close: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockBitmap = { close: vi.fn() };
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));
      mockDetect = vi.fn();
      vi.stubGlobal(
        'BarcodeDetector',
        vi.fn().mockImplementation(function () {
          return { detect: mockDetect };
        }),
      );
    });

    it('calls onDetected and resolves null when barcode found', async () => {
      mockDetect.mockResolvedValue([{ rawValue: '1234567890128' }]);

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const onDetected = vi.fn();
      const result = await decodeFromFile(file, onDetected);

      expect(result).toBeNull();
      expect(onDetected).toHaveBeenCalledWith('1234567890128');
      expect(mockBitmap.close).toHaveBeenCalled();
    });

    it('resolves not_found when no barcodes detected', async () => {
      mockDetect.mockResolvedValue([]);

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const result = await decodeFromFile(file, vi.fn());

      expect(result).toBe('not_found');
      expect(mockBitmap.close).toHaveBeenCalled();
    });

    it('falls through to Quagga when BarcodeDetector throws', async () => {
      mockDetect.mockRejectedValue(new Error('detection failed'));
      mockDecodeSingle.mockImplementation((_config: any, cb: any) => {
        cb({
          codeResult: {
            code: '1234567890128',
            decodedCodes: [{ error: 0.01 }],
          },
        });
        return Promise.resolve({} as any);
      });

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const onDetected = vi.fn();
      const resultPromise = decodeFromFile(file, onDetected);

      // Flush: createImageBitmap resolve, then detect rejection + catch block
      await Promise.resolve();
      await Promise.resolve();

      // Quagga fallback is now active — trigger FileReader.onload
      must(mockFileReader.onload)({ target: { result: 'data:image/jpeg;base64,abc' } });

      const result = await resultPromise;
      expect(result).toBeNull();
      expect(onDetected).toHaveBeenCalledWith('1234567890128');
    });
  });
});
