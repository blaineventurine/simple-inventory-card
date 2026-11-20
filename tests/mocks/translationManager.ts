import { vi } from 'vitest';

/**
 * Module mock for `src/services/translationManager` whose `localize` returns the fallback text
 * (what the real one does for a key missing from the translations). Use it as
 * `vi.mock('<…>/src/services/translationManager', () => import('<…>/mocks/translationManager'));`
 */
export const TranslationManager = {
  loadTranslations: vi.fn(async () => ({})),
  localize: vi.fn(
    (_translations: unknown, _key: string, _params: unknown, fallback: string) => fallback,
  ),
};
