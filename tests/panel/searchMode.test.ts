import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { SearchMode, SearchState } from '../../src/panel/search/searchMode';
import { SearchResult, SearchResultItem } from '../../src/panel/search/searchClient';

function result(name: string): SearchResultItem {
  return {
    id: name.toLowerCase(),
    name,
    quantity: 1,
    unit: '',
    description: '',
    category: '',
    location: '',
    expiry_date: '',
    todo_list: '',
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    inventory_id: 'kitchen_id',
    inventory_name: 'Kitchen',
    matched: 'name',
  };
}

describe('SearchMode', () => {
  let search: Mock<(query: string) => Promise<SearchResult>>;
  let unsubscribe: Mock<() => void>;
  let pushUpdate: () => void;
  let states: SearchState[];
  let mode: SearchMode;

  function lastState(): SearchState | undefined {
    return states.at(-1);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    search = vi.fn(async (query: string) => ({
      status: 'ok' as const,
      items: [result(query)],
      truncated: false,
    }));
    unsubscribe = vi.fn();
    pushUpdate = () => undefined;
    states = [];
    mode = new SearchMode({
      search,
      listen: (onUpdate) => {
        pushUpdate = onUpdate;
        return unsubscribe;
      },
      onChange: (state) => states.push(state),
    });
    mode.start();
  });

  afterEach(() => {
    mode.stop();
    vi.useRealTimers();
  });

  it('searches once, 250 ms after the last keystroke', async () => {
    mode.setQuery('b');
    mode.setQuery('bu');
    mode.setQuery('but');
    await vi.advanceTimersByTimeAsync(249);
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('but');
    expect(lastState()).toEqual({
      status: 'ok',
      query: 'but',
      items: [result('but')],
      truncated: false,
    });
  });

  it('leaves the hint for loading as soon as the query is long enough', () => {
    mode.setQuery('b');
    expect(mode.state).toEqual({ status: 'hint' });

    mode.setQuery('bu ');

    expect(mode.state).toEqual({ status: 'loading', query: 'bu' });
    expect(search).not.toHaveBeenCalled();
  });

  it('shows the hint below 2 characters after trimming, without searching', async () => {
    mode.setQuery('  b ');
    await vi.advanceTimersByTimeAsync(500);

    expect(search).not.toHaveBeenCalled();
    expect(lastState()).toEqual({ status: 'hint' });
    expect(mode.state).toEqual({ status: 'hint' });
  });

  it('searches the trimmed query', async () => {
    mode.setQuery('  butter ');
    await vi.advanceTimersByTimeAsync(250);

    expect(search).toHaveBeenCalledWith('butter');
    expect(mode.query).toBe('  butter ');
  });

  it('drops the answer of a stale query', async () => {
    const answers = new Map<string, (value: SearchResult) => void>();
    search.mockImplementation(
      (query) =>
        new Promise((resolve) => {
          answers.set(query, resolve);
        }),
    );
    mode.setQuery('bu');
    await vi.advanceTimersByTimeAsync(250);
    mode.setQuery('but');
    await vi.advanceTimersByTimeAsync(250);

    answers.get('but')?.({ status: 'ok', items: [result('Butter')], truncated: false });
    await vi.advanceTimersByTimeAsync(0);
    answers.get('bu')?.({ status: 'ok', items: [result('Bun')], truncated: false });
    await vi.advanceTimersByTimeAsync(0);

    expect(lastState()).toEqual({
      status: 'ok',
      query: 'but',
      items: [result('Butter')],
      truncated: false,
    });
    expect(states.some((state) => state.status === 'ok' && state.query === 'bu')).toBe(false);
  });

  it('re-runs the query on update events, once per 250 ms burst', async () => {
    mode.setQuery('butter');
    await vi.advanceTimersByTimeAsync(250);
    search.mockClear();

    pushUpdate();
    await vi.advanceTimersByTimeAsync(50);
    pushUpdate();
    await vi.advanceTimersByTimeAsync(50);
    pushUpdate();
    await vi.advanceTimersByTimeAsync(249);
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('butter');
  });

  it('ignores update events while the query is too short', async () => {
    pushUpdate();
    await vi.advanceTimersByTimeAsync(500);

    expect(search).not.toHaveBeenCalled();
  });

  it('stop() stops listening and cancels the pending search', async () => {
    mode.setQuery('butter');

    mode.stop();
    await vi.advanceTimersByTimeAsync(500);

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(search).not.toHaveBeenCalled();
  });

  it('shows an error, and retry() searches again at once', async () => {
    search.mockResolvedValueOnce({ status: 'error', message: 'Connection lost' });
    mode.setQuery('butter');
    await vi.advanceTimersByTimeAsync(250);
    expect(lastState()).toEqual({ status: 'error', query: 'butter', message: 'Connection lost' });

    mode.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(search).toHaveBeenCalledTimes(2);
    expect(lastState()?.status).toBe('ok');
  });

  it('searches an initial query (deep link) after the debounce', async () => {
    const deep = new SearchMode({
      search,
      listen: () => unsubscribe,
      onChange: () => undefined,
      query: 'dairy',
    });
    deep.start();
    expect(deep.query).toBe('dairy');
    expect(deep.state).toEqual({ status: 'loading', query: 'dairy' });

    await vi.advanceTimersByTimeAsync(250);

    expect(search).toHaveBeenCalledWith('dairy');
    deep.stop();
  });
});
