import { describe, it, expect, vi } from 'vitest';
import { searchItems, subscribeUpdates } from '../../src/panel/search/searchClient';
import { WS_COMMANDS } from '../../src/utils/constants';
import { createMockHomeAssistant, fakeConnection } from '../testHelpers';

describe('searchItems', () => {
  it('returns the items and the truncated flag', async () => {
    const hass = createMockHomeAssistant({});
    const items = [
      { name: 'Butter', inventory_id: 'k', inventory_name: 'Kitchen', matched: 'name' },
    ];
    hass.callWS = vi.fn().mockResolvedValue({ items, truncated: true });

    await expect(searchItems(hass, 'butter')).resolves.toEqual({
      status: 'ok',
      items,
      truncated: true,
    });
    expect(hass.callWS).toHaveBeenCalledWith({ type: WS_COMMANDS.SEARCH, query: 'butter' });
  });

  it('passes a limit when given', async () => {
    const hass = createMockHomeAssistant({});
    hass.callWS = vi.fn().mockResolvedValue({ items: [], truncated: false });

    await searchItems(hass, 'butter', 10);

    expect(hass.callWS).toHaveBeenCalledWith({
      type: WS_COMMANDS.SEARCH,
      query: 'butter',
      limit: 10,
    });
  });

  it('maps a top-level error', async () => {
    const hass = createMockHomeAssistant({});
    hass.callWS = vi.fn().mockRejectedValue({ code: 'invalid_format', message: 'Too long' });

    await expect(searchItems(hass, 'x'.repeat(101))).resolves.toEqual({
      status: 'error',
      message: 'Too long',
    });
  });

  it('maps the nested error of a HAWS result message', async () => {
    const hass = createMockHomeAssistant({});
    hass.callWS = vi.fn().mockRejectedValue({
      type: 'result',
      success: false,
      error: { code: 'unknown_error', message: 'Connection lost' },
    });

    await expect(searchItems(hass, 'butter')).resolves.toEqual({
      status: 'error',
      message: 'Connection lost',
    });
  });
});

describe('subscribeUpdates', () => {
  it('subscribes to every inventory (no inventory_id) and unsubscribes', async () => {
    const connection = fakeConnection();
    const hass = createMockHomeAssistant({});
    hass.connection = connection;
    const onUpdate = vi.fn();

    const unsubscribe = await subscribeUpdates(hass, onUpdate);
    connection.push({ event: 'updated' });

    expect(connection.subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
      type: WS_COMMANDS.SUBSCRIBE,
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects without a websocket connection', async () => {
    const hass = createMockHomeAssistant({}); // no websocket connection

    await expect(subscribeUpdates(hass, vi.fn())).rejects.toThrow();
  });
});
