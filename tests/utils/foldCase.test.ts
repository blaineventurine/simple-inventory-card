import { describe, it, expect } from 'vitest';
import { foldCase } from '../../src/utils/foldCase';

describe('foldCase', () => {
  it('folds case like Python casefold for the common cases', () => {
    expect(foldCase('Straße')).toBe('strasse');
    expect(foldCase('STRASSE')).toBe('strasse');
    expect(foldCase('ﬁle')).toBe('file');
    expect(foldCase('Čokolada')).toBe('čokolada');
  });

  it('keeps accents (matching is not accent-insensitive)', () => {
    expect(foldCase('Crème')).not.toBe(foldCase('Creme'));
  });

  it('folds every sigma to σ, so a prefix ending in sigma still matches', () => {
    expect(foldCase('κοσ')).toBe('κοσ');
    expect(foldCase('ΚΟΣ')).toBe('κοσ');
    expect(foldCase('Κοσμος')).toBe('κοσμοσ');
    expect(foldCase('Κοσμος').includes(foldCase('κοσ'))).toBe(true);
  });

  it('keeps dotless ı apart from i, as casefold does', () => {
    expect(foldCase('Kırmızı')).toBe('kırmızı');
    expect(foldCase('Kırmızı')).not.toBe(foldCase('Kirmizi'));
  });

  it('folds capital ẞ like ß and ss', () => {
    expect(foldCase('ẞ')).toBe('ss');
    expect(foldCase('ẞ')).toBe(foldCase('ß'));
    expect(foldCase('ẞ')).toBe(foldCase('SS'));
  });
});
