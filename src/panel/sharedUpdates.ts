/**
 * One all-inventories update subscription shared by the panel's views that follow every
 * inventory (Home and search): opened for the first listener, closed when the last one leaves.
 * A view that takes over from another joins before the other leaves, so the subscription stays
 * open across the switch.
 */
export class SharedUpdates {
  /** One entry per `listen` call (the same function may listen twice). */
  private readonly listeners = new Set<{ notify: () => void }>();
  private unsubscribe: (() => void) | undefined = undefined;
  /** Bumped on every open and close; a subscription accepted after its close is dropped. */
  private generation = 0;

  constructor(private readonly subscribe: (onUpdate: () => void) => Promise<() => void>) {}

  /** Calls `notify` on every update until the returned removal is called (any number of times). */
  listen(notify: () => void): () => void {
    const listener = { notify };
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.open();
    }
    return () => {
      if (this.listeners.delete(listener) && this.listeners.size === 0) {
        this.close();
      }
    };
  }

  private open(): void {
    this.generation += 1;
    const generation = this.generation;
    this.subscribe(() => {
      for (const listener of [...this.listeners]) {
        listener.notify();
      }
    })
      .then((unsubscribe) => {
        if (generation === this.generation) {
          this.unsubscribe = unsubscribe;
        } else {
          unsubscribe();
        }
      })
      .catch((error: unknown) => {
        if (generation === this.generation) {
          console.warn('Simple Inventory: the panel will not update live:', error);
        }
      });
  }

  private close(): void {
    this.generation += 1;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
