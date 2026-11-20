import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

import { LIVE_UPDATE_DELAY_MS, LiveUpdates } from '../../src/services/liveUpdates';
import { MessageBase } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import { WS_COMMANDS } from '../../src/utils/constants';
import { FakeConnection, fakeConnection } from '../testHelpers';

function item(name: string, quantity: number): InventoryItem {
  return {
    name,
    quantity,
    unit: '',
    description: '',
    category: '',
    location: '',
    expiry_date: '',
    todo_list: '',
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
  };
}

describe('LiveUpdates', () => {
  let connection: FakeConnection;
  let onItems: Mock<(items: InventoryItem[]) => void>;
  let onStale: Mock<() => void>;
  let live: LiveUpdates;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    connection = fakeConnection();
    onItems = vi.fn<(items: InventoryItem[]) => void>();
    onStale = vi.fn<() => void>();
    live = new LiveUpdates(onItems, onStale);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('subscribes to the inventory and is active once the backend accepted', async () => {
    live.connect(connection, 'pantry');
    expect(live.active).toBe(false);

    await vi.advanceTimersByTimeAsync(0);

    expect(connection.subscribeMessage).toHaveBeenCalledTimes(1);
    const message: MessageBase | undefined = connection.subscribeMessage.mock.calls[0]?.[1];
    expect(message).toEqual({ type: WS_COMMANDS.SUBSCRIBE, inventory_id: 'pantry' });
    // The card resubscribes itself after a reconnect, so it sees a refusal (see below).
    expect(connection.subscribeMessage.mock.calls[0]?.[2]).toEqual({ resubscribe: false });
    expect(live.active).toBe(true);
  });

  it('keeps one subscription while the connection and inventory stay the same', async () => {
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);
    live.connect(connection, 'pantry');

    expect(connection.subscribeMessage).toHaveBeenCalledTimes(1);
  });

  it('moves the subscription when the inventory changes', async () => {
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);

    live.connect(connection, 'garage');
    await vi.advanceTimersByTimeAsync(0);

    expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
    expect(connection.subscribeMessage.mock.calls[1]?.[1]).toEqual({
      type: WS_COMMANDS.SUBSCRIBE,
      inventory_id: 'garage',
    });
    expect(live.active).toBe(true);
  });

  it('does not subscribe without a connection or an inventory id', () => {
    live.connect(undefined, 'pantry');
    live.connect(connection, '');

    expect(connection.subscribeMessage).not.toHaveBeenCalled();
    expect(live.active).toBe(false);
  });

  it('delivers pushed items after the coalescing window, the latest of a burst only', async () => {
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);

    connection.push({ items: [item('Apples', 1)] });
    connection.push({ items: [item('Apples', 2)] });
    await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS - 1);
    expect(onItems).not.toHaveBeenCalled();
    connection.push({ items: [item('Apples', 3)] });
    await vi.advanceTimersByTimeAsync(1);

    expect(onItems).toHaveBeenCalledTimes(1);
    expect(onItems).toHaveBeenCalledWith([item('Apples', 3)]);
    expect(onStale).not.toHaveBeenCalled();
  });

  it('asks for a refetch for an event without items', async () => {
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);

    connection.push({ items: [item('Apples', 1)] });
    connection.push({ event: 'updated' });
    await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);

    expect(onStale).toHaveBeenCalledTimes(1);
    expect(onItems).not.toHaveBeenCalled();
  });

  it('ignores events of a subscription it moved away from', async () => {
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);
    const pantryEvents = connection.subscribeMessage.mock.calls[0]?.[0];

    live.connect(connection, 'garage');
    await vi.advanceTimersByTimeAsync(0);
    pantryEvents?.({ items: [item('Apples', 1)] });
    live.disconnect();
    pantryEvents?.({ items: [item('Apples', 2)] });
    await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);

    expect(onItems).not.toHaveBeenCalled();
    expect(onStale).not.toHaveBeenCalled();
  });

  it('subscribes again after the websocket reconnected, then asks for one refetch', async () => {
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);
    const accept = connection.subscribeMessage.getMockImplementation();
    // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
    let answer: () => void = () => {};
    connection.subscribeMessage.mockImplementationOnce(
      (callback, message, options) =>
        new Promise((resolve, reject) => {
          answer = () => {
            accept?.(callback, message, options).then(resolve, reject);
          };
        }),
    );

    connection.reconnect();
    expect(live.active).toBe(false);
    expect(connection.subscribeMessage).toHaveBeenCalledTimes(2);
    expect(onStale).not.toHaveBeenCalled();

    answer();
    await vi.advanceTimersByTimeAsync(0);

    expect(live.active).toBe(true);
    expect(onStale).toHaveBeenCalledTimes(1);
    connection.push({ items: [item('Apples', 4)] });
    await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);
    expect(onItems).toHaveBeenCalledWith([item('Apples', 4)]);
  });

  it('goes inactive when the resubscribe after a reconnect is refused, until a retry is accepted', async () => {
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);
    // HA restarting: the integration is not loaded yet when the websocket is back.
    connection.subscribeMessage.mockRejectedValueOnce({ code: 'unknown_command' });

    connection.reconnect();
    await vi.advanceTimersByTimeAsync(0);

    expect(live.active).toBe(false);
    expect(onStale).not.toHaveBeenCalled();

    live.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(connection.subscribeMessage).toHaveBeenCalledTimes(3);
    expect(live.active).toBe(true);
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('stays inactive when the backend refuses the subscription; a retry asks again', async () => {
    connection.subscribeMessage.mockRejectedValue({ code: 'unknown_command' });
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);

    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);
    expect(connection.subscribeMessage).toHaveBeenCalledTimes(1);

    live.retry();
    live.retry(); // one request at a time
    await vi.advanceTimersByTimeAsync(0);

    expect(live.active).toBe(false);
    expect(connection.subscribeMessage).toHaveBeenCalledTimes(2);
    expect(onStale).not.toHaveBeenCalled();
  });

  it('refetches once on the first acceptance after a refusal, even across a disconnect', async () => {
    connection.subscribeMessage.mockRejectedValueOnce({ code: 'unknown_command' });
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);

    live.disconnect();
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);

    expect(live.active).toBe(true);
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('does not retry while subscribed or without a connection', async () => {
    live.retry();
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);

    live.retry();

    expect(connection.subscribeMessage).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes, drops queued events and stops listening on disconnect', async () => {
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);
    connection.push({ items: [item('Apples', 1)] });

    live.disconnect();
    await vi.advanceTimersByTimeAsync(LIVE_UPDATE_DELAY_MS);

    expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
    expect(connection.readyListeners()).toBe(0);
    expect(onItems).not.toHaveBeenCalled();
    expect(live.active).toBe(false);
  });

  it('subscribes again after a disconnect', async () => {
    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);
    live.disconnect();

    live.connect(connection, 'pantry');
    await vi.advanceTimersByTimeAsync(0);

    expect(connection.subscribeMessage).toHaveBeenCalledTimes(2);
    expect(live.active).toBe(true);
  });

  it('cancels a subscription the backend accepts only after the disconnect', async () => {
    let accept: (unsubscribe: () => Promise<void>) => void = () => {};
    // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
    connection.subscribeMessage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          accept = resolve;
        }),
    );
    live.connect(connection, 'pantry');

    live.disconnect();
    accept(connection.unsubscribe);
    await vi.advanceTimersByTimeAsync(0);

    expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
    expect(live.active).toBe(false);
  });
});
