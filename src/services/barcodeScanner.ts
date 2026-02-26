import Quagga from '@ericblade/quagga2';

let active = false;

export function isScannerActive(): boolean {
  return active;
}

export function startScanner(
  targetElement: HTMLElement,
  onDetected: (code: string) => void,
): Promise<string | null> {
  // Always stop any lingering session first so the camera is released
  // before we request it again. This prevents Firefox/iOS from failing
  // when the previous MediaStream was not properly torn down.
  if (active) {
    Quagga.stop();
    Quagga.offDetected();
    active = false;
  }

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
  if (active) {
    Quagga.stop();
    Quagga.offDetected();
    active = false;
  }
}

export function isLiveScanAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
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
): Promise<string | null> {
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
