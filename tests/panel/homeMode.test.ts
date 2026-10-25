import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { HomeMode, HomeState } from '../../src/panel/home/homeMode';
import { OverviewResult } from '../../src/panel/home/overviewClient';
import { overview, summary } from './overviewFixtures';

const kitchen = { id: 'kitchen_id', name: 'Kitchen' };

function answer(totalItems: number): OverviewResult {
  return {
    status: 'ok',
    overview: overview({ inventories: [summary(kitchen, { total_items: totalItems })] }),
  };
}

describe('HomeMode', () => {
  let fetch: Mock<() => Promise<OverviewResult>>;
  let stopListening: Mock<() => void>;
  let pushUpdate: () => void;
  let states: HomeState[];
  let home: HomeMode;

  beforeEach(() => {
    vi.useFakeTimers();
    fetch = vi.fn(async () => answer(1));
    stopListening = vi.fn();
    pushUpdate = () => undefined;
    states = [];
    home = new HomeMode({
      fetch,
      listen: (onUpdate) => {
        pushUpdate = onUpdate;
        return stopListening;
      },
      onChange: (state) => states.push(state),
    });
  });

  afterEach(() => {
    home.stop();
    vi.useRealTimers();
  });

  it('loads the overview at once when started', async () => {
    home.start();
    expect(home.state).toEqual({ status: 'loading' });

    await vi.advanceTimersByTimeAsync(0);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(home.state).toEqual(answer(1));
  });

  it('re-fetches 500 ms after the last of a burst of updates, keeping the shown overview', async () => {
    home.start();
    await vi.advanceTimersByTimeAsync(0);
    const loaded = states.length;
    fetch.mockClear();
    fetch.mockResolvedValue(answer(2));

    pushUpdate();
    await vi.advanceTimersByTimeAsync(200);
    pushUpdate();
    await vi.advanceTimersByTimeAsync(200);
    pushUpdate();
    await vi.advanceTimersByTimeAsync(499);
    expect(fetch).not.toHaveBeenCalled();
    expect(states.at(-1)).toEqual(answer(1));

    await vi.advanceTimersByTimeAsync(1);

    expect(fetch).toHaveBeenCalledTimes(1);
    // No loading state in between: the shown overview stays until the new one replaces it.
    expect(states.slice(loaded)).toEqual([answer(2)]);
    expect(home.state).toEqual(answer(2));
  });

  it('drops the answer of a fetch a later one superseded', async () => {
    const answers: Array<(result: OverviewResult) => void> = [];
    fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          answers.push(resolve);
        }),
    );
    home.start();
    pushUpdate();
    await vi.advanceTimersByTimeAsync(500);

    answers[1](answer(2));
    await vi.advanceTimersByTimeAsync(0);
    answers[0](answer(1));
    await vi.advanceTimersByTimeAsync(0);

    expect(home.state).toEqual(answer(2));
  });

  it('shows an error, and retry() loads again', async () => {
    fetch.mockResolvedValueOnce({ status: 'error', message: 'Boom' });
    home.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(home.state).toEqual({ status: 'error', message: 'Boom' });

    home.retry();
    expect(home.state).toEqual({ status: 'loading' });
    await vi.advanceTimersByTimeAsync(0);

    expect(home.state).toEqual(answer(1));
  });

  it('refresh() fetches again at once, keeping the shown overview meanwhile', async () => {
    home.start();
    await vi.advanceTimersByTimeAsync(0);
    const loaded = states.length;
    fetch.mockResolvedValue(answer(2));

    home.refresh();
    expect(home.state).toEqual(answer(1));
    await vi.advanceTimersByTimeAsync(0);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(states.slice(loaded)).toEqual([answer(2)]);
  });

  it('remembers the expanded sections', async () => {
    home.start();
    await vi.advanceTimersByTimeAsync(0);
    const before = states.length;

    home.expand('low_stock');

    expect(home.expanded.has('low_stock')).toBe(true);
    expect(home.expanded.has('expired')).toBe(false);
    expect(states).toHaveLength(before + 1);
  });

  it('stop() stops listening, cancels the pending re-fetch and drops a late answer', async () => {
    home.start();
    pushUpdate();

    home.stop();
    await vi.advanceTimersByTimeAsync(1000);

    expect(stopListening).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(states).toEqual([]);
    expect(home.state).toEqual({ status: 'loading' });
  });
});
