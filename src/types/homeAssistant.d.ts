export interface HomeAssistant {
  states: { [entityId: string]: HassEntity };
  config: HassConfig;
  themes: unknown;
  selectedTheme: unknown;
  panels: unknown;
  panelUrl: string;
  language: string;
  selectedLanguage: string;
  localize: (key: string, ...arguments_: unknown[]) => string;
  translationMetadata: unknown;
  dockedSidebar: 'docked' | 'always_hidden' | 'auto';
  moreInfoEntityId: string | null;
  user?: CurrentUser;
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: HassServiceTarget,
  ) => Promise<ServiceCallResponse>;
  callApi: <T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: Record<string, unknown>,
  ) => Promise<T>;
  fetchWithAuth: (path: string, init?: RequestInit) => Promise<Response>;
  sendWS: (message: MessageBase) => void;
  callWS: <T>(message: MessageBase) => Promise<T>;
  /** HA's websocket connection (home-assistant-js-websocket); absent in some test doubles. */
  connection?: HassConnection;
  /** HA's auth; absent in some test doubles. */
  auth?: HassAuth;
}

export interface HassAuth {
  /**
   * HA's `ExternalMessaging` when the frontend runs in the companion app; read through the
   * type guard in services/barcodeScanner.
   */
  external?: unknown;
}

/** The part of home-assistant-js-websocket's `Connection` the card uses. */
export interface HassConnection {
  /**
   * Subscribe to a websocket command's events; resolves to the unsubscribe function once the
   * backend accepted it, rejects when it refused (e.g. an unknown command). Resubscribes by
   * itself after a reconnect unless `resubscribe` is false.
   */
  subscribeMessage(
    callback: (event: unknown) => void,
    message: MessageBase,
    options?: { resubscribe?: boolean },
  ): Promise<() => Promise<void>>;
  /** `ready` fires when the websocket (re)connected. */
  addEventListener(event: 'ready', listener: () => void): void;
  removeEventListener(event: 'ready', listener: () => void): void;
}

export interface HassConfig {
  latitude: number;
  longitude: number;
  elevation: number;
  unit_system: {
    length: string;
    mass: string;
    temperature: string;
    volume: string;
  };
  location_name: string;
  time_zone: string;
  currency?: string;
  components: string[];
  config_dir: string;
  whitelist_external_dirs: string[];
  allowlist_external_dirs: string[];
  allowlist_external_urls: string[];
  version: string;
  config_source: string;
  safe_mode: boolean;
  state: 'NOT_RUNNING' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'FINAL_WRITE';
  external_url?: string;
  internal_url?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  is_owner: boolean;
  is_admin: boolean;
  credentials: Credential[];
  mfa_modules: MfaModule[];
}

export interface Credential {
  id: string;
  type: string;
}

export interface MfaModule {
  id: string;
  name: string;
  enabled: boolean;
}

export interface HassServiceTarget {
  entity_id?: string | string[];
  device_id?: string | string[];
  area_id?: string | string[];
  label_id?: string | string[];
}

export interface ServiceCallResponse {
  context?: Context;
  response?: unknown;
}

export interface MessageBase {
  id?: number;
  type: string;
  [key: string]: unknown;
}

export interface Context {
  id: string;
  parent_id?: string;
  user_id?: string;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: HassEntityAttributeBase & InventorySensorAttributes & Record<string, unknown>;
  context: Context;
  last_changed: string;
  last_updated: string;
}

export interface HassEntityAttributeBase {
  friendly_name?: string;
  unit_of_measurement?: string;
  icon?: string;
  entity_picture?: string;
  supported_features?: number;
  hidden?: boolean;
  assumed_state?: boolean;
  device_class?: string;
  state_class?: string;
  restored?: boolean;
}

/** Attributes of the integration's inventory sensors that the card reads. */
export interface InventorySensorAttributes {
  inventory_id?: string;
  /** `inventory_<entry id>` also names the inventory (see `InventoryResolver.getInventoryId`). */
  unique_id?: string;
  description?: string;
  total_items?: number;
  total_quantity?: number;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  config?: LovelaceCardConfig;
  setConfig(config: LovelaceCardConfig): void;
  getCardSize?(): number | Promise<number>;
}

export interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  config?: LovelaceCardConfig;
  setConfig(config: LovelaceCardConfig): void;
}

declare global {
  interface Window {
    customCards: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
    loadCardHelpers?: () => Promise<{
      createCardElement: (config: Record<string, unknown>) => HTMLElement | Promise<HTMLElement>;
    }>;
  }
}
