import { HomeAssistant, HassEntity } from '@/types/homeAssistant';
import { Utilities } from '../utils/utilities';

export class State {
  public userInteracting = false;
  private renderTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  private _lastEntityState: HassEntity | undefined = undefined;
  private _renderCallback: (() => void) | undefined = undefined;
  private _debouncedRenderFn: (() => void) | undefined = undefined;

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

  public debouncedRender(renderFunction?: () => void, delay = 100): void {
    // If a function is provided, use it; otherwise use the stored callback
    const callback = renderFunction || this._renderCallback;

    if (!callback) {
      console.warn('No render function provided to debouncedRender');
      return;
    }

    if (!this._debouncedRenderFn) {
      this._debouncedRenderFn = Utilities.debounce(() => {
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

  public debouncedRenderWithCallback(renderFunction: () => void, delay = 100): void {
    this.debouncedRender(renderFunction, delay);
  }

  public debouncedRenderDefault(delay = 100): void {
    this.debouncedRender(undefined, delay);
  }

  public cleanup(): void {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = undefined;
    }
    this._renderCallback = undefined;
    this.userInteracting = false;
  }
}
