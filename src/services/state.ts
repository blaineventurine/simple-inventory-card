import { HomeAssistant, HassEntity, InventoryItem } from '../types/home-assistant';
import { Utils } from '../utils/utils';

export class State {
  public userInteracting = false;
  private renderTimeout: ReturnType<typeof setTimeout> | null = null;
  private _lastEntityState: HassEntity | null = null;
  private _renderCallback: (() => void) | null = null;
  private _debouncedRenderFn: (() => void) | null = null;

  public trackUserInteraction(shadowRoot: ShadowRoot): void {
    const inputs = shadowRoot.querySelectorAll<HTMLElement>('input, select, textarea');

    inputs.forEach((input) => {
      input.addEventListener('focus', () => {
        this.userInteracting = true;
      });

      input.addEventListener('blur', () => {
        setTimeout(() => {
          this.userInteracting = false;
        }, 100);
      });
    });
  }

  public hasRealEntityChange(hass: HomeAssistant, entityId: string): boolean {
    const currentState = hass.states[entityId];
    if (!currentState) {
      return false;
    }

    if (!this._lastEntityState) {
      this._lastEntityState = currentState;
      return true;
    }

    return this.hasItemsChanged(
      this._lastEntityState.attributes?.items,
      currentState.attributes?.items,
    );
  }

  private hasItemsChanged(
    oldItems: readonly InventoryItem[] | undefined,
    newItems: readonly InventoryItem[] | undefined,
  ): boolean {
    const oldItemsArray = oldItems || [];
    const newItemsArray = newItems || [];

    const changed = JSON.stringify(oldItemsArray) !== JSON.stringify(newItemsArray);

    if (changed && newItems) {
      this._lastEntityState = {
        ...(this._lastEntityState as HassEntity),
        attributes: {
          ...this._lastEntityState?.attributes,
          items: [...newItemsArray],
        },
      };
    }

    return changed;
  }

  public debouncedRender(renderFn?: () => void, delay = 100): void {
    // If a function is provided, use it; otherwise use the stored callback
    const callback = renderFn || this._renderCallback;

    if (!callback) {
      console.warn('No render function provided to debouncedRender');
      return;
    }

    if (!this._debouncedRenderFn) {
      this._debouncedRenderFn = Utils.debounce(() => {
        if (this._renderCallback) {
          this._renderCallback();
        }
      }, delay);
    }

    this._debouncedRenderFn();
  }

  public setRenderCallback(callback: () => void): void {
    this._renderCallback = callback;
  }

  public debouncedRenderWithCallback(renderFn: () => void, delay = 100): void {
    this.debouncedRender(renderFn, delay);
  }

  public debouncedRenderDefault(delay = 100): void {
    this.debouncedRender(undefined, delay);
  }

  public cleanup(): void {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }
    this._renderCallback = null;
    this.userInteracting = false;
  }
}
