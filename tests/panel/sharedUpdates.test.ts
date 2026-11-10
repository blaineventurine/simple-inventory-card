import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { SharedUpdates } from '../../src/panel/sharedUpdates';

describe('SharedUpdates', () => {
  let deliver: () => void;
  let unsubscribe: Mock<() => void>;
  let subscribe: Mock<(onUpdate: () => void) => Promise<() => void>>;
  let updates: SharedUpdates;

  beforeEach(() => {
    vi.useFakeTimers();
    deliver = () => undefined;
    unsubscribe = vi.fn();
    subscribe = vi.fn(async (onUpdate: () => void) => {
      deliver = onUpdate;
      return unsubscribe;
    });
    updates = new SharedUpdates(subscribe);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens one subscription for every listener and tells each of them', async () => {
    const home = vi.fn();
    const search = vi.fn();

    updates.listen(home);
    updates.listen(search);
    await vi.advanceTimersByTimeAsync(0);
    deliver();

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(home).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('closes the subscription when the last listener leaves, and only then', async () => {
    const leaveHome = updates.listen(vi.fn());
    const leaveSearch = updates.listen(vi.fn());
    await vi.advanceTimersByTimeAsync(0);

    leaveHome();
    expect(unsubscribe).not.toHaveBeenCalled();
    leaveSearch();
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    // A second call of a removal does nothing.
    leaveSearch();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('keeps the subscription when a listener joins before the other leaves', async () => {
    const leaveHome = updates.listen(vi.fn());
    await vi.advanceTimersByTimeAsync(0);

    updates.listen(vi.fn());
    leaveHome();
    await vi.advanceTimersByTimeAsync(0);

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it('subscribes again for a listener after the subscription closed', async () => {
    const leave = updates.listen(vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    leave();

    const listener = vi.fn();
    updates.listen(listener);
    await vi.advanceTimersByTimeAsync(0);
    deliver();

    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('closes a subscription the integration accepts only after the last listener left', async () => {
    let accept: (unsubscribe: () => void) => void = () => undefined;
    subscribe.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          accept = resolve;
        }),
    );
    const leave = updates.listen(vi.fn());
    leave();

    accept(unsubscribe);
    await vi.advanceTimersByTimeAsync(0);

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('warns, without throwing, when the integration refuses the subscription', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    subscribe.mockRejectedValueOnce(new Error('unknown_command'));

    const leave = updates.listen(vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    leave();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});
