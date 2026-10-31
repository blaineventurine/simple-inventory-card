import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withBusy } from '../../src/utils/busy';

describe('withBusy', () => {
  let button: HTMLButtonElement;

  const isBusy = (): boolean[] => [
    button.hasAttribute('disabled'),
    button.hasAttribute('data-processing'),
    button.getAttribute('aria-busy') === 'true',
    button.classList.contains('si-busy'),
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    button = document.createElement('button');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks the button busy while the work runs and releases it 200 ms after', async () => {
    let busyDuring: boolean[] = [];

    const result = await withBusy(button, async () => {
      busyDuring = isBusy();
      return 'done';
    });

    expect(result).toBe('done');
    expect(busyDuring).toEqual([true, true, true, true]);
    expect(isBusy()).toEqual([true, true, true, true]);
    expect(button.style.opacity).toBe('');

    vi.advanceTimersByTime(200);
    expect(isBusy()).toEqual([false, false, false, false]);
  });

  it('releases the button when the work fails, and passes the failure on', async () => {
    await expect(withBusy(button, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');

    vi.advanceTimersByTime(200);
    expect(isBusy()).toEqual([false, false, false, false]);
  });
});
