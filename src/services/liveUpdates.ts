import { HassConnection } from '@/types/homeAssistant';
import { InventoryItem } from '@/types/inventory';
import { WS_COMMANDS } from '@/utils/constants';

/** Coalescing window for a burst of pushes (an import, several service calls). */
export const LIVE_UPDATE_DELAY_MS = 150;

/**
 * Live updates of one inventory via `simple_inventory/subscribe`: after every change the
 * backend pushes `{ items }` (as `list_items` returns them). A burst is coalesced, the latest
 * payload winning, into one `onItems`; a payload without items asks for a refetch through
 * `onStale`.
 *
 * The subscription is renewed here, not by the websocket library, after the websocket comes
 * back: while HA restarts the integration may not be loaded yet and refuse it, which the card
 * must see. Once a renewed subscription is accepted, `onStale` fetches what changed meanwhile.
 * While refused (also by an older integration) it is inactive, the card refreshes on entity
 * changes and asks again through `retry`.
 */
export class LiveUpdates {
  private connection: HassConnection | undefined;
  private inventoryId = '';
  /** The backend accepted the subscription; pushes are flowing. */
  private subscribed = false;
  /** A subscribe request is waiting for the backend's answer. */
  private subscribing = false;
  /**
   * Pushes may have been lost (the websocket dropped, or a subscription was refused): refetch
   * once the next subscription is accepted. Kept across `disconnect`.
   */
  private missedPushes = false;
  private unsubscribe: (() => Promise<void>) | undefined;
  /** Counts subscribe requests; answers and events of an older one are ignored. */
  private generation = 0;
  /** The latest payload of the current burst: items, or 'refetch'. */
  private pending: InventoryItem[] | 'refetch' | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly onItems: (items: InventoryItem[]) => void,
    private readonly onStale: () => void,
  ) {}

  /** Whether pushes are flowing (the entity-state trigger is then not needed). */
  get active(): boolean {
    return this.subscribed;
  }

  /**
   * Subscribe to `inventoryId` on `connection`; moves the subscription when either changed and
   * does nothing otherwise (a refused subscription is asked again only through `retry`).
   */
  connect(connection: HassConnection | undefined, inventoryId: string): void {
    if (connection === this.connection && inventoryId === this.inventoryId) {
      return;
    }
    this.disconnect();
    if (!connection || !inventoryId) {
      return;
    }
    this.connection = connection;
    this.inventoryId = inventoryId;
    connection.addEventListener('ready', this.handleReconnect);
    this.subscribe();
  }

  /** Ask again after a refusal, e.g. when the entity changed (the integration may be back). */
  retry(): void {
    if (!this.subscribed && !this.subscribing) {
      this.subscribe();
    }
  }

  /** Unsubscribe and drop a burst not delivered yet. */
  disconnect(): void {
    this.connection?.removeEventListener('ready', this.handleReconnect);
    // The connection may be gone already; there is nothing left to unsubscribe from then.
    this.unsubscribe?.().catch(() => {});
    this.reset();
    this.connection = undefined;
    this.inventoryId = '';
  }

  /** Forget the current subscription (and its pending answer and burst). */
  private reset(): void {
    this.generation += 1;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = undefined;
    this.unsubscribe = undefined;
    this.subscribed = false;
    this.subscribing = false;
  }

  private subscribe(): void {
    const connection = this.connection;
    if (!connection) {
      return;
    }
    this.reset();
    const generation = this.generation;
    this.subscribing = true;
    connection
      .subscribeMessage(
        (event) => {
          if (generation === this.generation) {
            this.receive(event);
          }
        },
        { type: WS_COMMANDS.SUBSCRIBE, inventory_id: this.inventoryId },
        { resubscribe: false },
      )
      .then((unsubscribe) => {
        if (generation !== this.generation) {
          unsubscribe().catch(() => {});
          return;
        }
        this.unsubscribe = unsubscribe;
        this.subscribing = false;
        this.subscribed = true;
        if (this.missedPushes) {
          this.missedPushes = false;
          this.onStale();
        }
      })
      .catch((error: unknown) => {
        if (generation === this.generation) {
          this.subscribing = false;
          this.missedPushes = true;
          console.warn('Live updates unavailable, refreshing on entity changes instead:', error);
        }
      });
  }

  /** The websocket is back: the old subscription died with it, pushes in between are lost. */
  private readonly handleReconnect = (): void => {
    this.missedPushes = true;
    this.subscribe();
  };

  private receive(event: unknown): void {
    const items =
      event !== null && typeof event === 'object' && 'items' in event ? event.items : undefined;
    this.pending = Array.isArray(items) ? items : 'refetch';
    this.timer ??= setTimeout(() => {
      this.timer = undefined;
      const pending = this.pending;
      this.pending = undefined;
      if (pending === 'refetch') {
        this.onStale();
      } else if (pending) {
        this.onItems(pending);
      }
    }, LIVE_UPDATE_DELAY_MS);
  }
}
