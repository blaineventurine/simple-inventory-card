import { LitElement } from 'lit-element';
import { HomeAssistant } from '@/types/homeAssistant';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { ImageLoader, hydrateImages } from '@/services/imageLoader';
import { Services } from '@/services/services';
import { withBusy } from '@/utils/busy';
import { BACKEND_FEATURES, ITEM_EVENTS, PANEL_ELEMENT } from '@/utils/constants';
import { panelStyles } from './panelStyles';
import { EmbeddedCard, createInventoryCard } from './cardFactory';
import {
  InventoriesResult,
  InventorySummary,
  fetchFeatures,
  fetchInventories,
} from './inventories';
import {
  HOME_ID,
  emptyState,
  errorState,
  loadingState,
  outdatedState,
  sensorUnavailable,
  tabs,
  toolbar,
} from './panelTemplates';
import { HomeMode, isHomeSection } from './home/homeMode';
import { homeView } from './home/homeTemplates';
import { valueFormatter } from '@/utils/currency';
import { fetchOverview } from './home/overviewClient';
import { ScanOverlay } from './search/scanOverlay';
import { searchItems, subscribeUpdates } from './search/searchClient';
import { SearchMode } from './search/searchMode';
import { SEARCH_OPEN_ACTION, searchResults, searchToolbar } from './search/searchTemplates';
import { SharedUpdates } from './sharedUpdates';

export interface PanelRoute {
  prefix: string;
  path: string;
}

/** Tab keys and the index they move to, given the current index and the tab count. */
const TAB_KEYS: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

/** The ids of every inventory sensor in `hass.states`, sorted (the refetch trigger). */
function inventorySensorKey(hass: HomeAssistant): string {
  return Object.values(hass.states)
    .filter((state) => state.entity_id.startsWith('sensor.') && 'inventory_id' in state.attributes)
    .map((state) => state.entity_id)
    .sort()
    .join(',');
}

/** The route path of search mode (`/simple-inventory/search?q=…`). */
const SEARCH_PATH = '/search';
/** The route path of Home (`/simple-inventory/home`). */
const HOME_PATH = `/${HOME_ID}`;
/** The route segment before an item id (`/simple-inventory/<inventory_id>/item/<item_id>`). */
const ITEM_SEGMENT = 'item';
/** `history.state` key marking an item page entry pushed from its inventory's tab. */
const ITEM_FROM_TAB = 'simpleInventoryItemFrom';

/** A string field of an event's or history entry's object, if it has one. */
function stringField(source: unknown, field: string): string | undefined {
  if (source === null || typeof source !== 'object') return undefined;
  const value: unknown = Reflect.get(source, field);
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Full-page panel: Home (with the `overview` feature), then one tab per inventory, each hosting
 * the inventory's card; plus search mode. The shadow root is a fixed skeleton: only `.chrome`
 * (toolbar, tabs) and `.state` (messages, search results) are rewritten; `.content` holds Home
 * and the cards of visited tabs, which are never recreated.
 */
export class SimpleInventoryPanel extends LitElement {
  private _hass: HomeAssistant | undefined;
  private _narrow = false;
  /** HA's "always hidden" sidebar: the menu button is the only way to open it, as when narrow. */
  private _sidebarHidden = false;
  private _route: PanelRoute = { prefix: '/simple-inventory', path: '' };
  private _result: InventoriesResult | undefined;
  /** The integration's features (`get_info`); undefined until it answered. */
  private _features: string[] | undefined;
  private _sensorKey = '';
  private _translations: TranslationData = {};
  /** The search session while search mode is on. */
  private _search: SearchMode | undefined;
  /** The Home session while Home is shown. */
  private _homeMode: HomeMode | undefined;
  /** The tab ✕/Escape return to; the first tab when search was entered by a deep link. */
  private _searchReturnId: string | undefined;
  /** Focus the search field after the next render (search was just opened). */
  private _focusSearch = false;
  /** A result the user opened: opened in its tab's card once that card exists. */
  private _pendingOpen: { inventoryId: string; name: string } | undefined;
  private readonly _services = new Services(() => this._currentHass());
  /** Photos of search results and Home rows (`item_images`); released when neither shows. */
  private readonly _images = new ImageLoader((path) => this._services.fetchImage(path));
  /** The all-inventories update subscription Home and search share. */
  private readonly _updates = new SharedUpdates((onUpdate) =>
    subscribeUpdates(this._currentHass(), onUpdate),
  );
  /** Focus the active tab after the next render (keyboard navigation, click on a focused tab). */
  private _focusActiveTab = false;
  /**
   * Cards of visited tabs and the sensor each was configured for, by inventory id; kept so a tab
   * keeps its filters and open sheets.
   */
  private readonly _cards = new Map<string, { card: EmbeddedCard; entity: string }>();
  private readonly _chrome: HTMLElement;
  private readonly _state: HTMLElement;
  private readonly _content: HTMLElement;
  /** Home's view, the first child of `.content` (hidden on the other tabs). */
  private readonly _home: HTMLElement;
  /** Scan to find (search mode only). */
  private readonly _scan: ScanOverlay;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = panelStyles.toString();
    this._chrome = document.createElement('div');
    this._chrome.className = 'chrome';
    this._state = document.createElement('div');
    this._state.className = 'state';
    this._content = document.createElement('main');
    this._content.className = 'content';
    this._home = document.createElement('div');
    this._home.className = 'home';
    this._home.hidden = true;
    this._content.append(this._home);
    const overlay = document.createElement('div');
    overlay.className = 'scan-overlay';
    root.append(style, this._chrome, this._state, this._content, overlay);
    this._scan = new ScanOverlay({
      host: overlay,
      getTranslations: () => this._translations,
      getHass: () => this._hass,
      onCode: (code) => this._scanned(code),
      returnFocus: () => this._chrome.querySelector<HTMLElement>('.search-scan-btn'),
    });
    root.addEventListener('click', (event) => this._onClick(event));
    root.addEventListener('keydown', (event) => this._onKeydown(event));
    root.addEventListener('input', (event) => this._onInput(event));
    root.addEventListener(ITEM_EVENTS.OPEN, (event) => this._openItemPage(event));
    root.addEventListener(ITEM_EVENTS.CLOSE, (event) => this._closeItemPage(event));
    this._render();
  }

  set hass(hass: HomeAssistant) {
    const first = this._hass === undefined;
    this._hass = hass;
    for (const { card } of this._cards.values()) {
      card.hass = hass;
    }
    const sidebarHidden = hass.dockedSidebar === 'always_hidden';
    if (sidebarHidden !== this._sidebarHidden) {
      this._sidebarHidden = sidebarHidden;
      this._render();
    }
    const sensorKey = inventorySensorKey(hass);
    if (first) {
      this._sensorKey = sensorKey;
      void this._loadTranslations(hass.language);
      void this._loadFeatures();
      void this._load();
    } else if (sensorKey !== this._sensorKey) {
      this._sensorKey = sensorKey;
      void this._load();
    }
  }

  set narrow(narrow: boolean) {
    if (narrow !== this._narrow) {
      this._narrow = narrow;
      this._render();
    }
  }

  set route(route: PanelRoute) {
    this._route = route;
    this._render();
  }

  // `panel` is set by HA too; nothing in it is used.
  set panel(_panel: unknown) {}

  /** Re-attached on Home or in search mode: the session stopped on detach starts again. */
  connectedCallback(): void {
    super.connectedCallback();
    if (this._route.path === SEARCH_PATH || this._route.path === HOME_PATH) {
      this._render();
    }
  }

  /** Detached: the Home and search sessions stop, with their subscription and timers. */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._leaveSearch();
    this._leaveHome();
    this._releaseIdleImages();
  }

  private _currentHass(): HomeAssistant {
    if (!this._hass) {
      throw new Error('Simple Inventory panel used before hass was set');
    }
    return this._hass;
  }

  private _hasFeature(feature: string): boolean {
    return this._features?.includes(feature) === true;
  }

  private async _loadFeatures(): Promise<void> {
    this._features = await fetchFeatures(this._currentHass());
    this._render();
  }

  private async _loadTranslations(language: string): Promise<void> {
    this._translations = await TranslationManager.loadTranslations(language);
    this._render();
  }

  private async _load(): Promise<void> {
    const hass = this._hass;
    if (!hass) return;
    if (this._result?.status !== 'ok') {
      this._result = undefined;
      this._render();
    }
    this._result = await fetchInventories(hass);
    // A failed refetch says nothing about the inventories: every kept card stays for the retry.
    if (this._result.status === 'ok') {
      const entities = new Map(
        this._result.inventories.map((inventory) => [inventory.id, inventory.entity_id]),
      );
      for (const [id, { card, entity }] of this._cards) {
        // Gone, or its sensor was renamed or removed: the card's store follows the old entity.
        if (entities.get(id) !== entity) {
          card.remove();
          this._cards.delete(id);
        }
      }
    }
    const home = this._homeMode;
    this._render();
    // The inventories changed (one added, removed or renamed): a Home still showing fetches its
    // overview again, so the summaries follow without waiting for an item update.
    if (home && home === this._homeMode && this._result.status === 'ok') {
      home.refresh();
    }
  }

  /** The tab of the route: its first segment (an item page's inventory included). */
  private _activeId(): string {
    return this._route.path.replace(/^\//, '').split('/')[0] ?? '';
  }

  /** The item id of an item page route, else undefined. */
  private _itemId(): string | undefined {
    const [, segment, id] = this._route.path.replace(/^\//, '').split('/');
    if (segment !== ITEM_SEGMENT || !id) return undefined;
    try {
      return decodeURIComponent(id);
    } catch {
      // A malformed (hand-edited) link: no item has that id, so the card says it is gone.
      return id;
    }
  }

  private _homeEnabled(): boolean {
    return this._hasFeature(BACKEND_FEATURES.OVERVIEW);
  }

  /** The tab ids in order: Home (with the `overview` feature), then the inventories. */
  private _tabIds(): string[] {
    const inventories = this._result?.status === 'ok' ? this._result.inventories : [];
    return [
      ...(this._homeEnabled() ? [HOME_ID] : []),
      ...inventories.map((inventory) => inventory.id),
    ];
  }

  private _render(): void {
    const homeShown = this._renderRoute();
    // Sessions stop after the new view started: Home and search taking over from each other
    // keep the update subscription they share open.
    if (this._route.path !== SEARCH_PATH) {
      this._leaveSearch();
    }
    if (!homeShown) {
      this._leaveHome();
    }
    this._releaseIdleImages();
  }

  /** Renders the current route; returns whether it shows Home. */
  private _renderRoute(): boolean {
    const narrow = this._narrow || this._sidebarHidden;
    const result = this._result;
    if (result?.status !== 'ok' || result.inventories.length === 0) {
      // No inventories to search: no magnifier.
      this._chrome.innerHTML = toolbar(this._translations, narrow);
      this._showView(undefined);
      if (!result) {
        this._state.innerHTML = loadingState(this._translations);
      } else if (result.status === 'outdated') {
        this._state.innerHTML = outdatedState(this._translations);
      } else if (result.status === 'error') {
        this._state.innerHTML = errorState(this._translations, result.message);
      } else {
        this._state.innerHTML = emptyState(this._translations);
      }
      return false;
    }

    const header = toolbar(this._translations, narrow, this._hasFeature(BACKEND_FEATURES.SEARCH));
    const activeId = this._activeId();
    const active = result.inventories.find((inventory) => inventory.id === activeId);
    if (!active && this._features === undefined) {
      // Search, Home or the default tab need the features: neither render nor redirect yet.
      this._chrome.innerHTML = header;
      this._showView(undefined);
      this._state.innerHTML = loadingState(this._translations);
      return false;
    }
    if (this._route.path === SEARCH_PATH && this._hasFeature(BACKEND_FEATURES.SEARCH)) {
      this._renderSearch(result.inventories, narrow);
      return false;
    }
    const home = this._homeEnabled();
    if (this._route.path === HOME_PATH && home) {
      this._chrome.innerHTML = header + tabs(this._translations, result.inventories, HOME_ID, true);
      this._state.innerHTML = '';
      this._renderHome();
      this._revealActiveTab();
      return true;
    }
    if (!active) {
      // A panel HA already removed must not pull the user back to it.
      if (this.isConnected) this._navigate(home ? HOME_ID : result.inventories[0].id, true);
      return false;
    }

    this._chrome.innerHTML = header + tabs(this._translations, result.inventories, active.id, home);
    this._state.innerHTML = '';
    // An opened result is for this render only: a tab without a card drops it for good.
    const pending = this._pendingOpen;
    this._pendingOpen = undefined;
    if (active.entity_id === null) {
      this._state.innerHTML = sensorUnavailable(this._translations);
      this._showView(undefined);
    } else {
      const kept = this._cards.get(active.id);
      const card = kept?.card ?? createInventoryCard(active.entity_id);
      if (!card) {
        this._state.innerHTML = errorState(this._translations, 'card element not registered');
        this._showView(undefined);
      } else {
        card.hass = this._hass;
        if (!kept) {
          this._cards.set(active.id, { card, entity: active.entity_id });
          this._content.append(card);
        }
        this._showView(active.id);
        if (pending?.inventoryId === active.id) {
          card.openItem?.(pending.name);
        }
        const itemId = this._itemId();
        if (itemId === undefined) {
          card.showList?.();
        } else {
          card.showItem?.(itemId);
        }
      }
    }
    this._revealActiveTab();
    return false;
  }

  /** Scrolls the selected tab into view, and focuses it after keyboard navigation. */
  private _revealActiveTab(): void {
    const activeTab = this._chrome.querySelector<HTMLElement>('.tab[aria-selected="true"]');
    if (activeTab && typeof activeTab.scrollIntoView === 'function') {
      activeTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    if (activeTab && this._focusActiveTab) {
      activeTab.focus();
    }
    this._focusActiveTab = false;
  }

  /** Home: the summaries and attention sections, in the widened content. */
  private _renderHome(): void {
    this._showView(HOME_ID);
    // Never start a session while detached (a load answered after HA removed the panel).
    if (!this._homeMode && !this.isConnected) return;
    this._homeMode ??= this._startHome();
    this._renderHomeView();
  }

  private _startHome(): HomeMode {
    const home = new HomeMode({
      fetch: () => fetchOverview(this._currentHass()),
      listen: (onUpdate) => this._updates.listen(onUpdate),
      onChange: () => this._renderHomeView(),
    });
    this._homeMode = home;
    home.start();
    return home;
  }

  /** Stops the Home session (its re-fetches; expanded sections are forgotten). */
  private _leaveHome(): void {
    if (!this._homeMode) return;
    this._homeMode.stop();
    this._homeMode = undefined;
    this._home.innerHTML = '';
  }

  private _renderHomeView(): void {
    const home = this._homeMode;
    if (!home) return;
    const images = this._hasFeature(BACKEND_FEATURES.ITEM_IMAGES) ? this._images : undefined;
    this._home.innerHTML = homeView(this._translations, home.state, {
      expanded: home.expanded,
      formatValue: valueFormatter(this._hass?.language ?? 'en', this._hass?.config.currency),
      ...(images ? { images } : {}),
    });
    if (images) {
      hydrateImages(this._home, images);
    }
  }

  /** Frees the item photos once neither Home nor search shows any. */
  private _releaseIdleImages(): void {
    if (!this._search && !this._homeMode) {
      this._images.releaseAll();
    }
  }

  /** Search mode: the search toolbar, the tabs with none selected, and the results. */
  private _renderSearch(inventories: InventorySummary[], narrow: boolean): void {
    // A deep link (or back to the results) starts a session with the URL's query; never while
    // detached (a load answered after HA removed the panel).
    if (!this._search && !this.isConnected) return;
    const search =
      this._search ?? this._startSearch(new URLSearchParams(location.search).get('q') ?? '');
    const focused = this._searchField()?.matches(':focus') === true;
    this._chrome.innerHTML =
      searchToolbar(this._translations, narrow, search.query) +
      tabs(this._translations, inventories, '', this._homeEnabled());
    this._showView(undefined);
    this._renderResults();
    const field = this._searchField();
    if (field && (focused || this._focusSearch)) {
      field.focus();
    }
    this._focusSearch = false;
  }

  private _searchField(): HTMLInputElement | null {
    return this._chrome.querySelector<HTMLInputElement>('.search-field');
  }

  /** Starts a search session, replacing (and stopping) any running one. */
  private _startSearch(query: string): SearchMode {
    this._leaveSearch();
    const search = new SearchMode({
      query,
      search: (text) => searchItems(this._currentHass(), text),
      listen: (onUpdate) => this._updates.listen(onUpdate),
      onChange: () => this._renderResults(),
    });
    this._search = search;
    search.start();
    return search;
  }

  /** Stops the search session (its timers, its share of the updates) and the scanner. */
  private _leaveSearch(): void {
    this._scan.close();
    if (!this._search) return;
    this._search.stop();
    this._search = undefined;
  }

  private _renderResults(): void {
    const search = this._search;
    if (!search) return;
    const images = this._hasFeature(BACKEND_FEATURES.ITEM_IMAGES) ? this._images : undefined;
    this._state.innerHTML = searchResults(this._translations, search.state, images);
    if (images) {
      hydrateImages(this._state, images);
    }
  }

  /** The magnifier: one history entry for search mode, entered at once with the field focused. */
  private _enterSearch(): void {
    this._searchReturnId = this._activeId();
    this._startSearch('');
    this._focusSearch = true;
    this._goTo('search?q=', false);
  }

  /** ✕ / Escape: back to the tab active before search (the first after a deep link). */
  private _exitSearch(): void {
    const ids = this._tabIds();
    const target = ids.find((id) => id === this._searchReturnId) ?? ids.at(0);
    if (target === undefined) {
      this._leaveSearch();
      return;
    }
    // The render leaves search once the tab is shown (Home keeps the shared subscription).
    this._goTo(target, true);
  }

  /**
   * A search result or Home row was opened: its tab, where its card opens the item (back
   * returns to the results or to Home).
   */
  private _openResult(inventoryId: string, name: string): void {
    this._pendingOpen = { inventoryId, name };
    this._goTo(inventoryId, false);
  }

  /**
   * Navigates and renders the new route at once, without waiting for HA to set it: the URL's
   * query (search) and the session are then never out of step with the route.
   */
  private _goTo(path: string, replace: boolean): void {
    this._route = { ...this._route, path: `/${path.replace(/\?.*$/, '')}` };
    this._navigate(path, replace);
    this._render();
  }

  /** Typing in the search field. */
  private _onInput(event: Event): void {
    const field = event.target;
    if (!(field instanceof HTMLInputElement) || !field.matches('.search-field')) return;
    this._setQuery(field.value);
  }

  /** A scanned code becomes the query, as if typed; the field takes the focus. */
  private _scanned(code: string): void {
    const field = this._searchField();
    if (field) {
      field.value = code;
      field.focus();
    }
    this._setQuery(code);
  }

  /** The session's query, and the URL's `q` (no history entry). */
  private _setQuery(query: string): void {
    this._search?.setQuery(query);
    history.replaceState(
      null,
      '',
      `${this._route.prefix}${SEARCH_PATH}?q=${encodeURIComponent(query)}`,
    );
  }

  /** + / − on a result: the service call for the result's inventory, the button busy meanwhile. */
  private _stepResult(control: HTMLElement): void {
    const inventoryId = control.closest<HTMLElement>('.search-result')?.dataset.inventory;
    const name = control.dataset.name;
    if (!inventoryId || !name || control.hasAttribute('data-processing')) return;
    const increment = control.dataset.action === 'increment';
    // A failed call needs nothing more: HA's frontend toasts it; the live re-query shows the rest.
    void withBusy(control, () =>
      increment
        ? this._services.incrementItem(inventoryId, name)
        : this._services.decrementItem(inventoryId, name),
    );
  }

  /** The result open target `element` is (or is in), if any. */
  private _openTarget(element: Element): { inventoryId: string; name: string } | undefined {
    const target = element.closest<HTMLElement>(`[data-action="${SEARCH_OPEN_ACTION}"]`);
    const inventoryId = target?.dataset.inventory;
    const name = target?.dataset.name;
    return inventoryId && name ? { inventoryId, name } : undefined;
  }

  /**
   * Shows Home (`HOME_ID`, in the widened content), the card of an inventory, or neither
   * (undefined); the other cards stay attached, hidden.
   */
  private _showView(activeId: string | undefined): void {
    const home = activeId === HOME_ID;
    this._home.hidden = !home;
    this._content.classList.toggle('wide', home);
    for (const [id, { card }] of this._cards) {
      const hidden = id !== activeId;
      // Only real changes: the card reacts to its `hidden` attribute (camera, Escape).
      if (card.hidden !== hidden) card.hidden = hidden;
    }
  }

  private _navigate(id: string, replace: boolean, state: object | null = null): void {
    const url = `${this._route.prefix}/${id}`;
    if (replace) {
      history.replaceState(state, '', url);
    } else {
      history.pushState(state, '', url);
    }
    window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace } }));
  }

  /**
   * A tile tapped in an inventory's card: its item page, as a history entry marked as opened
   * from the tab (so the page's back arrow can go back to it).
   */
  private _openItemPage(event: Event): void {
    const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
    const inventoryId = stringField(detail, 'inventory_id');
    const itemId = stringField(detail, 'item_id');
    if (!inventoryId || !itemId) return;
    this._navigate(`${inventoryId}/${ITEM_SEGMENT}/${encodeURIComponent(itemId)}`, false, {
      [ITEM_FROM_TAB]: inventoryId,
    });
  }

  /**
   * The item page's back arrow: back in the history when the page was opened from its tab in
   * this session (the entry carries the mark), else the tab replaces the page (a deep link).
   */
  private _closeItemPage(event: Event): void {
    const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
    const inventoryId = stringField(detail, 'inventory_id');
    if (!inventoryId) return;
    if (stringField(history.state, ITEM_FROM_TAB) === inventoryId) {
      history.back();
    } else {
      this._navigate(inventoryId, true);
    }
  }

  private _onClick(event: Event): void {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest<HTMLElement>('.tab');
    const open = this._openTarget(event.target);
    const step = event.target.closest<HTMLElement>('.search-result .control-btn');
    const summary = event.target.closest<HTMLElement>('.home-summary')?.dataset.inventory;
    const section = event.target.closest<HTMLElement>('.home-show-all')?.dataset.section;
    if (tab?.dataset.id) {
      // A tab, or the selected tab from its item page: the tab's route.
      if (`/${tab.dataset.id}` !== this._route.path) {
        // The route render replaces the tabs; keep keyboard focus on them.
        this._focusActiveTab = tab.matches(':focus');
        this._navigate(tab.dataset.id, false);
      }
    } else if (event.target.closest('.menu-btn')) {
      // Composed, so it leaves the shadow root and reaches HA's sidebar handler.
      event.target.dispatchEvent(new Event('hass-toggle-menu', { bubbles: true, composed: true }));
    } else if (event.target.closest('.retry-btn')) {
      void this._load();
    } else if (event.target.closest('.search-open-btn')) {
      this._enterSearch();
    } else if (event.target.closest('.search-scan-btn')) {
      this._scan.open();
    } else if (event.target.closest('.search-close-btn')) {
      this._exitSearch();
    } else if (event.target.closest('.search-retry-btn')) {
      this._search?.retry();
    } else if (open) {
      this._openResult(open.inventoryId, open.name);
    } else if (step) {
      this._stepResult(step);
    } else if (summary) {
      this._navigate(summary, false);
    } else if (isHomeSection(section)) {
      this._homeMode?.expand(section);
    } else if (event.target.closest('.home-retry-btn')) {
      this._homeMode?.retry();
    }
  }

  private _onKeydown(event: Event): void {
    if (!(event instanceof KeyboardEvent) || !(event.target instanceof Element)) return;
    if (event.key === 'Escape' && this._scan.isOpen) {
      event.preventDefault();
      this._scan.close();
      return;
    }
    if (event.key === 'Escape' && this._search) {
      event.preventDefault();
      this._exitSearch();
      return;
    }
    const open = this._openTarget(event.target);
    if (open && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this._openResult(open.inventoryId, open.name);
      return;
    }
    const move = TAB_KEYS[event.key];
    if (!move || !event.target.closest('.tab')) return;
    const ids = this._tabIds();
    const index = ids.indexOf(this._activeId());
    const next = ids.at(move(index, ids.length));
    event.preventDefault();
    if (next !== undefined && next !== this._activeId()) {
      this._focusActiveTab = true;
      this._navigate(next, false);
    }
  }
}

if (!customElements.get(PANEL_ELEMENT)) {
  customElements.define(PANEL_ELEMENT, SimpleInventoryPanel);
}
