import { describe, it, expect } from 'vitest';

import { initializeModalMultiSelect } from '../../src/services/modalMultiSelect';

type OmittableElement = 'chips' | 'label' | 'newInput' | 'addBtn';

function createShadowRoot(
  id: string,
  options: { initialValue?: string; attachTo?: HTMLElement; omit?: OmittableElement[] } = {},
): { root: ShadowRoot; container: HTMLElement } {
  const omit = new Set(options.omit ?? []);
  const container = document.createElement('div');

  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.id = id;
  hiddenInput.value = options.initialValue ?? '';
  container.appendChild(hiddenInput);

  const trigger = document.createElement('div');
  trigger.id = `${id}-trigger`;

  if (!omit.has('chips')) {
    const chipsContainer = document.createElement('div');
    chipsContainer.id = `${id}-chips`;
    trigger.appendChild(chipsContainer);
  }

  if (!omit.has('label')) {
    const label = document.createElement('span');
    label.className = 'modal-multi-select-label';
    label.textContent = 'Select…';
    trigger.appendChild(label);
  }
  container.appendChild(trigger);

  const dropdown = document.createElement('div');
  dropdown.id = `${id}-dropdown`;
  dropdown.className = 'modal-multi-select-dropdown';
  container.appendChild(dropdown);

  const optionsContainer = document.createElement('div');
  optionsContainer.id = `${id}-options`;
  dropdown.appendChild(optionsContainer);

  if (!omit.has('newInput')) {
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.id = `${id}-new-input`;
    dropdown.appendChild(newInput);
  }

  if (!omit.has('addBtn')) {
    const addBtn = document.createElement('div');
    addBtn.id = `${id}-add-btn`;
    dropdown.appendChild(addBtn);
  }

  Object.assign(container, {
    getElementById: (elId: string): Element | null => container.querySelector(`#${elId}`),
  });

  if (options.attachTo) {
    options.attachTo.appendChild(container);
  }

  return { root: container as unknown as ShadowRoot, container };
}

function checkboxFor(container: HTMLElement, value: string): HTMLInputElement {
  const checkboxes = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  );
  const match = checkboxes.find((cb) => cb.value === value);
  if (!match) throw new Error(`checkbox for "${value}" not found`);
  return match;
}

describe('modalMultiSelect', () => {
  describe('missing required elements', () => {
    it('returns early without throwing when hiddenInput is missing', () => {
      const container = document.createElement('div');
      Object.assign(container, {
        getElementById: (elId: string): Element | null => container.querySelector(`#${elId}`),
      });
      const root = container as unknown as ShadowRoot;

      expect(() =>
        initializeModalMultiSelect({ id: 'missing', options: ['a'], shadowRoot: root }),
      ).not.toThrow();
    });
  });

  describe('missing optional DOM elements', () => {
    it('does not throw and skips chip rendering/removal wiring when the chips container is absent', () => {
      const { root, container } = createShadowRoot('ms', { omit: ['chips'] });

      expect(() =>
        initializeModalMultiSelect({ id: 'ms', options: ['Alpha', 'Beta'], shadowRoot: root }),
      ).not.toThrow();

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const alphaCheckbox = checkboxFor(container, 'Alpha');
      alphaCheckbox.checked = true;
      expect(() =>
        alphaCheckbox.dispatchEvent(new Event('change', { bubbles: true })),
      ).not.toThrow();
      expect(hiddenInput.value).toBe('Alpha');
    });

    it('skips updating the trigger label when the label span is absent', () => {
      const { root, container } = createShadowRoot('ms', { omit: ['label'] });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      expect(container.querySelector('.modal-multi-select-label')).toBeNull();

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const alphaCheckbox = checkboxFor(container, 'Alpha');
      alphaCheckbox.checked = true;
      expect(() =>
        alphaCheckbox.dispatchEvent(new Event('change', { bubbles: true })),
      ).not.toThrow();
      expect(hiddenInput.value).toBe('Alpha');
    });

    it('no-ops addNewOption and skips its keydown wiring when the new-option input is absent', () => {
      const { root, container } = createShadowRoot('ms', { omit: ['newInput'] });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const addBtn = container.querySelector('#ms-add-btn') as HTMLElement;

      expect(() => addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
      expect(hiddenInput.value).toBe('');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(1);
    });

    it('skips add-button wiring when the add button is absent', () => {
      const { root, container } = createShadowRoot('ms', { omit: ['addBtn'] });

      expect(() =>
        initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root }),
      ).not.toThrow();
      expect(container.querySelector('#ms-add-btn')).toBeNull();

      // Enter in the new-option input still works independently of the button.
      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const newInput = container.querySelector('#ms-new-input') as HTMLInputElement;
      newInput.value = 'Gamma';
      newInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(hiddenInput.value).toBe('Gamma');
    });

    it('ignores a chip-remove click when the button has no data-value', () => {
      const { root, container } = createShadowRoot('ms', { initialValue: 'Alpha' });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const chipsContainer = container.querySelector('#ms-chips') as HTMLElement;
      const rogueButton = document.createElement('button');
      rogueButton.className = 'modal-multi-select-chip-remove';
      chipsContainer.appendChild(rogueButton);

      rogueButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(hiddenInput.value).toBe('Alpha');
    });
  });

  describe('initial merge of pre-existing value', () => {
    it('merges a saved value not present in config.options as a checked option', () => {
      const { root, container } = createShadowRoot('ms', { initialValue: 'Zebra' });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha', 'Beta'], shadowRoot: root });

      const zebraCheckbox = checkboxFor(container, 'Zebra');
      expect(zebraCheckbox.checked).toBe(true);
      const alphaCheckbox = checkboxFor(container, 'Alpha');
      expect(alphaCheckbox.checked).toBe(false);
    });

    it('does not add anything extra when the hidden input starts empty', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha', 'Beta'], shadowRoot: root });

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(2);
    });
  });

  describe('rendering sorted options', () => {
    it('renders options sorted case-insensitively', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({
        id: 'ms',
        options: ['banana', 'Apple', 'cherry'],
        shadowRoot: root,
      });

      const spans = Array.from(
        container.querySelectorAll('#ms-options .modal-multi-select-option span'),
      ).map((s) => s.textContent);
      expect(spans).toEqual(['Apple', 'banana', 'cherry']);
    });

    it('checks the boxes matching the current selection', () => {
      const { root, container } = createShadowRoot('ms', { initialValue: 'Beta' });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha', 'Beta'], shadowRoot: root });

      expect(checkboxFor(container, 'Beta').checked).toBe(true);
      expect(checkboxFor(container, 'Alpha').checked).toBe(false);
    });
  });

  describe('rendering chips', () => {
    it('renders a removable chip per selected value and hides the trigger label', () => {
      const { root, container } = createShadowRoot('ms', { initialValue: 'Alpha, Beta' });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha', 'Beta'], shadowRoot: root });

      const chips = container.querySelectorAll('#ms-chips .modal-multi-select-chip');
      expect(chips.length).toBe(2);
      expect(Array.from(chips).map((c) => (c as HTMLElement).dataset.value)).toEqual([
        'Alpha',
        'Beta',
      ]);
      const removeButtons = container.querySelectorAll('.modal-multi-select-chip-remove');
      expect(removeButtons.length).toBe(2);

      const label = container.querySelector('.modal-multi-select-label') as HTMLElement;
      expect(label.style.display).toBe('none');
    });

    it('hides chips entirely and re-shows the trigger label when selection is empty', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha', 'Beta'], shadowRoot: root });

      const chipsContainer = container.querySelector('#ms-chips') as HTMLElement;
      expect(chipsContainer.innerHTML).toBe('');
      const label = container.querySelector('.modal-multi-select-label') as HTMLElement;
      expect(label.style.display).toBe('');
    });
  });

  describe('trigger toggle behavior', () => {
    it('toggles the dropdown open and closed on trigger click', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const trigger = container.querySelector('#ms-trigger') as HTMLElement;
      const dropdown = container.querySelector('#ms-dropdown') as HTMLElement;

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdown.style.display).toBe('block');

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdown.style.display).toBe('none');
    });

    it('closes every other open modal-multi-select-dropdown on the page', () => {
      const wrapper = document.createElement('div');
      document.body.appendChild(wrapper);

      const first = createShadowRoot('ms-one', { attachTo: wrapper });
      const second = createShadowRoot('ms-two', { attachTo: wrapper });

      // Use document as the shared root so querySelectorAll sees both widgets.
      initializeModalMultiSelect({ id: 'ms-one', options: ['Alpha'] });
      initializeModalMultiSelect({ id: 'ms-two', options: ['Beta'] });

      const triggerOne = first.container.querySelector('#ms-one-trigger') as HTMLElement;
      const dropdownOne = first.container.querySelector('#ms-one-dropdown') as HTMLElement;
      const triggerTwo = second.container.querySelector('#ms-two-trigger') as HTMLElement;
      const dropdownTwo = second.container.querySelector('#ms-two-dropdown') as HTMLElement;

      // Open the first dropdown.
      triggerOne.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdownOne.style.display).toBe('block');

      // Opening the second dropdown must close the first (it's an "other" dropdown).
      triggerTwo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdownTwo.style.display).toBe('block');
      expect(dropdownOne.style.display).toBe('none');

      document.body.removeChild(wrapper);
    });
  });

  describe('checkbox change handling', () => {
    it('adds a value to the hidden input and re-renders chips when a checkbox is checked', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha', 'Beta'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const alphaCheckbox = checkboxFor(container, 'Alpha');
      alphaCheckbox.checked = true;
      alphaCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

      expect(hiddenInput.value).toBe('Alpha');
      const chips = container.querySelectorAll('#ms-chips .modal-multi-select-chip');
      expect(chips.length).toBe(1);
      expect((chips[0] as HTMLElement).dataset.value).toBe('Alpha');
    });

    it('removes a value from the hidden input when a checkbox is unchecked', () => {
      const { root, container } = createShadowRoot('ms', { initialValue: 'Alpha, Beta' });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha', 'Beta'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const alphaCheckbox = checkboxFor(container, 'Alpha');
      alphaCheckbox.checked = false;
      alphaCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

      expect(hiddenInput.value).toBe('Beta');
    });

    it('does not add a duplicate value if the checkbox reports checked while already selected', () => {
      const { root, container } = createShadowRoot('ms', { initialValue: 'Alpha' });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha', 'Beta'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const alphaCheckbox = checkboxFor(container, 'Alpha');
      alphaCheckbox.checked = true;
      alphaCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

      expect(hiddenInput.value).toBe('Alpha');
    });

    it('ignores change events from non-checkbox targets', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const optionsContainer = container.querySelector('#ms-options') as HTMLElement;
      const decoy = document.createElement('input');
      decoy.type = 'text';
      optionsContainer.appendChild(decoy);

      decoy.dispatchEvent(new Event('change', { bubbles: true }));

      expect(hiddenInput.value).toBe('');
    });
  });

  describe('chip removal', () => {
    it('removes the value and rebuilds options so the checkbox unchecks', () => {
      const { root, container } = createShadowRoot('ms', { initialValue: 'Alpha, Beta' });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha', 'Beta'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const removeBtn = container.querySelector(
        '.modal-multi-select-chip-remove[data-value="Alpha"]',
      ) as HTMLElement;
      removeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(hiddenInput.value).toBe('Beta');
      const chips = container.querySelectorAll('#ms-chips .modal-multi-select-chip');
      expect(chips.length).toBe(1);
      expect((chips[0] as HTMLElement).dataset.value).toBe('Beta');

      const alphaCheckbox = checkboxFor(container, 'Alpha');
      expect(alphaCheckbox.checked).toBe(false);
    });

    it('does nothing when the click target has no chip-remove class', () => {
      const { root, container } = createShadowRoot('ms', { initialValue: 'Alpha' });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const chip = container.querySelector('.modal-multi-select-chip') as HTMLElement;
      chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(hiddenInput.value).toBe('Alpha');
    });
  });

  describe('adding a new option', () => {
    it('adds a trimmed value via the add button, updates selection, and clears the input', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const newInput = container.querySelector('#ms-new-input') as HTMLInputElement;
      const addBtn = container.querySelector('#ms-add-btn') as HTMLElement;

      newInput.value = '  Gamma  ';
      addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(hiddenInput.value).toBe('Gamma');
      expect(newInput.value).toBe('');
      expect(checkboxFor(container, 'Gamma').checked).toBe(true);
    });

    it('no-ops when the trimmed input is empty', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const newInput = container.querySelector('#ms-new-input') as HTMLInputElement;
      const addBtn = container.querySelector('#ms-add-btn') as HTMLElement;

      newInput.value = '   ';
      addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(hiddenInput.value).toBe('');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(1);
    });

    it('adds a new option when pressing Enter in the new-option input', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const newInput = container.querySelector('#ms-new-input') as HTMLInputElement;

      newInput.value = 'Delta';
      newInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(hiddenInput.value).toBe('Delta');
      expect(newInput.value).toBe('');
      expect(checkboxFor(container, 'Delta').checked).toBe(true);
    });

    it('does not add a new option on non-Enter keydown', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const newInput = container.querySelector('#ms-new-input') as HTMLInputElement;

      newInput.value = 'Delta';
      newInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

      expect(hiddenInput.value).toBe('');
      expect(newInput.value).toBe('Delta');
    });

    it('does not add a duplicate to the selection when the new value already exists', () => {
      const { root, container } = createShadowRoot('ms', { initialValue: 'Alpha' });
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const hiddenInput = container.querySelector('#ms') as HTMLInputElement;
      const newInput = container.querySelector('#ms-new-input') as HTMLInputElement;

      newInput.value = 'Alpha';
      newInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(hiddenInput.value).toBe('Alpha');
    });
  });

  describe('event propagation', () => {
    it('stops dropdown clicks from propagating to the outside-click handler', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const trigger = container.querySelector('#ms-trigger') as HTMLElement;
      const dropdown = container.querySelector('#ms-dropdown') as HTMLElement;

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdown.style.display).toBe('block');

      dropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdown.style.display).toBe('block');
    });
  });

  describe('outside click handling', () => {
    it('closes the dropdown when the click target is outside trigger and dropdown', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const trigger = container.querySelector('#ms-trigger') as HTMLElement;
      const dropdown = container.querySelector('#ms-dropdown') as HTMLElement;

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdown.style.display).toBe('block');

      // Note: chipsContainer itself has its own click handler that calls
      // stopPropagation, so it can't be used to exercise the outside-click
      // handler; use a plain sibling element instead.
      const outsideEl = document.createElement('div');
      container.appendChild(outsideEl);
      outsideEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(dropdown.style.display).toBe('none');
    });

    it('does not close the dropdown when the click target is a descendant of the trigger', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const trigger = container.querySelector('#ms-trigger') as HTMLElement;
      const dropdown = container.querySelector('#ms-dropdown') as HTMLElement;
      const label = trigger.querySelector('.modal-multi-select-label') as HTMLElement;

      // Clicking the label (a descendant of the trigger, not the trigger
      // itself) bubbles through the trigger's own toggle listener, opening
      // the dropdown, and then reaches the outside-click handler on root.
      // If the handler's trigger.contains(target) check were broken, it
      // would immediately re-close the dropdown it just opened.
      label.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(dropdown.style.display).toBe('block');
    });

    it('does not close the dropdown when the click target is a descendant of the dropdown', () => {
      const { root, container } = createShadowRoot('ms');
      initializeModalMultiSelect({ id: 'ms', options: ['Alpha'], shadowRoot: root });

      const trigger = container.querySelector('#ms-trigger') as HTMLElement;
      const dropdown = container.querySelector('#ms-dropdown') as HTMLElement;
      const optionsContainer = container.querySelector('#ms-options') as HTMLElement;

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdown.style.display).toBe('block');

      // A click inside the dropdown never reaches root at all because the
      // dropdown's own listener calls stopPropagation — this proves the
      // dropdown stays open for clicks on its descendants either way.
      optionsContainer.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(dropdown.style.display).toBe('block');
    });
  });
});
