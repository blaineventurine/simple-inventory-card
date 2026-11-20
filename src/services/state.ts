import { HomeAssistant, HassEntity } from '@/types/homeAssistant';

export class State {
  public userInteracting = false;
  /** Names of items whose details panel is open; survives full re-renders. */
  public readonly expandedBatchItems = new Set<string>();
  private _lastEntityState: HassEntity | undefined = undefined;

  public trackUserInteraction(shadowRoot: ShadowRoot): void {
    const inputs = shadowRoot.querySelectorAll<HTMLElement>('input, select, textarea');

    for (const input of inputs) {
      input.addEventListener('focus', () => {
        this.userInteracting = true;
      });

      input.addEventListener('blur', () => {
        setTimeout(() => {
          this.userInteracting = false;
        }, 100);
      });
    }
  }

  public hasRealEntityChange(hass: HomeAssistant, entityId: string): boolean {
    const currentState = hass.states[entityId];
    if (!currentState) {
      return false;
    }

    const prev = this._lastEntityState;
    this._lastEntityState = currentState;
    if (!prev) return true;

    return (
      prev.last_changed !== currentState.last_changed ||
      prev.attributes?.total_items !== currentState.attributes?.total_items ||
      prev.attributes?.total_quantity !== currentState.attributes?.total_quantity
    );
  }

  /** Open or close an item's details panel; returns whether it is now open. */
  public toggleBatchesExpanded(itemName: string): boolean {
    if (this.expandedBatchItems.delete(itemName)) {
      return false;
    }
    this.expandedBatchItems.add(itemName);
    return true;
  }

  public cleanup(): void {
    this.userInteracting = false;
    this.expandedBatchItems.clear();
  }
}
