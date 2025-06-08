export interface HomeAssistant {
  states: { [entityId: string]: HassEntity };
  config: HassConfig;
  themes: any;
  selectedTheme: any;
  panels: any;
  panelUrl: string;
  language: string;
  selectedLanguage: string;
  localize: (key: string, ...args: any[]) => string;
  translationMetadata: any;
  dockedSidebar: 'docked' | 'always_hidden' | 'auto';
  moreInfoEntityId: string | null;
  user?: CurrentUser;
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, any>,
    target?: HassServiceTarget
  ) => Promise<ServiceCallResponse>;
  callApi: <T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: Record<string, any>
  ) => Promise<T>;
  fetchWithAuth: (path: string, init?: RequestInit) => Promise<Response>;
  sendWS: (msg: MessageBase) => void;
  callWS: <T>(msg: MessageBase) => Promise<T>;
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

// Add your specific types
export interface InventoryItem {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  expiry_date?: string;
  auto_add_enabled?: boolean;
  threshold?: number;
  todo_list?: string;
}

export interface InventoryConfig extends LovelaceCardConfig {
  type?: string;
  entity?: string;
}
