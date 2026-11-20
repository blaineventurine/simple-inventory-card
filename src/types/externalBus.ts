/**
 * The parts of the Home Assistant frontend's external-app messaging the card uses, mirroring
 * `src/external_app/external_messaging.ts` of home-assistant/frontend. In the companion app,
 * `hass.auth.external` is HA's `ExternalMessaging`; the app talks back through
 * `window.externalBus`.
 */

/** The companion app's capabilities, fetched by HA at startup (`config/get`). */
export interface ExternalConfig {
  /** The app's native barcode scanner (its version); absent or 0 without one. */
  hasBarCodeScanner?: number;
}

/** Opens the app's barcode scanner. */
export interface BarCodeScanMessage {
  type: 'bar_code/scan';
  payload: {
    title: string;
    description: string;
    /** Label of the app scanner's alternative button (answered by `bar_code/aborted`). */
    alternative_option_label?: string;
  };
}

/** Closes the app's barcode scanner. */
export interface BarCodeCloseMessage {
  type: 'bar_code/close';
}

export type BarCodeMessage = BarCodeScanMessage | BarCodeCloseMessage;

/** The app read a barcode (`format` as in the Barcode Detection API, or `unknown`). */
export interface BarCodeScanResultCommand {
  id: number;
  type: 'command';
  command: 'bar_code/scan_result';
  payload: { rawValue: string; format: string };
}

/**
 * The app's scanner closed: by the user, or for its alternative button. Like HA's
 * ha-qr-scanner, the card takes any reason but `canceled` as the alternative button.
 */
export interface BarCodeAbortedCommand {
  id: number;
  type: 'command';
  command: 'bar_code/aborted';
  payload: { reason: 'canceled' | 'alternative_options' };
}

export type BarCodeCommand = BarCodeScanResultCommand | BarCodeAbortedCommand;

/** HA's `ExternalMessaging`: it numbers the messages and picks the app's transport. */
export interface ExternalMessaging {
  config?: ExternalConfig;
  fireMessage(message: BarCodeMessage): void;
}

declare global {
  interface Window {
    /** Where the companion app delivers its messages; HA's `ExternalMessaging` sets it. */
    externalBus?: (message: unknown) => void;
  }
}
