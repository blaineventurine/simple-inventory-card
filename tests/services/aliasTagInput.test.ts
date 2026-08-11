import { describe, it, expect, vi } from 'vitest';

import { initializeAliasTagInput } from '../../src/services/aliasTagInput';

vi.mock('../../src/utils/constants', () => ({
  ELEMENTS: {
    ALIASES: 'aliases',
  },
}));

function createMockShadowRoot(prefix: string, initialValue = ''): ShadowRoot {
  const container = document.createElement('div');

  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.id = `${prefix}-aliases`;
  hiddenInput.value = initialValue;
  container.appendChild(hiddenInput);

  const visibleInput = document.createElement('input');
  visibleInput.type = 'text';
  visibleInput.id = `${prefix}-aliases-input`;
  container.appendChild(visibleInput);

  const chipsContainer = document.createElement('div');
  chipsContainer.id = `${prefix}-alias-chips`;
  container.appendChild(chipsContainer);

  (container as any).getElementById = (id: string) => container.querySelector(`#${id}`);

  return container as unknown as ShadowRoot;
}

describe('aliasTagInput', () => {
  it('should do nothing if elements are missing', () => {
    const root = document.createElement('div');
    (root as any).getElementById = () => null;
    expect(() => initializeAliasTagInput(root as unknown as ShadowRoot, 'add')).not.toThrow();
  });

  it('should render initial chips from hidden input value', () => {
    const root = createMockShadowRoot('add', 'oats, hot cereal');
    initializeAliasTagInput(root, 'add');

    const chips = (root as unknown as HTMLElement).querySelector('#add-alias-chips')!;
    const chipElements = chips.querySelectorAll('.alias-chip');
    expect(chipElements).toHaveLength(2);
    expect(chipElements[0].textContent).toContain('oats');
    expect(chipElements[1].textContent).toContain('hot cereal');
  });

  it('should add alias chip on Enter', () => {
    const root = createMockShadowRoot('add');
    initializeAliasTagInput(root, 'add');

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases',
    ) as HTMLInputElement;

    visibleInput.value = 'oats';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(hiddenInput.value).toBe('oats');
    expect(visibleInput.value).toBe('');

    const chips = (root as unknown as HTMLElement).querySelector('#add-alias-chips')!;
    expect(chips.querySelectorAll('.alias-chip')).toHaveLength(1);
  });

  it('should prevent duplicate aliases', () => {
    const root = createMockShadowRoot('add', 'oats');
    initializeAliasTagInput(root, 'add');

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases',
    ) as HTMLInputElement;

    visibleInput.value = 'oats';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(hiddenInput.value).toBe('oats');
    const chips = (root as unknown as HTMLElement).querySelector('#add-alias-chips')!;
    expect(chips.querySelectorAll('.alias-chip')).toHaveLength(1);
  });

  it('should ignore empty input on Enter', () => {
    const root = createMockShadowRoot('add');
    initializeAliasTagInput(root, 'add');

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases',
    ) as HTMLInputElement;

    visibleInput.value = '   ';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(hiddenInput.value).toBe('');
  });

  it('should remove chip when remove button clicked', () => {
    const root = createMockShadowRoot('add', 'oats, hot cereal');
    initializeAliasTagInput(root, 'add');

    const chips = (root as unknown as HTMLElement).querySelector('#add-alias-chips')!;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases',
    ) as HTMLInputElement;

    const removeBtn = chips.querySelector('.alias-chip-remove') as HTMLElement;
    removeBtn.click();

    expect(hiddenInput.value).toBe('hot cereal');
    expect(chips.querySelectorAll('.alias-chip')).toHaveLength(1);
  });

  it('should not react to non-Enter keys', () => {
    const root = createMockShadowRoot('add');
    initializeAliasTagInput(root, 'add');

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases',
    ) as HTMLInputElement;

    visibleInput.value = 'oats';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    expect(hiddenInput.value).toBe('');
  });

  it('should use the correct prefix for edit modal', () => {
    const root = createMockShadowRoot('edit', 'oats');
    initializeAliasTagInput(root, 'edit');

    const chips = (root as unknown as HTMLElement).querySelector('#edit-alias-chips')!;
    expect(chips.querySelectorAll('.alias-chip')).toHaveLength(1);
  });

  it('should split a comma-containing Enter press into separate chips', () => {
    const root = createMockShadowRoot('add');
    initializeAliasTagInput(root, 'add');

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases',
    ) as HTMLInputElement;

    visibleInput.value = 'oats, hot cereal';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(hiddenInput.value).toBe('oats, hot cereal');
    expect(visibleInput.value).toBe('');

    const chips = (root as unknown as HTMLElement).querySelector('#add-alias-chips')!;
    const chipElements = chips.querySelectorAll('.alias-chip');
    expect(chipElements).toHaveLength(2);
    expect(chipElements[0].textContent).toContain('oats');
    expect(chipElements[1].textContent).toContain('hot cereal');
  });

  it('should treat differently-cased aliases as distinct', () => {
    const root = createMockShadowRoot('add');
    initializeAliasTagInput(root, 'add');

    const visibleInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases-input',
    ) as HTMLInputElement;
    const hiddenInput = (root as unknown as HTMLElement).querySelector(
      '#add-aliases',
    ) as HTMLInputElement;

    visibleInput.value = 'oats';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    visibleInput.value = 'Oats';
    visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(hiddenInput.value).toBe('oats, Oats');
    const chips = (root as unknown as HTMLElement).querySelector('#add-alias-chips')!;
    expect(chips.querySelectorAll('.alias-chip')).toHaveLength(2);
  });

  describe('duplicate initialization safety (modal reopen)', () => {
    it('registers the Enter keydown handler only once across repeated initializations, so dispatching Enter fires it exactly once', () => {
      const root = createMockShadowRoot('add');
      const visibleInput = (root as unknown as HTMLElement).querySelector(
        '#add-aliases-input',
      ) as HTMLInputElement;
      const addEventListenerSpy = vi.spyOn(visibleInput, 'addEventListener');

      initializeAliasTagInput(root, 'add');
      initializeAliasTagInput(root, 'add'); // simulate modal reopen

      const keydownRegistrations = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'keydown',
      );
      expect(keydownRegistrations).toHaveLength(1);

      // A single dispatch therefore invokes the surviving handler exactly once.
      visibleInput.value = 'oats';
      visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      const hiddenInput = (root as unknown as HTMLElement).querySelector(
        '#add-aliases',
      ) as HTMLInputElement;
      expect(hiddenInput.value).toBe('oats');
    });

    it('still renders freshly populated chips on a second call (e.g. editing a different item)', () => {
      const root = createMockShadowRoot('edit', 'first-item-alias');
      initializeAliasTagInput(root, 'edit');

      const hiddenInput = (root as unknown as HTMLElement).querySelector(
        '#edit-aliases',
      ) as HTMLInputElement;
      const chips = (root as unknown as HTMLElement).querySelector('#edit-alias-chips')!;

      // Simulate populateEditModal writing a different item's aliases before reopening.
      hiddenInput.value = 'second-item-alias';
      initializeAliasTagInput(root, 'edit');

      const chipElements = chips.querySelectorAll('.alias-chip');
      expect(chipElements).toHaveLength(1);
      expect(chipElements[0].textContent).toContain('second-item-alias');
    });

    it('marks the visible input as bound after the first call', () => {
      const root = createMockShadowRoot('add');
      initializeAliasTagInput(root, 'add');

      const visibleInput = (root as unknown as HTMLElement).querySelector(
        '#add-aliases-input',
      ) as HTMLInputElement;
      expect(visibleInput.hasAttribute('data-listeners-bound')).toBe(true);
    });
  });
});
