import { TranslationData } from '@/types/translatableComponent';

import en from '../translations/en.json';
import es from '../translations/es.json';
import fr from '../translations/fr.json';
import it from '../translations/it.json';
import sl from '../translations/sl.json';

const TRANSLATIONS: Record<string, TranslationData> = { en, es, fr, it, sl };

export class TranslationManager {
  static loadTranslations(language: string): Promise<TranslationData> {
    return Promise.resolve(TRANSLATIONS[language] ?? TRANSLATIONS['en'] ?? {});
  }

  static localize(
    translations: TranslationData,
    key: string,
    params?: Record<string, any>,
    fallback?: string,
  ): string {
    const keys = key.split('.');
    let value: unknown = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return fallback ?? key;
      }
    }

    let result = typeof value === 'string' ? value : (fallback ?? key);

    if (params) {
      Object.entries(params).forEach(([param, val]) => {
        result = result.replace(new RegExp(`{${param}}`, 'g'), String(val));
      });
    }

    return result;
  }
}
