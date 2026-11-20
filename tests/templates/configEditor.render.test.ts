import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'lit';
import {
  createEntitySelector,
  createLayoutToggle,
  createVisibilityToggles,
} from '../../src/templates/configEditor';
import { InventoryConfig } from '../../src/types/inventory';
import { TranslationManager } from '../../src/services/translationManager';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

const config: InventoryConfig = { type: 'custom:simple-inventory-card', entity: 'sensor.pantry' };
const options = [
  { value: 'sensor.pantry', label: 'Pantry' },
  { value: 'sensor.freezer', label: 'Freezer' },
];

describe('config editor templates (rendered)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  describe('display option switches', () => {
    it('shows each switch with its label text, without depending on ha-formfield', () => {
      render(createVisibilityToggles(config, vi.fn(), {}), container);

      const rows = Array.from(container.querySelectorAll('.toggle-row'));
      expect(rows).toHaveLength(11);
      expect(container.querySelector('ha-formfield')).toBeNull();
      for (const row of rows) {
        const label = row.querySelector('span')?.textContent?.trim();
        expect(label).toBeTruthy();
        expect(row.querySelector('ha-switch')?.getAttribute('aria-label')).toBe(label);
      }
      expect(rows.map((row) => row.textContent?.trim())).toContain('Show header');
    });

    it('labels the tiles switch', () => {
      render(createLayoutToggle(config, vi.fn(), {}), container);

      expect(container.querySelector('.toggle-row span')?.textContent?.trim()).toBe(
        'Show items as tiles',
      );
    });

    it('reports a switch change with its key', () => {
      const onToggle = vi.fn();
      render(createVisibilityToggles(config, onToggle, {}), container);

      const toggle = container.querySelector('ha-switch') as HTMLElement & { checked: boolean };
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));

      expect(onToggle).toHaveBeenCalledWith('show_header', false);
    });

    it('shows the label in the translations it was given', async () => {
      const actual = await vi.importActual<{ TranslationManager: typeof TranslationManager }>(
        '../../src/services/translationManager',
      );
      const localize = vi.mocked(TranslationManager.localize);
      const fallbackOnly = localize.getMockImplementation();
      localize.mockImplementation(actual.TranslationManager.localize);
      const fr = {
        config: {
          show_header: "Afficher l'en-tête",
          layout_tiles: 'Afficher les articles en vignettes',
        },
      };
      try {
        render(createVisibilityToggles(config, vi.fn(), fr), container);
        const header = container.querySelector('.toggle-row');
        expect(header?.querySelector('span')?.textContent?.trim()).toBe("Afficher l'en-tête");
        expect(header?.querySelector('ha-switch')?.getAttribute('aria-label')).toBe(
          "Afficher l'en-tête",
        );

        render(createLayoutToggle(config, vi.fn(), fr), container);
        expect(container.querySelector('.toggle-row span')?.textContent?.trim()).toBe(
          'Afficher les articles en vignettes',
        );
      } finally {
        localize.mockImplementation(
          fallbackOnly ?? ((_translations, key, _params, fallback) => fallback ?? key),
        );
      }
    });
  });

  describe('inventory picker', () => {
    it('lists the inventories with the configured one selected', () => {
      render(createEntitySelector(options, 'sensor.freezer', vi.fn(), {}), container);

      const select = container.querySelector('select') as HTMLSelectElement;
      expect(container.querySelector('ha-combo-box')).toBeNull();
      expect(Array.from(select.options).map((option) => option.textContent?.trim())).toEqual([
        'Pantry',
        'Freezer',
      ]);
      expect(select.value).toBe('sensor.freezer');
      expect(container.querySelector('.entity-select-label')?.textContent?.trim()).toBe(
        'Inventory Entity (Required)',
      );
    });

    it('reports the chosen inventory', () => {
      const onSelected = vi.fn();
      render(createEntitySelector(options, 'sensor.pantry', onSelected, {}), container);

      const select = container.querySelector('select') as HTMLSelectElement;
      select.value = 'sensor.freezer';
      select.dispatchEvent(new Event('change'));

      expect(onSelected).toHaveBeenCalledWith('sensor.freezer');
    });

    it('starts on an empty choice when no inventory is configured', () => {
      render(createEntitySelector(options, '', vi.fn(), {}), container);

      const select = container.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('');
      expect(select.options[0].disabled).toBe(true);
    });

    it('keeps a configured entity that is not an inventory sensor selected', () => {
      render(createEntitySelector(options, 'sensor.gone', vi.fn(), {}), container);

      const select = container.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('sensor.gone');
      expect(select.options).toHaveLength(3);
    });
  });
});
