import Quagga from '@ericblade/quagga2';
import type { ExternalMessaging } from '@/types/externalBus';
import type { HomeAssistant } from '@/types/homeAssistant';

/** Why the live camera did not start. */
export type CameraError = 'permission_denied' | 'not_available';
/** A photo was decoded but had no (readable) barcode. */
export type DecodeError = 'not_found';
/**
 * How a barcode can be read here: the live camera, only a photo (no camera API), or a photo
 * because the page is not a secure context (browsers expose the camera on HTTPS only).
 */
export type ScanSupport = 'live' | 'photo' | 'insecure';

let active = false;
/** Bumped by every start and stop: a start that finishes after a newer one or a stop is dropped. */
let session = 0;
/**
 * The latest start, settled once its camera is running or released. quagga2 keeps one stream:
 * a start opens its camera only after the previous start settled, so none is orphaned.
 */
let starting: Promise<unknown> = Promise.resolve();

export function isScannerActive(): boolean {
  return active;
}

export function startScanner(
  targetElement: HTMLElement,
  onDetected: (code: string) => void,
): Promise<CameraError | null> {
  // Always stop any lingering session first so the camera is released
  // before we request it again. This prevents Firefox/iOS from failing
  // when the previous MediaStream was not properly torn down.
  if (active) {
    Quagga.stop();
    Quagga.offDetected();
    active = false;
  }

  const mine = ++session;
  const result = starting.then(() =>
    // Stopped or superseded while waiting: do not open the camera at all.
    mine === session ? openCamera(targetElement, onDetected, mine) : null,
  );
  starting = result.catch(() => undefined);
  return result;
}

function openCamera(
  targetElement: HTMLElement,
  onDetected: (code: string) => void,
  mine: number,
): Promise<CameraError | null> {
  // Clear any leftover video elements from a previous session
  targetElement.innerHTML = '';

  return new Promise((resolve) => {
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: targetElement,
          constraints: {
            facingMode: 'environment',
            // `ideal` never fails: a camera without 1080p picks its closest mode.
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader'],
        },
        locate: true,
        frequency: 10,
      },
      (err: Error | null) => {
        if (err) {
          const message = err.message || '';
          if (
            message.includes('Permission') ||
            message.includes('permission') ||
            message.includes('NotAllowedError')
          ) {
            resolve('permission_denied');
          } else {
            resolve('not_available');
          }
          return;
        }

        // Stopped or superseded while the camera was opening (e.g. the card was detached):
        // release it before the next start opens one.
        if (mine !== session) {
          Quagga.stop();
          resolve(null);
          return;
        }

        // Register the detection handler *after* successful init,
        // so we never accumulate stale listeners from previous calls.
        Quagga.offDetected();
        Quagga.onDetected((result) => {
          const codeResult = result?.codeResult;
          if (!codeResult?.code) return;

          const errors = codeResult.decodedCodes
            ?.filter((d) => typeof d.error === 'number')
            .map((d) => d.error as number);

          if (errors && errors.length > 0) {
            const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
            if (avgError >= 0.2) return;
          }

          onDetected(codeResult.code);
        });

        Quagga.start();
        active = true;
        resolve(null);
      },
    );
  });
}

export function stopScanner(): void {
  session += 1;
  if (active) {
    Quagga.stop();
    Quagga.offDetected();
    active = false;
  }
  endNativeScan(true);
}

/** The texts of the companion app's scanner screen. */
export interface NativeScanTexts {
  title: string;
  description: string;
  /** The app scanner's alternative button: "Choose a photo". */
  alternativeOptionLabel: string;
}

/** Who gets the companion app scanner's answer; the scan is over when one is called. */
export interface NativeScanHandlers {
  /** A barcode was read (any format, QR codes included). */
  onDetected(code: string): void;
  /** The user picked the alternative button: offer the photo chooser. */
  onChoosePhoto(): void;
  /** The user closed the app's scanner. */
  onCancel?(): void;
  /** The scan ended, whichever way: an answer above, a stop or a newer scan. */
  onEnd?(): void;
}

/** The open scan in the companion app's scanner. */
let nativeScan: { external: ExternalMessaging; handlers: NativeScanHandlers } | undefined;

/** A listener of the shared `window.externalBus` wrapper: one per copy of this module. */
type BusListener = (message: unknown) => void;

/**
 * The `window.externalBus` wrapper installed by whichever copy of this module (the card's or the
 * panel's bundle) came first; the other copies add their listener to its set.
 */
interface SharedExternalBus {
  (message: unknown): void;
  __simpleInventoryListeners: Set<BusListener>;
}

function isSharedExternalBus(bus: unknown): bus is SharedExternalBus {
  return (
    typeof bus === 'function' &&
    '__simpleInventoryListeners' in bus &&
    bus.__simpleInventoryListeners instanceof Set
  );
}

function isExternalMessaging(value: unknown): value is ExternalMessaging {
  return (
    typeof value === 'object' &&
    value !== null &&
    'fireMessage' in value &&
    typeof value.fireMessage === 'function'
  );
}

/** The app scanner's answer in `message`; undefined when it is not one (any other message). */
function nativeAnswer(
  message: unknown,
): { kind: 'detected'; code: string } | { kind: 'canceled' | 'alternative' } | undefined {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('type' in message) ||
    message.type !== 'command' ||
    !('command' in message)
  ) {
    return undefined;
  }
  const payload: object =
    'payload' in message && typeof message.payload === 'object' && message.payload !== null
      ? message.payload
      : {};
  switch (message.command) {
    case 'bar_code/scan_result':
      return 'rawValue' in payload && typeof payload.rawValue === 'string'
        ? { kind: 'detected', code: payload.rawValue }
        : undefined;
    case 'bar_code/aborted':
      // Like HA's ha-qr-scanner: any reason but `canceled` is the alternative option.
      return 'reason' in payload && payload.reason === 'canceled'
        ? { kind: 'canceled' }
        : { kind: 'alternative' };
    default:
      return undefined;
  }
}

/**
 * The companion app's messaging when the app has a barcode scanner (HA fetched its config at
 * startup) and can answer through `window.externalBus`; undefined elsewhere.
 */
export function nativeScanner(hass: HomeAssistant | undefined): ExternalMessaging | undefined {
  const external = hass?.auth?.external;
  return isExternalMessaging(external) &&
    !!external.config?.hasBarCodeScanner &&
    typeof window.externalBus === 'function'
    ? external
    : undefined;
}

/**
 * Opens the companion app's scanner; its answer goes to `handlers`. A newer scan replaces one
 * still open, and `stopScanner` closes it.
 */
export function startNativeScanner(
  external: ExternalMessaging,
  texts: NativeScanTexts,
  handlers: NativeScanHandlers,
): void {
  endNativeScan(false);
  observeExternalBus();
  nativeScan = { external, handlers };
  external.fireMessage({
    type: 'bar_code/scan',
    payload: {
      title: texts.title,
      description: texts.description,
      alternative_option_label: texts.alternativeOptionLabel,
    },
  });
}

/** Ends the open native scan, if any; `close` closes the app's scanner too. */
function endNativeScan(close: boolean): void {
  const scan = nativeScan;
  if (!scan) return;
  nativeScan = undefined;
  if (close) scan.external.fireMessage({ type: 'bar_code/close' });
  scan.handlers.onEnd?.();
}

/**
 * Watches the app's answers through one wrapper of `window.externalBus` (HA's
 * `ExternalMessaging.receiveMessage`) per page, shared by every copy of this module: every
 * message goes to each copy's listener, then to HA once and unchanged; HA forwards it to its
 * own listeners and answers the app. A copy wraps only when the bus is not the shared wrapper
 * (first use, or HA replaced it).
 */
function observeExternalBus(): void {
  const bus = window.externalBus;
  if (!bus) return;
  if (isSharedExternalBus(bus)) {
    bus.__simpleInventoryListeners.add(answerNativeScan);
    return;
  }
  const listeners = new Set<BusListener>([answerNativeScan]);
  window.externalBus = Object.assign(
    (message: unknown): void => {
      // A failing listener keeps neither the other copies nor HA from the message.
      const failures: unknown[] = [];
      for (const listener of listeners) {
        try {
          listener(message);
        } catch (error) {
          failures.push(error);
        }
      }
      bus(message);
      if (failures.length > 0) throw failures[0];
    },
    { __simpleInventoryListeners: listeners },
  );
}

/** Hands the app scanner's answer to this copy's open scan; anything else is HA's alone. */
function answerNativeScan(message: unknown): void {
  const scan = nativeScan;
  const answer = scan && nativeAnswer(message);
  if (!scan || !answer) return;
  nativeScan = undefined;
  try {
    if (answer.kind === 'detected') {
      scan.handlers.onDetected(answer.code);
    } else if (answer.kind === 'alternative') {
      scan.handlers.onChoosePhoto();
    } else {
      scan.handlers.onCancel?.();
    }
  } finally {
    // The app's scanner stays open after a result until closed (HA's ha-qr-scanner closes it too).
    if (answer.kind === 'detected') {
      scan.external.fireMessage({ type: 'bar_code/close' });
    }
    scan.handlers.onEnd?.();
  }
}

export function scanSupport(): ScanSupport {
  if (window.isSecureContext === false) {
    return 'insecure';
  }
  return typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
    ? 'live'
    : 'photo';
}

/** The photo input still waiting for a choice; settling it removes it and resolves null. */
let pendingPhoto: (() => void) | undefined;

/**
 * Opens the photo picker (phones offer the camera or the photo library) and decodes the chosen
 * photo into `onDetected`. Resolves null once decoded or when nothing was chosen, `not_found`
 * for a photo without a barcode. A newer choice replaces one still open.
 */
export function chooseBarcodePhoto(
  onDetected: (code: string) => void,
): Promise<DecodeError | null> {
  pendingPhoto?.();
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // Off-screen instead of display:none: iOS WKWebView may not fire change on a hidden input.
    Object.assign(input.style, {
      position: 'fixed',
      top: '-9999px',
      left: '-9999px',
      width: '0',
      height: '0',
      opacity: '0',
    });
    const settle = (result: Promise<DecodeError | null> | null): void => {
      input.remove();
      if (pendingPhoto === cancel) pendingPhoto = undefined;
      resolve(result);
    };
    // Its identity marks this input as the pending one.
    const cancel = (): void => settle(null);
    pendingPhoto = cancel;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      settle(file ? decodeFromFile(file, onDetected) : null);
    });
    input.addEventListener('cancel', cancel);
    document.body.appendChild(input);
    input.click();
  });
}

function resizeToDataUrl(src: string, maxDimension: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.naturalWidth, img.naturalHeight);
      if (longest <= maxDimension) {
        resolve(src);
        return;
      }
      const scale = maxDimension / longest;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export async function decodeFromFile(
  file: File,
  onDetected: (code: string) => void,
): Promise<DecodeError | null> {
  // Use the native BarcodeDetector API when available
  if ('BarcodeDetector' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      });
      const bitmap = await createImageBitmap(file);
      const barcodes: Array<{ rawValue: string }> = await detector.detect(bitmap);

      bitmap.close();

      if (barcodes.length > 0) {
        onDetected(barcodes[0].rawValue);
        return null;
      }
      return 'not_found';
    } catch (err) {
      console.warn('BarcodeDetector: error, falling through to Quagga', err);
    }
  }

  // Quagga fallback: resize the image first so decodeSingle gets a manageable size
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawSrc = e.target?.result as string;
      resizeToDataUrl(rawSrc, 1280)
        .then((src) => {
          try {
            Quagga.decodeSingle(
              {
                src,
                numOfWorkers: 0,
                decoder: {
                  readers: [
                    'ean_reader',
                    'ean_8_reader',
                    'upc_reader',
                    'upc_e_reader',
                    'code_128_reader',
                  ],
                },
                locate: true,
              },
              (result) => {
                if (!result?.codeResult?.code) {
                  resolve('not_found');
                  return;
                }
                const errors = result.codeResult.decodedCodes
                  ?.filter((d) => typeof d.error === 'number')
                  .map((d) => d.error as number);
                if (errors && errors.length > 0) {
                  const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
                  if (avgError >= 0.2) {
                    resolve('not_found');
                    return;
                  }
                }
                onDetected(result.codeResult.code);
                resolve(null);
              },
            );
          } catch {
            resolve('not_found');
          }
        })
        .catch(() => {
          resolve('not_found');
        });
    };
    reader.onerror = () => {
      resolve('not_found');
    };
    reader.readAsDataURL(file);
  });
}
