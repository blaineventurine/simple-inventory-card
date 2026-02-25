import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Quagga from '@ericblade/quagga2';
import {
  startScanner,
  stopScanner,
  isScannerActive,
  isLiveScanAvailable,
  decodeFromFile,
} from '../../src/services/barcodeScanner';

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

    detectedHandler!({
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

    detectedHandler!({
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

describe('isLiveScanAvailable', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when navigator.mediaDevices.getUserMedia is a function', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      writable: true,
      configurable: true,
    });
    expect(isLiveScanAvailable()).toBe(true);
  });

  it('returns false when navigator.mediaDevices is undefined', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(isLiveScanAvailable()).toBe(false);
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

    mockFileReader.onload!({ target: { result: 'data:image/jpeg;base64,abc' } });

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

    mockFileReader.onload!({ target: { result: 'data:image/jpeg;base64,abc' } });

    const result = await resultPromise;
    expect(result).toBe('not_found');
    expect(onDetected).not.toHaveBeenCalled();
  });

  it('resolves not_found when confidence is too low (avgError >= 0.1)', async () => {
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

    mockFileReader.onload!({ target: { result: 'data:image/jpeg;base64,abc' } });

    const result = await resultPromise;
    expect(result).toBe('not_found');
    expect(onDetected).not.toHaveBeenCalled();
  });

  it('resolves not_found on FileReader error', async () => {
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    const onDetected = vi.fn();
    const resultPromise = decodeFromFile(file, onDetected);

    mockFileReader.onerror!();

    const result = await resultPromise;
    expect(result).toBe('not_found');
    expect(onDetected).not.toHaveBeenCalled();
  });
});
