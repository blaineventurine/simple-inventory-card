import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { TranslationManager } from '../../src/services/translationManager';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import {
  ACTIONS,
  BATCH_FIELDS,
  ELEMENTS,
  CSS_CLASSES,
  WS_COMMANDS,
} from '../../src/utils/constants';
import { createMockHassEntity, createMockHomeAssistant } from '../testHelpers';

vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    shadowRoot: HTMLElement;
    constructor() {
      const root = document.createElement('div');
      // `host` stands in for the card element (the card mirrors its layout on it).
      Object.assign(root, {
        getElementById: (id: string) => root.querySelector(`#${id}`),
        host: document.createElement('div'),
      });
      this.shadowRoot = root;
    }
    attachShadow(): HTMLElement {
      return this.shadowRoot;
    }
    get renderRoot(): HTMLElement {
      return this.shadowRoot;
    }
    connectedCallback(): void {}
    disconnectedCallback(): void {}
  },
  css: vi.fn((strings: TemplateStringsArray) => ({
    cssText: strings.join(''),
    toString: () => strings.join(''),
  })),
}));

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

function item(name: string, quantity: number): InventoryItem {
  return {
    name,
    quantity,
    unit: '',
    description: '',
    category: '',
    location: '',
    expiry_date: '',
    todo_list: '',
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    batches: [],
  };
}

describe('background refreshes and open in-card UI (integration)', () => {
  let card: SimpleInventoryCard;
  let root: HTMLElement;
  let items: InventoryItem[];
  let wsTypes: string[];
  let changes = 0;

  function makeHass(): HomeAssistant {
    const hass = createMockHomeAssistant({
      'sensor.pantry': createMockHassEntity('sensor.pantry', {
        state: String(items.length),
        last_changed: `2026-10-26T10:00:${String(changes).padStart(2, '0')}Z`,
        attributes: { inventory_id: 'pantry' },
      }),
    });
    hass.callWS = vi.fn().mockImplementation(async (msg: { type: string }) => {
      wsTypes.push(msg.type);
      switch (msg.type) {
        case WS_COMMANDS.GET_INFO:
          return { version: '0.10.0', api_version: 2, features: ['batches', 'transfers'] };
        case WS_COMMANDS.LIST_ITEMS:
          return { items };
        case WS_COMMANDS.GET_HISTORY:
          return { events: [] };
        default:
          return {};
      }
    });
    return hass;
  }

  /** An item changes elsewhere (another device, an automation): HA pushes a new state. */
  async function changeElsewhere(name: string, quantity: number): Promise<void> {
    items = items.map((entry) => (entry.name === name ? { ...entry, quantity } : entry));
    changes += 1;
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
  }

  function listCalls(): number {
    return wsTypes.filter((type) => type === WS_COMMANDS.LIST_ITEMS).length;
  }

  function rowText(name: string): string {
    const row = Array.from(root.querySelectorAll('.item-row')).find(
      (candidate) => candidate.querySelector('.item-name')?.textContent === name,
    );
    return row?.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  function action(name: string, actionName: string): HTMLElement {
    const target = root.querySelector<HTMLElement>(
      `[data-action="${actionName}"][data-name="${name}"]`,
    );
    if (!target) throw new Error(`no ${actionName} for ${name}`);
    return target;
  }

  async function openRestock(name: string): Promise<HTMLElement> {
    action(name, ACTIONS.TOGGLE_BATCHES).click();
    action(name, ACTIONS.OPEN_RESTOCK).click();
    await vi.advanceTimersByTimeAsync(0);
    const form = action(name, ACTIONS.OPEN_RESTOCK)
      .closest('.batch-panel')
      ?.querySelector<HTMLElement>('.restock-form');
    if (!form || form.hidden) throw new Error('restock form did not open');
    return form;
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', storageMock);
    storageMock.clear();
    vi.spyOn(TranslationManager, 'loadTranslations').mockResolvedValue({
      items: { no_items: 'No items' },
    });
    items = [item('Apples', 3), item('Bananas', 2)];
    changes = 0;
    wsTypes = [];
    card = new SimpleInventoryCard();
    root = card.shadowRoot as unknown as HTMLElement; // the mocked shadow root is a <div>
    document.body.append(root); // sheets track focus and Esc only for connected nodes
    card.setConfig({ type: 'custom:simple-inventory-card', entity: 'sensor.pantry' });
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
    expect(root.querySelector('.restock-open-btn')).not.toBeNull();
  });

  afterEach(() => {
    root.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps an open restock form through a refresh and refreshes once after Cancel', async () => {
    const form = await openRestock('Apples');
    const amount = form.querySelector<HTMLInputElement>(
      `[data-batch-field="${BATCH_FIELDS.AMOUNT}"]`,
    );
    if (!amount) throw new Error('no amount field');
    amount.value = '5';
    const before = listCalls();

    await changeElsewhere('Bananas', 7);

    expect(form.isConnected).toBe(true);
    expect(form.hidden).toBe(false);
    expect(amount.value).toBe('5');
    expect(listCalls()).toBe(before);
    expect(rowText('Bananas')).not.toContain('7');

    form.querySelector<HTMLElement>(`[data-action="${ACTIONS.CANCEL_RESTOCK}"]`)?.click();
    await vi.advanceTimersByTimeAsync(300);

    expect(listCalls()).toBe(before + 1);
    expect(rowText('Bananas')).toContain('7');
  });

  it('holds a typing-debounced refresh back when a form opened before it fired', async () => {
    // Focus in an input marks the user as typing: the refresh is debounced, not immediate.
    root.querySelector<HTMLInputElement>(`#${ELEMENTS.SEARCH_INPUT}`)?.focus();
    const before = listCalls();
    items = items.map((entry) => (entry.name === 'Bananas' ? { ...entry, quantity: 7 } : entry));
    changes += 1;
    card.hass = makeHass();

    const form = await openRestock('Apples'); // inside the debounce window
    await vi.advanceTimersByTimeAsync(300);

    expect(form.isConnected).toBe(true);
    expect(form.hidden).toBe(false);
    expect(listCalls()).toBe(before);

    form.querySelector<HTMLElement>(`[data-action="${ACTIONS.CANCEL_RESTOCK}"]`)?.click();
    await vi.advanceTimersByTimeAsync(300);

    expect(listCalls()).toBe(before + 1);
    expect(rowText('Bananas')).toContain('7');
  });

  it('does not hold back a render the user asked for while a form is open', async () => {
    const form = await openRestock('Apples');
    const sort = root.querySelector<HTMLSelectElement>(`#${ELEMENTS.SORT_METHOD}`);
    if (!sort) throw new Error('no sort select');

    sort.value = 'quantity';
    sort.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(300);

    expect(form.isConnected).toBe(false);
    expect(root.querySelector<HTMLSelectElement>(`#${ELEMENTS.SORT_METHOD}`)?.value).toBe(
      'quantity',
    );
  });

  it('keeps the history sheet open through a refresh and refreshes once after Esc', async () => {
    root.querySelector<HTMLElement>(`[data-action="${ACTIONS.OPEN_EDIT_MODAL}"]`)?.click();
    root.querySelector<HTMLElement>(`#${ELEMENTS.EDIT_HISTORY_BTN}`)?.click();
    await vi.advanceTimersByTimeAsync(0);
    const sheet = root.querySelector<HTMLElement>(`#${ELEMENTS.HISTORY_MODAL}`);
    expect(sheet?.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    const before = listCalls();

    await changeElsewhere('Bananas', 7);

    expect(sheet?.isConnected).toBe(true);
    expect(sheet?.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    expect(listCalls()).toBe(before);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.advanceTimersByTimeAsync(300);

    expect(listCalls()).toBe(before + 1);
    expect(rowText('Bananas')).toContain('7');
  });

  it('refreshes after an edit save even with a restock form still open elsewhere', async () => {
    await openRestock('Apples');
    action('Bananas', ACTIONS.OPEN_EDIT_MODAL).click();
    expect(root.querySelector(`#${ELEMENTS.EDIT_MODAL}.${CSS_CLASSES.SHOW}`)).not.toBeNull();
    // The save's own state change, arriving while the sheet is open, is held for it.
    await changeElsewhere('Bananas', 7);
    const before = listCalls();

    root.querySelector<HTMLElement>(`#${ELEMENTS.EDIT_MODAL} .${CSS_CLASSES.SAVE_BTN}`)?.click();
    await vi.advanceTimersByTimeAsync(300);

    expect(root.querySelector(`#${ELEMENTS.EDIT_MODAL}.${CSS_CLASSES.SHOW}`)).toBeNull();
    expect(listCalls()).toBe(before + 1);
    expect(rowText('Bananas')).toContain('7');
  });

  it('runs a held refresh once a search re-lists the rows and drops the open form', async () => {
    const form = await openRestock('Apples');
    const before = listCalls();
    await changeElsewhere('Bananas', 7);
    expect(listCalls()).toBe(before);

    const search = root.querySelector<HTMLInputElement>(`#${ELEMENTS.SEARCH_INPUT}`);
    if (!search) throw new Error('no search input');
    search.value = 'an';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(600);

    expect(form.isConnected).toBe(false);
    expect(listCalls()).toBe(before + 1);
    expect(rowText('Bananas')).toContain('7');
  });
});
