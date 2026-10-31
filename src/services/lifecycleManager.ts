import { Services } from './services';
import { Modals } from './modals';
import { Filters } from './filters';
import { Renderer } from './renderer';
import { State } from './state';
import { EventHandler } from './eventHandler';
import { ImageLoader, hydrateImages } from './imageLoader';
import { DetailView } from './detailView';
import { ImageViewer } from './imageViewer';
import { ItemImageField } from './modals/itemImageField';
import { InventoryItem } from '../types/inventory';
import { InventoryResolver } from '../utils/inventoryResolver';
import { GetCardContext } from '@/types/cardContext';
import type { AcquireHold } from './inventoryStore';
import { setSheetHolds } from './modals/modalUIManager';

/** The card's hooks its services call back into. */
export interface CardCallbacks {
  /** Re-fetches the items and renders (the user's own actions: sort change, ±, submit). */
  render: () => void;
  /** Refreshes shortly after a save. */
  refreshAfterSave: () => void;
  /** Re-lists the rows only (live filtering). */
  updateItems: (items: InventoryItem[], sortMethod: string) => void;
  /** Holds renders while UI a render would wipe is open (sheets, forms, viewer, scanner). */
  hold?: AcquireHold;
}

interface InitializedServices {
  services: Services;
  modals: Modals;
  filters: Filters;
  renderer: Renderer;
  state: State;
  eventHandler: EventHandler;
  /** Item photos as blob URLs, shared by the rows, details panels and the add/edit sheets. */
  imageLoader: ImageLoader;
  /** Full-screen photo viewer for the details panels and the sheets' previews. */
  imageViewer: ImageViewer;
  /** The item page (the card's second view). */
  detailView: DetailView;
}

/**
 * How long a detached card keeps its item image blobs. HA re-attaches a card it only moved
 * (masonry columns) at once; one left detached this long was likely discarded, and its blobs
 * would otherwise live until the page unloads.
 */
export const IMAGE_RELEASE_DELAY_MS = 60_000;

export class LifecycleManager {
  private renderRoot: ShadowRoot;
  private isInitialized = false;
  private services: InitializedServices | undefined;
  /** Pending `releaseAll` of a paused card's image blobs. */
  private releaseTimer: ReturnType<typeof setTimeout> | undefined;
  /** The image blobs were released while paused: `resume` reloads the images on screen. */
  private imagesReleased = false;

  constructor(renderRoot: ShadowRoot) {
    this.renderRoot = renderRoot;
  }

  initialize(
    getContext: GetCardContext,
    callbacks: CardCallbacks,
  ): InitializedServices | undefined {
    if (this.isInitialized && this.services) {
      return this.services;
    }

    const { hass, config } = getContext();
    if (!hass || !config || !this.renderRoot) {
      return undefined;
    }
    const { render, refreshAfterSave, updateItems, hold } = callbacks;

    try {
      const services = new Services(() => getContext().hass);
      const imageLoader = new ImageLoader((path) => services.fetchImage(path));
      if (hold) {
        setSheetHolds(this.renderRoot, hold);
      }
      const imageViewer = new ImageViewer(this.renderRoot, imageLoader, hold);
      const imageField = new ItemImageField(
        this.renderRoot,
        services,
        imageLoader,
        getContext,
        imageViewer,
      );
      const filters = new Filters(this.renderRoot);
      const renderer = new Renderer(this.renderRoot);
      const state = new State();

      const getInventoryId = (entityId: string) =>
        InventoryResolver.getInventoryId(getContext().hass, entityId);
      const modals = new Modals(
        this.renderRoot,
        services,
        getInventoryId,
        refreshAfterSave,
        getContext,
        imageField,
      );

      const eventHandler = new EventHandler({
        renderRoot: this.renderRoot,
        services,
        modals,
        filters,
        state,
        getContext,
        renderCallback: render,
        updateItemsCallback: updateItems,
        hold,
        imageLoader,
        imageField,
        imageViewer,
      });

      this.services = {
        services,
        modals,
        filters,
        renderer,
        state,
        eventHandler,
        imageLoader,
        imageViewer,
        detailView: new DetailView({
          renderRoot: this.renderRoot,
          getContext,
          historyHandler: eventHandler.historyHandler,
          imageLoader,
          formsReplaced: () => eventHandler.rowsReplaced(),
        }),
      };

      this.isInitialized = true;
      return this.services;
    } catch (error) {
      console.error('Failed to initialize modules:', error);
      return undefined;
    }
  }

  getServices(): InitializedServices | undefined {
    return this.isInitialized ? this.services : undefined;
  }

  isReady(): boolean {
    return this.isInitialized && this.services !== undefined;
  }

  /**
   * Card detached: drop document listeners, the camera and a waiting live search, and free the
   * image blobs unless it is re-attached within `IMAGE_RELEASE_DELAY_MS`; services and state stay.
   */
  pause(): void {
    this.services?.modals.destroy();
    this.services?.filters.cancelScheduledSearch();
    this.services?.imageViewer.pause();
    this.services?.detailView.pause('detached');
    const loader = this.services?.imageLoader;
    if (loader && this.releaseTimer === undefined) {
      this.releaseTimer = setTimeout(() => {
        this.releaseTimer = undefined;
        loader.releaseAll();
        this.imagesReleased = true;
      }, IMAGE_RELEASE_DELAY_MS);
    }
  }

  /**
   * The camera was stopped (card detached or hidden): the sheets listen on the document again,
   * and a header or sheet scanner that was showing its camera starts it again.
   */
  resumeScanners(): void {
    this.services?.modals.resume();
    this.services?.eventHandler.resumeScanning();
  }

  /**
   * Card re-attached after `pause`: listen on the document again, restart a scanner that was
   * showing its camera, and keep the image blobs, or reload the images if they were freed.
   */
  resume(): void {
    this.resumeScanners();
    this.services?.imageViewer.resume();
    this.services?.detailView.resume('detached');
    if (this.releaseTimer !== undefined) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = undefined;
    } else if (this.imagesReleased && this.services) {
      this.imagesReleased = false;
      hydrateImages(this.renderRoot, this.services.imageLoader);
    }
  }

  cleanup(): void {
    if (this.services) {
      this.services.eventHandler?.cleanupEventListeners();
      this.services.state?.cleanup();
      this.services.modals?.destroy();
    }

    this.services = undefined;
    this.isInitialized = false;
  }
}
