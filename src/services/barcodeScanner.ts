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
            if (avgError >= 0.1) return;
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
