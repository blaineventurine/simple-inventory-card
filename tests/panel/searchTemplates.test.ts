import { describe, it, expect } from 'vitest';
import { searchResults, searchToolbar } from '../../src/panel/search/searchTemplates';
import { SearchResultItem } from '../../src/panel/search/searchClient';
import en from '../../src/translations/en.json';

function rendered(html: string): HTMLElement {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element;
}

function result(overrides: Partial<SearchResultItem>): SearchResultItem {
  return {
    id: 'street',
    name: 'Street map',
    quantity: 1,
    unit: '',
    description: '',
    category: '',
    location: '',
    expiry_date: '',
    todo_list: '',
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    inventory_id: 'k',
    inventory_name: 'Kitchen',
    matched: 'name',
    ...overrides,
  };
}

describe('search templates', () => {
  it('limits the field to the 100 characters the integration accepts', () => {
    const field = rendered(searchToolbar(en, false, '')).querySelector('.search-field');

    expect(field?.getAttribute('maxlength')).toBe('100');
  });

  it('shows a query with replacement patterns literally in the no-results message', () => {
    const html = searchResults(
      en,
      { status: 'ok', query: "a$&b$'c", items: [], truncated: false },
      undefined,
    );

    expect(rendered(html).textContent).toBe('No items match "a$&b$\'c"');
  });

  it('names the alias that matched, folding case as the integration does (ß → ss)', () => {
    const html = searchResults(
      en,
      {
        status: 'ok',
        query: 'strasse',
        items: [result({ matched: 'alias', aliases: ['City plan', 'Hauptstraße'] })],
        truncated: false,
      },
      undefined,
    );

    expect(rendered(html).querySelector('.search-reason')?.textContent).toBe('alias: Hauptstraße');
  });
});
