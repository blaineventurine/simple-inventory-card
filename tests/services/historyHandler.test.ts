import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { HistoryHandler, HistoryViewState } from '../../src/services/historyHandler';
import { hideSheet, setSheetHolds } from '../../src/services/modals/modalUIManager';
import { Services } from '../../src/services/services';
import { InventoryResolver } from '../../src/utils/inventoryResolver';
import { ELEMENTS, CSS_CLASSES } from '../../src/utils/constants';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryConfig } from '../../src/types/inventory';
import {
  createMockHomeAssistant,
  createMockHassEntity,
  createMockCardContext,
} from '../testHelpers';
import { holdTracker } from '../holdTracker';
import { TranslationData } from '@/types/translatableComponent';
import { HistoryEvent } from '@/types/historyEvent';
import { ItemConsumptionRates } from '@/types/consumptionRates';

vi.mock('../../src/utils/inventoryResolver');

vi.mock('../../src/templates/historyView', () => ({
  createHistoryAndConsumptionView: vi.fn(
    () =>
      '<div id="history-tab-history">History tab</div>' +
      '<div id="history-tab-consumption">Consumption tab</div>' +
      '<div id="history-tab-content">HISTORY_VIEW_MARKER</div>',
  ),
  createHistoryContent: vi.fn(() => 'HISTORY_CONTENT_MARKER'),
  createConsumptionLoading: vi.fn(() => 'LOADING_MARKER'),
  createConsumptionView: vi.fn(
    () =>
      'CONSUMPTION_VIEW_MARKER' +
      '<button class="window-pill" data-window="7">7d</button>' +
      '<button class="window-pill" data-window="all">All</button>',
  ),
}));

import {
  createHistoryAndConsumptionView,
  createHistoryContent,
  createConsumptionLoading,
  createConsumptionView,
} from '../../src/templates/historyView';

function createMockRenderRoot(): ShadowRoot {
  const container = document.createElement('div');
  // Real DOM node stands in for ShadowRoot; only getElementById needs a delegate to querySelector.
  const containerWithElementLookup = container as HTMLDivElement & {
    getElementById: (id: string) => Element | null;
  };
  containerWithElementLookup.getElementById = (id: string) => container.querySelector(`#${id}`);
  return container as unknown as ShadowRoot;
}

function createMockHistoryEvent(overrides: Partial<HistoryEvent> = {}): HistoryEvent {
  return {
    id: '1',
    item_id: 'item-1',
    inventory_id: 'test-inventory-id',
    event_type: 'decrement',
    amount: 1,
    quantity_before: 5,
    quantity_after: 4,
    source: 'manual',
    location_from: '',
    location_to: '',
    timestamp: '2024-01-01T00:00:00Z',
    metadata: '',
    ...overrides,
  };
}

function createMockConsumptionRates(
  overrides: Partial<ItemConsumptionRates> = {},
): ItemConsumptionRates {
  return {
    item_name: 'Milk',
    current_quantity: 2,
    unit: 'unit',
    decrement_count: 3,
    total_consumed: 5,
    window_days: null,
    daily_rate: 0.5,
    weekly_rate: 3.5,
    days_until_depletion: 4,
    avg_restock_days: 7,
    has_sufficient_data: true,
    daily_spend_rate: null,
    weekly_spend_rate: null,
    total_spend: null,
    ...overrides,
  };
}

/** Flushes pending microtask continuations (e.g. resolved-promise `await` chains) deterministically. */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('HistoryHandler', () => {
  let handler: HistoryHandler;
  let renderRoot: ShadowRoot;
  let mockHass: HomeAssistant;
  let mockConfig: InventoryConfig;
  let mockTranslations: TranslationData;
  let mockServices: Services;

  beforeEach(() => {
    renderRoot = createMockRenderRoot();
    mockHass = createMockHomeAssistant({
      'sensor.test_inventory': createMockHassEntity('sensor.test_inventory'),
    });
    mockConfig = { type: 'inventory-card', entity: 'sensor.test_inventory' };
    mockTranslations = {
      analytics: { load_error: 'Could not load consumption data.' },
    };
    mockServices = {
      getHistory: vi.fn(),
      getItemConsumptionRates: vi.fn(),
    } as unknown as Services;

    vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('test-inventory-id');

    handler = new HistoryHandler(
      renderRoot,
      () =>
        createMockCardContext({
          hass: mockHass,
          config: mockConfig,
          translations: mockTranslations,
        }),
      mockServices,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('showItemHistory', () => {
    it('resolves the inventory id and fetches history for the item', async () => {
      const events = [createMockHistoryEvent()];
      vi.mocked(mockServices.getHistory).mockResolvedValue(events);

      await handler.showItemHistory('Milk');

      expect(InventoryResolver.getInventoryId).toHaveBeenCalledWith(
        mockHass,
        'sensor.test_inventory',
      );
      expect(mockServices.getHistory).toHaveBeenCalledWith('test-inventory-id', {
        itemName: 'Milk',
        limit: 500,
      });
      expect(createHistoryAndConsumptionView).toHaveBeenCalledWith(events, mockTranslations);
    });

    it('logs an error and does not throw when getHistory rejects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('boom');
      vi.mocked(mockServices.getHistory).mockRejectedValue(error);

      await expect(handler.showItemHistory('Milk')).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching history:', error);
      expect(createHistoryAndConsumptionView).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('shows a hass-notification with the error when getHistory rejects', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(mockServices.getHistory).mockRejectedValue(new Error('boom'));
      const listener = vi.fn();
      renderRoot.addEventListener('hass-notification', listener);

      await handler.showItemHistory('Milk');

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as CustomEvent<{ message: string }>;
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(event.detail.message).toBe('Failed to load history: boom');
    });
  });

  describe('showHistoryModal (via showItemHistory)', () => {
    beforeEach(() => {
      vi.mocked(mockServices.getHistory).mockResolvedValue([]);
    });

    it('creates the modal element on first call and appends it to the render root', async () => {
      const rootEl = renderRoot as unknown as HTMLElement;
      expect(rootEl.children.length).toBe(0);

      await handler.showItemHistory('Milk');

      const modal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL);
      expect(modal).not.toBeNull();
      expect(modal?.id).toBe(ELEMENTS.HISTORY_MODAL);
      expect(modal?.classList.contains('modal')).toBe(true);
      expect(modal?.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
      expect(rootEl.children.length).toBe(1);
      expect(rootEl.children[0]).toBe(modal);
    });

    it('reuses the existing modal element on a second call instead of creating a duplicate', async () => {
      await handler.showItemHistory('Milk');
      const firstModal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL);

      await handler.showItemHistory('Bread');
      const secondModal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL);

      expect(secondModal).toBe(firstModal);
      expect((renderRoot as unknown as HTMLElement).children.length).toBe(1);
    });

    it('wires the close button to remove the SHOW class', async () => {
      await handler.showItemHistory('Milk');
      const modal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL);
      expect(modal?.classList.contains(CSS_CLASSES.SHOW)).toBe(true);

      const closeBtn = modal?.querySelector('#close-history-modal') as HTMLElement | null;
      expect(closeBtn).not.toBeNull();
      closeBtn?.click();

      expect(modal?.classList.contains(CSS_CLASSES.SHOW)).toBe(false);
    });

    it('holds background work while the sheet is open, released by any close route', async () => {
      const holds = holdTracker();
      setSheetHolds(renderRoot, holds.hold);

      await handler.showItemHistory('Milk');
      expect(holds.holds()).toEqual([{ kind: 'background', reason: ELEMENTS.HISTORY_MODAL }]);
      renderRoot.getElementById(ELEMENTS.HISTORY_CLOSE)?.click();
      expect(holds.holds()).toEqual([]);

      // Reopened (the sheet element is reused), then closed another way (Esc, ✕ or backdrop).
      await handler.showItemHistory('Bread');
      expect(holds.holds()).toHaveLength(1);
      const modal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL);
      if (!modal) throw new Error('history sheet missing');
      hideSheet(modal);
      expect(holds.holds()).toEqual([]);
    });

    it('renders the history in a sheet titled with the item name', async () => {
      await handler.showItemHistory('Milk');
      const modal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL);

      expect(modal?.classList.contains('si-sheet')).toBe(true);
      expect(modal?.querySelector('.si-sheet__title')?.textContent).toBe('History: Milk');
      expect(modal?.querySelector('.si-sheet__body')?.innerHTML).toContain('HISTORY_VIEW_MARKER');
      expect(modal?.querySelector(`#${ELEMENTS.HISTORY_CLOSE}`)?.textContent).toBe('Close');
    });

    it('escapes the item name in the sheet title exactly once', async () => {
      await handler.showItemHistory('<b>Milk</b>');
      const title = renderRoot
        .getElementById(ELEMENTS.HISTORY_MODAL)
        ?.querySelector('.si-sheet__title');

      expect(title?.querySelector('b')).toBeNull();
      expect(title?.textContent).toBe('History: <b>Milk</b>');
    });

    it('keeps aria-selected and the tint in step with the active tab', async () => {
      vi.mocked(mockServices.getItemConsumptionRates).mockReturnValue(
        new Promise<ItemConsumptionRates>(() => {}),
      );
      await handler.showItemHistory('Milk');
      const modal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL);
      const historyTab = modal?.querySelector<HTMLElement>(`#${ELEMENTS.HISTORY_TAB_HISTORY}`);
      const consumptionTab = modal?.querySelector<HTMLElement>(
        `#${ELEMENTS.HISTORY_TAB_CONSUMPTION}`,
      );

      consumptionTab?.click();
      expect(consumptionTab?.getAttribute('aria-selected')).toBe('true');
      expect(consumptionTab?.classList.contains('si-tint')).toBe(true);
      expect(historyTab?.getAttribute('aria-selected')).toBe('false');
      expect(historyTab?.classList.contains('si-tint')).toBe(false);

      historyTab?.click();
      expect(historyTab?.getAttribute('aria-selected')).toBe('true');
      expect(consumptionTab?.getAttribute('aria-selected')).toBe('false');
    });

    it('focuses the sheet panel when it opens', async () => {
      const host = renderRoot as unknown as HTMLElement;
      document.body.append(host);
      try {
        await handler.showItemHistory('Milk');
        const panel = renderRoot
          .getElementById(ELEMENTS.HISTORY_MODAL)
          ?.querySelector(`.${CSS_CLASSES.MODAL_CONTENT}`);

        expect(panel).not.toBeNull();
        expect(document.activeElement).toBe(panel);
      } finally {
        host.remove();
      }
    });

    it('re-renders history content and marks the history tab active on click', async () => {
      const events = [createMockHistoryEvent({ id: 'e1' })];
      vi.mocked(mockServices.getHistory).mockResolvedValue(events);

      await handler.showItemHistory('Milk');
      const modal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL) as HTMLElement;
      const historyTab = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_HISTORY}`) as HTMLElement;
      const consumptionTab = modal.querySelector(
        `#${ELEMENTS.HISTORY_TAB_CONSUMPTION}`,
      ) as HTMLElement;
      const tabContent = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_CONTENT}`) as HTMLElement;

      // simulate consumption tab having been active previously
      consumptionTab.classList.add('active');

      historyTab.click();

      expect(createHistoryContent).toHaveBeenCalledWith(events);
      expect(tabContent.innerHTML).toBe('HISTORY_CONTENT_MARKER');
      expect(historyTab.classList.contains('active')).toBe(true);
      expect(consumptionTab.classList.contains('active')).toBe(false);
    });

    it('shows a loading state and marks the consumption tab active on click', async () => {
      // never-resolving promise so we can inspect the synchronous loading render.
      // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
      const neverSettles = new Promise<ItemConsumptionRates>(() => {});
      vi.mocked(mockServices.getItemConsumptionRates).mockReturnValue(neverSettles);

      await handler.showItemHistory('Milk');
      const modal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL) as HTMLElement;
      const historyTab = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_HISTORY}`) as HTMLElement;
      const consumptionTab = modal.querySelector(
        `#${ELEMENTS.HISTORY_TAB_CONSUMPTION}`,
      ) as HTMLElement;
      const tabContent = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_CONTENT}`) as HTMLElement;

      consumptionTab.click();

      expect(consumptionTab.classList.contains('active')).toBe(true);
      expect(historyTab.classList.contains('active')).toBe(false);
      expect(createConsumptionLoading).toHaveBeenCalledWith(mockTranslations);
      expect(tabContent.innerHTML).toBe('LOADING_MARKER');
    });

    it('slices the history list to the 50 most recent events but keeps all events for charts', async () => {
      const events = Array.from({ length: 60 }, (_, index) =>
        createMockHistoryEvent({ id: String(index) }),
      );
      vi.mocked(mockServices.getHistory).mockResolvedValue(events);
      const rates = createMockConsumptionRates();
      vi.mocked(mockServices.getItemConsumptionRates).mockResolvedValue(rates);

      await handler.showItemHistory('Milk');

      // history list view receives only the first 50 (backend returns newest-first)
      expect(createHistoryAndConsumptionView).toHaveBeenCalledWith(
        events.slice(0, 50),
        mockTranslations,
      );

      const modal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL) as HTMLElement;
      const consumptionTab = modal.querySelector(
        `#${ELEMENTS.HISTORY_TAB_CONSUMPTION}`,
      ) as HTMLElement;
      consumptionTab.click();
      await flushMicrotasks();

      // charts receive the FULL event set
      expect(createConsumptionView).toHaveBeenCalledWith(
        rates,
        events,
        null,
        mockTranslations,
        expect.objectContaining({ requestedLimit: 500 }),
      );
    });
  });

  describe('consumption tab loading (via clicking the consumption tab)', () => {
    let modal: HTMLElement;
    let consumptionTab: HTMLElement;
    let tabContent: HTMLElement;

    beforeEach(async () => {
      vi.mocked(mockServices.getHistory).mockResolvedValue([]);
      await handler.showItemHistory('Milk');
      modal = renderRoot.getElementById(ELEMENTS.HISTORY_MODAL) as HTMLElement;
      consumptionTab = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_CONSUMPTION}`) as HTMLElement;
      tabContent = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_CONTENT}`) as HTMLElement;
    });

    it('fetches consumption rates for the initial window, then a new window on pill click, and maps "all" back to null', async () => {
      const ratesAll = createMockConsumptionRates({ window_days: null });
      const rates7 = createMockConsumptionRates({ window_days: 7 });
      vi.mocked(mockServices.getItemConsumptionRates)
        .mockResolvedValueOnce(ratesAll)
        .mockResolvedValueOnce(rates7);

      consumptionTab.click();
      await flushMicrotasks();

      expect(mockServices.getItemConsumptionRates).toHaveBeenCalledTimes(1);
      expect(mockServices.getItemConsumptionRates).toHaveBeenNthCalledWith(
        1,
        'test-inventory-id',
        'Milk',
        null,
      );
      const expectedOptions = { currency: undefined, language: 'en', requestedLimit: 500 };
      expect(createConsumptionView).toHaveBeenNthCalledWith(
        1,
        ratesAll,
        [],
        null,
        mockTranslations,
        expectedOptions,
      );
      expect(tabContent.innerHTML).toContain('CONSUMPTION_VIEW_MARKER');

      const pill7 = tabContent.querySelector('[data-window="7"]') as HTMLElement;
      pill7.click();
      await flushMicrotasks();

      expect(mockServices.getItemConsumptionRates).toHaveBeenCalledTimes(2);
      expect(mockServices.getItemConsumptionRates).toHaveBeenNthCalledWith(
        2,
        'test-inventory-id',
        'Milk',
        7,
      );
      expect(createConsumptionView).toHaveBeenNthCalledWith(
        2,
        rates7,
        [],
        7,
        mockTranslations,
        expectedOptions,
      );

      // clicking the "all" pill maps back to a null window and hits the cache
      // populated by the initial load, so no third service call is made.
      const pillAll = tabContent.querySelector('[data-window="all"]') as HTMLElement;
      pillAll.click();
      await flushMicrotasks();

      expect(mockServices.getItemConsumptionRates).toHaveBeenCalledTimes(2);
      expect(createConsumptionView).toHaveBeenNthCalledWith(
        3,
        ratesAll,
        [],
        null,
        mockTranslations,
        expectedOptions,
      );
    });

    it('does not call the service again when the same window pill is clicked twice', async () => {
      const rates7 = createMockConsumptionRates({ window_days: 7 });
      vi.mocked(mockServices.getItemConsumptionRates).mockResolvedValue(rates7);

      consumptionTab.click();
      await flushMicrotasks();
      expect(mockServices.getItemConsumptionRates).toHaveBeenCalledTimes(1);

      let pill7 = tabContent.querySelector('[data-window="7"]') as HTMLElement;
      pill7.click();
      await flushMicrotasks();
      expect(mockServices.getItemConsumptionRates).toHaveBeenCalledTimes(2);

      // re-query: the previous pill node was discarded when the content was re-rendered
      pill7 = tabContent.querySelector('[data-window="7"]') as HTMLElement;
      pill7.click();
      await flushMicrotasks();

      // same window (cache key "7") already cached -> no additional service call
      expect(mockServices.getItemConsumptionRates).toHaveBeenCalledTimes(2);
    });

    it('renders a localized error message and does not throw when getItemConsumptionRates rejects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('network fail');
      vi.mocked(mockServices.getItemConsumptionRates).mockRejectedValue(error);

      consumptionTab.click();
      await flushMicrotasks();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching consumption rates:', error);

      const errorEl = tabContent.querySelector('.consumption-empty');
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toBe('Could not load consumption data.');
      consoleErrorSpy.mockRestore();
    });

    it('falls back to the default message when the translation key is missing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockTranslations = {};
      vi.mocked(mockServices.getItemConsumptionRates).mockRejectedValue(new Error('fail'));

      consumptionTab.click();
      await flushMicrotasks();

      const errorEl = tabContent.querySelector('.consumption-empty');
      expect(errorEl?.textContent).toBe('Failed to load consumption data.');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('renderHistoryInto (a given container, e.g. the item page)', () => {
    let container: HTMLElement;
    let state: HistoryViewState;
    const tab = (id: string): HTMLElement => {
      const found = container.querySelector<HTMLElement>(`#${id}`);
      if (!found) throw new Error(`no ${id}`);
      return found;
    };

    beforeEach(() => {
      container = document.createElement('div');
      state = { segment: 'history', window: null };
    });

    it('loads the history into the container, without a sheet', async () => {
      const events = [createMockHistoryEvent()];
      vi.mocked(mockServices.getHistory).mockResolvedValue(events);

      await handler.renderHistoryInto(container, 'Milk', state);

      expect(mockServices.getHistory).toHaveBeenCalledWith('test-inventory-id', {
        itemName: 'Milk',
        limit: 500,
      });
      expect(createHistoryAndConsumptionView).toHaveBeenCalledWith(events, mockTranslations, '');
      expect(container.textContent).toContain('HISTORY_VIEW_MARKER');
      expect(renderRoot.getElementById(ELEMENTS.HISTORY_MODAL)).toBeNull();
    });

    it('switches segments and windows inside the container, and remembers them', async () => {
      vi.mocked(mockServices.getHistory).mockResolvedValue([]);
      vi.mocked(mockServices.getItemConsumptionRates).mockResolvedValue(
        createMockConsumptionRates(),
      );
      await handler.renderHistoryInto(container, 'Milk', state);

      tab(ELEMENTS.HISTORY_TAB_CONSUMPTION).click();
      await flushMicrotasks();
      expect(state.segment).toBe('consumption');
      expect(tab(ELEMENTS.HISTORY_TAB_CONTENT).innerHTML).toContain('CONSUMPTION_VIEW_MARKER');

      container.querySelector<HTMLElement>('[data-window="7"]')?.click();
      await flushMicrotasks();
      expect(state.window).toBe(7);
      expect(mockServices.getItemConsumptionRates).toHaveBeenLastCalledWith(
        'test-inventory-id',
        'Milk',
        7,
      );

      tab(ELEMENTS.HISTORY_TAB_HISTORY).click();
      expect(state.segment).toBe('history');
      expect(tab(ELEMENTS.HISTORY_TAB_CONTENT).innerHTML).toBe('HISTORY_CONTENT_MARKER');
    });

    it('a refresh fetches again and re-renders the segment and window the user chose', async () => {
      vi.mocked(mockServices.getHistory).mockResolvedValue([]);
      vi.mocked(mockServices.getItemConsumptionRates).mockResolvedValue(
        createMockConsumptionRates(),
      );
      await handler.renderHistoryInto(container, 'Milk', state);
      tab(ELEMENTS.HISTORY_TAB_CONSUMPTION).click();
      await flushMicrotasks();
      container.querySelector<HTMLElement>('[data-window="7"]')?.click();
      await flushMicrotasks();
      vi.mocked(mockServices.getItemConsumptionRates).mockClear();

      await handler.renderHistoryInto(container, 'Milk', state);
      await flushMicrotasks();

      expect(mockServices.getHistory).toHaveBeenCalledTimes(2);
      expect(tab(ELEMENTS.HISTORY_TAB_CONSUMPTION).getAttribute('aria-selected')).toBe('true');
      // The item changed: its rates are fetched again, for the chosen window.
      expect(mockServices.getItemConsumptionRates).toHaveBeenCalledTimes(1);
      expect(mockServices.getItemConsumptionRates).toHaveBeenCalledWith(
        'test-inventory-id',
        'Milk',
        7,
      );
      expect(tab(ELEMENTS.HISTORY_TAB_CONTENT).innerHTML).toContain('CONSUMPTION_VIEW_MARKER');
    });

    it('drops a render that a later one for the same container superseded', async () => {
      const first = [createMockHistoryEvent({ id: 'old' })];
      const second = [createMockHistoryEvent({ id: 'new' })];
      let answerFirst: (events: HistoryEvent[]) => void = () => undefined;
      vi.mocked(mockServices.getHistory)
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              answerFirst = resolve;
            }),
        )
        .mockResolvedValueOnce(second);

      const stale = handler.renderHistoryInto(container, 'Milk', state);
      await handler.renderHistoryInto(container, 'Milk', state);
      answerFirst(first);
      await stale;

      expect(createHistoryAndConsumptionView).toHaveBeenCalledTimes(1);
      expect(createHistoryAndConsumptionView).toHaveBeenCalledWith(second, mockTranslations, '');
    });

    it('shows a failed load in the container', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockTranslations = { errors: { history_failed: 'Failed to load history: {error}' } };
      vi.mocked(mockServices.getHistory).mockRejectedValue(new Error('Boom'));

      await handler.renderHistoryInto(container, 'Milk', state);

      expect(container.textContent?.trim()).toBe('Failed to load history: Boom');
      consoleErrorSpy.mockRestore();
    });
  });
});
