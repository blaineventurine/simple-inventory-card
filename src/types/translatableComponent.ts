export interface TranslatableComponent {
  translations: TranslationData;
  localize(key: string, params?: Record<string, unknown>, fallback?: string): string;
}

export interface TranslationData {
  [key: string]: string | TranslationData;
}
