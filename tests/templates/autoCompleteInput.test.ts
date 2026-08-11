import { describe, it, expect } from 'vitest';

import { createAutoCompleteInput } from '../../src/templates/autoCompleteInput';

describe('createAutoCompleteInput', () => {
  it('renders the input with the given id, value, and placeholder', () => {
    const html = createAutoCompleteInput({
      id: 'item-name',
      value: 'Apples',
      placeholder: 'Search items…',
      options: [],
    });

    expect(html).toContain('id="item-name"');
    expect(html).toContain('value="Apples"');
    expect(html).toContain('placeholder="Search items…"');
  });

  it('renders the dropdown container with an id derived from the input id', () => {
    const html = createAutoCompleteInput({
      id: 'item-name',
      options: [],
    });

    expect(html).toContain('id="item-name-dropdown"');
    expect(html).toContain('class="autocomplete-dropdown"');
  });

  it('falls back to empty strings when value and placeholder are omitted', () => {
    const html = createAutoCompleteInput({
      id: 'no-extras',
      options: [],
    });

    expect(() => html).not.toThrow();
    expect(html).toContain('value=""');
    expect(html).toContain('placeholder=""');
    expect(html).not.toContain('undefined');
  });
});
