import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { TranslationManager } from '../../src/services/translationManager';
import { RenderingCoordinator } from '../../src/services/renderingCoordinator';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import { CSS_CLASSES, ELEMENTS, WS_COMMANDS } from '../../src/utils/constants';
import { createMockHassEntity, createMockHomeAssistant, fakeConnection } from '../testHelpers';
import { startScanner, stopScanner } from '../../src/services/barcodeScanner';

/** The camera (Quagga) is not available in jsdom: one fake session, like the real module's. */
const camera = vi.hoisted(() => ({ active: false }));
vi.mock('../../src/services/barcodeScanner', () => ({
  startScanner: vi.fn(async () => {
    camera.active = true;
    return null;
  }),
  stopScanner: vi.fn(() => {
    camera.active = false;
  }),
  isScannerActive: vi.fn(() => camera.active),
  scanSupport: vi.fn(() => 'live'),
  chooseBarcodePhoto: vi.fn(async () => null),
  nativeScanner: vi.fn(() => undefined),
  startNativeScanner: vi.fn(),
}));

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

/** Document-level listeners currently registered, keyed by type and capture phase. */
const liveDocumentListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

function listenerKey(type: string, options?: boolean | EventListenerOptions): string {
  const capture = typeof options === 'boolean' ? options : options?.capture === true;
  return `${type}${capture ? ' (capture)' : ''}`;
}

describe('card connect / disconnect / reconnect (integration)', () => {
  let card: SimpleInventoryCard;
  let root: HTMLElement;
  let wsTypes: string[];
  let changes: number;
  let features: string[];

  function makeHass(): HomeAssistant {
    const hass = createMockHomeAssistant({
      'sensor.pantry': createMockHassEntity('sensor.pantry', {
        state: '1',
        last_changed: `2026-10-26T10:00:${String(changes).padStart(2, '0')}Z`,
        attributes: { inventory_id: 'pantry' },
      }),
    });
    hass.callWS = vi.fn().mockImplementation(async (msg: { type: string }) => {
      wsTypes.push(msg.type);
      if (msg.type === WS_COMMANDS.LIST_ITEMS) {
        const item = (name: string): InventoryItem => ({
          id: name.toLowerCase(),
          image: '1',
          name,
          quantity: 3,
          unit: '',
          description: '',
          category: '',
          location: '',
          expiry_date: '',
          todo_list: '',
          auto_add_enabled: false,
          auto_add_id_to_description_enabled: false,
          batches: [],
        });
        return { items: [item('Apples'), item('Bananas')] };
      }
      return { version: '0.10.0', api_version: 2, features };
    });
    hass.fetchWithAuth = vi.fn(async () => new Response('img', { status: 200 }));
    return hass;
  }

  function liveCount(key: string): number {
    return liveDocumentListeners.get(key)?.size ?? 0;
  }

  function rowNames(): string[] {
    return Array.from(root.querySelectorAll('.items-container .item-name')).map(
      (name) => name.textContent ?? '',
    );
  }

  async function typeSearch(text: string): Promise<void> {
    const input = root.querySelector<HTMLInputElement>(`#${ELEMENTS.SEARCH_INPUT}`);
    if (!input) throw new Error('no search input');
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(300);
  }

  async function mountCard(): Promise<void> {
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
    liveDocumentListeners.clear();
    const add = document.addEventListener.bind(document);
    const remove = document.removeEventListener.bind(document);
    vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
      const key = listenerKey(type, options);
      const set = liveDocumentListeners.get(key) ?? new Set();
      set.add(listener);
      liveDocumentListeners.set(key, set);
      add(type, listener, options);
    });
    vi.spyOn(document, 'removeEventListener').mockImplementation((type, listener, options) => {
      liveDocumentListeners.get(listenerKey(type, options))?.delete(listener);
      remove(type, listener, options);
    });
    vi.spyOn(TranslationManager, 'loadTranslations').mockResolvedValue({
      items: { no_items: 'No items' },
    });
    wsTypes = [];
    changes = 0;
    features = ['batches'];
    localStorage.clear(); // saved filters would carry over between tests
    await mountCard();
  });

  afterEach(() => {
    card.disconnectedCallback();
    root.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('holds exactly one Esc and one press listener while connected, none while detached', async () => {
    expect(liveCount('keydown')).toBe(1);
    expect(liveCount('pointerdown (capture)')).toBe(1);

    card.disconnectedCallback();
    expect(liveCount('keydown')).toBe(0);
    expect(liveCount('pointerdown (capture)')).toBe(0);

    for (let cycle = 0; cycle < 3; cycle += 1) {
      card.connectedCallback();
      await vi.advanceTimersByTimeAsync(300);
      expect(liveCount('keydown')).toBe(1);
      expect(liveCount('pointerdown (capture)')).toBe(1);
      card.disconnectedCallback();
    }
    card.connectedCallback();
    await vi.advanceTimersByTimeAsync(300);
    expect(liveCount('keydown')).toBe(1);
  });

  it('still opens and Esc-closes a sheet after being re-attached', async () => {
    card.disconnectedCallback();
    card.connectedCallback();
    await vi.advanceTimersByTimeAsync(300);

    root.querySelector<HTMLElement>(`#${ELEMENTS.OPEN_ADD_MODAL}`)?.click();
    const sheet = root.querySelector<HTMLElement>(`#${ELEMENTS.ADD_MODAL}`);
    expect(sheet?.classList.contains(CSS_CLASSES.SHOW)).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(sheet?.classList.contains(CSS_CLASSES.SHOW)).toBe(false);
  });

  it('keeps an open sheet, an open restock form and an expanded panel across a re-attach', async () => {
    root.querySelector<HTMLElement>('[data-action="toggle_batches"][data-name="Apples"]')?.click();
    root.querySelector<HTMLElement>('[data-action="open_restock"][data-name="Apples"]')?.click();
    const form = root.querySelector<HTMLElement>('.restock-form');
    const panel = root.querySelector<HTMLElement>('.item-details-panel');
    root
      .querySelector<HTMLElement>('.si-row__open')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const sheet = root.querySelector<HTMLElement>(`#${ELEMENTS.EDIT_MODAL}`);
    expect(sheet?.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    expect(form?.hidden).toBe(false);
    const fetched = wsTypes.filter((type) => type === WS_COMMANDS.LIST_ITEMS).length;

    // HA's masonry view moves the same element to another column.
    card.disconnectedCallback();
    card.connectedCallback();
    await vi.advanceTimersByTimeAsync(300);

    expect(sheet?.isConnected).toBe(true);
    expect(sheet?.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    expect(form?.isConnected).toBe(true);
    expect(form?.hidden).toBe(false);
    expect(panel?.isConnected).toBe(true);
    expect(panel?.hidden).toBe(false);
    expect(wsTypes.filter((type) => type === WS_COMMANDS.LIST_ITEMS).length).toBe(fetched);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(sheet?.classList.contains(CSS_CLASSES.SHOW)).toBe(false);
  });

  it('catches up on an update that arrived while detached, once re-attached', async () => {
    const fetched = (): number => wsTypes.filter((type) => type === WS_COMMANDS.LIST_ITEMS).length;
    const before = fetched();

    card.disconnectedCallback();
    changes += 1;
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
    expect(fetched()).toBe(before);

    card.connectedCallback();
    await vi.advanceTimersByTimeAsync(300);
    expect(fetched()).toBe(before + 1);
  });

  it('filters live while typing after a full re-render and after re-attach, once per pause', async () => {
    const updateList = vi.spyOn(RenderingCoordinator.prototype, 'updateItemsOnly');
    await typeSearch('ban');
    expect(rowNames()).toEqual(['Bananas']);
    await typeSearch('');

    // A full render (here a sort change) replaces the search box.
    const sort = root.querySelector<HTMLSelectElement>(`#${ELEMENTS.SORT_METHOD}`);
    if (!sort) throw new Error('no sort select');
    sort.value = 'quantity';
    sort.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(300);
    updateList.mockClear();
    await typeSearch('app');
    expect(rowNames()).toEqual(['Apples']);
    expect(updateList).toHaveBeenCalledTimes(1);

    card.disconnectedCallback();
    card.connectedCallback();
    await vi.advanceTimersByTimeAsync(300);
    updateList.mockClear();
    await typeSearch('ban');
    expect(rowNames()).toEqual(['Bananas']);
    expect(updateList).toHaveBeenCalledTimes(1);
  });

  it('drops a live search still waiting for a typing pause when detached', async () => {
    const updateList = vi.spyOn(RenderingCoordinator.prototype, 'updateItemsOnly');
    const input = root.querySelector<HTMLInputElement>(`#${ELEMENTS.SEARCH_INPUT}`);
    if (!input) throw new Error('no search input');
    input.value = 'ban';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    card.disconnectedCallback();
    await vi.advanceTimersByTimeAsync(300);

    expect(updateList).not.toHaveBeenCalled();
  });

  describe('item images', () => {
    let blobs: number;
    let revoked: Set<string>;

    function thumbSources(): Array<string | null> {
      return Array.from(root.querySelectorAll('.items-container .si-photo__img')).map((img) =>
        img.getAttribute('src'),
      );
    }

    beforeEach(async () => {
      blobs = 0;
      revoked = new Set();
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: vi.fn<(blob: Blob) => string>(() => `blob:test/${++blobs}`),
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: vi.fn<(url: string) => void>((url) => {
          revoked.add(url);
        }),
      });
      card.disconnectedCallback();
      root.remove();
      features = ['batches', 'item_images'];
      await mountCard();
    });

    afterEach(() => {
      Reflect.deleteProperty(URL, 'createObjectURL');
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    });

    it('keeps the blobs for a re-attach within a minute', async () => {
      const before = thumbSources();
      expect(before).toEqual(['blob:test/1', 'blob:test/2']);

      card.disconnectedCallback();
      await vi.advanceTimersByTimeAsync(59_000);
      card.connectedCallback();
      await vi.advanceTimersByTimeAsync(120_000);

      expect(revoked.size).toBe(0);
      expect(thumbSources()).toEqual(before);
    });

    it('frees the blobs of a card detached for a minute and reloads them on re-attach', async () => {
      const before = thumbSources();

      card.disconnectedCallback();
      await vi.advanceTimersByTimeAsync(60_000);
      expect([...revoked].sort()).toEqual([...before].sort());
      // Freed while detached, but the images keep their (decoded) src: no broken flash.
      expect(thumbSources()).toEqual(before);

      card.connectedCallback();
      await vi.advanceTimersByTimeAsync(300);

      const after = thumbSources();
      expect(after).toHaveLength(2);
      for (const src of after) {
        expect(src).toMatch(/^blob:test\//);
        expect(revoked.has(src ?? '')).toBe(false);
      }
    });
  });

  describe('barcode scanner', () => {
    function button(id: string): HTMLElement {
      const el = root.querySelector<HTMLElement>(`#${id}`);
      if (!el) throw new Error(`no #${id}`);
      return el;
    }

    beforeEach(() => {
      camera.active = false;
      vi.mocked(startScanner).mockClear();
      vi.mocked(stopScanner).mockClear();
    });

    it('stops the header scan panel camera when detached and restarts it on re-attach', async () => {
      button(ELEMENTS.HEADER_SCAN_BTN).click();
      await vi.advanceTimersByTimeAsync(0);
      expect(camera.active).toBe(true);

      card.disconnectedCallback();
      expect(stopScanner).toHaveBeenCalled();
      expect(camera.active).toBe(false);

      card.connectedCallback();
      await vi.advanceTimersByTimeAsync(0);
      expect(startScanner).toHaveBeenCalledTimes(2);
      expect(vi.mocked(startScanner).mock.calls[1]?.[0]).toBe(button(ELEMENTS.SCAN_VIEWPORT));
      expect(camera.active).toBe(true);
    });

    it('keeps the restarted scan panel through the re-attach catch-up refresh, then catches up', async () => {
      const fetched = (): number =>
        wsTypes.filter((type) => type === WS_COMMANDS.LIST_ITEMS).length;
      // Subscribed to live updates: pushes missed while detached are fetched on re-attach.
      const hass = makeHass();
      hass.connection = fakeConnection();
      card.hass = hass;
      await vi.advanceTimersByTimeAsync(300);
      button(ELEMENTS.HEADER_SCAN_BTN).click();
      await vi.advanceTimersByTimeAsync(0);
      const before = fetched();

      card.disconnectedCallback();
      card.connectedCallback();
      await vi.advanceTimersByTimeAsync(300);

      // A render would replace the panel and leave the camera filming a detached viewport.
      const viewport = vi.mocked(startScanner).mock.calls[1]?.[0];
      expect(viewport?.isConnected).toBe(true);
      expect(button(ELEMENTS.SCAN_PANEL).hidden).toBe(false);
      expect(fetched()).toBe(before);

      button(ELEMENTS.SCAN_CLOSE).click();
      await vi.advanceTimersByTimeAsync(300);
      expect(fetched()).toBe(before + 1);
    });

    it('holds an entity change that arrives while scanning and refreshes when the panel closes', async () => {
      const fetched = (): number =>
        wsTypes.filter((type) => type === WS_COMMANDS.LIST_ITEMS).length;
      button(ELEMENTS.HEADER_SCAN_BTN).click();
      await vi.advanceTimersByTimeAsync(0);
      const before = fetched();

      changes += 1;
      card.hass = makeHass();
      await vi.advanceTimersByTimeAsync(300);
      expect(fetched()).toBe(before);
      expect(button(ELEMENTS.SCAN_PANEL).hidden).toBe(false);

      button(ELEMENTS.SCAN_CLOSE).click();
      await vi.advanceTimersByTimeAsync(300);
      expect(fetched()).toBe(before + 1);
    });

    it("stops the add sheet's scanner when detached and restarts it on re-attach", async () => {
      button(ELEMENTS.OPEN_ADD_MODAL).click();
      await vi.advanceTimersByTimeAsync(0);
      button(`add-${ELEMENTS.BARCODE_SCAN_BTN}`).click();
      await vi.advanceTimersByTimeAsync(0);
      expect(camera.active).toBe(true);

      card.disconnectedCallback();
      expect(camera.active).toBe(false);

      card.connectedCallback();
      await vi.advanceTimersByTimeAsync(0);
      expect(startScanner).toHaveBeenCalledTimes(2);
      expect(vi.mocked(startScanner).mock.calls[1]?.[0]).toBe(
        button(`add-${ELEMENTS.BARCODE_VIEWPORT}`),
      );
    });

    it('does not restart a scanner whose sheet was closed', async () => {
      button(ELEMENTS.OPEN_ADD_MODAL).click();
      await vi.advanceTimersByTimeAsync(0);
      button(`add-${ELEMENTS.BARCODE_SCAN_BTN}`).click();
      await vi.advanceTimersByTimeAsync(0);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      card.disconnectedCallback();
      card.connectedCallback();
      await vi.advanceTimersByTimeAsync(0);

      expect(startScanner).toHaveBeenCalledTimes(1);
      expect(camera.active).toBe(false);
    });

    it('does not open a camera when nothing was scanning', async () => {
      card.disconnectedCallback();
      card.connectedCallback();
      await vi.advanceTimersByTimeAsync(0);

      expect(startScanner).not.toHaveBeenCalled();
    });
  });
});
