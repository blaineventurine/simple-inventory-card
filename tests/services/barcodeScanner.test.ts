import { describe, it, expect, vi, beforeEach } from 'vitest';
import Quagga from '@ericblade/quagga2';
import { startScanner, stopScanner, isScannerActive } from '../../src/services/barcodeScanner';

// quagga2 is globally mocked in tests/setup.ts
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
