import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { LIVE_UPDATE_DELAY_MS } from '../../src/services/liveUpdates';
import { TranslationManager } from '../../src/services/translationManager';
import { HomeAssistant, ServiceCallResponse } from '../../src/types/homeAssistant';
import { InventoryConfig, InventoryItem } from '../../src/types/inventory';
import {
  ACTIONS,
  CSS_CLASSES,
  ELEMENTS,
  ITEM_EVENTS,
  STORAGE_KEYS,
  WS_COMMANDS,
} from '../../src/utils/constants';
import {
  FakeConnection,
  createMockHassEntity,
  createMockHomeAssistant,
  fakeConnection,
  must,
} from '../testHelpers';

vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    shadowRoot: HTMLElement;
    constructor() {
      const root = document.createElement('div');
      // The shadow root's host stands in for the card element (a real one is the card itself).
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

function item(name: string, quantity: number): InventoryItem {
  return {
    id: name.toLowerCase(),
    image: 's1',
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
  };
}

describe('tile layout (integration)', () => {
  let card: SimpleInventoryCard;
  let root: HTMLElement;
  let items: InventoryItem[];
  let changes: number;
  let connection: FakeConnection;
  let callService: Mock<HomeAssistant['callService']>;
  /** Resolves the service call in flight. */
  let finishCall: () => void;

  function makeHass(): HomeAssistant {
    const hass = createMockHomeAssistant({
      'sensor.pantry': createMockHassEntity('sensor.pantry', {
        state: String(items.length),
        last_changed: `2026-10-28T10:00:${String(changes).padStart(2, '0')}Z`,
        attributes: { inventory_id: 'pantry' },
      }),
    });
    hass.connection = connection;
    hass.callWS = vi.fn().mockImplementation(async (msg: { type: string }) => {
      if (msg.type === WS_COMMANDS.LIST_ITEMS) {
        return { items };
      }
      return {
        version: '0.12.0',
        api_version: 3,
        features: ['batches', 'item_icons', 'item_images', 'tile_images'],
      };
    });
    hass.callService = callService;
    hass.fetchWithAuth = vi.fn(async () => new Response('img', { status: 200 }));
    return hass;
  }

  async function mount(config: Partial<InventoryConfig> = {}): Promise<void> {
    card = new SimpleInventoryCard();
    root = card.shadowRoot as unknown as HTMLElement; // the mocked shadow root is a <div>
    document.body.append(root);
    card.setConfig({ type: 'custom:simple-inventory-card', entity: 'sensor.pantry', ...config });
    card.connectedCallback();
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
  }

  function tileNames(): string[] {
    return Array.from(
      root.querySelectorAll('.items-container .si-tiles > .si-tile .si-tile__name'),
      (name) => name.textContent ?? '',
    );
  }

  function tileValue(name: string): string {
    const tile = Array.from(root.querySelectorAll('.si-tile')).find(
      (candidate) => candidate.querySelector('.si-tile__name')?.textContent === name,
    );
    return tile?.querySelector('.si-stepper__value')?.textContent ?? '';
  }

  function toggle(): HTMLElement {
    return must(root.querySelector<HTMLElement>(`[data-action="${ACTIONS.TOGGLE_LAYOUT}"]`));
  }

  /** The `layout` attribute the card mirrors on its host element. */
  function hostLayout(): string | null | undefined {
    return card.shadowRoot?.host.getAttribute('layout');
  }

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn<(blob: Blob) => string>(() => 'blob:test'),
    });
    vi.spyOn(TranslationManager, 'loadTranslations').mockResolvedValue({
      items: { no_items: 'No items' },
    });
    localStorage.clear();
    items = [item('Apples', 3), item('Bananas', 2)];
    changes = 0;
    connection = fakeConnection();
    finishCall = () => {};
    // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
    callService = vi.fn<HomeAssistant['callService']>(
      () =>
        new Promise<ServiceCallResponse>((resolve) => {
          finishCall = () => resolve({});
        }),
    );
  });

  afterEach(() => {
    card.disconnectedCallback();
    root.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('tile tap', () => {
    const tileOpen = (name: string): HTMLElement =>
      must(
        root.querySelector<HTMLElement>(`.si-tile__open[data-name="${name}"]`),
        `no tile ${name}`,
      );
    const editSheetOpen = (): boolean =>
      root.querySelector(`#${ELEMENTS.EDIT_MODAL}`)?.classList.contains(CSS_CLASSES.SHOW) === true;

    it('opens the edit sheet on a dashboard', async () => {
      await mount({ layout: 'tiles' });
      const opened: Event[] = [];
      root.addEventListener(ITEM_EVENTS.OPEN, (event) => opened.push(event));

      tileOpen('Apples').click();
      await vi.advanceTimersByTimeAsync(0);

      expect(editSheetOpen()).toBe(true);
      expect(opened).toHaveLength(0);
    });

    it('asks the panel to open the item page in an embedded card', async () => {
      await mount({ layout: 'tiles' });
      card.shadowRoot?.host.setAttribute('embedded', '');
      const opened: Event[] = [];
      root.addEventListener(ITEM_EVENTS.OPEN, (event) => opened.push(event));

      tileOpen('Apples').click();
      await vi.advanceTimersByTimeAsync(0);

      expect(editSheetOpen()).toBe(false);
      const [event] = opened;
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(event instanceof CustomEvent ? event.detail : undefined).toEqual({
        inventory_id: 'pantry',
        item_id: 'apples',
      });
    });

    it('opens the item page with Enter on a focused tile, in an embedded card', async () => {
      await mount({ layout: 'tiles' });
      card.shadowRoot?.host.setAttribute('embedded', '');
      const opened: Event[] = [];
      root.addEventListener(ITEM_EVENTS.OPEN, (event) => opened.push(event));

      tileOpen('Bananas').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await vi.advanceTimersByTimeAsync(0);

      expect(opened).toHaveLength(1);
    });
  });

  it('renders tiles with tile-size photos for layout: tiles', async () => {
    await mount({ layout: 'tiles' });

    expect(tileNames()).toEqual(['Apples', 'Bananas']);
    expect(root.querySelector('.items-container .si-row')).toBeNull();
    expect(
      root.querySelector('.si-tile[data-status] .si-tile__photo')?.getAttribute('data-image-path'),
    ).toBe('/api/simple_inventory/image/apples?tile=1&v=s1');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(toggle().getAttribute('aria-label')).toBe('Tile layout');
    expect(toggle().getAttribute('title')).toBe('Show as list');
  });

  it('increments from a tile through the busy stepper like a row', async () => {
    await mount({ layout: 'tiles' });
    const plus = must(
      root.querySelector<HTMLElement>(
        `.si-tile [data-action="${ACTIONS.INCREMENT}"][data-name="Bananas"]`,
      ),
    );

    plus.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(callService).toHaveBeenCalledWith('simple_inventory', 'increment_item', {
      inventory_id: 'pantry',
      name: 'Bananas',
      amount: 1,
    });
    expect(plus.classList).toContain('si-busy');
    expect(plus.hasAttribute('data-processing')).toBe(true);

    finishCall();
    await vi.advanceTimersByTimeAsync(300);
    expect(plus.classList).not.toContain('si-busy');
  });

  it('re-renders the tiles on a live push', async () => {
    await mount({ layout: 'tiles' });

    items = [item('Apples', 3), item('Bananas', 5)];
    connection.push({ items: items.map((entry) => ({ ...entry })) });
    await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);

    expect(tileNames()).toEqual(['Apples', 'Bananas']);
    expect(tileValue('Bananas')).toBe('5');
  });

  it('keeps the tiles while searching', async () => {
    await mount({ layout: 'tiles' });
    const input = must(root.querySelector<HTMLInputElement>(`#${ELEMENTS.SEARCH_INPUT}`));

    input.value = 'ban';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(300);

    expect(tileNames()).toEqual(['Bananas']);
  });

  it('mirrors a layout saved elsewhere once live filtering re-lists the items', async () => {
    await mount();
    expect(hostLayout()).toBe('list');
    // Another card for the same inventory switched to tiles in this browser.
    localStorage.setItem(STORAGE_KEYS.LAYOUT('sensor.pantry'), 'tiles');
    const input = must(root.querySelector<HTMLInputElement>(`#${ELEMENTS.SEARCH_INPUT}`));

    input.value = 'ban';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(300);

    expect(tileNames()).toEqual(['Bananas']);
    expect(hostLayout()).toBe('tiles');
  });

  it('switches a list to tiles with the toolbar toggle and remembers it', async () => {
    await mount();
    expect(root.querySelector('.items-container .si-tile')).toBeNull();
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(toggle().getAttribute('aria-label')).toBe('Tile layout');
    expect(toggle().getAttribute('title')).toBe('Show as tiles');

    const button = toggle();
    button.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(localStorage.getItem(STORAGE_KEYS.LAYOUT('sensor.pantry'))).toBe('tiles');
    expect(tileNames()).toEqual(['Apples', 'Bananas']);
    expect(toggle()).toBe(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Tile layout');
    expect(button.getAttribute('title')).toBe('Show as list');
    expect(button.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:view-list-outline');

    button.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(localStorage.getItem(STORAGE_KEYS.LAYOUT('sensor.pantry'))).toBe('list');
    expect(root.querySelector('.items-container .si-tile')).toBeNull();
    expect(root.querySelectorAll('.items-container .si-row')).toHaveLength(2);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('title')).toBe('Show as tiles');
    expect(button.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:view-grid-outline');
  });

  it('mirrors its layout on the host element, through the toggle', async () => {
    await mount();
    expect(hostLayout()).toBe('list');

    toggle().click();
    await vi.advanceTimersByTimeAsync(0);
    expect(hostLayout()).toBe('tiles');

    toggle().click();
    await vi.advanceTimersByTimeAsync(0);
    expect(hostLayout()).toBe('list');
  });

  it('mirrors the saved layout from the first render', async () => {
    localStorage.setItem(STORAGE_KEYS.LAYOUT('sensor.pantry'), 'tiles');

    await mount();

    expect(hostLayout()).toBe('tiles');
  });

  it('prefers the saved choice over the layout option', async () => {
    localStorage.setItem(STORAGE_KEYS.LAYOUT('sensor.pantry'), 'list');

    await mount({ layout: 'tiles' });

    expect(root.querySelector('.items-container .si-tile')).toBeNull();
    expect(root.querySelectorAll('.items-container .si-row')).toHaveLength(2);
  });

  it('switches to the other layout than the one shown, whatever is saved', async () => {
    await mount();
    // Another card for the same inventory saved tiles; this one still shows the list.
    localStorage.setItem(STORAGE_KEYS.LAYOUT('sensor.pantry'), 'tiles');

    toggle().click();
    await vi.advanceTimersByTimeAsync(0);

    expect(localStorage.getItem(STORAGE_KEYS.LAYOUT('sensor.pantry'))).toBe('tiles');
    expect(tileNames()).toEqual(['Apples', 'Bananas']);
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the empty-inventory message when toggled without items', async () => {
    items = [];
    await mount();
    const message = (): string =>
      root.querySelector('.items-container .si-empty__text')?.textContent ?? '';
    expect(message()).toBe('No items');

    toggle().click();
    await vi.advanceTimersByTimeAsync(0);

    expect(localStorage.getItem(STORAGE_KEYS.LAYOUT('sensor.pantry'))).toBe('tiles');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(message()).toBe('No items');
  });

  it('mirrors a toggle without items on the host too', async () => {
    items = [];
    await mount();

    toggle().click();
    await vi.advanceTimersByTimeAsync(0);

    expect(hostLayout()).toBe('tiles');
  });
});
