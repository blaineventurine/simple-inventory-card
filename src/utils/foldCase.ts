/**
 * `text` with its case folded like the integration's Python `str.casefold()`, so the card agrees
 * with the integration on what is the same name and what a search finds. Use it for every
 * case-insensitive comparison of item text (names, aliases, search).
 *
 * Upper- then lower-casing does most of it ("ß" and "SS" give "ss", "ﬁ" gives "fi"); casefold
 * differs from that on three letters, handled here: capital ẞ folds to "ss" too, dotless "ı"
 * stays apart from "i", and every sigma folds to "σ" (lower-casing turns a word-final one into
 * "ς", which would keep a search ending in sigma from matching the rest of the word). This
 * matches `casefold()` on every code point except Cherokee, which casefold folds to upper case
 * (equality still agrees).
 */
export function foldCase(text: string): string {
  return text
    .replaceAll('ẞ', 'ß')
    .split('ı')
    .map((run) => run.toUpperCase().toLowerCase())
    .join('ı')
    .replaceAll('ς', 'σ');
}
