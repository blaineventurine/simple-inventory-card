import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { LIVE_UPDATE_DELAY_MS } from '../../src/services/liveUpdates';
import { TranslationManager } from '../../src/services/translationManager';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import { ACTIONS, CSS_CLASSES, ELEMENTS, WS_COMMANDS } from '../../src/utils/constants';
import {
  FakeConnection,
  createMockHassEntity,
  createMockHomeAssistant,
  fakeConnection,
} from '../testHelpers';

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

function item(name: string, quantity: number, description = ''): InventoryItem {
  return {
    name,
    quantity,
    unit: '',
    description,
    category: '',
    location: '',
    expiry_date: '',
    todo_list: '',
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    batches: [],
  };
}

describe('live updates via simple_inventory/subscribe (integration)', () => {
  let card: SimpleInventoryCard;
  let root: HTMLElement;
  let items: InventoryItem[];
  let wsTypes: string[];
  let changes = 0;
  let connection: FakeConnection;
  /** `list_items` fails with this while set (e.g. HA still starting). */
  let listError: Error | undefined;
  /** `get_info` fails with this while set (an integration older than the handshake). */
  let infoError: object | undefined;

  function makeHass(): HomeAssistant {
    const hass = createMockHomeAssistant({
      'sensor.pantry': createMockHassEntity('sensor.pantry', {
        state: String(items.length),
        last_changed: `2026-10-26T10:00:${String(changes).padStart(2, '0')}Z`,
        attributes: { inventory_id: 'pantry' },
      }),
    });
    hass.connection = connection;
    hass.callWS = vi.fn().mockImplementation(async (msg: { type: string }) => {
      wsTypes.push(msg.type);
      switch (msg.type) {
        case WS_COMMANDS.GET_INFO:
          if (infoError) throw infoError;
          return { version: '0.10.0', api_version: 2, features: ['batches', 'transfers'] };
        case WS_COMMANDS.LIST_ITEMS:
          if (listError) throw listError;
          return { items };
        default:
          return {};
      }
    });
    return hass;
  }

  /** The backend pushes the inventory's items after a change (and HA updates the entity). */
  async function push(next: InventoryItem[]): Promise<void> {
    items = next;
    connection.push({ items: next.map((entry) => ({ ...entry })) });
    await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);
  }

  function listCalls(): number {
    return wsTypes.filter((type) => type === WS_COMMANDS.LIST_ITEMS).length;
  }

  function row(name: string): Element | undefined {
    return Array.from(root.querySelectorAll('.item-row')).find(
      (candidate) => candidate.querySelector('.item-name')?.textContent === name,
    );
  }

  function rowText(name: string): string {
    return row(name)?.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  function action(name: string, actionName: string): HTMLElement {
    const target = root.querySelector<HTMLElement>(
      `[data-action="${actionName}"][data-name="${name}"]`,
    );
    if (!target) throw new Error(`no ${actionName} for ${name}`);
    return target;
  }

  /** HA pushes a new entity state (the inventory sensor changed). */
  async function entityChanged(): Promise<void> {
    changes += 1;
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
  }

  function notifications(): string[] {
    const messages: string[] = [];
    root.addEventListener('hass-notification', (event) => {
      if (event instanceof CustomEvent) {
        messages.push(String(event.detail.message));
      }
    });
    return messages;
  }

  async function start(): Promise<void> {
    card = new SimpleInventoryCard();
    root = card.shadowRoot as unknown as HTMLElement; // the mocked shadow root is a <div>
    document.body.append(root);
    card.setConfig({ type: 'custom:simple-inventory-card', entity: 'sensor.pantry' });
    card.connectedCallback();
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', storageMock);
    storageMock.clear();
    vi.spyOn(TranslationManager, 'loadTranslations').mockResolvedValue({
      items: { no_items: 'No items' },
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    items = [item('Apples', 3), item('Bananas', 2)];
    changes = 0;
    wsTypes = [];
    connection = fakeConnection();
    listError = undefined;
    infoError = undefined;
  });

  afterEach(() => {
    card.disconnectedCallback();
    root.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("subscribes to the card's inventory", async () => {
    await start();

    expect(connection.subscribeMessage).toHaveBeenCalledTimes(1);
    expect(connection.subscribeMessage.mock.calls[0]?.[1]).toEqual({
      type: WS_COMMANDS.SUBSCRIBE,
      inventory_id: 'pantry',
    });
  });

  it('renders pushed items without fetching them', async () => {
    await start();
    const before = listCalls();

    await push([item('Apples', 3), item('Bananas', 7, 'Ripe')]);

    expect(rowText('Bananas')).toContain('7');
    expect(listCalls()).toBe(before);
  });

  it('does not re-render when the pushed items equal the rendered ones', async () => {
    await start();
    const apples = row('Apples');

    await push([item('Apples', 3), item('Bananas', 2)]);

    expect(apples?.isConnected).toBe(true);
  });

  it('renders a burst of pushes once, with the latest items', async () => {
    await start();
    const apples = row('Apples');

    connection.push({ items: [item('Apples', 4), item('Bananas', 2)] });
    connection.push({ items: [item('Apples', 5), item('Bananas', 2)] });
    await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS - 1);
    expect(apples?.isConnected).toBe(true);
    connection.push({ items: [item('Apples', 6), item('Bananas', 2)] });
    await vi.advanceTimersByTimeAsync(1);

    expect(rowText('Apples')).toContain('6');
  });

  it('holds pushed items while a restock form is open and renders them when it closes', async () => {
    await start();
    action('Apples', ACTIONS.TOGGLE_BATCHES).click();
    action('Apples', ACTIONS.OPEN_RESTOCK).click();
    await vi.advanceTimersByTimeAsync(0);
    const restock = action('Apples', ACTIONS.OPEN_RESTOCK)
      .closest('.batch-panel')
      ?.querySelector<HTMLElement>('.restock-form');
    if (!restock || restock.hidden) throw new Error('restock form did not open');
    const before = listCalls();

    await push([item('Apples', 3), item('Bananas', 7)]);

    expect(restock.isConnected).toBe(true);
    expect(rowText('Bananas')).not.toContain('7');

    restock.querySelector<HTMLElement>(`[data-action="${ACTIONS.CANCEL_RESTOCK}"]`)?.click();
    await vi.advanceTimersByTimeAsync(300);

    expect(rowText('Bananas')).toContain('7');
    expect(listCalls()).toBe(before);
  });

  it('refetches for an event without items', async () => {
    await start();
    const before = listCalls();

    items = [item('Apples', 3), item('Bananas', 9)];
    connection.push({ event: 'updated' });
    await vi.advanceTimersByTimeAsync(300);

    expect(listCalls()).toBe(before + 1);
    expect(rowText('Bananas')).toContain('9');
  });

  it('skips the entity-change refetch while subscribed', async () => {
    await start();
    const before = listCalls();

    changes += 1;
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);

    expect(listCalls()).toBe(before);
  });

  it('keeps refetching on entity changes when the backend refuses the subscription', async () => {
    connection.subscribeMessage.mockRejectedValue({ code: 'unknown_command' });
    await start();
    const before = listCalls();

    items = [item('Apples', 3), item('Bananas', 7)];
    changes += 1;
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);

    expect(listCalls()).toBe(before + 1);
    expect(rowText('Bananas')).toContain('7');
  });

  it('unsubscribes while detached, then resubscribes and refreshes once on re-attach', async () => {
    await start();
    const before = listCalls();

    card.disconnectedCallback();
    expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
    items = [item('Apples', 3), item('Bananas', 7)];
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
    expect(connection.subscribeMessage).toHaveBeenCalledTimes(1);

    card.connectedCallback();
    await vi.advanceTimersByTimeAsync(300);

    expect(connection.subscribeMessage).toHaveBeenCalledTimes(2);
    expect(listCalls()).toBe(before + 1);
    expect(rowText('Bananas')).toContain('7');
  });

  it('falls back to entity changes when the resubscribe after an HA restart is refused, and goes live again later', async () => {
    await start();
    const messages = notifications();
    // HA restarting: the websocket is back before the integration is loaded.
    connection.subscribeMessage.mockRejectedValueOnce({ code: 'unknown_command' });
    listError = new Error('Inventory not loaded');
    connection.reconnect();
    await vi.advanceTimersByTimeAsync(300);
    const before = listCalls();

    // The integration loaded: its sensor changes, which refreshes and subscribes again.
    listError = undefined;
    items = [item('Apples', 3), item('Bananas', 7)];
    await entityChanged();

    expect(listCalls()).toBeGreaterThan(before);
    expect(rowText('Bananas')).toContain('7');
    expect(connection.subscribeMessage).toHaveBeenCalledTimes(3);
    await push([item('Apples', 3), item('Bananas', 8)]);
    expect(rowText('Bananas')).toContain('8');
    expect(messages).toEqual([]);
  });

  it('keeps retrying the subscription on entity changes while it is refused', async () => {
    connection.subscribeMessage.mockRejectedValue({ code: 'unknown_command' });
    await start();

    await entityChanged();
    await entityChanged();

    expect(connection.subscribeMessage).toHaveBeenCalledTimes(3);
  });

  it('does not retry the subscription on entity changes with an outdated integration', async () => {
    infoError = { code: 'unknown_command' };
    connection.subscribeMessage.mockRejectedValue({ code: 'unknown_command' });
    await start();
    const before = listCalls();

    items = [item('Apples', 3), item('Bananas', 7)];
    await entityChanged();
    await entityChanged();

    expect(connection.subscribeMessage).toHaveBeenCalledTimes(1);
    expect(listCalls()).toBe(before + 2);
    expect(rowText('Bananas')).toContain('7');
  });

  it('fetches once when re-attached after the subscription was refused and is now accepted', async () => {
    connection.subscribeMessage.mockRejectedValueOnce({ code: 'unknown_command' });
    await start();
    const before = listCalls();

    card.disconnectedCallback();
    items = [item('Apples', 3), item('Bananas', 7)];
    card.connectedCallback();
    await vi.advanceTimersByTimeAsync(300);

    expect(connection.subscribeMessage).toHaveBeenCalledTimes(2);
    expect(listCalls()).toBe(before + 1);
    expect(rowText('Bananas')).toContain('7');
  });

  it('does not toast a failed background refresh', async () => {
    await start();
    const messages = notifications();
    listError = new Error('ws down');

    connection.push({ event: 'updated' });
    await vi.advanceTimersByTimeAsync(300);

    expect(messages).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith('Failed to fetch inventory items:', listError);
  });

  it('holds pushed items while the scanner is open and renders them when it closes', async () => {
    await start();
    const panel = root.querySelector<HTMLElement>(`#${ELEMENTS.SCAN_PANEL}`);
    if (!panel) throw new Error('no scan panel');
    panel.hidden = false;

    await push([item('Apples', 3), item('Bananas', 7)]);
    expect(rowText('Bananas')).not.toContain('7');

    root.querySelector<HTMLElement>(`#${ELEMENTS.SCAN_CLOSE}`)?.click();
    await vi.advanceTimersByTimeAsync(300);

    expect(rowText('Bananas')).toContain('7');
  });

  it('holds background renders while the add sheet is open and renders them when it closes', async () => {
    await start();
    root.querySelector<HTMLElement>(`#${ELEMENTS.OPEN_ADD_MODAL}`)?.click();
    const sheet = root.querySelector<HTMLElement>(`#${ELEMENTS.ADD_MODAL}`);
    expect(sheet?.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    const name = root.querySelector<HTMLInputElement>(`#add-${ELEMENTS.NAME}`);
    if (!name) throw new Error('no name field');
    name.value = 'Cherries';

    await push([item('Apples', 3), item('Bananas', 7)]);

    expect(sheet?.isConnected).toBe(true);
    expect(sheet?.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    expect(name.value).toBe('Cherries');
    expect(rowText('Bananas')).not.toContain('7');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.advanceTimersByTimeAsync(300);

    expect(rowText('Bananas')).toContain('7');
  });

  it('refreshes once after the websocket reconnects', async () => {
    await start();
    const before = listCalls();

    items = [item('Apples', 3), item('Bananas', 7)];
    connection.reconnect();
    await vi.advanceTimersByTimeAsync(300);

    expect(listCalls()).toBe(before + 1);
    expect(rowText('Bananas')).toContain('7');
  });
});
