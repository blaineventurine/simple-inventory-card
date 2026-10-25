import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { LIVE_UPDATE_DELAY_MS } from '../../src/services/liveUpdates';
import { DETAIL_HISTORY_ID_PREFIX } from '../../src/services/detailView';
import { TranslationManager } from '../../src/services/translationManager';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import { CSS_CLASSES, ELEMENTS, ITEM_EVENTS, WS_COMMANDS } from '../../src/utils/constants';
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
    isConnected = true;
    constructor() {
      const root = document.createElement('div');
      // `host` stands in for the card element (the card mirrors its layout and view on it).
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
    attributeChangedCallback(): void {}
  },
  css: vi.fn((strings: TemplateStringsArray) => ({
    cssText: strings.join(''),
    toString: () => strings.join(''),
  })),
}));

const FULL = '/api/simple_inventory/image/apples?v=1';
/** The Consumption segment of the page's history. */
const PAGE_CONSUMPTION_TAB = `#${DETAIL_HISTORY_ID_PREFIX}${ELEMENTS.HISTORY_TAB_CONSUMPTION}`;

function apples(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'apples',
    image: '1',
    name: 'Apples',
    quantity: 3,
    unit: 'kg',
    description: 'Crunchy',
    category: 'Fruit',
    categories: ['Fruit'],
    location: 'Pantry',
    locations: ['Pantry', 'Garage'],
    price: 2,
    expiry_date: '2026-11-01',
    expiry_alert_days: 3,
    todo_list: 'todo.shopping',
    auto_add_enabled: true,
    auto_add_to_list_quantity: 1,
    desired_quantity: 5,
    auto_add_id_to_description_enabled: false,
    barcodes: ['4006381333931'],
    aliases: ['Malus'],
    batches: [
      {
        id: 'b1',
        quantity: 1,
        expiry_date: '2026-11-01',
        location: 'Pantry',
        unit_price: 0,
        purchased_at: '2026-10-01',
      },
      {
        id: 'b2',
        quantity: 2,
        expiry_date: '2026-12-01',
        location: 'Garage',
        unit_price: 0,
        purchased_at: '2026-10-02',
      },
    ],
    ...overrides,
  };
}

function bananas(): InventoryItem {
  return {
    id: 'bananas',
    name: 'Bananas',
    quantity: 0,
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

describe('item detail view in the card (integration)', () => {
  let card: SimpleInventoryCard;
  let root: HTMLElement;
  let host: Element;
  let items: InventoryItem[];
  let connection: FakeConnection;
  let wsCalls: Array<{ type: string; item_name?: string; window_days?: number }>;
  let releaseLoads: Array<() => void> | undefined;
  let scrollTo: ReturnType<typeof vi.spyOn>;

  function makeHass(): HomeAssistant {
    const hass = createMockHomeAssistant({
      'sensor.pantry': createMockHassEntity('sensor.pantry', {
        state: '2',
        attributes: { inventory_id: 'pantry' },
      }),
      'todo.shopping': createMockHassEntity('todo.shopping', {
        attributes: { friendly_name: 'Shopping' },
      }),
    });
    hass.connection = connection;
    hass.callWS = vi.fn().mockImplementation((msg: { type: string; item_name?: string }) => {
      wsCalls.push(msg);
      if (msg.type === WS_COMMANDS.LIST_ITEMS) {
        const answer = { items };
        if (releaseLoads) {
          // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
          return new Promise((resolve) => {
            releaseLoads?.push(() => resolve(answer));
          });
        }
        return Promise.resolve(answer);
      }
      if (msg.type === WS_COMMANDS.GET_HISTORY) {
        return Promise.resolve({ events: [] });
      }
      if (msg.type === WS_COMMANDS.GET_ITEM_CONSUMPTION_RATES) {
        return Promise.resolve({
          item_name: msg.item_name ?? '',
          current_quantity: 3,
          unit: 'kg',
          decrement_count: 0,
          total_consumed: 0,
          window_days: null,
          daily_rate: null,
          weekly_rate: null,
          days_until_depletion: null,
          avg_restock_days: null,
          has_sufficient_data: false,
          daily_spend_rate: null,
          weekly_spend_rate: null,
          total_spend: null,
        });
      }
      return Promise.resolve({
        version: '0.12.0',
        api_version: 3,
        features: ['batches', 'transfers', 'item_images', 'item_icons'],
      });
    });
    hass.fetchWithAuth = vi.fn(async () => new Response('img', { status: 200 }));
    return hass;
  }

  async function mount(): Promise<void> {
    card = new SimpleInventoryCard();
    root = card.shadowRoot as unknown as HTMLElement; // the mocked shadow root is a <div>
    host = must(card.shadowRoot?.host);
    document.body.append(root);
    card.setConfig({ type: 'custom:simple-inventory-card', entity: 'sensor.pantry' });
    card.connectedCallback();
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
  }

  async function openApples(): Promise<void> {
    card.showItem('apples');
    await vi.advanceTimersByTimeAsync(0);
  }

  async function push(next: InventoryItem[]): Promise<void> {
    items = next;
    connection.push({ items: next });
    await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);
  }

  const page = (): HTMLElement => must(root.querySelector<HTMLElement>('.si-detail'));
  const list = (): HTMLElement => must(root.querySelector<HTMLElement>('.si-list'));
  const text = (element: Element | null | undefined): string =>
    (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const fact = (name: string): string =>
    text(page().querySelector(`.si-detail__fact[data-fact="${name}"] dd`));
  const historyCalls = (): number =>
    wsCalls.filter((call) => call.type === WS_COMMANDS.GET_HISTORY).length;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-30T12:00:00'));
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn<(blob: Blob) => string>(() => 'blob:test'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn<(url: string) => void>(),
    });
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(TranslationManager, 'loadTranslations').mockResolvedValue({
      items: { no_items: 'No items' },
    });
    localStorage.clear();
    items = [apples(), bananas()];
    connection = fakeConnection();
    wsCalls = [];
    releaseLoads = undefined;
  });

  afterEach(() => {
    card.disconnectedCallback();
    root.remove();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('showItem / showList', () => {
    it('waits for the first load, then shows the page instead of the list', async () => {
      releaseLoads = [];
      card = new SimpleInventoryCard();
      root = card.shadowRoot as unknown as HTMLElement; // the mocked shadow root is a <div>
      host = must(card.shadowRoot?.host);
      document.body.append(root);
      card.setConfig({ type: 'custom:simple-inventory-card', entity: 'sensor.pantry' });
      card.connectedCallback();
      card.showItem('apples');
      card.hass = makeHass();
      await vi.advanceTimersByTimeAsync(300);
      expect(host.getAttribute('view')).not.toBe('detail');

      releaseLoads.splice(0).forEach((release) => release());
      await vi.advanceTimersByTimeAsync(0);

      expect(host.getAttribute('view')).toBe('detail');
      expect(list().hidden).toBe(true);
      expect(page().hidden).toBe(false);
      expect(text(page().querySelector('.si-detail__name'))).toBe('Apples');
    });

    it('swaps back to the same list, with its search, and the view attribute follows', async () => {
      await mount();
      expect(host.getAttribute('view')).toBe('list');
      const search = must(root.querySelector<HTMLInputElement>(`#${ELEMENTS.SEARCH_INPUT}`));
      search.value = 'app';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(300);
      const shownList = list();
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 420 });

      await openApples();
      expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
      card.showList();

      expect(host.getAttribute('view')).toBe('list');
      expect(list()).toBe(shownList);
      expect(shownList.hidden).toBe(false);
      expect(page().hidden).toBe(true);
      expect(root.querySelector(`#${ELEMENTS.SEARCH_INPUT}`)).toBe(search);
      expect(search.value).toBe('app');
      expect(
        Array.from(root.querySelectorAll('.items-container .item-name'), (name) => text(name)),
      ).toEqual(['Apples']);
      expect(scrollTo).toHaveBeenLastCalledWith(0, 420);
      Reflect.deleteProperty(window, 'scrollY');
    });

    it('leaves a later showList pending before the load in favour of the list', async () => {
      releaseLoads = [];
      await mount();
      card.showItem('apples');
      card.showList();
      releaseLoads.splice(0).forEach((release) => release());
      await vi.advanceTimersByTimeAsync(0);

      expect(host.getAttribute('view')).toBe('list');
    });
  });

  describe('page content', () => {
    it('heads the page with the back arrow, the name, the status badge and Edit', async () => {
      await mount();
      await openApples();

      expect(page().querySelector('.si-detail__back')).not.toBeNull();
      expect(text(page().querySelector('.si-detail__name'))).toBe('Apples');
      expect(text(page().querySelector('.si-detail__badge'))).toBe('Expiring soon');

      must(page().querySelector<HTMLElement>('.si-detail__edit')).click();
      await vi.advanceTimersByTimeAsync(0);
      const sheet = must(root.querySelector<HTMLElement>(`#${ELEMENTS.EDIT_MODAL}`));
      expect(sheet.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
      expect(root.querySelector<HTMLInputElement>('#edit-name')?.value).toBe('Apples');
      expect(card['_store'].holds()).toEqual([{ kind: 'page', reason: ELEMENTS.EDIT_MODAL }]);
    });

    it('dispatches the back event composed and bubbling, with the inventory id', async () => {
      await mount();
      await openApples();
      const seen: Event[] = [];
      root.addEventListener(ITEM_EVENTS.CLOSE, (event) => seen.push(event));

      must(page().querySelector<HTMLElement>('.si-detail__back')).click();

      const [event] = seen;
      expect(event).toBeInstanceOf(CustomEvent);
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(event instanceof CustomEvent ? event.detail : undefined).toEqual({
        inventory_id: 'pantry',
      });
    });

    it('shows the full photo, which opens the viewer', async () => {
      await mount();
      await openApples();

      const img = must(page().querySelector<HTMLImageElement>('.si-detail__photo'));
      expect(img.getAttribute('data-image-path')).toBe(FULL);
      must(img.closest<HTMLElement>('[data-action="view_image"]')).click();
      await vi.advanceTimersByTimeAsync(0);

      const viewer = must(root.querySelector<HTMLElement>(`#${ELEMENTS.IMAGE_VIEWER}`));
      expect(viewer.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    });

    it('shows the status-tinted icon without a photo', async () => {
      await mount();
      card.showItem('bananas');
      await vi.advanceTimersByTimeAsync(0);

      expect(page().querySelector('.si-detail__photo')).toBeNull();
      const icon = must(page().querySelector('.si-detail__icon'));
      expect(icon.classList.contains('si-tone-disabled')).toBe(true);
      expect(text(page().querySelector('.si-detail__badge'))).toBe('Out of stock');
    });

    it('lists the facts, with chips for barcodes and aliases', async () => {
      await mount();
      await openApples();

      expect(text(page().querySelector('.si-stepper__value'))).toBe('3 kg');
      expect(fact('locations')).toBe('Pantry, Garage');
      expect(fact('categories')).toBe('Fruit');
      expect(fact('price')).toBe('2.00 each · 6.00 in total');
      expect(fact('expiry')).toBe('2026-11-01 · Expires in 2 days');
      expect(fact('auto_add')).toBe('At 1 or less, add up to 5 to Shopping');
      expect(
        Array.from(page().querySelectorAll('[data-fact="barcodes"] .si-chip'), (chip) =>
          text(chip),
        ),
      ).toEqual(['4006381333931']);
      expect(
        Array.from(page().querySelectorAll('[data-fact="aliases"] .si-chip'), (chip) => text(chip)),
      ).toEqual(['Malus']);
      expect(fact('description')).toBe('Crunchy');
    });

    it("lists where the batches are, in batch order, over the item's own locations", async () => {
      items = [
        apples({
          locations: ['Garage freezer'],
          location: 'Garage freezer',
          stocked_locations: ['Bottom drawer', 'Garage freezer'],
        }),
        bananas(),
      ];
      await mount();
      await openApples();

      expect(fact('locations')).toBe('Bottom drawer, Garage freezer');
    });

    it("falls back to the item's own locations when no batch has one", async () => {
      items = [
        apples({ locations: ['Pantry'], location: 'Pantry', stocked_locations: [] }),
        bananas(),
      ];
      await mount();
      await openApples();

      expect(fact('locations')).toBe('Pantry');
    });

    it('hides the facts that are empty', async () => {
      await mount();
      card.showItem('bananas');
      await vi.advanceTimersByTimeAsync(0);

      const shown = Array.from(
        page().querySelectorAll<HTMLElement>('.si-detail__fact'),
        (element) => element.dataset.fact,
      );
      expect(shown).toEqual(['quantity']);
    });

    it('offers the batch panel, whose forms hold background work while open', async () => {
      await mount();
      await openApples();

      expect(page().querySelectorAll('.batch-row')).toHaveLength(2);
      expect(page().querySelector('.batch-move-btn')).not.toBeNull();
      must(page().querySelector<HTMLElement>('.restock-open-btn')).click();
      await vi.advanceTimersByTimeAsync(0);
      expect(must(page().querySelector<HTMLElement>('.restock-form')).hidden).toBe(false);
      expect(card['_store'].holds()).toEqual([{ kind: 'background', reason: 'restock form' }]);

      must(page().querySelector<HTMLElement>('.restock-cancel-btn')).click();
      await vi.advanceTimersByTimeAsync(0);
      expect(card['_store'].holds()).toEqual([]);
    });

    it('releases the hold of a page form when the list comes back, so pushes apply again', async () => {
      await mount();
      await openApples();
      must(page().querySelector<HTMLElement>('.restock-open-btn')).click();
      await vi.advanceTimersByTimeAsync(0);

      card.showList();

      expect(card['_store'].holds()).toEqual([]);
      await push([apples({ quantity: 7 }), bananas()]);
      const appleRow = must(
        Array.from(root.querySelectorAll('.items-container .item-row')).find(
          (row) => text(row.querySelector('.item-name')) === 'Apples',
        ),
      );
      expect(text(appleRow.querySelector('.si-stepper__value'))).toBe('7 kg');
    });

    it('keeps holding while a page form is open, until the form is gone', async () => {
      await mount();
      await openApples();
      must(page().querySelector<HTMLElement>('.restock-open-btn')).click();
      await vi.advanceTimersByTimeAsync(0);

      await push([apples({ quantity: 7 }), bananas()]);

      expect(card['_store'].holds()).toEqual([{ kind: 'background', reason: 'restock form' }]);
      expect(must(page().querySelector<HTMLElement>('.restock-form')).hidden).toBe(false);
      expect(text(page().querySelector('.si-stepper__value'))).toBe('3 kg');

      must(page().querySelector<HTMLElement>('.restock-cancel-btn')).click();
      await vi.advanceTimersByTimeAsync(300);
      expect(card['_store'].holds()).toEqual([]);
      expect(text(page().querySelector('.si-stepper__value'))).toBe('7 kg');
    });

    it("keeps a page form's hold when live filtering re-lists the hidden list", async () => {
      await mount();
      const search = must(root.querySelector<HTMLInputElement>(`#${ELEMENTS.SEARCH_INPUT}`));
      await openApples();
      must(page().querySelector<HTMLElement>('.restock-open-btn')).click();
      await vi.advanceTimersByTimeAsync(0);

      search.value = 'app';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(300);

      expect(card['_store'].holds()).toEqual([{ kind: 'background', reason: 'restock form' }]);
    });

    it('keeps an open form, its typed values and the scroll for a second showItem of the item', async () => {
      await mount();
      await openApples();
      must(page().querySelector<HTMLElement>('.restock-open-btn')).click();
      await vi.advanceTimersByTimeAsync(0);
      const form = must(page().querySelector<HTMLElement>('.restock-form'));
      const amount = must(form.querySelector<HTMLInputElement>('input'));
      amount.value = '4';
      const scrolls = scrollTo.mock.calls.length;

      card.showItem('apples');
      await vi.advanceTimersByTimeAsync(0);

      expect(page().querySelector('.restock-form')).toBe(form);
      expect(form.hidden).toBe(false);
      expect(amount.value).toBe('4');
      expect(scrollTo.mock.calls.length).toBe(scrolls);
      expect(card['_store'].holds()).toEqual([{ kind: 'background', reason: 'restock form' }]);
    });
  });

  describe('history', () => {
    it('loads the history when the page opens, with the segment switch', async () => {
      await mount();
      await openApples();

      expect(wsCalls).toContainEqual(
        expect.objectContaining({ type: WS_COMMANDS.GET_HISTORY, item_name: 'Apples' }),
      );
      // The page's history ids differ from the history sheet's (both can be in the card).
      expect(page().querySelector(`#${ELEMENTS.HISTORY_TAB_CONSUMPTION}`)).toBeNull();
      const section = must(page().querySelector<HTMLElement>('.si-detail__history'));
      must(section.querySelector<HTMLElement>(PAGE_CONSUMPTION_TAB)).click();
      await vi.advanceTimersByTimeAsync(0);

      expect(wsCalls).toContainEqual(
        expect.objectContaining({
          type: WS_COMMANDS.GET_ITEM_CONSUMPTION_RATES,
          item_name: 'Apples',
        }),
      );
      expect(section.querySelector('.window-pill')).not.toBeNull();
    });

    it('keeps the segment through a re-render, and refreshes 500 ms after the item changed', async () => {
      await mount();
      await openApples();
      const section = must(page().querySelector<HTMLElement>('.si-detail__history'));
      must(section.querySelector<HTMLElement>(PAGE_CONSUMPTION_TAB)).click();
      await vi.advanceTimersByTimeAsync(0);
      expect(historyCalls()).toBe(1);

      await push([apples({ quantity: 2 }), bananas()]);
      await vi.advanceTimersByTimeAsync(300);
      await push([apples({ quantity: 1 }), bananas()]);
      // `push` returns once the push rendered: the second change restarted the 500 ms.
      await vi.advanceTimersByTimeAsync(499);
      expect(historyCalls()).toBe(1);
      const kept = must(page().querySelector<HTMLElement>('.si-detail__history'));
      expect(kept.querySelector(PAGE_CONSUMPTION_TAB)?.getAttribute('aria-selected')).toBe('true');

      await vi.advanceTimersByTimeAsync(1);
      expect(historyCalls()).toBe(2);
    });

    it('refreshes only while the page is visible', async () => {
      await mount();
      await openApples();
      card.attributeChangedCallback('hidden', null, '');

      await push([apples({ quantity: 2 }), bananas()]);
      await vi.advanceTimersByTimeAsync(1000);
      expect(historyCalls()).toBe(1);

      card.attributeChangedCallback('hidden', '', null);
      await vi.advanceTimersByTimeAsync(0);
      expect(historyCalls()).toBe(2);
    });

    it('stays paused when a hidden card is re-attached, until it is shown', async () => {
      await mount();
      await openApples();
      card.attributeChangedCallback('hidden', null, '');
      card.disconnectedCallback();
      card.connectedCallback();
      await vi.advanceTimersByTimeAsync(300);

      await push([apples({ quantity: 2 }), bananas()]);
      await vi.advanceTimersByTimeAsync(1000);
      expect(historyCalls()).toBe(1);

      card.attributeChangedCallback('hidden', '', null);
      await vi.advanceTimersByTimeAsync(0);
      expect(historyCalls()).toBe(2);
    });

    it('stops refreshing once the list is back', async () => {
      await mount();
      await openApples();
      card.showList();

      await push([apples({ quantity: 2 }), bananas()]);
      await vi.advanceTimersByTimeAsync(1000);

      expect(historyCalls()).toBe(1);
    });

    it('keeps the history sheet of the edit menu working', async () => {
      await mount();
      await openApples();
      must(page().querySelector<HTMLElement>('.si-detail__edit')).click();
      await vi.advanceTimersByTimeAsync(0);

      must(root.querySelector<HTMLElement>(`#${ELEMENTS.EDIT_HISTORY_BTN}`)).click();
      await vi.advanceTimersByTimeAsync(0);

      const sheet = must(root.querySelector<HTMLElement>(`#${ELEMENTS.HISTORY_MODAL}`));
      expect(sheet.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
      expect(sheet.querySelector(`#${ELEMENTS.HISTORY_TAB_HISTORY}`)).not.toBeNull();
    });
  });

  describe('live behaviour', () => {
    it('re-renders the page on a push', async () => {
      await mount();
      await openApples();

      await push([apples({ quantity: 7 }), bananas()]);

      expect(host.getAttribute('view')).toBe('detail');
      expect(text(page().querySelector('.si-stepper__value'))).toBe('7 kg');
    });

    it('follows a rename in place', async () => {
      await mount();
      await openApples();

      await push([apples({ name: 'Green apples' }), bananas()]);

      expect(host.getAttribute('view')).toBe('detail');
      expect(text(page().querySelector('.si-detail__name'))).toBe('Green apples');
    });

    it('shows the gone state when the item is deleted, without navigating', async () => {
      await mount();
      await openApples();
      const seen: Event[] = [];
      root.addEventListener(ITEM_EVENTS.CLOSE, (event) => seen.push(event));

      await push([bananas()]);

      expect(host.getAttribute('view')).toBe('detail');
      expect(text(page().querySelector('.si-detail__gone p'))).toBe('This item no longer exists');
      expect(seen).toHaveLength(0);
      must(
        page().querySelector<HTMLElement>('.si-detail__gone [data-action="detail_back"]'),
      ).click();
      expect(seen).toHaveLength(1);
    });

    it('shows the gone state for an unknown id', async () => {
      await mount();
      card.showItem('nope');
      await vi.advanceTimersByTimeAsync(0);

      expect(host.getAttribute('view')).toBe('detail');
      expect(text(page().querySelector('.si-detail__gone p'))).toBe('This item no longer exists');
      expect(historyCalls()).toBe(0);
    });
  });
});
