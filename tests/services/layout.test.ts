import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getLayout, saveLayout } from '../../src/services/layout';
import { InventoryConfig } from '../../src/types/inventory';
import { STORAGE_KEYS } from '../../src/utils/constants';

const store = new Map<string, string>();
const storageMock = {
  getItem: (key: string): string | null => store.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    store.set(key, value);
  },
};

const config = (layout?: InventoryConfig['layout']): InventoryConfig => ({
  type: 'custom:simple-inventory-card',
  entity: 'sensor.pantry',
  ...(layout ? { layout } : {}),
});

describe('layout', () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', storageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is the list without a saved choice or a config option', () => {
    expect(getLayout('sensor.pantry', config())).toBe('list');
  });

  it('follows the layout option without a saved choice', () => {
    expect(getLayout('sensor.pantry', config('tiles'))).toBe('tiles');
  });

  it('prefers the saved choice over the layout option', () => {
    saveLayout('sensor.pantry', 'list');

    expect(getLayout('sensor.pantry', config('tiles'))).toBe('list');
  });

  it('ignores an invalid saved value', () => {
    store.set(STORAGE_KEYS.LAYOUT('sensor.pantry'), 'mosaic');

    expect(getLayout('sensor.pantry', config('tiles'))).toBe('tiles');
    expect(getLayout('sensor.pantry', config())).toBe('list');
  });

  it('saves the choice per inventory', () => {
    saveLayout('sensor.pantry', 'tiles');

    expect(store.get('simple_inventory_layout_sensor.pantry')).toBe('tiles');
    expect(getLayout('sensor.pantry', config())).toBe('tiles');
    expect(getLayout('sensor.garage', { ...config(), entity: 'sensor.garage' })).toBe('list');
  });
});
