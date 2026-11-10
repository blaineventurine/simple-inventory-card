import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

import {
  INTERACTION_REFRESH_DELAY_MS,
  InventoryStore,
  SAVE_REFRESH_DELAY_MS,
} from '../../src/services/inventoryStore';
import { LIVE_UPDATE_DELAY_MS } from '../../src/services/liveUpdates';
import { TranslationManager } from '../../src/services/translationManager';
import { BackendInfo } from '../../src/types/backendInfo';
import { HomeAssistant, MessageBase } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import { ELEMENTS, WS_COMMANDS } from '../../src/utils/constants';
import {
  SHEET_CLOSED_EVENT,
  hideSheet,
  mountSheet,
  setSheetHolds,
  showSheet,
} from '../../src/services/modals/modalUIManager';
import {
  FakeConnection,
  createMockHassEntity,
  createMockHomeAssistant,
  fakeConnection,
} from '../testHelpers';

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    loadTranslations: vi.fn(),
    localize: vi.fn(
      (_translations: unknown, _key: string, _params: unknown, fallback: string) => fallback,
    ),
  },
}));

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
  };
}

describe('InventoryStore', () => {
  let connection: FakeConnection;
  let hass: HomeAssistant;
  let listItems: Mock<() => Promise<{ items: InventoryItem[] }>>;
  let getInfo: Mock<() => Promise<BackendInfo>>;
  let showError: Mock<(message: string) => void>;
  let compatibilityChecked: Mock<() => void>;
  let rendered: Mock<() => void>;
  let store: InventoryStore;

  function hassWith(overrides: Partial<HomeAssistant> = {}): HomeAssistant {
    const base = createMockHomeAssistant({
      'sensor.pantry': createMockHassEntity('sensor.pantry', {
        attributes: { inventory_id: 'pantry' },
      }),
    });
    base.connection = connection;
    base.callWS = vi.fn(async (message: MessageBase) => {
      if (message.type === WS_COMMANDS.GET_INFO) {
        return getInfo();
      }
      return listItems();
    }) as HomeAssistant['callWS'];
    return { ...base, ...overrides };
  }

  /** The first hass: translations load, get_info answers, the first fetch renders. */
  async function start(): Promise<void> {
    store.setHass(hass);
    await vi.advanceTimersByTimeAsync(0);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(TranslationManager.loadTranslations).mockResolvedValue({ items: {} });
    connection = fakeConnection();
    listItems = vi.fn(async () => ({ items: [item('Milk', 1)] }));
    getInfo = vi.fn(async () => ({ version: '0.11.0', api_version: 3, features: [] }));
    hass = hassWith();
    showError = vi.fn<(message: string) => void>();
    compatibilityChecked = vi.fn<() => void>();
    store = new InventoryStore({
      showError,
      compatibilityChecked,
    });
    store.setEntity('sensor.pantry');
    rendered = vi.fn<() => void>();
    store.subscribe(rendered);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function listCalls(): number {
    return vi
      .mocked(hass.callWS)
      .mock.calls.filter(([message]) => message.type === WS_COMMANDS.LIST_ITEMS).length;
  }

  describe('first hass', () => {
    it('loads the translations for the language, fetches the items and renders once', async () => {
      hass = hassWith({ language: 'fr' });
      await start();

      expect(TranslationManager.loadTranslations).toHaveBeenCalledWith('fr');
      expect(listCalls()).toBe(1);
      expect(rendered).toHaveBeenCalledTimes(1);
      expect(store.items).toMatchObject([item('Milk', 1)]);
      expect(store.hass).toBe(hass);
    });

    it('takes the capabilities from get_info and reports the check to the view', async () => {
      getInfo.mockResolvedValue({ version: '0.9.0', api_version: 3, features: ['transfers'] });
      await start();

      expect(store.capabilities.transfers).toBe(true);
      expect(store.compatibility?.status).toBe('ok');
      expect(compatibilityChecked).toHaveBeenCalledTimes(1);
    });

    it('re-renders when get_info reports batches after the first render', async () => {
      let answer: (info: BackendInfo) => void = () => {};
      getInfo.mockReturnValue(
        new Promise<BackendInfo>((resolve) => {
          answer = resolve;
        }),
      );
      await start();
      expect(rendered).toHaveBeenCalledTimes(1);

      answer({ version: '0.8.0', api_version: 3, features: ['batches'] });
      await vi.advanceTimersByTimeAsync(0);

      expect(rendered).toHaveBeenCalledTimes(2);
      expect(compatibilityChecked).not.toHaveBeenCalled();
    });

    it('does not render before the translations are loaded', () => {
      store.setHass(hass);
      store.render();

      expect(rendered).not.toHaveBeenCalled();
    });

    it('subscribes to live updates for the inventory', async () => {
      await start();

      expect(connection.subscribeMessage.mock.calls[0]?.[1]).toEqual({
        type: WS_COMMANDS.SUBSCRIBE,
        inventory_id: 'pantry',
      });
    });
  });

  describe('later hass updates', () => {
    it('re-renders after a language change, without fetching', async () => {
      await start();

      expect(store.setHass(hassWith({ language: 'de' }))).toBe(true);
      await vi.advanceTimersByTimeAsync(0);

      expect(TranslationManager.loadTranslations).toHaveBeenLastCalledWith('de');
      expect(rendered).toHaveBeenCalledTimes(2);
      expect(listCalls()).toBe(1);
    });

    it('leaves other updates to the view (entity-change check)', async () => {
      await start();

      expect(store.setHass(hassWith())).toBe(false);
    });
  });

  describe('entity changes', () => {
    beforeEach(async () => {
      connection.subscribeMessage.mockRejectedValue(new Error('unknown command'));
      await start();
    });

    it('fetches in the background while live updates are refused', async () => {
      store.entityChanged(false);
      await vi.advanceTimersByTimeAsync(0);

      expect(listCalls()).toBe(2);
    });

    it('debounces the fetch while the user is interacting', async () => {
      store.entityChanged(true);
      store.entityChanged(true);
      await vi.advanceTimersByTimeAsync(INTERACTION_REFRESH_DELAY_MS - 1);
      expect(listCalls()).toBe(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(listCalls()).toBe(2);
    });

    it('asks for live updates again with an integration that passed get_info', async () => {
      store.entityChanged(false);

      expect(connection.subscribeMessage).toHaveBeenCalledTimes(2);
    });

    it('holds the fetch while background UI is open and runs it once it closed', async () => {
      const release = store.hold('background', 'restock form');
      store.entityChanged(false);
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(1);

      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(2);

      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(2);
    });
  });

  it('ignores entity changes while live updates are flowing', async () => {
    await start();

    store.entityChanged(false);
    await vi.advanceTimersByTimeAsync(0);

    expect(listCalls()).toBe(1);
  });

  describe('pushed items', () => {
    beforeEach(start);

    it('renders pushed items without fetching', async () => {
      connection.push({ items: [item('Milk', 2)] });
      await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);

      expect(store.items).toMatchObject([item('Milk', 2)]);
      expect(rendered).toHaveBeenCalledTimes(2);
      expect(listCalls()).toBe(1);
    });

    it('skips a push equal to the rendered items', async () => {
      connection.push({ items: [item('Milk', 1)] });
      await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);

      expect(rendered).toHaveBeenCalledTimes(1);
    });

    it('holds a push while background UI is open and renders it once that closed', async () => {
      const release = store.hold('background', 'history sheet');
      connection.push({ items: [item('Milk', 3)] });
      await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);
      expect(rendered).toHaveBeenCalledTimes(1);

      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);

      expect(store.items).toMatchObject([item('Milk', 3)]);
      expect(rendered).toHaveBeenCalledTimes(2);
      expect(listCalls()).toBe(1);
    });

    it('refetches for a push without items', async () => {
      connection.push({});
      await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);

      expect(listCalls()).toBe(2);
    });
  });

  describe('fetch', () => {
    beforeEach(start);

    it('defers a user fetch only while a page sheet is open', async () => {
      store.hold('background', 'add sheet');
      await store.fetch();
      expect(listCalls()).toBe(2);

      store.hold('page', 'edit sheet');
      await store.fetch();
      expect(listCalls()).toBe(2);
    });

    it('shows a failed user fetch, but not a failed background fetch', async () => {
      listItems.mockRejectedValue(new Error('ws down'));

      await store.fetch(true);
      expect(showError).not.toHaveBeenCalled();

      await store.fetch();
      expect(showError).toHaveBeenCalledWith('Failed to load inventory items: ws down');
    });

    it('holds the render of a background fetch when background UI opened meanwhile', async () => {
      const fetching = store.fetch(true);
      store.hold('background', 'restock form');
      await fetching;

      expect(rendered).toHaveBeenCalledTimes(1);
    });
  });

  describe('render', () => {
    beforeEach(start);

    it('is held while a page sheet is open, and runs as a refetch once it closed', async () => {
      const release = store.hold('page', 'edit sheet');
      store.render();
      expect(rendered).toHaveBeenCalledTimes(1);

      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);

      expect(rendered).toHaveBeenCalledTimes(2);
      expect(listCalls()).toBe(2);
    });

    it('stops calling an unsubscribed listener', () => {
      const other = vi.fn<() => void>();
      const unsubscribe = store.subscribe(other);
      unsubscribe();

      store.render();

      expect(other).not.toHaveBeenCalled();
      expect(rendered).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshAfterSave', () => {
    beforeEach(start);

    it('fetches after the save delay, coalescing rapid saves', async () => {
      store.refreshAfterSave();
      store.refreshAfterSave();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS - 1);
      expect(listCalls()).toBe(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(listCalls()).toBe(2);
    });

    it('is not replaced by a held refresh when the UI closes', async () => {
      const release = store.hold('background', 'add sheet');
      store.fetch(true); // held: a refresh is now pending
      store.refreshAfterSave();

      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);

      // The save's own (user) refresh ran despite the background UI.
      expect(listCalls()).toBe(2);
    });
  });

  describe('pause and resume', () => {
    beforeEach(start);

    it('drops the subscription and timers, and catches up on re-attach', async () => {
      store.refreshAfterSave();
      store.pause();
      expect(store.paused).toBe(true);
      expect(connection.unsubscribe).toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(1);
      store.render();
      expect(rendered).toHaveBeenCalledTimes(1);

      const reattach = vi.fn<() => void>();
      store.resume(reattach);
      await vi.advanceTimersByTimeAsync(0);

      expect(reattach).toHaveBeenCalledTimes(1);
      expect(connection.subscribeMessage).toHaveBeenCalledTimes(2);
      expect(listCalls()).toBe(2);
      expect(rendered).toHaveBeenCalledTimes(2);
    });

    it('re-attaches without a refresh when nothing was missed', async () => {
      connection.subscribeMessage.mockRejectedValue(new Error('refused'));
      const refused = new InventoryStore({
        showError,
        compatibilityChecked,
      });
      const refusedHass = hassWith();
      refused.setEntity('sensor.pantry');
      refused.setHass(refusedHass);
      await vi.advanceTimersByTimeAsync(0);
      const calls = vi.mocked(refusedHass.callWS).mock.calls.length;

      refused.pause();
      refused.resume(() => {});
      await vi.advanceTimersByTimeAsync(0);

      expect(vi.mocked(refusedHass.callWS).mock.calls.length).toBe(calls);
    });

    it('ignores resume without a pause', () => {
      const reattach = vi.fn<() => void>();

      store.resume(reattach);

      expect(reattach).not.toHaveBeenCalled();
    });
  });

  describe('holds (state machine)', () => {
    beforeEach(async () => {
      connection.subscribeMessage.mockRejectedValue(new Error('unknown command'));
      await start();
    });

    it('lists the active holds; a release removes its own, a second release is a no-op', () => {
      const releaseForm = store.hold('background', 'restock form');
      const releaseSheet = store.hold('page', 'edit sheet');
      expect(store.holds()).toEqual([
        { kind: 'background', reason: 'restock form' },
        { kind: 'page', reason: 'edit sheet' },
      ]);

      releaseSheet();
      releaseSheet();

      expect(store.holds()).toEqual([{ kind: 'background', reason: 'restock form' }]);
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('released twice'),
        'edit sheet',
      );
      releaseForm();
      expect(store.holds()).toEqual([]);
    });

    it('a double release does not run held work twice', async () => {
      const release = store.hold('background', 'restock form');
      store.entityChanged(false);
      release();
      store.hold('background', 'move form');
      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);

      // The refetch ran once and was held again by the move form, not run twice.
      expect(listCalls()).toBe(1);
    });

    it('a background hold lets user fetches and renders through', async () => {
      store.hold('background', 'add sheet');
      store.render();
      await store.fetch();

      expect(rendered).toHaveBeenCalledTimes(3);
      expect(listCalls()).toBe(2);
    });

    it('a page hold also holds background work, and logs each held refresh', async () => {
      // The console doubles are shared by the suite: count only this test's calls.
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
      debug.mockClear();
      const release = store.hold('page', 'photo viewer');
      store.entityChanged(false);
      store.render();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(1);
      expect(rendered).toHaveBeenCalledTimes(1);
      // Once for the entity change, once for the render.
      expect(debug).toHaveBeenCalledTimes(2);
      expect(debug).toHaveBeenCalledWith(
        'Simple Inventory: refresh held by open UI, refetch pending:',
        [{ kind: 'page', reason: 'photo viewer' }],
      );

      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(2);
    });

    it('runs held work only once the last hold of either kind is released', async () => {
      const releasePage = store.hold('page', 'edit sheet');
      const releaseForm = store.hold('background', 'restock form');
      store.entityChanged(false);

      releasePage();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(1);

      releaseForm();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS - 1);
      expect(listCalls()).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(listCalls()).toBe(2);
    });

    it('releasing with nothing held back runs nothing', async () => {
      store.hold('background', 'restock form')();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);

      expect(listCalls()).toBe(1);
      expect(rendered).toHaveBeenCalledTimes(1);
    });

    it('a user fetch clears the held work', async () => {
      const release = store.hold('background', 'add sheet');
      store.entityChanged(false);
      await store.fetch();
      expect(listCalls()).toBe(2);

      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(2);
    });

    it('a release while detached catches up on re-attach, not before', async () => {
      const release = store.hold('background', 'scan panel');
      store.entityChanged(false);
      store.pause();
      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(1);

      store.resume(() => {});
      await vi.advanceTimersByTimeAsync(0);
      expect(listCalls()).toBe(2);
    });

    it('held work survives a detach while the hold stays, and runs on its release', async () => {
      const release = store.hold('background', 'restock form');
      store.entityChanged(false);
      store.pause();
      store.resume(() => {});
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(1);

      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
      expect(listCalls()).toBe(2);
    });
  });

  describe('holds with live updates', () => {
    beforeEach(start);

    it('keeps only the latest held push and renders it once, without fetching', async () => {
      const release = store.hold('background', 'restock form');
      connection.push({ items: [item('Milk', 3)] });
      await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);
      connection.push({ items: [item('Milk', 4)] });
      await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);
      expect(rendered).toHaveBeenCalledTimes(1);

      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);

      expect(store.items).toMatchObject([item('Milk', 4)]);
      expect(rendered).toHaveBeenCalledTimes(2);
      expect(listCalls()).toBe(1);
    });

    it('a held push is followed by a held refetch: the refetch runs instead', async () => {
      const release = store.hold('background', 'history sheet');
      connection.push({ items: [item('Milk', 3)] });
      await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);
      store.fetch(true);
      release();
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);

      expect(listCalls()).toBe(2);
      expect(store.items).toMatchObject([item('Milk', 1)]);
    });

    it('re-attaching with a held push refreshes once', async () => {
      const release = store.hold('background', 'restock form');
      connection.push({ items: [item('Milk', 3)] });
      await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);
      store.pause();
      release();
      store.resume(() => {});
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);

      expect(listCalls()).toBe(2);
      expect(store.items).toMatchObject([item('Milk', 1)]);
    });
  });

  describe('holds of sheets', () => {
    beforeEach(start);

    it('a closer that refreshes on its own replaces the held refetch (import result sheet)', async () => {
      const host = document.createElement('div');
      document.body.append(host);
      const root = host.attachShadow({ mode: 'open' });
      setSheetHolds(root, (kind, reason) => store.hold(kind, reason));
      const sheet = mountSheet(
        root,
        `<div id="${ELEMENTS.IMPORT_RESULT_MODAL}" class="modal"></div>`,
      );
      sheet.addEventListener(SHEET_CLOSED_EVENT, () => void store.fetch(), { once: true });
      showSheet(root, sheet);
      store.render(); // e.g. the import's own entity update: held as a refetch

      hideSheet(sheet);
      await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);

      expect(listCalls()).toBe(2);
      host.remove();
    });
  });

  it("releaseHolds drops every hold, runs the held work, and leaves the holders' releases inert", async () => {
    connection.subscribeMessage.mockRejectedValue(new Error('unknown command'));
    await start();
    const release = store.hold('background', 'restock form');
    store.hold('page', 'edit sheet');
    store.entityChanged(false);

    store.releaseHolds();
    await vi.advanceTimersByTimeAsync(SAVE_REFRESH_DELAY_MS);
    expect(store.holds()).toEqual([]);
    expect(listCalls()).toBe(2);

    store.hold('background', 'move form');
    release();
    expect(store.holds()).toEqual([{ kind: 'background', reason: 'move form' }]);
  });
});
