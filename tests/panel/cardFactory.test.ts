import { describe, it, expect, vi, afterEach } from 'vitest';
import { createInventoryCard } from '../../src/panel/cardFactory';

afterEach(() => vi.restoreAllMocks());

describe('createInventoryCard', () => {
  it('configures the registered card element for the inventory sensor, embedded', () => {
    const element = document.createElement('div');
    const setConfig = vi.fn();
    Object.assign(element, { setConfig, hass: undefined });
    vi.spyOn(document, 'createElement').mockReturnValue(element);

    const card = createInventoryCard('sensor.kitchen_inventory');

    expect(document.createElement).toHaveBeenCalledWith('simple-inventory-card');
    expect(card).toBe(element);
    expect(setConfig).toHaveBeenCalledWith({
      type: 'custom:simple-inventory-card',
      entity: 'sensor.kitchen_inventory',
    });
    expect(card?.hasAttribute('embedded')).toBe(true);
  });

  it('returns undefined when the card element is not registered', () => {
    expect(createInventoryCard('sensor.kitchen_inventory')).toBeUndefined();
  });
});
