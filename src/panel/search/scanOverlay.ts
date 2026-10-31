import { TranslationData } from '@/types/translatableComponent';
import type { HomeAssistant } from '@/types/homeAssistant';
import { TranslationManager } from '@/services/translationManager';
import {
  chooseBarcodePhoto,
  nativeScanner,
  scanSupport,
  startNativeScanner,
  startScanner,
  stopScanner,
} from '@/services/barcodeScanner';
import { nativeScanTexts, scannerText } from '@/services/scannerText';
import { button, iconButton } from '@/templates/primitives';
import { Utilities } from '@/utils/utilities';

export interface ScanOverlayDeps {
  /** The element the overlay shows in (hidden while closed). */
  host: HTMLElement;
  getTranslations: () => TranslationData;
  /** The panel's current hass, for the companion app's scanner. */
  getHass: () => HomeAssistant | undefined;
  /** A barcode was read (the overlay has closed); the receiver takes the focus. */
  onCode: (code: string) => void;
  /** Where the focus goes when the overlay closes without a code (the scan button). */
  returnFocus: () => HTMLElement | null;
}

function photoButton(label: string): string {
  return button({ kind: 'filled', icon: 'mdi:camera', label, className: 'scan-overlay__file' });
}

/** `body`: the camera (loading text and viewport) or a photo button. */
function overlayTemplate(translations: TranslationData, body: string): string {
  const text = (key: string, fallback: string): string =>
    TranslationManager.localize(translations, key, undefined, fallback);
  return `<div class="scan-overlay__sheet" role="dialog" aria-modal="true" aria-label="${Utilities.sanitizeHtml(text('panel.search.scan_title', 'Scan a barcode'))}">
      <div class="scan-overlay__header">
        <h2 class="scan-overlay__title">${Utilities.sanitizeHtml(text('panel.search.scan_title', 'Scan a barcode'))}</h2>
        ${iconButton({ icon: 'mdi:close', label: text('panel.search.scan_close', 'Close the scanner'), className: 'scan-overlay__close' })}
      </div>
      ${body}
      <p class="scan-overlay__error" hidden></p>
    </div>`;
}

/**
 * The panel's scan-to-find overlay: the live camera (the card's scanner module) or a photo,
 * offered right away without live scanning and after a camera problem (HTTP, denied, none).
 * A read code closes the overlay and goes to `onCode`. The camera stops whenever the overlay
 * closes (✕, a read code, `close`).
 */
export class ScanOverlay {
  private _open = false;
  /** Bumped on every open and close; callbacks of an earlier session are ignored. */
  private session = 0;

  constructor(private readonly deps: ScanOverlayDeps) {
    deps.host.hidden = true;
    deps.host.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('.scan-overlay__close')) {
        this.close();
      } else if (event.target.closest('.scan-overlay__file')) {
        this.pickFile();
      }
    });
  }

  get isOpen(): boolean {
    return this._open;
  }

  open(): void {
    if (this._open) return;
    this._open = true;
    this.session += 1;
    const session = this.session;
    const { host } = this.deps;
    const translations = this.deps.getTranslations();

    const external = nativeScanner(this.deps.getHass());
    if (external) {
      // The app draws its own scanner: the overlay shows only for its "Choose a photo".
      startNativeScanner(external, nativeScanTexts(translations), {
        onDetected: (code) => this.detected(code, session),
        onChoosePhoto: () => {
          if (session !== this.session) return;
          this.show(translations, photoButton(scannerText(translations, 'choose_photo')));
        },
        onCancel: () => {
          if (session === this.session) this.close();
        },
      });
      return;
    }

    const support = scanSupport();
    const body =
      support === 'live'
        ? `<div class="scan-overlay__loading">${Utilities.sanitizeHtml(TranslationManager.localize(translations, 'scanner.starting_camera', undefined, 'Starting camera...'))}</div><div class="scan-overlay__viewport"></div>`
        : photoButton(
            support === 'photo'
              ? TranslationManager.localize(
                  translations,
                  'panel.search.scan_file',
                  undefined,
                  'Take or choose a photo',
                )
              : scannerText(translations, 'choose_photo'),
          );
    this.show(translations, body);
    if (support === 'photo') {
      this.pickFile();
      return;
    }
    if (support === 'insecure') {
      this.showError(scannerText(translations, 'insecure'));
      return;
    }
    const viewport = host.querySelector<HTMLElement>('.scan-overlay__viewport');
    if (!viewport) return;
    void startScanner(viewport, (code) => this.detected(code, session)).then((error) => {
      if (session !== this.session) return;
      host.querySelector('.scan-overlay__loading')?.remove();
      if (error) {
        const texts = this.deps.getTranslations();
        viewport.outerHTML = photoButton(scannerText(texts, 'choose_photo'));
        this.showError(scannerText(texts, error));
      }
    });
  }

  /** Stops the camera, hides the overlay and returns the focus; nothing when it is not open. */
  close(): void {
    if (!this._open) return;
    this.hide();
    this.deps.returnFocus()?.focus();
  }

  /** Shows the overlay with `body`, the focus inside it so Escape reaches the panel's handler. */
  private show(translations: TranslationData, body: string): void {
    const { host } = this.deps;
    host.innerHTML = overlayTemplate(translations, body);
    host.hidden = false;
    host.querySelector<HTMLElement>('.scan-overlay__close')?.focus();
  }

  private hide(): void {
    this._open = false;
    this.session += 1;
    stopScanner();
    this.deps.host.hidden = true;
    this.deps.host.innerHTML = '';
  }

  /** Opens the photo picker; the chosen photo is decoded. */
  private pickFile(): void {
    const session = this.session;
    void chooseBarcodePhoto((code) => this.detected(code, session)).then((error) => {
      if (error && session === this.session) {
        this.showError(scannerText(this.deps.getTranslations(), 'no_barcode'));
      }
    });
  }

  private detected(code: string, session: number): void {
    if (session !== this.session) return;
    this.hide();
    this.deps.onCode(code);
  }

  private showError(message: string): void {
    const error = this.deps.host.querySelector<HTMLElement>('.scan-overlay__error');
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }
}
