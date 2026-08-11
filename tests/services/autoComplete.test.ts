import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { initializeAutoComplete } from '../../src/services/autoComplete';

function createMockShadowRoot(id: string, initialValue = ''): ShadowRoot {
  const container = document.createElement('div');

  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.value = initialValue;
  container.appendChild(input);

  const dropdown = document.createElement('div');
  dropdown.id = `${id}-dropdown`;
  container.appendChild(dropdown);

  const shadowRoot = container as unknown as ShadowRoot;
  // ShadowRoot has getElementById — delegate to querySelector on the real container.
  shadowRoot.getElementById = (elId: string) => container.querySelector<HTMLElement>(`#${elId}`);

  return shadowRoot;
}

function getInput(shadowRoot: ShadowRoot, id: string): HTMLInputElement {
  return shadowRoot.getElementById(id) as HTMLInputElement;
}

function getDropdown(shadowRoot: ShadowRoot, id: string): HTMLElement {
  return shadowRoot.getElementById(`${id}-dropdown`) as HTMLElement;
}

describe('autoComplete', () => {
  const options = ['Apple', 'Banana', 'Cherry'];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initializeAutoComplete guard clauses', () => {
    it('returns without throwing when input element is missing', () => {
      const shadowRoot = createMockShadowRoot('missing-input');
      // Remove the input so getElementById(id) returns null.
      const input = getInput(shadowRoot, 'missing-input');
      input.remove();

      expect(() =>
        initializeAutoComplete({
          id: 'missing-input',
          options,
          shadowRoot,
        }),
      ).not.toThrow();
    });

    it('returns without throwing when dropdown element is missing', () => {
      const shadowRoot = createMockShadowRoot('missing-dropdown');
      const dropdown = getDropdown(shadowRoot, 'missing-dropdown');
      dropdown.remove();

      expect(() =>
        initializeAutoComplete({
          id: 'missing-dropdown',
          options,
          shadowRoot,
        }),
      ).not.toThrow();
    });

    it('falls back to document when shadowRoot is not provided', () => {
      const input = document.createElement('input');
      input.id = 'doc-autocomplete';
      document.body.appendChild(input);
      const dropdown = document.createElement('div');
      dropdown.id = 'doc-autocomplete-dropdown';
      document.body.appendChild(dropdown);

      expect(() =>
        initializeAutoComplete({
          id: 'doc-autocomplete',
          options,
        }),
      ).not.toThrow();

      expect(dropdown.style.display).toBe('none');

      document.body.removeChild(input);
      document.body.removeChild(dropdown);
    });
  });

  describe('initial render', () => {
    it('hides the dropdown initially and populates all options', () => {
      const shadowRoot = createMockShadowRoot('init');
      initializeAutoComplete({ id: 'init', options, shadowRoot });

      const dropdown = getDropdown(shadowRoot, 'init');
      expect(dropdown.style.display).toBe('none');
      const rendered = dropdown.querySelectorAll('.autocomplete-option');
      expect(rendered.length).toBe(3);
      expect(dropdown.innerHTML).toContain('Apple');
      expect(dropdown.innerHTML).toContain('Banana');
      expect(dropdown.innerHTML).toContain('Cherry');
    });
  });

  describe('input event (filtering + show)', () => {
    it('filters options case-insensitively by substring and shows the dropdown', () => {
      const shadowRoot = createMockShadowRoot('filter');
      initializeAutoComplete({ id: 'filter', options, shadowRoot });

      const input = getInput(shadowRoot, 'filter');
      const dropdown = getDropdown(shadowRoot, 'filter');

      input.value = 'an';
      input.dispatchEvent(new Event('input'));

      expect(dropdown.style.display).toBe('block');
      const rendered = Array.from(dropdown.querySelectorAll('.autocomplete-option')).map(
        (el) => el.textContent,
      );
      expect(rendered).toEqual(['Banana']);
    });

    it('re-renders live as the query changes further', () => {
      const shadowRoot = createMockShadowRoot('filter2');
      initializeAutoComplete({ id: 'filter2', options, shadowRoot });

      const input = getInput(shadowRoot, 'filter2');
      const dropdown = getDropdown(shadowRoot, 'filter2');

      input.value = 'a';
      input.dispatchEvent(new Event('input'));
      expect(dropdown.querySelectorAll('.autocomplete-option').length).toBe(2); // Apple, Banana contain "a"

      input.value = 'ap';
      input.dispatchEvent(new Event('input'));
      const rendered = Array.from(dropdown.querySelectorAll('.autocomplete-option')).map(
        (el) => el.textContent,
      );
      expect(rendered).toEqual(['Apple']);
    });

    it('does not show the dropdown when no options match', () => {
      const shadowRoot = createMockShadowRoot('nomatch');
      initializeAutoComplete({ id: 'nomatch', options, shadowRoot });

      const input = getInput(shadowRoot, 'nomatch');
      const dropdown = getDropdown(shadowRoot, 'nomatch');

      input.value = 'zzz';
      input.dispatchEvent(new Event('input'));

      expect(dropdown.querySelectorAll('.autocomplete-option').length).toBe(0);
      expect(dropdown.style.display).toBe('none');
    });
  });

  describe('option click-to-select', () => {
    it('calls onSelect with the option value, updates the input, and hides the dropdown', () => {
      const onSelect = vi.fn();
      const shadowRoot = createMockShadowRoot('select');
      initializeAutoComplete({ id: 'select', options, shadowRoot, onSelect });

      const input = getInput(shadowRoot, 'select');
      const dropdown = getDropdown(shadowRoot, 'select');

      // Open the dropdown first via input event so options are rendered & listeners attached.
      input.value = '';
      input.dispatchEvent(new Event('input'));

      const bananaOption = Array.from(dropdown.querySelectorAll('.autocomplete-option')).find(
        (el) => el.textContent === 'Banana',
      ) as HTMLElement;
      expect(bananaOption).toBeTruthy();

      bananaOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(input.value).toBe('Banana');
      expect(onSelect).toHaveBeenCalledWith('Banana');
      expect(dropdown.style.display).toBe('none');
    });

    it('does not throw when onSelect is not provided', () => {
      const shadowRoot = createMockShadowRoot('select-noop');
      initializeAutoComplete({ id: 'select-noop', options, shadowRoot });

      const input = getInput(shadowRoot, 'select-noop');
      const dropdown = getDropdown(shadowRoot, 'select-noop');

      input.dispatchEvent(new Event('input'));
      const option = dropdown.querySelector('.autocomplete-option') as HTMLElement;

      expect(() =>
        option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
      ).not.toThrow();
    });
  });

  describe('click-to-toggle on input', () => {
    it('opens the dropdown on click when closed', () => {
      const shadowRoot = createMockShadowRoot('toggle');
      initializeAutoComplete({ id: 'toggle', options, shadowRoot });

      const input = getInput(shadowRoot, 'toggle');
      const dropdown = getDropdown(shadowRoot, 'toggle');

      expect(dropdown.style.display).toBe('none');
      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(dropdown.style.display).toBe('block');
    });

    it('closes the dropdown on click when open', () => {
      const shadowRoot = createMockShadowRoot('toggle2');
      initializeAutoComplete({ id: 'toggle2', options, shadowRoot });

      const input = getInput(shadowRoot, 'toggle2');
      const dropdown = getDropdown(shadowRoot, 'toggle2');

      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(dropdown.style.display).toBe('block');

      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(dropdown.style.display).toBe('none');
    });
  });

  describe('blur behavior', () => {
    it('hides the dropdown 100ms after blur when the mouse is not in the dropdown', () => {
      const shadowRoot = createMockShadowRoot('blur');
      initializeAutoComplete({ id: 'blur', options, shadowRoot });

      const input = getInput(shadowRoot, 'blur');
      const dropdown = getDropdown(shadowRoot, 'blur');

      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(dropdown.style.display).toBe('block');

      input.dispatchEvent(new Event('blur'));
      // Not yet hidden before the timeout elapses.
      expect(dropdown.style.display).toBe('block');

      vi.advanceTimersByTime(100);
      expect(dropdown.style.display).toBe('none');
    });

    it('does not hide the dropdown after blur while the mouse is inside the dropdown', () => {
      const shadowRoot = createMockShadowRoot('blur-hover');
      initializeAutoComplete({ id: 'blur-hover', options, shadowRoot });

      const input = getInput(shadowRoot, 'blur-hover');
      const dropdown = getDropdown(shadowRoot, 'blur-hover');

      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(dropdown.style.display).toBe('block');

      dropdown.dispatchEvent(new MouseEvent('mouseenter'));
      input.dispatchEvent(new Event('blur'));
      vi.advanceTimersByTime(100);

      expect(dropdown.style.display).toBe('block');
    });

    it('hides the dropdown after blur once the mouse has left the dropdown', () => {
      const shadowRoot = createMockShadowRoot('blur-leave');
      initializeAutoComplete({ id: 'blur-leave', options, shadowRoot });

      const input = getInput(shadowRoot, 'blur-leave');
      const dropdown = getDropdown(shadowRoot, 'blur-leave');

      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      dropdown.dispatchEvent(new MouseEvent('mouseenter'));
      dropdown.dispatchEvent(new MouseEvent('mouseleave'));
      input.dispatchEvent(new Event('blur'));
      vi.advanceTimersByTime(100);

      expect(dropdown.style.display).toBe('none');
    });
  });

  describe('keyboard navigation', () => {
    function selectedOptions(dropdown: HTMLElement): string[] {
      return Array.from(dropdown.querySelectorAll('.autocomplete-option.selected')).map(
        (el) => el.textContent || '',
      );
    }

    it('opens the dropdown from a closed state on ArrowDown', () => {
      const shadowRoot = createMockShadowRoot('kbd-open-down');
      initializeAutoComplete({ id: 'kbd-open-down', options, shadowRoot });

      const input = getInput(shadowRoot, 'kbd-open-down');
      const dropdown = getDropdown(shadowRoot, 'kbd-open-down');

      expect(dropdown.style.display).toBe('none');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(dropdown.style.display).toBe('block');
    });

    it('opens the dropdown from a closed state on ArrowUp', () => {
      const shadowRoot = createMockShadowRoot('kbd-open-up');
      initializeAutoComplete({ id: 'kbd-open-up', options, shadowRoot });

      const input = getInput(shadowRoot, 'kbd-open-up');
      const dropdown = getDropdown(shadowRoot, 'kbd-open-up');

      expect(dropdown.style.display).toBe('none');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(dropdown.style.display).toBe('block');
    });

    it('does nothing on ArrowDown/ArrowUp/Enter when open but no options are filtered', () => {
      const shadowRoot = createMockShadowRoot('kbd-empty');
      initializeAutoComplete({ id: 'kbd-empty', options, shadowRoot, onSelect: vi.fn() });

      const input = getInput(shadowRoot, 'kbd-empty');
      const dropdown = getDropdown(shadowRoot, 'kbd-empty');

      input.value = 'zzz';
      input.dispatchEvent(new Event('input'));
      // Force dropdown open even though there are no matches, to exercise the
      // `filteredOptions.length === 0` guard directly.
      dropdown.style.display = 'block';

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(selectedOptions(dropdown)).toEqual([]);
    });

    it('moves the selection down with ArrowDown, clamped to the last option, toggling .selected', () => {
      const shadowRoot = createMockShadowRoot('kbd-down');
      initializeAutoComplete({ id: 'kbd-down', options, shadowRoot });

      const input = getInput(shadowRoot, 'kbd-down');
      const dropdown = getDropdown(shadowRoot, 'kbd-down');

      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); // open, all 3 options

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(selectedOptions(dropdown)).toEqual(['Apple']);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(selectedOptions(dropdown)).toEqual(['Banana']);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(selectedOptions(dropdown)).toEqual(['Cherry']);

      // Clamped at the last option — no further movement or extra selection.
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(selectedOptions(dropdown)).toEqual(['Cherry']);
    });

    it('moves the selection up with ArrowUp, clamped to -1 (none selected)', () => {
      const shadowRoot = createMockShadowRoot('kbd-up');
      initializeAutoComplete({ id: 'kbd-up', options, shadowRoot });

      const input = getInput(shadowRoot, 'kbd-up');
      const dropdown = getDropdown(shadowRoot, 'kbd-up');

      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); // open
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(selectedOptions(dropdown)).toEqual(['Banana']);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(selectedOptions(dropdown)).toEqual(['Apple']);

      // Clamped at -1 — nothing selected, and stays there on repeat.
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(selectedOptions(dropdown)).toEqual([]);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(selectedOptions(dropdown)).toEqual([]);
    });

    it('selects the highlighted option on Enter, calls onSelect, and hides the dropdown', () => {
      const onSelect = vi.fn();
      const shadowRoot = createMockShadowRoot('kbd-enter');
      initializeAutoComplete({ id: 'kbd-enter', options, shadowRoot, onSelect });

      const input = getInput(shadowRoot, 'kbd-enter');
      const dropdown = getDropdown(shadowRoot, 'kbd-enter');

      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); // open
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); // highlight Apple
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(input.value).toBe('Apple');
      expect(onSelect).toHaveBeenCalledWith('Apple');
      expect(dropdown.style.display).toBe('none');
    });

    it('no-ops on Enter (still hides) when nothing is highlighted', () => {
      const onSelect = vi.fn();
      const shadowRoot = createMockShadowRoot('kbd-enter-noop');
      initializeAutoComplete({ id: 'kbd-enter-noop', options, shadowRoot, onSelect });

      const input = getInput(shadowRoot, 'kbd-enter-noop');
      const dropdown = getDropdown(shadowRoot, 'kbd-enter-noop');
      input.value = 'initial';

      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); // open, nothing highlighted
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(input.value).toBe('initial');
      expect(onSelect).not.toHaveBeenCalled();
      expect(dropdown.style.display).toBe('none');
    });

    it('hides the dropdown on Escape', () => {
      const shadowRoot = createMockShadowRoot('kbd-escape');
      initializeAutoComplete({ id: 'kbd-escape', options, shadowRoot });

      const input = getInput(shadowRoot, 'kbd-escape');
      const dropdown = getDropdown(shadowRoot, 'kbd-escape');

      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); // open
      expect(dropdown.style.display).toBe('block');

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(dropdown.style.display).toBe('none');
    });

    it('ignores ArrowDown/Up/Enter while closed and no explicit open keys pressed first (guard: !isOpen)', () => {
      const shadowRoot = createMockShadowRoot('kbd-closed-enter');
      const onSelect = vi.fn();
      initializeAutoComplete({ id: 'kbd-closed-enter', options, shadowRoot, onSelect });

      const input = getInput(shadowRoot, 'kbd-closed-enter');
      const dropdown = getDropdown(shadowRoot, 'kbd-closed-enter');

      expect(dropdown.style.display).toBe('none');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(onSelect).not.toHaveBeenCalled();
      expect(dropdown.style.display).toBe('none');
    });
  });

  describe('XSS protection', () => {
    it('escapes a malicious option so it cannot inject a tag or break out of the data-value attribute, while still selecting the correct original value on click', () => {
      const onSelect = vi.fn();
      const maliciousOption = '"><img src=x onerror=alert(1)>';
      const shadowRoot = createMockShadowRoot('xss-option');
      initializeAutoComplete({
        id: 'xss-option',
        options: [maliciousOption, 'Safe Option'],
        shadowRoot,
        onSelect,
      });

      const dropdown = getDropdown(shadowRoot, 'xss-option');

      // The raw payload must never appear verbatim in the rendered markup
      // (as a bare string, i.e. not properly quoted/escaped).
      expect(dropdown.innerHTML).not.toContain('"><img src=x onerror=alert(1)>');

      const optionEls = dropdown.querySelectorAll('.autocomplete-option');
      expect(optionEls.length).toBe(2);
      const maliciousEl = optionEls[0] as HTMLElement;

      // The real security property: no stray <img> element was ever parsed
      // into the DOM. (jsdom's innerHTML getter re-serializes a safely-quoted
      // attribute value without re-escaping `<`/`>` inside it, since they are
      // not ambiguous there — that's an inert string-serialization detail,
      // not evidence of an actual injected element, which is why this DOM
      // structural check is the assertion that matters.)
      expect(maliciousEl.querySelector('img')).toBeNull();
      expect(dropdown.querySelectorAll('img').length).toBe(0);

      // Clicking it still resolves to the correct, faithful original value
      // (browsers decode HTML entities in attribute values on parse).
      maliciousEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(onSelect).toHaveBeenCalledWith(maliciousOption);
    });
  });
});
