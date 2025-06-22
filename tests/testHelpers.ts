import { vi } from 'vitest';
import { HomeAssistant, HassEntity, HassConfig } from '../src/types/homeAssistant';

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
