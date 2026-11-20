import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { SimpleInventoryPanel } from '../../src/panel/simpleInventoryPanel';
import { createInventoryCard } from '../../src/panel/cardFactory';
import {
  InventoriesResult,
  InventorySummary,
  fetchFeatures,
  fetchInventories,
} from '../../src/panel/inventories';
import { SearchResultItem } from '../../src/panel/search/searchClient';
import { Overview } from '../../src/panel/home/overviewClient';
import { nativeScanner, startScanner, stopScanner } from '../../src/services/barcodeScanner';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { ITEM_EVENTS, WS_COMMANDS } from '../../src/utils/constants';
import {
  FakeConnection,
  createMockHassEntity,
  createMockHomeAssistant,
  fakeConnection,
} from '../testHelpers';
import { entry, expired, low, overview, summary } from './overviewFixtures';

vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    shadowRoot: HTMLElement;
    isConnected = true;
    constructor() {
      const root = document.createElement('div');
      Object.assign(root, { getElementById: (id: string) => root.querySelector(`#${id}`) });
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

interface FakeCard extends HTMLDivElement {
  setConfig: ReturnType<typeof vi.fn>;
  openItem: Mock<(name: string) => void>;
  showItem: Mock<(id: string) => void>;
  showList: Mock<() => void>;
  hass: HomeAssistant | undefined;
}

function fakeCard(entity: string): FakeCard {
  const card = Object.assign(document.createElement('div'), {
    setConfig: vi.fn(),
    openItem: vi.fn(),
    showItem: vi.fn(),
    showList: vi.fn(),
    hass: undefined,
  });
  card.dataset.entity = entity;
  return card;
}

vi.mock('../../src/panel/cardFactory', () => ({
  createInventoryCard: vi.fn((entity: string) => fakeCard(entity)),
}));
vi.mock('../../src/panel/inventories', () => ({
  fetchInventories: vi.fn(),
  fetchFeatures: vi.fn(),
}));
vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));
vi.mock('../../src/services/barcodeScanner', () => ({
  startScanner: vi.fn(async () => null),
  stopScanner: vi.fn(),
  isScannerActive: vi.fn(() => false),
  scanSupport: vi.fn(() => 'live'),
  chooseBarcodePhoto: vi.fn(async () => null),
  nativeScanner: vi.fn(() => undefined),
  startNativeScanner: vi.fn(),
}));

const kitchen: InventorySummary = {
  id: 'kitchen_id',
  name: 'Kitchen',
  icon: 'mdi:fridge',
  description: '',
  entity_id: 'sensor.kitchen_inventory',
};
const pantry: InventorySummary = {
  id: 'pantry_id',
  name: 'Pantry',
  icon: '',
  description: '',
  entity_id: 'sensor.pantry_inventory',
};

/** What `simple_inventory/search` answers in the panel tests (by query); rejects when unset. */
let searchAnswers: Record<string, { items: SearchResultItem[]; truncated: boolean }> = {};
/** What `simple_inventory/overview` answers; rejects when unset. */
let overviewAnswer: Overview | undefined;
let connection: FakeConnection;

function sensors(...ids: string[]): HomeAssistant {
  const states = Object.fromEntries(
    ids.map((id) => [
      `sensor.${id}_inventory`,
      createMockHassEntity(`sensor.${id}_inventory`, { attributes: { inventory_id: `${id}_id` } }),
    ]),
  );
  const hass = createMockHomeAssistant(states);
  hass.callWS = vi.fn().mockImplementation(async (message: { type: string; query?: string }) => {
    if (message.type === WS_COMMANDS.OVERVIEW && overviewAnswer) {
      return overviewAnswer;
    }
    const answer = searchAnswers[message.query ?? ''];
    if (message.type !== WS_COMMANDS.SEARCH || !answer) {
      throw { code: 'unknown_error', message: 'Boom' };
    }
    return answer;
  });
  hass.connection = connection;
  return hass;
}

function resultItem(
  name: string,
  inventory: InventorySummary,
  overrides: Partial<SearchResultItem> = {},
): SearchResultItem {
  return {
    id: name.toLowerCase(),
    name,
    quantity: 2,
    unit: '',
    description: '',
    category: '',
    location: '',
    expiry_date: '',
    todo_list: '',
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    inventory_id: inventory.id,
    inventory_name: inventory.name,
    matched: 'name',
    ...overrides,
  };
}

describe('simple-inventory-panel', () => {
  let panel: SimpleInventoryPanel;
  let root: HTMLElement;
  let pushState: ReturnType<typeof vi.spyOn>;
  let replaceState: ReturnType<typeof vi.spyOn>;
  let locationEvents: CustomEvent[];
  /** The hass of the last `mount`. */
  let mountedHass: HomeAssistant;

  const onLocation = (event: Event): void => {
    if (event instanceof CustomEvent) locationEvents.push(event);
  };

  function respond(result: InventoriesResult): void {
    vi.mocked(fetchInventories).mockResolvedValue(result);
  }

  async function mount(path: string, options: { narrow?: boolean } = {}): Promise<void> {
    panel = new SimpleInventoryPanel();
    const shadow = panel.shadowRoot;
    if (!(shadow instanceof HTMLElement)) throw new Error('no shadow root');
    root = shadow;
    document.body.appendChild(root);
    panel.narrow = options.narrow ?? false;
    panel.route = { prefix: '/simple-inventory', path };
    mountedHass = sensors('kitchen', 'pantry');
    panel.hass = mountedHass;
    await vi.runAllTimersAsync();
  }

  async function goTo(path: string): Promise<void> {
    panel.route = { prefix: '/simple-inventory', path };
    await vi.runAllTimersAsync();
  }

  const tabs = (): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
  const tab = (name: string): HTMLElement => {
    const found = tabs().find((element) => element.textContent === name);
    if (!found) throw new Error(`no tab ${name}`);
    return found;
  };
  const cards = (): FakeCard[] => vi.mocked(createInventoryCard).mock.results.map((r) => r.value);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(createInventoryCard).mockClear();
    vi.mocked(fetchInventories).mockReset();
    pushState = vi.spyOn(history, 'pushState').mockImplementation(() => undefined);
    replaceState = vi.spyOn(history, 'replaceState').mockImplementation(() => undefined);
    locationEvents = [];
    window.addEventListener('location-changed', onLocation);
    respond({ status: 'ok', inventories: [kitchen, pantry] });
    vi.mocked(fetchFeatures).mockReset();
    vi.mocked(fetchFeatures).mockResolvedValue(['search']);
    searchAnswers = {};
    overviewAnswer = undefined;
    connection = fakeConnection();
  });

  afterEach(() => {
    window.removeEventListener('location-changed', onLocation);
    root.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
    History.prototype.replaceState.call(history, null, '', '/');
  });

  it('renders one tab per inventory, in the order returned', async () => {
    await mount('/kitchen_id');
    expect(tabs().map((element) => element.textContent)).toEqual(['Kitchen', 'Pantry']);
    const list = root.querySelector('[role="tablist"]');
    expect(list?.getAttribute('aria-label')).toBe('Inventories');
  });

  it('selects the tab of the route and creates only its card', async () => {
    await mount('/pantry_id');
    expect(tab('Pantry').getAttribute('aria-selected')).toBe('true');
    expect(tab('Kitchen').getAttribute('aria-selected')).toBe('false');
    expect(createInventoryCard).toHaveBeenCalledTimes(1);
    expect(createInventoryCard).toHaveBeenCalledWith('sensor.pantry_inventory');
  });

  it('redirects an empty or unknown route to the first inventory', async () => {
    await mount('');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/simple-inventory/kitchen_id');
    expect(locationEvents.at(-1)?.detail).toEqual({ replace: true });

    replaceState.mockClear();
    await goTo('/gone');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/simple-inventory/kitchen_id');
  });

  it('navigates on tab click; the new route selects the tab', async () => {
    await mount('/kitchen_id');
    tab('Pantry').click();
    expect(pushState).toHaveBeenCalledWith(null, '', '/simple-inventory/pantry_id');
    expect(locationEvents.at(-1)?.detail).toEqual({ replace: false });

    await goTo('/pantry_id');
    expect(tab('Pantry').getAttribute('aria-selected')).toBe('true');
  });

  it('keeps visited cards and creates them lazily', async () => {
    await mount('/kitchen_id');
    const kitchenCard = cards()[0];
    const content = root.querySelector('.content');
    await goTo('/pantry_id');
    await goTo('/kitchen_id');

    expect(createInventoryCard).toHaveBeenCalledTimes(2);
    expect(root.querySelector('.content')).toBe(content);
    const shown = [...(content?.children ?? [])];
    expect(shown).toContain(kitchenCard);
    expect(kitchenCard.hidden).toBe(false);
    expect(cards()[1].hidden).toBe(true);
    expect(cards()[1].isConnected).toBe(true);
  });

  it('passes every new hass to every created card', async () => {
    await mount('/kitchen_id');
    await goTo('/pantry_id');
    const hass = sensors('kitchen', 'pantry');
    panel.hass = hass;
    expect(cards().map((card) => card.hass)).toEqual([hass, hass]);
  });

  it('moves through the tabs with Arrow, Home and End keys (wrapping)', async () => {
    await mount('/kitchen_id');
    const press = (key: string): void => {
      root
        .querySelector('[aria-selected="true"]')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    };

    press('ArrowRight');
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
    await goTo('/pantry_id');
    press('ArrowRight');
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/kitchen_id');
    press('ArrowLeft');
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/kitchen_id');
    press('Home');
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/kitchen_id');
    await goTo('/kitchen_id');
    press('ArrowLeft');
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
    press('End');
    expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
    expect(pushState).toHaveBeenCalledTimes(6);
  });

  it('shows a menu button when narrow that toggles the HA sidebar', async () => {
    await mount('/kitchen_id', { narrow: true });
    const toggles: Event[] = [];
    window.addEventListener('hass-toggle-menu', (event) => toggles.push(event));
    root.querySelector<HTMLElement>('.menu-btn')?.click();
    expect(toggles).toHaveLength(1);
    expect(toggles[0].bubbles).toBe(true);
    expect(toggles[0].composed).toBe(true);

    panel.narrow = false;
    expect(root.querySelector('.menu-btn')).toBeNull();
  });

  it('shows the empty state with a link to the integration', async () => {
    respond({ status: 'ok', inventories: [] });
    await mount('');
    expect(root.textContent).toContain('No inventories yet.');
    expect(root.querySelector('a')?.getAttribute('href')).toBe(
      '/config/integrations/integration/simple_inventory',
    );
    expect(tabs()).toHaveLength(0);
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('shows the outdated state without tabs', async () => {
    respond({ status: 'outdated' });
    await mount('');
    expect(root.textContent).toContain('too old for the panel');
    expect(tabs()).toHaveLength(0);
  });

  it('shows the error with a Retry that loads again', async () => {
    respond({ status: 'error', message: 'Connection lost' });
    await mount('/kitchen_id');
    expect(root.textContent).toContain('Connection lost');
    expect(tabs()).toHaveLength(0);

    respond({ status: 'ok', inventories: [kitchen, pantry] });
    root.querySelector<HTMLElement>('.retry-btn')?.click();
    await vi.runAllTimersAsync();
    expect(fetchInventories).toHaveBeenCalledTimes(2);
    expect(tabs()).toHaveLength(2);
  });

  it('shows sensor unavailable for an inventory without a sensor', async () => {
    respond({ status: 'ok', inventories: [{ ...kitchen, entity_id: null }, pantry] });
    await mount('/kitchen_id');
    expect(root.textContent).toContain('The sensor of this inventory is unavailable.');
    expect(createInventoryCard).not.toHaveBeenCalled();
  });

  it('does not redirect once detached (HA removed the panel before the list arrived)', async () => {
    let resolve: (result: InventoriesResult) => void = () => undefined;
    vi.mocked(fetchInventories).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    await mount('');
    Object.defineProperty(panel, 'isConnected', { value: false });

    resolve({ status: 'ok', inventories: [kitchen, pantry] });
    await vi.runAllTimersAsync();

    expect(replaceState).not.toHaveBeenCalled();
    expect(locationEvents).toHaveLength(0);
  });

  it('keeps the visited cards through a failed refetch and shows them again after Retry', async () => {
    await mount('/kitchen_id');
    const kitchenCard = cards()[0];

    respond({ status: 'error', message: 'Connection lost' });
    panel.hass = sensors('kitchen', 'pantry', 'garage');
    await vi.runAllTimersAsync();
    expect(root.textContent).toContain('Connection lost');
    expect(kitchenCard.isConnected).toBe(true);

    respond({ status: 'ok', inventories: [kitchen, pantry] });
    root.querySelector<HTMLElement>('.retry-btn')?.click();
    await vi.runAllTimersAsync();
    expect(createInventoryCard).toHaveBeenCalledTimes(1);
    expect(kitchenCard.isConnected).toBe(true);
    expect(kitchenCard.hidden).toBe(false);
  });

  it('recreates a kept card when its inventory sensor was renamed', async () => {
    await mount('/kitchen_id');
    const oldCard = cards()[0];

    respond({
      status: 'ok',
      inventories: [{ ...kitchen, entity_id: 'sensor.kitchen_renamed' }, pantry],
    });
    panel.hass = sensors('kitchen', 'pantry', 'garage');
    await vi.runAllTimersAsync();

    expect(createInventoryCard).toHaveBeenLastCalledWith('sensor.kitchen_renamed');
    expect(oldCard.isConnected).toBe(false);
    expect(cards()[1].isConnected).toBe(true);
    expect(cards()[1].hidden).toBe(false);
  });

  it('shows the menu button while the HA sidebar is always hidden', async () => {
    await mount('/kitchen_id');
    expect(root.querySelector('.menu-btn')).toBeNull();

    const hidden = sensors('kitchen', 'pantry');
    hidden.dockedSidebar = 'always_hidden';
    panel.hass = hidden;
    expect(root.querySelector('.menu-btn')).not.toBeNull();

    panel.hass = sensors('kitchen', 'pantry');
    expect(root.querySelector('.menu-btn')).toBeNull();
  });

  it('keeps keyboard focus on the tabs after a click on a focused tab', async () => {
    await mount('/kitchen_id');
    const pantryTab = tab('Pantry');
    pantryTab.focus();
    pantryTab.click();
    await goTo('/pantry_id');

    expect(tab('Pantry')).not.toBe(pantryTab);
    expect(document.activeElement).toBe(tab('Pantry'));
  });

  it('refetches only when the set of inventory sensors changes', async () => {
    await mount('/kitchen_id');
    expect(fetchInventories).toHaveBeenCalledTimes(1);

    panel.hass = sensors('kitchen', 'pantry');
    await vi.runAllTimersAsync();
    expect(fetchInventories).toHaveBeenCalledTimes(1);

    panel.hass = sensors('kitchen', 'pantry', 'garage');
    await vi.runAllTimersAsync();
    expect(fetchInventories).toHaveBeenCalledTimes(2);
  });

  describe('search', () => {
    const field = (): HTMLInputElement | null =>
      root.querySelector<HTMLInputElement>('.search-field');
    const rows = (): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('.search-result')];
    const rowNames = (): string[] =>
      rows().map((row) => row.querySelector('.si-row__name')?.textContent ?? '');
    const secondary = (row: HTMLElement | undefined): string =>
      row?.querySelector('.si-secondary')?.textContent ?? '';

    async function openSearch(): Promise<void> {
      root.querySelector<HTMLElement>('.search-open-btn')?.click();
      await vi.runAllTimersAsync();
    }

    async function type(text: string): Promise<void> {
      const input = field();
      if (!input) throw new Error('no search field');
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await vi.runAllTimersAsync();
    }

    function searchCalls(): unknown[] {
      return vi
        .mocked(mountedHass.callWS)
        .mock.calls.map(([message]) => message)
        .filter((message) => JSON.stringify(message).includes(WS_COMMANDS.SEARCH));
    }

    it('shows the magnifier only when the integration has the search feature', async () => {
      await mount('/kitchen_id');
      const button = root.querySelector('.search-open-btn');
      expect(button?.getAttribute('aria-label')).toBe('Search all inventories');

      root.remove();
      vi.mocked(fetchFeatures).mockResolvedValue(['batches']);
      await mount('/kitchen_id');
      expect(root.querySelector('.search-open-btn')).toBeNull();
    });

    it('shows no magnifier while the inventories failed to load or there are none', async () => {
      respond({ status: 'error', message: 'Connection lost' });
      await mount('/kitchen_id');
      expect(root.querySelector('.search-open-btn')).toBeNull();

      root.remove();
      respond({ status: 'ok', inventories: [] });
      await mount('');
      expect(root.querySelector('.search-open-btn')).toBeNull();
    });

    it('entering search twice leaves one live subscription', async () => {
      await mount('/kitchen_id');

      panel['_enterSearch']();
      panel['_enterSearch']();
      await vi.runAllTimersAsync();

      expect(connection.subscribeMessage).toHaveBeenCalledTimes(2);
      expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('shows no hint once the second character is typed, before the debounce', async () => {
      await mount('/kitchen_id');
      await openSearch();
      const input = field();
      if (!input) throw new Error('no search field');

      input.value = 'b';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(root.textContent).toContain('Type at least 2 characters');
      input.value = 'bu';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(root.textContent).not.toContain('Type at least 2 characters');
      expect(searchCalls()).toHaveLength(0);
    });

    it('enters search with one history entry and a focused field; no tab is selected', async () => {
      await mount('/kitchen_id');
      await openSearch();

      expect(pushState).toHaveBeenCalledTimes(1);
      expect(pushState).toHaveBeenCalledWith(null, '', '/simple-inventory/search?q=');
      expect(locationEvents.at(-1)?.detail).toEqual({ replace: false });
      expect(field()).not.toBeNull();
      expect(document.activeElement).toBe(field());
      expect(tabs()).toHaveLength(2);
      expect(root.querySelector('[aria-selected="true"]')).toBeNull();
      expect(cards()[0].hidden).toBe(true);
      expect(root.textContent).toContain('Type at least 2 characters');
    });

    it('keeps the title next to the field when wide, and drops it when narrow', async () => {
      await mount('/kitchen_id');
      await openSearch();
      expect(root.querySelector('.title')).not.toBeNull();

      panel.narrow = true;
      expect(root.querySelector('.title')).toBeNull();
      expect(field()).not.toBeNull();
    });

    it('replaces the URL query while typing, with no extra history entry', async () => {
      await mount('/kitchen_id');
      await openSearch();
      replaceState.mockClear();

      await type('butter');

      expect(replaceState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/search?q=butter');
      expect(pushState).toHaveBeenCalledTimes(1);
    });

    it('enters search from a deep link with the field filled, and searches', async () => {
      searchAnswers.dairy = { items: [resultItem('Milk', kitchen)], truncated: false };
      History.prototype.replaceState.call(history, null, '', '/simple-inventory/search?q=dairy');

      await mount('/search');

      expect(field()?.value).toBe('dairy');
      expect(searchCalls()).toEqual([{ type: WS_COMMANDS.SEARCH, query: 'dairy' }]);
      expect(rowNames()).toEqual(['Milk']);
      expect(connection.subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
        type: WS_COMMANDS.SUBSCRIBE,
      });
    });

    it('✕ returns to the tab that was active before search, replacing the entry', async () => {
      await mount('/pantry_id');
      await openSearch();

      root.querySelector<HTMLElement>('.search-close-btn')?.click();

      expect(replaceState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
      expect(locationEvents.at(-1)?.detail).toEqual({ replace: true });
      expect(field()).toBeNull();
      expect(tab('Pantry').getAttribute('aria-selected')).toBe('true');
      expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('Escape leaves search to the first tab after a deep link', async () => {
      History.prototype.replaceState.call(history, null, '', '/simple-inventory/search?q=');
      await mount('/search');

      field()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(replaceState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/kitchen_id');
      expect(field()).toBeNull();
    });

    it('a tab click leaves search', async () => {
      await mount('/kitchen_id');
      await openSearch();

      tab('Pantry').click();
      expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
      await goTo('/pantry_id');

      expect(field()).toBeNull();
      expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
      expect(tab('Pantry').getAttribute('aria-selected')).toBe('true');
    });

    it('lists the results in order with inventory, locations and match reasons', async () => {
      searchAnswers.double = {
        items: [
          resultItem('Double cream', kitchen, { locations: ['Fridge'], location: 'Fridge' }),
          resultItem('Batteries', pantry, {
            matched: 'alias',
            aliases: ['AA cell', 'Double A'],
            locations: ['Garage', 'Drawer'],
          }),
          resultItem('Flour', pantry, { matched: 'description', quantity: 0 }),
        ],
        truncated: false,
      };
      await mount('/kitchen_id');
      await openSearch();

      await type('double');

      expect(rowNames()).toEqual(['Double cream', 'Batteries', 'Flour']);
      const [cream, batteries, flour] = rows();
      expect(secondary(cream)).toBe('Kitchen · Fridge');
      // The reason right after the inventory: on phones the line's end is cut off.
      expect(secondary(batteries)).toBe('Pantry · alias: Double A · Garage, Drawer');
      expect(secondary(flour)).toBe('Pantry · description');
      expect(flour.classList.contains('zero-quantity')).toBe(true);
      expect(cream.classList.contains('zero-quantity')).toBe(false);
      expect(root.textContent).not.toContain('Showing the first');
    });

    it('shows the barcode that matched', async () => {
      searchAnswers['0063'] = {
        items: [
          resultItem('Beans', kitchen, { matched: 'barcode', barcodes: ['111', '4006381333931'] }),
        ],
        truncated: false,
      };
      await mount('/kitchen_id');
      await openSearch();

      await type('0063');

      expect(secondary(rows()[0])).toBe('Kitchen · barcode: 4006381333931');
    });

    it('shows the truncated footer and the no-results message', async () => {
      searchAnswers.bu = {
        items: [resultItem('Butter', kitchen), resultItem('Buns', pantry)],
        truncated: true,
      };
      searchAnswers.zzz = { items: [], truncated: false };
      await mount('/kitchen_id');
      await openSearch();

      await type('bu');
      expect(root.textContent).toContain('Showing the first 2 matches; refine your search');

      await type('zzz');
      expect(rows()).toHaveLength(0);
      expect(root.textContent).toContain('No items match "zzz"');
    });

    it('shows a failed search with a Retry that searches again', async () => {
      await mount('/kitchen_id');
      await openSearch();
      await type('butter');
      expect(root.textContent).toContain('Search failed: Boom');

      searchAnswers.butter = { items: [resultItem('Butter', kitchen)], truncated: false };
      root.querySelector<HTMLElement>('.search-retry-btn')?.click();
      await vi.runAllTimersAsync();

      expect(rowNames()).toEqual(['Butter']);
    });

    it('re-runs the search when an inventory changes', async () => {
      searchAnswers.butter = { items: [resultItem('Butter', kitchen)], truncated: false };
      await mount('/kitchen_id');
      await openSearch();
      await type('butter');
      expect(searchCalls()).toHaveLength(1);

      searchAnswers.butter = {
        items: [resultItem('Butter', kitchen, { quantity: 5 })],
        truncated: false,
      };
      connection.push({ event: 'updated' });
      await vi.runAllTimersAsync();

      expect(searchCalls()).toHaveLength(2);
      expect(rows()[0].querySelector('.si-stepper__value')?.textContent).toBe('5');
    });

    it('+ on a result increments it in its inventory, busy while the call runs', async () => {
      searchAnswers.butter = { items: [resultItem('Butter', pantry)], truncated: false };
      await mount('/kitchen_id');
      await openSearch();
      await type('butter');
      let done: () => void = () => undefined;
      vi.mocked(mountedHass.callService).mockImplementation(
        () =>
          new Promise((resolve) => {
            done = () => resolve({});
          }),
      );

      const plus = rows()[0].querySelector<HTMLElement>('[data-action="increment"]');
      plus?.click();

      expect(mountedHass.callService).toHaveBeenCalledWith('simple_inventory', 'increment_item', {
        inventory_id: 'pantry_id',
        name: 'Butter',
        amount: 1,
      });
      expect(plus?.classList.contains('si-busy')).toBe(true);
      plus?.click();
      expect(mountedHass.callService).toHaveBeenCalledTimes(1);

      done();
      await vi.runAllTimersAsync();
      expect(plus?.classList.contains('si-busy')).toBe(false);
    });

    it('− on a result decrements it in its inventory', async () => {
      searchAnswers.butter = { items: [resultItem('Butter', pantry)], truncated: false };
      await mount('/kitchen_id');
      await openSearch();
      await type('butter');

      rows()[0].querySelector<HTMLElement>('[data-action="decrement"]')?.click();

      expect(mountedHass.callService).toHaveBeenCalledWith('simple_inventory', 'decrement_item', {
        inventory_id: 'pantry_id',
        name: 'Butter',
        amount: 1,
      });
    });

    it('opening a result goes to its tab and opens the item there once', async () => {
      searchAnswers.butter = { items: [resultItem('Butter', pantry)], truncated: false };
      await mount('/kitchen_id');
      await openSearch();
      await type('butter');

      rows()[0].querySelector<HTMLElement>('[data-action="search-open"]')?.click();

      expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
      expect(locationEvents.at(-1)?.detail).toEqual({ replace: false });
      await goTo('/pantry_id');

      const pantryCard = cards().find((card) => card.dataset.entity === 'sensor.pantry_inventory');
      expect(pantryCard?.openItem).toHaveBeenCalledTimes(1);
      expect(pantryCard?.openItem).toHaveBeenCalledWith('Butter');
      expect(pantryCard?.hidden).toBe(false);
      expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('opens a result with Enter on its focused row', async () => {
      searchAnswers.butter = { items: [resultItem('Butter', pantry)], truncated: false };
      await mount('/kitchen_id');
      await openSearch();
      await type('butter');

      rows()[0]
        .querySelector<HTMLElement>('[data-action="search-open"]')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
    });

    it('stops the live subscription when the panel is detached during search', async () => {
      await mount('/kitchen_id');
      await openSearch();
      expect(connection.subscribeMessage).toHaveBeenCalledTimes(1);

      panel.disconnectedCallback();

      expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('starts no search session when the route arrives while detached', async () => {
      History.prototype.replaceState.call(history, null, '', '/simple-inventory/search?q=dairy');
      panel = new SimpleInventoryPanel();
      const shadow = panel.shadowRoot;
      if (!(shadow instanceof HTMLElement)) throw new Error('no shadow root');
      root = shadow;
      document.body.appendChild(root);
      panel.route = { prefix: '/simple-inventory', path: '/search' };
      mountedHass = sensors('kitchen', 'pantry');
      panel.hass = mountedHass;
      // HA removed the panel before the inventories and features arrived.
      Object.defineProperty(panel, 'isConnected', { value: false });
      panel.disconnectedCallback();

      await vi.runAllTimersAsync();

      expect(connection.subscribeMessage).not.toHaveBeenCalled();
      expect(searchCalls()).toHaveLength(0);
    });

    it('forgets an opened result whose tab shows no card', async () => {
      respond({ status: 'ok', inventories: [{ ...kitchen, entity_id: null }, pantry] });
      searchAnswers.butter = { items: [resultItem('Butter', kitchen)], truncated: false };
      await mount('/pantry_id');
      await openSearch();
      await type('butter');
      rows()[0].querySelector<HTMLElement>('[data-action="search-open"]')?.click();
      await goTo('/kitchen_id');
      expect(root.textContent).toContain('The sensor of this inventory is unavailable.');

      // The sensor comes back later: its card opens without the old result's sheet.
      respond({ status: 'ok', inventories: [kitchen, pantry] });
      panel.hass = sensors('kitchen', 'pantry', 'garage');
      await vi.runAllTimersAsync();

      const kitchenCard = cards().find((card) => card.dataset.entity === kitchen.entity_id);
      expect(kitchenCard?.hidden).toBe(false);
      expect(kitchenCard?.openItem).not.toHaveBeenCalled();
    });

    describe('scan to find', () => {
      async function scan(): Promise<(code: string) => void> {
        root.querySelector<HTMLElement>('.search-scan-btn')?.click();
        await vi.runAllTimersAsync();
        const call = vi.mocked(startScanner).mock.calls.at(-1);
        if (!call) throw new Error('the camera did not start');
        return call[1];
      }

      const overlayOpen = (): boolean =>
        root.querySelector<HTMLElement>('.scan-overlay')?.hidden === false;

      beforeEach(() => {
        vi.mocked(startScanner).mockClear();
        vi.mocked(stopScanner).mockClear();
      });

      it('a scanned code fills the field and searches it', async () => {
        searchAnswers['4006381333931'] = {
          items: [
            resultItem('Beans', kitchen, { matched: 'barcode', barcodes: ['4006381333931'] }),
          ],
          truncated: false,
        };
        await mount('/kitchen_id');
        await openSearch();
        const detected = await scan();
        expect(overlayOpen()).toBe(true);
        expect(root.querySelector('.scan-overlay__viewport')).not.toBeNull();

        detected('4006381333931');
        await vi.runAllTimersAsync();

        expect(overlayOpen()).toBe(false);
        expect(stopScanner).toHaveBeenCalledTimes(1);
        expect(field()?.value).toBe('4006381333931');
        expect(replaceState).toHaveBeenLastCalledWith(
          null,
          '',
          '/simple-inventory/search?q=4006381333931',
        );
        expect(searchCalls()).toEqual([{ type: WS_COMMANDS.SEARCH, query: '4006381333931' }]);
        expect(rowNames()).toEqual(['Beans']);
        expect(document.activeElement).toBe(field());
      });

      it('Escape closes the scanner first and stays in search', async () => {
        await mount('/kitchen_id');
        await openSearch();
        await scan();

        root
          .querySelector('.scan-overlay__close')
          ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(stopScanner).toHaveBeenCalledTimes(1);
        expect(overlayOpen()).toBe(false);
        expect(field()).not.toBeNull();
        expect(document.activeElement).toBe(root.querySelector('.search-scan-btn'));
      });

      it('leaving search stops the camera', async () => {
        await mount('/kitchen_id');
        await openSearch();
        await scan();

        // Back to the tab (HA sets the route).
        await goTo('/kitchen_id');

        expect(stopScanner).toHaveBeenCalledTimes(1);
        expect(overlayOpen()).toBe(false);
      });

      it('detaching the panel stops the camera', async () => {
        await mount('/kitchen_id');
        await openSearch();
        await scan();

        panel.disconnectedCallback();

        expect(stopScanner).toHaveBeenCalledTimes(1);
        expect(overlayOpen()).toBe(false);
      });

      it("asks the app's scanner with the panel's hass", async () => {
        await mount('/kitchen_id');
        await openSearch();

        await scan();

        expect(nativeScanner).toHaveBeenCalledWith(mountedHass);
      });
    });
  });

  describe('home', () => {
    const home = (): HTMLElement | null => root.querySelector<HTMLElement>('.home:not([hidden])');
    const homeRows = (): HTMLElement[] => [
      ...root.querySelectorAll<HTMLElement>('.home .search-result'),
    ];
    const overviewCalls = (): number =>
      vi
        .mocked(mountedHass.callWS)
        .mock.calls.filter(([message]) => JSON.stringify(message).includes(WS_COMMANDS.OVERVIEW))
        .length;

    beforeEach(() => {
      vi.mocked(fetchFeatures).mockResolvedValue(['search', 'overview']);
      overviewAnswer = overview({
        inventories: [
          summary(kitchen, {
            total_items: 4,
            total_value: 10,
            attention: { expired: 1, expiring_soon: 0, out_of_stock: 0, low_stock: 0 },
          }),
          summary(pantry, {
            total_items: 8,
            attention: { expired: 0, expiring_soon: 0, out_of_stock: 0, low_stock: 7 },
          }),
        ],
        expired: [entry('Milk', kitchen, expired(2))],
        low_stock: Array.from({ length: 7 }, (_, index) =>
          entry(`Rice ${index + 1}`, pantry, low(2, 1)),
        ),
      });
    });

    it('puts a Home tab first and makes it the default route', async () => {
      await mount('');
      expect(replaceState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/home');
      expect(locationEvents.at(-1)?.detail).toEqual({ replace: true });

      await goTo('/home');
      expect(tabs().map((element) => element.textContent)).toEqual(['Home', 'Kitchen', 'Pantry']);
      expect(tab('Home').querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:home-outline');
      expect(tab('Home').getAttribute('aria-selected')).toBe('true');
      expect(home()).not.toBeNull();
      expect(createInventoryCard).not.toHaveBeenCalled();

      replaceState.mockClear();
      await goTo('/gone');
      expect(replaceState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/home');
    });

    it.each(['', '/gone'])(
      'waits for the features before redirecting the route "%s" to Home',
      async (path) => {
        let resolveFeatures: (features: string[]) => void = () => undefined;
        vi.mocked(fetchFeatures).mockReturnValue(
          new Promise((resolve) => {
            resolveFeatures = resolve;
          }),
        );

        await mount(path);

        expect(root.textContent).toContain('Loading inventories…');
        expect(replaceState).not.toHaveBeenCalled();
        expect(locationEvents).toHaveLength(0);

        resolveFeatures(['search', 'overview']);
        await vi.runAllTimersAsync();

        expect(replaceState).toHaveBeenCalledTimes(1);
        expect(replaceState).toHaveBeenCalledWith(null, '', '/simple-inventory/home');
      },
    );

    it('has no Home tab without the overview feature', async () => {
      vi.mocked(fetchFeatures).mockResolvedValue(['search']);

      await mount('/home');

      expect(replaceState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/kitchen_id');
      await goTo('/kitchen_id');
      expect(tabs().map((element) => element.textContent)).toEqual(['Kitchen', 'Pantry']);
      expect(overviewCalls()).toBe(0);
    });

    it('moves from Home to the inventory tabs with the arrow keys', async () => {
      await mount('/home');

      tab('Home').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/kitchen_id');
      tab('Home').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
    });

    it('shows the summaries; a tap goes to that inventory', async () => {
      await mount('/home');

      const cardsShown = [...root.querySelectorAll<HTMLElement>('.home-summary')];
      expect(
        cardsShown.map((card) => card.querySelector('.home-summary__name')?.textContent),
      ).toEqual(['Kitchen', 'Pantry']);
      cardsShown[1].click();

      expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
      expect(locationEvents.at(-1)?.detail).toEqual({ replace: false });
    });

    it('expands a section in place, and collapses it again after leaving Home', async () => {
      await mount('/home');
      expect(homeRows()).toHaveLength(6);

      root.querySelector<HTMLElement>('.home-show-all[data-section="low_stock"]')?.click();
      expect(homeRows()).toHaveLength(8);
      expect(overviewCalls()).toBe(1);

      await goTo('/kitchen_id');
      expect(home()).toBeNull();
      await goTo('/home');

      expect(homeRows()).toHaveLength(6);
    });

    it('+ on a row increments it in its inventory', async () => {
      await mount('/home');

      const rice = homeRows().find((row) => row.dataset.name === 'Rice 1');
      rice?.querySelector<HTMLElement>('[data-action="increment"]')?.click();

      expect(mountedHass.callService).toHaveBeenCalledWith('simple_inventory', 'increment_item', {
        inventory_id: 'pantry_id',
        name: 'Rice 1',
        amount: 1,
      });
    });

    it('opens a row in its tab; back returns to Home', async () => {
      await mount('/home');

      homeRows()[0].querySelector<HTMLElement>('[data-action="search-open"]')?.click();
      expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/kitchen_id');
      await goTo('/kitchen_id');
      const kitchenCard = cards().find((card) => card.dataset.entity === kitchen.entity_id);
      expect(kitchenCard?.openItem).toHaveBeenCalledWith('Milk');
      expect(home()).toBeNull();

      await goTo('/home');
      expect(home()).not.toBeNull();
      expect(kitchenCard?.hidden).toBe(true);
    });

    it('re-fetches the overview 500 ms after the last of a burst of updates', async () => {
      await mount('/home');
      expect(overviewCalls()).toBe(1);

      connection.push({ event: 'updated' });
      await vi.advanceTimersByTimeAsync(100);
      connection.push({ event: 'updated' });
      await vi.advanceTimersByTimeAsync(100);
      connection.push({ event: 'updated' });
      await vi.advanceTimersByTimeAsync(499);
      expect(overviewCalls()).toBe(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(overviewCalls()).toBe(2);
    });

    it('shares one live subscription between Home and search, closed on a tab', async () => {
      await mount('/home');
      expect(connection.subscribeMessage).toHaveBeenCalledTimes(1);
      expect(connection.subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
        type: WS_COMMANDS.SUBSCRIBE,
      });

      root.querySelector<HTMLElement>('.search-open-btn')?.click();
      await vi.runAllTimersAsync();
      expect(tab('Home').getAttribute('aria-selected')).toBe('false');
      expect(home()).toBeNull();

      root.querySelector<HTMLElement>('.search-close-btn')?.click();
      await vi.runAllTimersAsync();
      expect(replaceState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/home');
      expect(home()).not.toBeNull();
      expect(connection.subscribeMessage).toHaveBeenCalledTimes(1);
      expect(connection.unsubscribe).not.toHaveBeenCalled();

      await goTo('/kitchen_id');
      expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('closes the live subscription when detached on Home', async () => {
      await mount('/home');

      panel.disconnectedCallback();

      expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('widens the content on Home only', async () => {
      await mount('/home');
      const content = root.querySelector('.content');
      expect(content?.classList.contains('wide')).toBe(true);

      await goTo('/kitchen_id');
      expect(content?.classList.contains('wide')).toBe(false);
    });

    it('shows a failed overview with a Retry that loads it again', async () => {
      const answer = overviewAnswer;
      overviewAnswer = undefined;
      await mount('/home');
      expect(home()?.textContent).toContain('Could not load the overview: Boom');

      overviewAnswer = answer;
      root.querySelector<HTMLElement>('.home-retry-btn')?.click();
      await vi.runAllTimersAsync();

      expect(homeRows()).toHaveLength(6);
    });

    it('fetches the overview again when an inventory is added, so its summary appears', async () => {
      await mount('/home');
      expect(overviewCalls()).toBe(1);
      const garage: InventorySummary = { ...pantry, id: 'garage_id', name: 'Garage' };
      respond({ status: 'ok', inventories: [garage, kitchen, pantry] });
      overviewAnswer = overview({
        ...overviewAnswer,
        inventories: [summary(garage, { total_items: 1 }), ...(overviewAnswer?.inventories ?? [])],
      });

      mountedHass = sensors('kitchen', 'pantry', 'garage');
      panel.hass = mountedHass;
      await vi.runAllTimersAsync();

      // One fetch through the new hass: without the nudge there would be none.
      expect(overviewCalls()).toBe(1);
      expect(
        [...root.querySelectorAll('.home-summary__name')].map((name) => name.textContent),
      ).toEqual(['Garage', 'Kitchen', 'Pantry']);
      expect(tabs().map((element) => element.textContent)).toEqual([
        'Home',
        'Garage',
        'Kitchen',
        'Pantry',
      ]);
    });
  });

  describe('item page', () => {
    const pantryCard = (): FakeCard | undefined =>
      cards().find((card) => card.dataset.entity === pantry.entity_id);

    function sendFromCard(card: FakeCard | undefined, type: string, detail: object): void {
      card?.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
    }

    it("opens a tile's item: pushes its route, marked as opened from the tab", async () => {
      await mount('/pantry_id');

      sendFromCard(pantryCard(), ITEM_EVENTS.OPEN, {
        inventory_id: 'pantry_id',
        item_id: 'apples',
      });

      expect(pushState).toHaveBeenCalledWith(
        { simpleInventoryItemFrom: 'pantry_id' },
        '',
        '/simple-inventory/pantry_id/item/apples',
      );
      expect(locationEvents.at(-1)?.detail).toEqual({ replace: false });
    });

    it("shows the item route in its inventory's card, with the tab selected", async () => {
      await mount('/pantry_id');
      const card = pantryCard();

      await goTo('/pantry_id/item/apples');

      expect(card?.showItem).toHaveBeenLastCalledWith('apples');
      expect(card?.hidden).toBe(false);
      expect(tab('Pantry').getAttribute('aria-selected')).toBe('true');
      expect(createInventoryCard).toHaveBeenCalledTimes(1);
    });

    it('opens a deep link to an item page in a card created for it', async () => {
      await mount('/pantry_id/item/apples');

      expect(createInventoryCard).toHaveBeenCalledWith('sensor.pantry_inventory');
      expect(pantryCard()?.showItem).toHaveBeenCalledWith('apples');
      expect(replaceState).not.toHaveBeenCalled();
    });

    it('passes a malformed item segment on as it is (the card shows it is gone)', async () => {
      await mount('/pantry_id/item/%E0%A4%A');

      expect(pantryCard()?.showItem).toHaveBeenCalledWith('%E0%A4%A');
      expect(tab('Pantry').getAttribute('aria-selected')).toBe('true');
    });

    it('shows the list again in the same card on the tab route', async () => {
      await mount('/pantry_id/item/apples');
      const card = pantryCard();
      card?.showList.mockClear();

      await goTo('/pantry_id');

      expect(card?.showList).toHaveBeenCalledTimes(1);
      expect(pantryCard()).toBe(card);
      expect(createInventoryCard).toHaveBeenCalledTimes(1);
    });

    it('a click on the selected tab leaves the item page for the list', async () => {
      await mount('/pantry_id/item/apples');

      tab('Pantry').click();

      expect(pushState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
    });

    it('goes back in the history when the page was opened from the tab', async () => {
      const back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
      await mount('/pantry_id/item/apples');
      History.prototype.replaceState.call(
        history,
        { simpleInventoryItemFrom: 'pantry_id' },
        '',
        '/simple-inventory/pantry_id/item/apples',
      );

      sendFromCard(pantryCard(), ITEM_EVENTS.CLOSE, { inventory_id: 'pantry_id' });

      expect(back).toHaveBeenCalledTimes(1);
      expect(replaceState).not.toHaveBeenCalled();
    });

    it('replaces the deep-linked page with the tab when there is nothing to go back to', async () => {
      const back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
      await mount('/pantry_id/item/apples');

      sendFromCard(pantryCard(), ITEM_EVENTS.CLOSE, { inventory_id: 'pantry_id' });

      expect(back).not.toHaveBeenCalled();
      expect(replaceState).toHaveBeenLastCalledWith(null, '', '/simple-inventory/pantry_id');
      expect(locationEvents.at(-1)?.detail).toEqual({ replace: true });
    });

    it('ignores item events without both ids', async () => {
      await mount('/pantry_id');

      sendFromCard(pantryCard(), ITEM_EVENTS.OPEN, { inventory_id: 'pantry_id' });

      expect(pushState).not.toHaveBeenCalled();
    });
  });
});
