import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslationManager } from '../../src/services/translationManager';
import { TranslationData } from '@/types/translatableComponent';

// TranslationManager caches loaded translations and in-flight loading promises
// in private static members with no public reset API. Tests need to clear
// this module-level state between runs, so we reach into it via a narrow,
// explicitly-typed view of the private internals rather than a bare `any`.
type TranslationManagerInternals = {
  _cache: Map<string, TranslationData>;
  _loadingPromises: Map<string, Promise<TranslationData>>;
};
const internals = TranslationManager as unknown as TranslationManagerInternals;

function mockResponse(ok: boolean, json?: unknown, status = 200): Response {
  // Minimal partial Response stub — only `ok`/`status`/`json()` are read by
  // the source under test, so a full Response shape isn't achievable (or
  // necessary) here.
  return {
    ok,
    status,
    json: () => Promise.resolve(json),
  } as unknown as Response;
}

describe('TranslationManager', () => {
  beforeEach(() => {
    internals._cache.clear();
    internals._loadingPromises.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('loadTranslations', () => {
    it('returns translations from the first url when it succeeds', async () => {
      const translations = { modal: { title: 'Title' } };
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(true, translations));
      vi.stubGlobal('fetch', fetchMock);

      const result = await TranslationManager.loadTranslations('en');

      expect(result).toEqual(translations);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/local/community/simple-inventory-card/translations/en.json',
      );
    });

    it('falls through to a later url when earlier urls return non-ok responses', async () => {
      const translations = { modal: { title: 'Title' } };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(mockResponse(false, undefined, 404))
        .mockResolvedValueOnce(mockResponse(false, undefined, 500))
        .mockResolvedValueOnce(mockResponse(true, translations));
      vi.stubGlobal('fetch', fetchMock);

      const result = await TranslationManager.loadTranslations('en');

      expect(result).toEqual(translations);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        '/local/community/simple-inventory-card/translations/en.json',
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/hacsfiles/simple-inventory-card/translations/en.json',
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        '/local/community/simple-inventory-card/en.json',
      );
    });

    it('falls through to a later url when an earlier fetch rejects', async () => {
      const translations = { modal: { title: 'Title' } };
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(mockResponse(true, translations));
      vi.stubGlobal('fetch', fetchMock);

      const result = await TranslationManager.loadTranslations('fr');

      expect(result).toEqual(translations);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        '/local/community/simple-inventory-card/translations/fr.json',
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/hacsfiles/simple-inventory-card/translations/fr.json',
      );
    });

    it('recursively loads english when all four urls fail for a non-english language', async () => {
      const englishTranslations = { modal: { title: 'English Title' } };
      // fr: all 4 urls fail; en: first url succeeds
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValueOnce(mockResponse(false, undefined, 404))
        .mockRejectedValueOnce(new Error('fail 3'))
        .mockResolvedValueOnce(mockResponse(false, undefined, 500))
        .mockResolvedValueOnce(mockResponse(true, englishTranslations));
      vi.stubGlobal('fetch', fetchMock);

      const loadTranslationsSpy = vi.spyOn(TranslationManager, 'loadTranslations');

      const result = await TranslationManager.loadTranslations('fr');

      expect(result).toEqual(englishTranslations);
      // 4 fr attempts + 1 successful en attempt
      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(fetchMock).toHaveBeenNthCalledWith(
        5,
        '/local/community/simple-inventory-card/translations/en.json',
      );
      // the internal recursive call to loadTranslations('en')
      expect(loadTranslationsSpy).toHaveBeenCalledWith('en');
    });

    it('returns an empty object when the language is already english and all urls fail', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(false, undefined, 404));
      vi.stubGlobal('fetch', fetchMock);

      const result = await TranslationManager.loadTranslations('en');

      expect(result).toEqual({});
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('caches the result so a second call does not re-invoke fetch', async () => {
      const translations = { modal: { title: 'Title' } };
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(true, translations));
      vi.stubGlobal('fetch', fetchMock);

      const first = await TranslationManager.loadTranslations('en');
      const second = await TranslationManager.loadTranslations('en');

      expect(first).toEqual(translations);
      expect(second).toEqual(translations);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('de-duplicates concurrent calls for the same language via the in-flight loading promise', async () => {
      const translations = { modal: { title: 'Title' } };
      let resolveFetch: (value: Response) => void = () => {};
      const pending = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
      const fetchMock = vi.fn().mockReturnValue(pending);
      vi.stubGlobal('fetch', fetchMock);

      const p1 = TranslationManager.loadTranslations('en');
      const p2 = TranslationManager.loadTranslations('en');

      // Only the first call should have triggered a fetch so far.
      expect(fetchMock).toHaveBeenCalledTimes(1);

      resolveFetch(mockResponse(true, translations));

      const [result1, result2] = await Promise.all([p1, p2]);

      expect(result1).toEqual(translations);
      expect(result2).toEqual(translations);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('localize', () => {
    const translations: TranslationData = {
      modal: {
        title: 'Add Item',
        aliases: 'Aliases',
        greeting: 'Hello {name}, you have {count} items and {count} pending',
      },
      simple: 'Simple Value',
      nested: {
        deep: {
          value: 'Deep Value',
        },
      },
    };

    it('resolves a nested dot-path key', () => {
      const result = TranslationManager.localize(translations, 'modal.aliases');
      expect(result).toBe('Aliases');
    });

    it('resolves a top-level key', () => {
      const result = TranslationManager.localize(translations, 'simple');
      expect(result).toBe('Simple Value');
    });

    it('resolves a deeply nested key', () => {
      const result = TranslationManager.localize(translations, 'nested.deep.value');
      expect(result).toBe('Deep Value');
    });

    it('returns the fallback when a path segment is missing', () => {
      const result = TranslationManager.localize(
        translations,
        'modal.missingKey',
        undefined,
        'Fallback Text',
      );
      expect(result).toBe('Fallback Text');
    });

    it('returns the raw key when a path segment is missing and no fallback is given', () => {
      const result = TranslationManager.localize(translations, 'modal.missingKey');
      expect(result).toBe('modal.missingKey');
    });

    it('returns the fallback when an intermediate segment does not exist', () => {
      const result = TranslationManager.localize(
        translations,
        'nonexistent.deep.value',
        undefined,
        'Fallback',
      );
      expect(result).toBe('Fallback');
    });

    it('returns the fallback when the resolved value is an object, not a string', () => {
      const result = TranslationManager.localize(translations, 'modal', undefined, 'Fallback');
      expect(result).toBe('Fallback');
    });

    it('returns the raw key when the resolved value is an object and no fallback is given', () => {
      const result = TranslationManager.localize(translations, 'nested');
      expect(result).toBe('nested');
    });

    it('returns the fallback when the resolved value is an array, not a string', () => {
      // Arrays don't structurally satisfy TranslationData; this exercises the
      // `typeof value === 'string'` guard against unexpected runtime shapes.
      const withArray = { list: ['a', 'b'] } as unknown as TranslationData;
      const result = TranslationManager.localize(withArray, 'list', undefined, 'Fallback');
      expect(result).toBe('Fallback');
    });

    it('interpolates a single {param} placeholder', () => {
      const data: TranslationData = { greeting: 'Hello {name}!' };
      const result = TranslationManager.localize(data, 'greeting', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('interpolates multiple different {param} placeholders', () => {
      const result = TranslationManager.localize(translations, 'modal.greeting', {
        name: 'Alice',
        count: 3,
      });
      expect(result).toBe('Hello Alice, you have 3 items and 3 pending');
    });

    it('interpolates the same placeholder appearing multiple times in one string', () => {
      const data: TranslationData = { msg: '{count} of {count} complete' };
      const result = TranslationManager.localize(data, 'msg', { count: 5 });
      expect(result).toBe('5 of 5 complete');
    });

    it('leaves {param} placeholders untouched when no matching key exists in params', () => {
      const data: TranslationData = { msg: 'Hello {name}, {unmatched} stays' };
      const result = TranslationManager.localize(data, 'msg', { name: 'Bob' });
      expect(result).toBe('Hello Bob, {unmatched} stays');
    });

    it('works correctly with no params argument at all', () => {
      const result = TranslationManager.localize(translations, 'modal.title');
      expect(result).toBe('Add Item');
    });

    it('leaves placeholders untouched when params is undefined and string contains one', () => {
      const data: TranslationData = { msg: 'Hello {name}' };
      const result = TranslationManager.localize(data, 'msg');
      expect(result).toBe('Hello {name}');
    });
  });
});
