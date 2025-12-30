export interface CardContext {
  hass: HomeAssistant;
  config: InventoryConfig;
  translations: TranslationData;
}

export interface HomeAssistant {
  states: { [entityId: string]: HassEntity };
  config: HassConfig;
  themes: any;
  selectedTheme: any;
  panels: any;
  panelUrl: string;
  language: string;
  selectedLanguage: string;
  localize: (key: string, ...arguments_: any[]) => string;
  translationMetadata: any;
  dockedSidebar: 'docked' | 'always_hidden' | 'auto';
  moreInfoEntityId: string | null;
  user?: CurrentUser;
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, any>,
    target?: HassServiceTarget,
  ) => Promise<ServiceCallResponse>;
  callApi: <T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: Record<string, any>,
  ) => Promise<T>;
  fetchWithAuth: (path: string, init?: RequestInit) => Promise<Response>;
  sendWS: (message: MessageBase) => void;
  callWS: <T>(message: MessageBase) => Promise<T>;
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
  response?: any;
}

export interface MessageBase {
  id?: number;
  type: string;
  [key: string]: any;
}

export interface Context {
  id: string;
  parent_id?: string;
  user_id?: string;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: HassEntityAttributeBase & Record<string, any>;
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

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  config?: LovelaceCardConfig;
  setConfig(config: LovelaceCardConfig): void;
  getCardSize?(): number | Promise<number>;
}

export interface LovelaceCardConfig {
  type: string;
  [key: string]: any;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  config?: LovelaceCardConfig;
  setConfig(config: LovelaceCardConfig): void;
}

export interface InventoryItem {
  auto_add_enabled: boolean;
  auto_add_id_to_description_enabled: boolean;
  auto_add_to_list_quantity?: number;
  category: string;
  description: string;
  expiry_alert_days?: number;
  expiry_date: string;
  location: string;
  name: string;
  quantity: number;
  todo_list: string;
  unit: string;
}

export interface InventoryConfig extends LovelaceCardConfig {
  type: string;
  entity: string;
}
