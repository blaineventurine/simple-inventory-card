import { GetCardContext } from '@/types/cardContext';
import { historyLoading, itemDetailTemplate, itemGoneTemplate } from '../templates/itemDetail';
import { valueFormatter } from '../utils/currency';
import { InventoryResolver } from '../utils/inventoryResolver';
import { HistoryHandler, HistoryViewState } from './historyHandler';
import { ImageLoader, hydrateImages } from './imageLoader';

/** Pause after the shown item changed before its history is fetched again. */
export const DETAIL_HISTORY_REFRESH_MS = 500;
/** Prefix of the page's history ids (apart from the history sheet's, open at the same time). */
export const DETAIL_HISTORY_ID_PREFIX = 'detail-';

export interface DetailViewDeps {
  renderRoot: ShadowRoot;
  getContext: GetCardContext;
  historyHandler: HistoryHandler;
  /** Item photos, used with `item_images`. */
  imageLoader: ImageLoader;
  /** The page's DOM was replaced: forms no longer on screen release their holds. */
  formsReplaced: () => void;
}

/** Why the page is off screen: its card is hidden (a panel tab) or detached. */
export type DetailPauseReason = 'hidden' | 'detached';

/**
 * The card's item page, the second view next to the list. Which view shows is state here (the
 * item id, or none for the list), never read back from the DOM. The list and the page swap by
 * `hidden` in the rendered card, so the list (its search, filters and layout) is never
 * re-created by the swap; each full render of the card renders the page again from the store,
 * so live updates, holds, forms and sheets work on it as on the list. The embedded history keeps
 * one element across those renders (segment and window stay) and is fetched again shortly after
 * the item changed, only while the page is on screen.
 */
export class DetailView {
  private itemId: string | undefined = undefined;
  /** The history view of the shown item, moved into each render of the page. */
  private historyElement: HTMLElement | undefined = undefined;
  private historyState: HistoryViewState = { segment: 'history', window: null };
  private historyLoaded = false;
  /** The shown item as last rendered, serialized: a change refreshes the history. */
  private renderedItem: string | undefined = undefined;
  private historyTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  /** Why the page is off screen; history refreshes wait until no reason is left. */
  private readonly pauseReasons = new Set<DetailPauseReason>();
  /** A history refresh was due while paused. */
  private staleHistory = false;
  /** The list's scroll position when the page opened, restored when the list is back. */
  private listScroll = 0;

  constructor(private readonly deps: DetailViewDeps) {}

  /** The id of the item shown, or undefined while the list shows. */
  get shownItemId(): string | undefined {
    return this.itemId;
  }

  /**
   * Shows the page of item `id` in place of the list (a fresh history for a new item). The item
   * already shown stays as it is (its open forms, typed values and scroll position).
   */
  show(id: string): void {
    if (this.itemId === id) {
      return;
    }
    if (this.itemId === undefined) {
      this.listScroll = window.scrollY;
    }
    this.itemId = id;
    this.historyElement = undefined;
    this.historyState = { segment: 'history', window: null };
    this.historyLoaded = false;
    this.renderedItem = undefined;
    this.cancelHistoryRefresh();
    this.render();
    window.scrollTo(0, 0);
  }

  /** Shows the list again, as it was (scroll position included). */
  hide(): void {
    if (this.itemId === undefined) {
      return;
    }
    this.itemId = undefined;
    this.historyElement = undefined;
    this.cancelHistoryRefresh();
    this.render();
    window.scrollTo(0, this.listScroll);
  }

  /** Off screen for `reason`: history refreshes wait. */
  pause(reason: DetailPauseReason): void {
    this.pauseReasons.add(reason);
    if (this.historyTimer !== undefined) {
      this.cancelHistoryRefresh();
      this.staleHistory = true;
    }
  }

  /** `reason` is gone; back on screen once no other is left: a refresh due meanwhile runs. */
  resume(reason: DetailPauseReason): void {
    this.pauseReasons.delete(reason);
    if (this.pauseReasons.size === 0 && this.staleHistory) {
      this.staleHistory = false;
      this.refreshHistory();
    }
  }

  /**
   * Shows the view of the current state in the rendered card (after every full render, and on
   * each switch) and mirrors it on the card element as `view="list|detail"`.
   */
  render(): void {
    const { renderRoot } = this.deps;
    renderRoot.host.setAttribute('view', this.itemId === undefined ? 'list' : 'detail');
    const list = renderRoot.querySelector<HTMLElement>('.si-list');
    const page = renderRoot.querySelector<HTMLElement>('.si-detail');
    if (!list || !page) {
      return;
    }
    if (this.itemId === undefined) {
      list.hidden = false;
      page.hidden = true;
      page.innerHTML = '';
      this.deps.formsReplaced();
      // Images of the hidden list waited for it.
      if (this.deps.getContext().capabilities.itemImages) {
        hydrateImages(list, this.deps.imageLoader);
      }
      return;
    }
    list.hidden = true;
    page.hidden = false;
    this.renderPage(page, this.itemId);
    this.deps.formsReplaced();
  }

  private renderPage(page: HTMLElement, id: string): void {
    const context = this.deps.getContext();
    const { hass, translations, config, capabilities } = context;
    const item = context.items.find((candidate) => candidate.id === id);
    if (!item) {
      page.innerHTML = itemGoneTemplate(translations);
      this.renderedItem = undefined;
      this.cancelHistoryRefresh();
      return;
    }
    const images = capabilities.itemImages ? this.deps.imageLoader : undefined;
    page.innerHTML = itemDetailTemplate(item, translations, config, {
      images,
      batches: capabilities.batches,
      transfers: capabilities.transfers,
      todoLists: InventoryResolver.extractTodoLists(hass),
      formatValue: valueFormatter(hass.language, hass.config.currency),
    });
    if (images) {
      hydrateImages(page, images);
    }
    if (!this.historyElement) {
      this.historyElement = document.createElement('div');
      this.historyElement.className = 'si-detail__history-view';
      this.historyElement.innerHTML = historyLoading(translations);
    }
    page.querySelector('.si-detail__history-slot')?.replaceWith(this.historyElement);

    const serialized = JSON.stringify(item);
    if (!this.historyLoaded) {
      this.historyLoaded = true;
      this.refreshHistory();
    } else if (this.renderedItem !== undefined && serialized !== this.renderedItem) {
      this.scheduleHistoryRefresh();
    }
    this.renderedItem = serialized;
  }

  private scheduleHistoryRefresh(): void {
    if (this.pauseReasons.size > 0) {
      this.staleHistory = true;
      return;
    }
    clearTimeout(this.historyTimer);
    this.historyTimer = setTimeout(() => {
      this.historyTimer = undefined;
      this.refreshHistory();
    }, DETAIL_HISTORY_REFRESH_MS);
  }

  private cancelHistoryRefresh(): void {
    clearTimeout(this.historyTimer);
    this.historyTimer = undefined;
    this.staleHistory = false;
  }

  /** Fetches the shown item's history into its element (by its current name). */
  private refreshHistory(): void {
    const element = this.historyElement;
    const item = this.deps.getContext().items.find((candidate) => candidate.id === this.itemId);
    if (!element || !item) {
      return;
    }
    void this.deps.historyHandler.renderHistoryInto(
      element,
      item.name,
      this.historyState,
      DETAIL_HISTORY_ID_PREFIX,
    );
  }
}
