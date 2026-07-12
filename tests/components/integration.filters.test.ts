import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { TranslationManager } from '../../src/services/translationManager';
import { HomeAssistant } from '../../src/types/homeAssistant';

vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    shadowRoot: any;
    constructor() {
      const root = document.createElement('div');
      (root as any).getElementById = (id: string) => root.querySelector(`#${id}`);
      this.shadowRoot = root;
    }
    attachShadow() {
      return this.shadowRoot;
    }
    get renderRoot() {
      return this.shadowRoot;
    }
  },
  css: vi.fn((strings: TemplateStringsArray) => ({
    cssText: strings.join(''),
    toString: () => strings.join(''),
  })),
}));

const flush = (ms = 60) => new Promise((r) => setTimeout(r, ms));

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

describe('filter dropdowns — full card lifecycle (integration)', () => {
  let card: SimpleInventoryCard;
  let shadow: HTMLElement;

  const ITEMS = [
    {
      name: 'Melk',
      quantity: 4,
      unit: 'pak',
      category: 'Zuivel',
      location: 'Koelkast',
      categories: ['Zuivel'],
      locations: ['Koelkast'],
      description: '',
      auto_add_enabled: false,
      auto_add_id_to_description_enabled: false,
      expiry_date: '',
      todo_list: '',
    },
    {
      name: 'Pasta',
      quantity: 3,
      unit: 'pak',
      category: 'Voorraadkast',
      location: 'Kast',
      categories: ['Voorraadkast'],
      locations: ['Kast'],
      description: '',
      auto_add_enabled: false,
      auto_add_id_to_description_enabled: false,
      expiry_date: '',
      todo_list: '',
    },
  ];

  function makeHass(): HomeAssistant {
    return {
      language: 'en',
      selectedLanguage: 'en',
      states: {
        'sensor.test_inventory': {
          entity_id: 'sensor.test_inventory',
          state: '7',
          last_changed: '2026-07-12T10:00:00Z',
          attributes: { inventory_id: 'inv1', total_items: 2, total_quantity: 7 },
        },
      },
      callWS: vi.fn().mockImplementation(async (msg: { type: string }) => {
        // realistic websocket latency — the original bug's race window
        await new Promise((r) => setTimeout(r, 30));
        if (msg.type === 'simple_inventory/list_items') {
          return { items: ITEMS };
        }
        return {};
      }),
      callService: vi.fn(),
      connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
    } as unknown as HomeAssistant;
  }

  beforeEach(async () => {
    vi.stubGlobal('localStorage', storageMock);
    storageMock.clear();
    vi.spyOn(TranslationManager, 'loadTranslations').mockResolvedValue({
      items: { no_items: 'No items' },
    });
    card = new SimpleInventoryCard();
    shadow = card.shadowRoot as unknown as HTMLElement;
    card.setConfig({ type: 'custom:simple-inventory-card', entity: 'sensor.test_inventory' });
    card.hass = makeHass();
    await flush(150);
  });

  it('filters items when a category checkbox is clicked after opening the panel', async () => {
    // initial render sanity
    expect(shadow.querySelector('.items-container')?.textContent).toContain('Melk');
    expect(shadow.querySelector('.items-container')?.textContent).toContain('Pasta');

    // 1. open advanced filters (triggers renderCallback -> fetch -> re-render, async)
    const toggle = shadow.querySelector('#advanced-search-toggle') as HTMLElement;
    expect(toggle).toBeTruthy();
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush(200);

    const panel = shadow.querySelector('#advanced-filters') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.style.display).toBe('block');

    // 2. open the category dropdown
    const trigger = shadow.querySelector('#filter-category-trigger') as HTMLElement;
    expect(trigger).toBeTruthy();
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush(20);

    const dropdown = shadow.querySelector('#filter-category-dropdown') as HTMLElement;
    expect(dropdown.style.display).toBe('block');

    // 3. click the 'Zuivel' checkbox — THE step that was broken in v0.5.0
    const checkbox = dropdown.querySelector('input[value="Zuivel"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    checkbox.click(); // jsdom toggles checked + fires click, but not change
    checkbox.dispatchEvent(new Event('change', { bubbles: true })); // real browsers fire this on user clicks
    await flush(100);

    // 4. filter must be persisted AND the visible list must shrink to Zuivel only
    const savedRaw = storageMock.getItem('simple_inventory_filters_sensor.test_inventory');
    expect(savedRaw).toContain('Zuivel');

    const list = shadow.querySelector('.items-container') as HTMLElement;
    expect(list.textContent).toContain('Melk');
    expect(list.textContent).not.toContain('Pasta');
  });
});
