import { vi, type Mock } from 'vitest';
import { HomeAssistant, HassConnection, HassEntity, HassConfig } from '../src/types/homeAssistant';
import { CardContext, NO_CAPABILITIES } from '../src/types/cardContext';

export const createMockHassEntity = (
  entityId: string,
  overrides: Partial<HassEntity> = {},
): HassEntity => ({
  entity_id: entityId,
  state: 'unknown',
  attributes: {},
  context: { id: 'test-context' },
  last_changed: '2023-01-01T00:00:00Z',
  last_updated: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockHassConfig = (overrides: Partial<HassConfig> = {}): HassConfig => ({
  latitude: 0,
  longitude: 0,
  elevation: 0,
  unit_system: {
    length: 'ft',
    mass: 'lb',
    temperature: '°F',
    volume: 'gal',
  },
  location_name: 'Test Location',
  time_zone: 'America/New_York',
  components: ['inventory'],
  config_dir: '/config',
  whitelist_external_dirs: [],
  allowlist_external_dirs: [],
  allowlist_external_urls: [],
  version: '2024.1.0',
  config_source: 'yaml',
  safe_mode: false,
  state: 'RUNNING',
  ...overrides,
});

export const createMockHomeAssistant = (
  entities: Record<string, HassEntity> = {},
  configOverrides: Partial<HassConfig> = {},
): HomeAssistant => ({
  states: entities,
  config: createMockHassConfig(configOverrides),
  themes: {},
  selectedTheme: null,
  panels: {},
  panelUrl: '',
  language: 'en',
  selectedLanguage: 'en',
  localize: vi.fn((key: string) => key),
  translationMetadata: {},
  dockedSidebar: 'docked',
  moreInfoEntityId: null,
  user: {
    id: 'test-user',
    name: 'Test User',
    is_owner: true,
    is_admin: true,
    credentials: [],
    mfa_modules: [],
  },
  callService: vi.fn(),
  callApi: vi.fn(),
  fetchWithAuth: vi.fn(),
  sendWS: vi.fn(),
  callWS: vi.fn(),
});

/** A card context: an empty hass, a `sensor.test_inventory` config, no items or capabilities. */
export const createMockCardContext = (overrides: Partial<CardContext> = {}): CardContext => ({
  hass: createMockHomeAssistant(),
  config: { type: 'custom:simple-inventory-card', entity: 'sensor.test_inventory' },
  translations: {},
  items: [],
  capabilities: NO_CAPABILITIES,
  ...overrides,
});

/** `value`, failing the test with `message` when it is null or undefined. */
export function must<T>(value: T | null | undefined, message = 'expected a value'): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/** A websocket connection double: `push` delivers a subscription event, `reconnect` fires `ready`. */
export interface FakeConnection extends HassConnection {
  subscribeMessage: Mock<HassConnection['subscribeMessage']>;
  unsubscribe: Mock<() => Promise<void>>;
  push(event: unknown): void;
  reconnect(): void;
  readyListeners(): number;
}

export function fakeConnection(): FakeConnection {
  let deliver: ((event: unknown) => void) | undefined;
  const ready = new Set<() => void>();
  const unsubscribe = vi.fn<() => Promise<void>>(async () => {
    deliver = undefined;
  });
  return {
    unsubscribe,
    subscribeMessage: vi.fn<HassConnection['subscribeMessage']>(async (callback) => {
      deliver = callback;
      return unsubscribe;
    }),
    addEventListener: (_event, listener) => {
      ready.add(listener);
    },
    removeEventListener: (_event, listener) => {
      ready.delete(listener);
    },
    push: (event) => deliver?.(event),
    reconnect: () => ready.forEach((listener) => listener()),
    readyListeners: () => ready.size,
  };
}
