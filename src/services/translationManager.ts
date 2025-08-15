import { TranslationData } from '@/types/translatableComponent';

export class TranslationManager {
  private static _cache: Map<string, TranslationData> = new Map();
  private static _loadingPromises: Map<string, Promise<TranslationData>> = new Map();
  private static _cardName = 'simple-inventory-card';

  static async loadTranslations(language: string): Promise<TranslationData> {
    const cacheKey = `${this._cardName}-${language}`;

    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey)!;
    }

    if (this._loadingPromises.has(cacheKey)) {
      return this._loadingPromises.get(cacheKey)!;
    }

    const loadingPromise = this._loadTranslationsInternal(language);
    this._loadingPromises.set(cacheKey, loadingPromise);

    try {
      const translations = await loadingPromise;
      this._cache.set(cacheKey, translations);
      return translations;
    } finally {
      this._loadingPromises.delete(cacheKey);
    }
  }

  private static async _loadTranslationsInternal(language: string): Promise<TranslationData> {
    const urls = [
      `/local/community/${this._cardName}/translations/${language}.json`,
      `/hacsfiles/${this._cardName}/translations/${language}.json`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const translations = await response.json();
          return translations;
        } else {
          console.error('❌ Failed to load from', url, 'Status:', response.status);
        }
      } catch (error) {
        console.debug(`Failed to load translations from ${url}:`, error);
      }
    }

    if (language !== 'en') {
      return this.loadTranslations('en');
    }

    return {};
  }

  static localize(
    translations: TranslationData,
    key: string,
    params?: Record<string, any>,
    fallback?: string,
  ): string {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }

    let result = typeof value === 'string' ? value : fallback || key;

    if (params) {
      Object.entries(params).forEach(([param, val]) => {
        result = result.replace(new RegExp(`{${param}}`, 'g'), String(val));
      });
    }

    return result;
  }
}
