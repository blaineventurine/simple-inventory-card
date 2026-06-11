import { describe, it, expect } from 'vitest';
import { TranslationManager } from '../../src/services/translationManager';
import type { TranslationData } from '../../src/types/translatableComponent';

describe('TranslationManager.loadTranslations', () => {
  it('returns English translations for "en"', async () => {
    const t = await TranslationManager.loadTranslations('en');
    expect(typeof t).toBe('object');
    expect(Object.keys(t).length).toBeGreaterThan(0);
  });

  it('returns distinct data for each supported language', async () => {
    const en = await TranslationManager.loadTranslations('en');
    const es = await TranslationManager.loadTranslations('es');
    const fr = await TranslationManager.loadTranslations('fr');
    const it = await TranslationManager.loadTranslations('it');
    const sl = await TranslationManager.loadTranslations('sl');
    // All five must be objects with keys
    for (const t of [en, es, fr, it, sl]) {
      expect(Object.keys(t).length).toBeGreaterThan(0);
    }
    // Spot-check that they're not all the same object
    expect(en).not.toBe(es);
  });

  it('falls back to English for an unknown language', async () => {
    const en = await TranslationManager.loadTranslations('en');
    const unknown = await TranslationManager.loadTranslations('zz');
    expect(unknown).toEqual(en);
  });
});

describe('TranslationManager.localize', () => {
  const translations = {
    greeting: 'Hello',
    nested: { key: 'Nested value' },
    template: 'Hello, {name}! You have {count} items.',
  };

  it('resolves a top-level key', () => {
    expect(TranslationManager.localize(translations, 'greeting')).toBe('Hello');
  });

  it('resolves a dot-notation nested key', () => {
    expect(TranslationManager.localize(translations, 'nested.key')).toBe('Nested value');
  });

  it('substitutes params into the result', () => {
    expect(
      TranslationManager.localize(translations, 'template', { name: 'Alice', count: '3' }),
    ).toBe('Hello, Alice! You have 3 items.');
  });

  it('returns the fallback when the key is missing', () => {
    expect(TranslationManager.localize(translations, 'missing.key', undefined, 'Fallback')).toBe(
      'Fallback',
    );
  });

  it('returns the key itself when missing and no fallback provided', () => {
    expect(TranslationManager.localize(translations, 'missing.key')).toBe('missing.key');
  });

  it('returns the fallback when the resolved value is not a string', () => {
    const t: TranslationData = { section: { sub: { deep: 'ok' } } };
    expect(TranslationManager.localize(t, 'section', undefined, 'Fallback')).toBe('Fallback');
  });
});
