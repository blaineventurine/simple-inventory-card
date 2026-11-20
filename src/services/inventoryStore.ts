import { HomeAssistant } from '@/types/homeAssistant';
import { InventoryItem } from '@/types/inventory';
import { TranslationData } from '@/types/translatableComponent';
import { Capabilities, NO_CAPABILITIES, capabilitiesFrom } from '@/types/cardContext';
import { BackendCompatibility, checkBackendCompatibility } from '@/utils/backendCompatibility';
import { InventoryResolver } from '@/utils/inventoryResolver';
import { Utilities } from '@/utils/utilities';
import { LiveUpdates } from './liveUpdates';
import { Services, extractErrorMessage } from './services';
import { TranslationManager } from './translationManager';

/** Debounce of the entity-change refresh while the user is interacting. */
export const INTERACTION_REFRESH_DELAY_MS = 100;
/** Delay of the refresh after a save (and of held work once the last hold is released). */
export const SAVE_REFRESH_DELAY_MS = 50;

/**
 * What a hold keeps a render from wiping. `page`: UI no render may replace (edit sheet, import
 * outcome, photo viewer); it holds every render. `background`: UI only background work waits
 * for (add/history sheet, restock/move form, scan panel); the user's own refreshes still run.
 */
export type HoldKind = 'page' | 'background';

/** One active hold, as `InventoryStore.holds` reports it. */
export interface UiHold {
  kind: HoldKind;
  reason: string;
}

/** Acquires a hold (see `InventoryStore.hold`); returns its idempotent release. */
export type AcquireHold = (kind: HoldKind, reason: string) => () => void;

/** What the store needs from its view; it never touches the DOM itself. */
export interface InventoryStoreView {
  /** Shows a failed user-initiated load. */
  showError(message: string): void;
  /** The get_info handshake answered without a re-render (the view may show a banner). */
  compatibilityChecked(): void;
}

/**
 * The data of one inventory and its lifecycle: items, the integration's capabilities, the
 * translations for hass's language, live updates and the refresh policy that holds renders
 * while UI they would wipe is open. Views subscribe and render from it, and hold renders while
 * such UI is open (`hold`).
 *
 * Held work, one state (`pending`, plus the latest held push):
 * - a background refresh (entity change, language change, late get_info, re-attach catch-up)
 *   or a page-held render while held → `refetch`;
 * - a push while background-held → `push` (keeps only the latest items); a `refetch` dominates;
 * - the last hold released → the pending work runs once, after `SAVE_REFRESH_DELAY_MS`, as
 *   background work (UI opened meanwhile holds it again); a refresh already scheduled (e.g.
 *   the save that closed the sheet) covers it and is never replaced; while detached it becomes
 *   the re-attach refresh;
 * - a fetch that runs → `none`;
 * - `releaseHolds` (the view's safety net after a full render) → as the last release;
 * - `pause` → refresh on re-attach when a refresh was scheduled or live updates were flowing
 *   (pushes stop meanwhile); `resume` → that one background refresh.
 */
export class InventoryStore {
  private _hass: HomeAssistant | undefined = undefined;
  private entityId = '';
  private _items: InventoryItem[] = [];
  private _translations: TranslationData = {};
  private _compatibility: BackendCompatibility | undefined = undefined;
  /** What the integration supports, from its get_info handshake (none until it answers). */
  private _capabilities: Capabilities = NO_CAPABILITIES;
  /** The active holds (see `hold`). */
  private readonly _holds = new Set<UiHold>();
  /** Work held back by the holds; runs once the last one is released (see the class doc). */
  private pending: 'none' | 'push' | 'refetch' = 'none';
  /** The latest pushed items not rendered yet (`pending` is `push` while held). */
  private heldPush: InventoryItem[] | undefined = undefined;
  /** Detached from the page: timers and the subscription are released. */
  private _paused = false;
  /** A refresh was skipped or cancelled while detached; run it on re-attach. */
  private resumeRefresh = false;
  /** The normalized items of the last render, serialized: a push equal to them is not rendered. */
  private _renderedItems = '';
  /**
   * The listeners were notified at least once (a late get_info then re-renders). "Notified",
   * not "painted": a view that bails out of a render still counts.
   */
  private rendered = false;
  /** A fetch of the items succeeded at least once (`items` holds real data). */
  private _loaded = false;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  private saveTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  private readonly listeners = new Set<() => void>();
  private readonly services = new Services(() => {
    if (!this._hass) {
      throw new Error('Simple Inventory store used before hass was set');
    }
    return this._hass;
  });
  private readonly liveUpdates = new LiveUpdates(
    (items) => {
      this.heldPush = items;
      if (this.pending === 'none') {
        this.pending = 'push';
      }
      this.applyPushedItems();
    },
    () => {
      this.fetch(true);
    },
  );

  constructor(private readonly view: InventoryStoreView) {}

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  get items(): InventoryItem[] {
    return this._items;
  }

  /** Whether the items were fetched successfully at least once. */
  get loaded(): boolean {
    return this._loaded;
  }

  get translations(): TranslationData {
    return this._translations;
  }

  get capabilities(): Capabilities {
    return this._capabilities;
  }

  get compatibility(): BackendCompatibility | undefined {
    return this._compatibility;
  }

  /**
   * Holds renders while UI of `kind` is open; returns the release, which may be called any
   * number of times. The holder acquires on open and releases on close, by every route,
   * including its DOM being replaced.
   */
  hold(kind: HoldKind, reason: string): () => void {
    const entry: UiHold = { kind, reason };
    this._holds.add(entry);
    let released = false;
    return () => {
      if (released) {
        console.debug('Simple Inventory: hold released twice:', reason);
        return;
      }
      released = true;
      // Gone already when `releaseHolds` dropped it: nothing to run again.
      if (this._holds.delete(entry) && this._holds.size === 0) {
        this.runHeldWork();
      }
    };
  }

  /**
   * Drops every hold and runs the held work, e.g. when a full render replaced all UI that could
   * hold. The holders' own releases then do nothing.
   */
  releaseHolds(): void {
    if (this._holds.size === 0) {
      return;
    }
    this._holds.clear();
    this.runHeldWork();
  }

  /** The active holds (for tests and debugging). */
  holds(): UiHold[] {
    return Array.from(this._holds, ({ kind, reason }) => ({ kind, reason }));
  }

  /** Registers a render; returns its unsubscribe. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** The inventory sensor this store follows. */
  setEntity(entityId: string): void {
    this.entityId = entityId;
  }

  /**
   * Takes a new hass. The first one starts the get_info handshake, loads the translations and
   * fetches; a language change reloads the translations and re-renders.
   * @returns whether the update was handled; otherwise the view checks for an entity change.
   */
  setHass(hass: HomeAssistant): boolean {
    const oldHass = this._hass;
    this._hass = hass;
    this.connectLiveUpdates();

    if (!oldHass) {
      this.checkCompatibility();
      this.loadTranslations().then(() => {
        this.fetch();
      });
      return true;
    }

    if (oldHass.language !== hass.language || oldHass.selectedLanguage !== hass.selectedLanguage) {
      this.loadTranslations().then(() => {
        if (!this.deferIfBlocked('background')) {
          this.render();
        }
      });
      return true;
    }
    return false;
  }

  /**
   * The inventory entity really changed. Live updates replace this trigger while subscribed;
   * while refused, the change may mean the integration is back (HA restarted): ask again, but
   * only with an integration whose get_info handshake succeeded (an older one has no subscribe).
   */
  entityChanged(userInteracting: boolean): void {
    if (this.liveUpdates.active) {
      return;
    }
    if (this._compatibility?.status === 'ok') {
      this.liveUpdates.retry();
    }
    if (this.deferIfBlocked('background')) {
      return;
    }
    if (userInteracting) {
      // A background refresh too, so a form or sheet opened meanwhile still holds it back.
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = undefined;
        this.fetch(true);
      }, INTERACTION_REFRESH_DELAY_MS);
    } else {
      this.fetch(true);
    }
  }

  /**
   * Renders the subscribers, unless detached (recorded for the re-attach), the translations
   * are missing, or a page hold is active (held as a refetch).
   */
  render(): void {
    if (!this._hass || !this.entityId) {
      return;
    }
    // Detached: rendering could set the view's services (and their document listeners) up again.
    if (this._paused) {
      this.resumeRefresh = true;
      return;
    }
    if (Object.keys(this._translations).length === 0) {
      return;
    }
    if (this.deferIfBlocked('page')) {
      return;
    }
    this.rendered = true;
    for (const listener of this.listeners) {
      listener();
    }
    this._renderedItems = JSON.stringify(Utilities.validateInventoryItems(this._items));
  }

  /**
   * Fetches the items and re-renders. `background` marks refreshes the user did not ask for,
   * which also wait for `background` holds.
   */
  async fetch(background = false): Promise<void> {
    const hass = this._hass;
    if (!hass || !this.entityId) return;
    if (this._paused) {
      this.resumeRefresh = true;
      return;
    }
    if (this.deferIfBlocked(background ? 'background' : 'page')) return;
    // This refresh supersedes any held work; a render deferred below holds it again.
    this.pending = 'none';
    this.heldPush = undefined;
    const inventoryId = InventoryResolver.getInventoryId(hass, this.entityId);
    if (!inventoryId) return;
    try {
      this._items = await this.services.getItems(inventoryId);
      this._loaded = true;
    } catch (error) {
      console.warn('Failed to fetch inventory items:', error);
      // A background refresh fails quietly, e.g. while HA restarts; the next one catches up.
      if (!background) {
        const message = extractErrorMessage(error);
        this.view.showError(
          TranslationManager.localize(
            this._translations,
            'errors.load_items_failed',
            { error: message },
            `Failed to load inventory items: ${message}`,
          ),
        );
      }
    }
    // The user may have opened a form while the items were loading.
    if (background && this.deferIfBlocked('background')) return;
    this.render();
  }

  /** Refreshes shortly after a save (the user's own refresh). */
  refreshAfterSave(): void {
    this.scheduleSaveRefresh(() => {
      this.fetch();
    });
  }

  get paused(): boolean {
    return this._paused;
  }

  /**
   * The view was detached: stop the subscription and the timers. Pushes stop meanwhile, so
   * whatever changed is fetched on `resume`.
   */
  pause(): void {
    this._paused = true;
    this.resumeRefresh = this.hasPendingRefresh() || this.liveUpdates.active;
    this.liveUpdates.disconnect();
    clearTimeout(this.debounceTimer);
    clearTimeout(this.saveTimer);
    this.debounceTimer = undefined;
    this.saveTimer = undefined;
  }

  /**
   * The view was re-attached after `pause`: `reattachView` restores the view's own listeners,
   * then the subscription comes back, plus a refresh missed while detached.
   */
  resume(reattachView: () => void): void {
    if (!this._paused) {
      return;
    }
    this._paused = false;
    reattachView();
    this.connectLiveUpdates();
    if (this.resumeRefresh) {
      this.resumeRefresh = false;
      this.fetch(true);
    }
  }

  private async checkCompatibility(): Promise<void> {
    this._compatibility = await checkBackendCompatibility(this.services);
    if (this._compatibility.status === 'ok') {
      this._capabilities = capabilitiesFrom(this._compatibility.info.features);
    }
    // get_info usually answers after the first render; batch UI needs a re-render to appear.
    if (this._capabilities.batches && this.rendered) {
      if (!this.deferIfBlocked('background')) {
        this.render();
      }
      return;
    }
    this.view.compatibilityChecked();
  }

  private async loadTranslations(): Promise<void> {
    const language = this._hass?.language || this._hass?.selectedLanguage || 'en';
    try {
      this._translations = await TranslationManager.loadTranslations(language);
    } catch (error) {
      console.warn('Failed to load translations:', error);
      this._translations = {};
    }
  }

  /** The last hold was released: the held work runs once (see the class doc). */
  private runHeldWork(): void {
    if (this.pending === 'none') {
      return;
    }
    const refetch = this.pending === 'refetch';
    // A held push stays in place until it runs: a later push replaces it.
    if (refetch) {
      this.pending = 'none';
    }
    // A refresh already on its way (e.g. the save that closed the edit sheet) covers this one;
    // replacing it would turn the user's own refresh into one that waits for open forms.
    if (this.hasPendingRefresh()) {
      return;
    }
    if (this._paused) {
      this.resumeRefresh = true;
      return;
    }
    this.scheduleSaveRefresh(() => {
      if (refetch) {
        this.fetch(true);
      } else {
        this.applyPushedItems();
      }
    });
  }

  /**
   * Renders the latest pushed items through the background path: held by any hold, and
   * skipped when they equal the rendered items.
   */
  private applyPushedItems(): void {
    const items = this.heldPush;
    if (!items || this._paused || this._holds.size > 0) {
      return;
    }
    this.heldPush = undefined;
    if (this.pending === 'push') {
      this.pending = 'none';
    }
    if (JSON.stringify(Utilities.validateInventoryItems(items)) === this._renderedItems) {
      return;
    }
    this._items = items;
    this.render();
  }

  /** Subscribes to the inventory, or moves the subscription when the entity changed. */
  private connectLiveUpdates(): void {
    if (this._paused || !this._hass || !this.entityId) {
      return;
    }
    this.liveUpdates.connect(
      this._hass.connection,
      InventoryResolver.getInventoryId(this._hass, this.entityId),
    );
  }

  /** Holds a refetch when a hold of `kind` (any hold for `background`) is active. */
  private deferIfBlocked(kind: HoldKind): boolean {
    const held =
      kind === 'background'
        ? this._holds.size > 0
        : Array.from(this._holds).some((entry) => entry.kind === 'page');
    if (held) {
      this.pending = 'refetch';
      console.debug('Simple Inventory: refresh held by open UI, refetch pending:', this.holds());
    }
    return held;
  }

  private scheduleSaveRefresh(refresh: () => void): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      refresh();
    }, SAVE_REFRESH_DELAY_MS);
  }

  /** Whether a debounced or post-save refresh is scheduled and has not run yet. */
  private hasPendingRefresh(): boolean {
    return this.debounceTimer !== undefined || this.saveTimer !== undefined;
  }
}
