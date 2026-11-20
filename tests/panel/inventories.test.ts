import { describe, it, expect, vi } from 'vitest';
import { fetchFeatures, fetchInventories } from '../../src/panel/inventories';
import { WS_COMMANDS } from '../../src/utils/constants';
import { createMockHomeAssistant } from '../testHelpers';

describe('fetchInventories', () => {
  it('returns the inventories the integration lists', async () => {
    const hass = createMockHomeAssistant({});
    const inventories = [
      {
        id: 'k',
        name: 'Kitchen',
        icon: 'mdi:fridge',
        description: '',
        entity_id: 'sensor.kitchen_inventory',
      },
    ];
    hass.callWS = vi.fn().mockResolvedValue({ inventories });

    await expect(fetchInventories(hass)).resolves.toEqual({ status: 'ok', inventories });
    expect(hass.callWS).toHaveBeenCalledWith({ type: WS_COMMANDS.LIST_INVENTORIES });
  });

  it('reports an integration without the command as outdated', async () => {
    const hass = createMockHomeAssistant({});
    hass.callWS = vi
      .fn()
      .mockRejectedValue({ code: 'unknown_command', message: 'Unknown command.' });

    await expect(fetchInventories(hass)).resolves.toEqual({ status: 'outdated' });
  });

  it('reads the nested error of a HAWS result message', async () => {
    const hass = createMockHomeAssistant({});
    hass.callWS = vi
      .fn()
      .mockRejectedValueOnce({
        type: 'result',
        success: false,
        error: { code: 'unknown_command', message: 'Unknown command.' },
      })
      .mockRejectedValueOnce({
        type: 'result',
        success: false,
        error: { code: 3, message: 'Connection lost' },
      });

    await expect(fetchInventories(hass)).resolves.toEqual({ status: 'outdated' });
    await expect(fetchInventories(hass)).resolves.toEqual({
      status: 'error',
      message: 'Connection lost',
    });
  });

  it('reports other failures with their message', async () => {
    const hass = createMockHomeAssistant({});
    hass.callWS = vi.fn().mockRejectedValue({ code: 'timeout', message: 'Connection lost' });

    await expect(fetchInventories(hass)).resolves.toEqual({
      status: 'error',
      message: 'Connection lost',
    });
  });
});

describe('fetchFeatures', () => {
  it('returns the features get_info reports', async () => {
    const hass = createMockHomeAssistant({});
    hass.callWS = vi
      .fn()
      .mockResolvedValue({ version: '1.0.0', api_version: 2, features: ['batches', 'search'] });

    await expect(fetchFeatures(hass)).resolves.toEqual(['batches', 'search']);
    expect(hass.callWS).toHaveBeenCalledWith({ type: WS_COMMANDS.GET_INFO });
  });

  it('reports no features when get_info fails', async () => {
    const hass = createMockHomeAssistant({});
    hass.callWS = vi.fn().mockRejectedValue({ code: 'unknown_command', message: 'Unknown' });

    await expect(fetchFeatures(hass)).resolves.toEqual([]);
  });
});
