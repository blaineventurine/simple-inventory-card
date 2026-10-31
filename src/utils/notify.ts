/**
 * Show a toast through the Home Assistant frontend.
 *
 * HA's root element listens for the bubbling, composed `hass-notification`
 * event (the frontend's own `fireEvent(this, 'hass-notification', {message})`),
 * so dispatching it from anywhere inside the card's shadow tree reaches it.
 *
 * Use for failures HA does not already surface — `callWS` rejections. Do not use
 * for `hass.callService` failures; HA toasts those itself.
 */
export function showHassNotification(target: EventTarget, message: string): void {
  target.dispatchEvent(
    new CustomEvent('hass-notification', {
      detail: { message },
      bubbles: true,
      composed: true,
    }),
  );
}
