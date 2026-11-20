import { describe, it, expect, vi, afterEach } from 'vitest';

import { itemIcon } from '../../src/templates/modalPartials/itemIcon';
import { DEFAULT_ITEM_ICON } from '../../src/utils/itemStatus';
import { TranslationData } from '@/types/translatableComponent';

class FakeIconPicker extends HTMLElement {}

const translations: TranslationData = {
  modal: { icon: 'Icon', icon_help: 'Leave empty for the default icon.' },
};

describe('itemIcon', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('without ha-icon-picker', () => {
    it('renders a labelled prefix:name text input with help', () => {
      const result = itemIcon('add', translations);

      expect(result).toContain(
        '<label for="add-icon" class="form-label si-field__label">Icon</label>',
      );
      expect(result).toContain('type="text" id="add-icon"');
      expect(result).toContain(`placeholder="${DEFAULT_ITEM_ICON}"`);
      expect(result).toContain('aria-describedby="add-icon-help"');
      expect(result).toContain('id="add-icon-help" class="help-text si-field__help"');
      expect(result).not.toContain('<ha-icon-picker');
    });

    it('renders a decorative preview circle showing the default icon', () => {
      const host = document.createElement('div');
      host.innerHTML = itemIcon('edit', translations);
      const preview = host.querySelector('#edit-icon-preview');

      expect(preview?.getAttribute('aria-hidden')).toBe('true');
      expect(preview?.querySelector('.si-icon-circle ha-icon')?.getAttribute('icon')).toBe(
        DEFAULT_ITEM_ICON,
      );
    });
  });

  describe('with ha-icon-picker', () => {
    it("uses Home Assistant's icon picker with its label, and the help text below it", () => {
      vi.spyOn(customElements, 'get').mockImplementation((name: string) =>
        name === 'ha-icon-picker' ? FakeIconPicker : undefined,
      );
      const host = document.createElement('div');
      host.innerHTML = itemIcon('edit', translations);
      const picker = host.querySelector('ha-icon-picker');

      expect(picker?.id).toBe('edit-icon');
      expect(picker?.getAttribute('label')).toBe('Icon');
      // Help sits outside the picker so the outlined border wraps only the field.
      expect(picker?.hasAttribute('helper')).toBe(false);
      expect(picker?.nextElementSibling?.classList.contains('si-field__help')).toBe(true);
      expect(picker?.nextElementSibling?.textContent).toBe('Leave empty for the default icon.');
      expect(picker?.getAttribute('placeholder')).toBe(DEFAULT_ITEM_ICON);
      expect(host.querySelector('input')).toBeNull();
      expect(host.querySelector('#edit-icon-preview')).toBeNull();
    });
  });

  it('escapes translated text', () => {
    const result = itemIcon('add', { modal: { icon: '<b>Icon</b>', icon_help: '"help"' } });

    expect(result).toContain('&lt;b&gt;Icon&lt;/b&gt;');
    expect(result).not.toContain('<b>');
    expect(result).toContain('&quot;help&quot;');
  });
});
