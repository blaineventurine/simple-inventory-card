import { CSS_CLASSES, ELEMENTS } from '../utils/constants';
import { GetCardContext } from '@/types/cardContext';
import { Services, extractErrorMessage } from './services';
import { showHassNotification } from '../utils/notify';
import { TranslationManager } from './translationManager';
import { Utilities } from '../utils/utilities';
import { InventoryResolver } from '../utils/inventoryResolver';
import {
  createHistoryAndConsumptionView,
  createHistoryContent,
  createConsumptionView,
  createConsumptionLoading,
  ConsumptionFormatOptions,
} from '../templates/historyView';
import { sheet } from '../templates/sheet';
import { button } from '../templates/primitives';
import { hideSheet, mountSheet, showSheet } from './modals/modalUIManager';
import { ItemConsumptionRates } from '@/types/consumptionRates';
import { HistoryEvent } from '@/types/historyEvent';

const HISTORY_FETCH_LIMIT = 500;
const HISTORY_LIST_DISPLAY_LIMIT = 50;

/** Segment state: `active` is the behaviour hook, `si-tint` the look, aria-selected for AT. */
function markTab(tab: Element, selected: boolean): void {
  tab.classList.toggle('active', selected);
  tab.classList.toggle('si-tint', selected);
  tab.setAttribute('aria-selected', String(selected));
}

/** The History/Consumption view's segment and consumption window, kept across re-renders. */
export interface HistoryViewState {
  segment: 'history' | 'consumption';
  /** Days of the consumption window; null = all time. */
  window: number | null;
}

/** One loaded history: what the view lists and charts, and the item it belongs to. */
interface LoadedHistory {
  inventoryId: string;
  itemName: string;
  /** The most recent events, listed. */
  displayEvents: HistoryEvent[];
  /** Every fetched event, charted. */
  allEvents: HistoryEvent[];
  /** Consumption rates by window (`'all'` or the days), fetched once per window. */
  cachedRates: Map<string, ItemConsumptionRates>;
}

/**
 * The History/Consumption view of an item: in the history sheet (`showItemHistory`) or in any
 * container (`renderHistoryInto`, e.g. the item page). Both load and wire the view the same way.
 */
export class HistoryHandler {
  private renderRoot: ShadowRoot;
  private getContext: GetCardContext;
  private services: Services;
  /** Bumped by each render into a container; an older render's answer is dropped. */
  private readonly renders = new WeakMap<HTMLElement, number>();

  constructor(renderRoot: ShadowRoot, getContext: GetCardContext, services: Services) {
    this.renderRoot = renderRoot;
    this.getContext = getContext;
    this.services = services;
  }

  async showItemHistory(itemName: string): Promise<void> {
    try {
      const history = await this.loadHistory(itemName);
      const html = createHistoryAndConsumptionView(
        history.displayEvents,
        this.getContext().translations,
      );
      this.showHistoryModal(html, history);
    } catch (error) {
      console.error('Error fetching history:', error);
      showHassNotification(this.renderRoot, this.failureMessage(error));
    }
  }

  /**
   * Loads the item's history and renders the History/Consumption view into `container`, with
   * the segment and window of `state` (which then follows the user's switches). Calling it
   * again refreshes the view; only the latest call for a container renders. A failed load is
   * shown in the container. `idPrefix` keeps the view's ids apart from the history sheet's.
   */
  async renderHistoryInto(
    container: HTMLElement,
    itemName: string,
    state: HistoryViewState,
    idPrefix = '',
  ): Promise<void> {
    const render = (this.renders.get(container) ?? 0) + 1;
    this.renders.set(container, render);
    let history: LoadedHistory;
    try {
      history = await this.loadHistory(itemName);
    } catch (error) {
      if (this.renders.get(container) !== render) return;
      console.error('Error fetching history:', error);
      container.innerHTML = `<p class="consumption-empty">${Utilities.sanitizeHtml(this.failureMessage(error))}</p>`;
      return;
    }
    if (this.renders.get(container) !== render) return;
    container.innerHTML = createHistoryAndConsumptionView(
      history.displayEvents,
      this.getContext().translations,
      idPrefix,
    );
    this.wireView(container, history, state, idPrefix);
  }

  private async loadHistory(itemName: string): Promise<LoadedHistory> {
    const { hass, config } = this.getContext();
    const inventoryId = InventoryResolver.getInventoryId(hass, config.entity);
    const allEvents = await this.services.getHistory(inventoryId, {
      itemName,
      limit: HISTORY_FETCH_LIMIT,
    });
    return {
      inventoryId,
      itemName,
      displayEvents: allEvents.slice(0, HISTORY_LIST_DISPLAY_LIMIT),
      allEvents,
      cachedRates: new Map(),
    };
  }

  private failureMessage(error: unknown): string {
    const message = extractErrorMessage(error);
    return TranslationManager.localize(
      this.getContext().translations,
      'errors.history_failed',
      { error: message },
      `Failed to load history: ${message}`,
    );
  }

  private showHistoryModal(content: string, history: LoadedHistory): void {
    const translations = this.getContext().translations;
    const closeLabel = TranslationManager.localize(translations, 'modal.close', undefined, 'Close');
    const historyLabel = TranslationManager.localize(
      translations,
      'analytics.tab_history',
      undefined,
      'History',
    );
    const modal = mountSheet(
      this.renderRoot,
      sheet({
        id: ELEMENTS.HISTORY_MODAL,
        title: `${historyLabel}: ${history.itemName}`,
        closeLabel,
        bodyHtml: content,
        actionsHtml: button({
          kind: 'tonal',
          label: closeLabel,
          attrs: { id: ELEMENTS.HISTORY_CLOSE },
        }),
      }),
    );
    showSheet(this.renderRoot, modal);
    modal.querySelector<HTMLElement>(`.${CSS_CLASSES.MODAL_CONTENT}`)?.focus();

    modal.querySelector(`#${ELEMENTS.HISTORY_CLOSE}`)?.addEventListener('click', () => {
      hideSheet(modal);
    });

    this.wireView(modal, history, { segment: 'history', window: null });
  }

  /**
   * Wires the segment switches of the view rendered under `root`, and shows `state`'s segment
   * (the history list is what the template renders).
   */
  private wireView(
    root: HTMLElement,
    history: LoadedHistory,
    state: HistoryViewState,
    idPrefix = '',
  ): void {
    const historyTab = root.querySelector(`#${idPrefix}${ELEMENTS.HISTORY_TAB_HISTORY}`);
    const consumptionTab = root.querySelector(`#${idPrefix}${ELEMENTS.HISTORY_TAB_CONSUMPTION}`);
    const tabContent = root.querySelector<HTMLElement>(
      `#${idPrefix}${ELEMENTS.HISTORY_TAB_CONTENT}`,
    );

    if (!historyTab || !consumptionTab || !tabContent) {
      return;
    }

    const showConsumption = (): void => {
      state.segment = 'consumption';
      markTab(historyTab, false);
      markTab(consumptionTab, true);
      void this.loadConsumptionTab(tabContent, history, state);
    };

    historyTab.addEventListener('click', () => {
      state.segment = 'history';
      markTab(historyTab, true);
      markTab(consumptionTab, false);
      tabContent.innerHTML = createHistoryContent(history.displayEvents);
    });

    consumptionTab.addEventListener('click', showConsumption);

    if (state.segment === 'consumption') {
      showConsumption();
    }
  }

  private async loadConsumptionTab(
    container: HTMLElement,
    history: LoadedHistory,
    state: HistoryViewState,
  ): Promise<void> {
    const activeWindow = state.window;
    const cacheKey = activeWindow !== null ? String(activeWindow) : 'all';

    const cached = history.cachedRates.get(cacheKey);
    if (cached) {
      this.renderConsumptionContent(container, cached, history, state);
      return;
    }

    const translations = this.getContext().translations;
    container.innerHTML = createConsumptionLoading(translations);

    try {
      const rates = await this.services.getItemConsumptionRates(
        history.inventoryId,
        history.itemName,
        activeWindow,
      );
      history.cachedRates.set(cacheKey, rates);
      this.renderConsumptionContent(container, rates, history, state);
    } catch (error) {
      console.error('Error fetching consumption rates:', error);
      const errorMsg = TranslationManager.localize(
        translations,
        'analytics.load_error',
        undefined,
        'Failed to load consumption data.',
      );
      container.innerHTML = `<p class="consumption-empty">${Utilities.sanitizeHtml(errorMsg)}</p>`;
    }
  }

  private renderConsumptionContent(
    container: HTMLElement,
    rates: ItemConsumptionRates,
    history: LoadedHistory,
    state: HistoryViewState,
  ): void {
    const { translations, hass } = this.getContext();
    const options: ConsumptionFormatOptions = {
      currency: hass.config.currency,
      language: hass.language,
      requestedLimit: HISTORY_FETCH_LIMIT,
    };
    container.innerHTML = createConsumptionView(
      rates,
      history.allEvents,
      state.window,
      translations,
      options,
    );

    container.querySelectorAll<HTMLElement>('.window-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const value = pill.dataset.window;
        state.window = value === 'all' ? null : Number(value);
        void this.loadConsumptionTab(container, history, state);
      });
    });
  }
}
