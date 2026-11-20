import type { TranslationData } from '@/types/translatableComponent';
import type { NativeScanTexts } from './barcodeScanner';
import { TranslationManager } from './translationManager';

/** The translation key and English fallback of each scanner text the entry points share. */
const TEXTS = {
  permission_denied: ['modal.camera_permission_denied', 'Camera access denied'],
  not_available: ['modal.camera_not_available', 'Camera not available'],
  insecure: [
    'scanner.insecure_connection',
    'The camera needs a secure (HTTPS) connection to Home Assistant',
  ],
  choose_photo: ['scanner.choose_photo', 'Choose a photo'],
  no_barcode: ['scanner.no_barcode_found', 'No barcode found in photo'],
  native_title: ['scanner.native_title', 'Scan barcode'],
  native_description: ['scanner.native_description', "Point the camera at the item's barcode"],
} as const satisfies Record<string, readonly [string, string]>;

/** A scanner text in the user's language: a camera problem, the photo button or no barcode. */
export function scannerText(translations: TranslationData, text: keyof typeof TEXTS): string {
  const [key, fallback] = TEXTS[text];
  return TranslationManager.localize(translations, key, undefined, fallback);
}

/** The companion app scanner's screen in the user's language, "Choose a photo" its alternative. */
export function nativeScanTexts(translations: TranslationData): NativeScanTexts {
  return {
    title: scannerText(translations, 'native_title'),
    description: scannerText(translations, 'native_description'),
    alternativeOptionLabel: scannerText(translations, 'choose_photo'),
  };
}
