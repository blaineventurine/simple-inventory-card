import { SearchResult, SearchResultItem } from './searchClient';

/** Pause after the last keystroke (or live update) before searching. */
export const SEARCH_DEBOUNCE_MS = 250;
/** Shortest query searched, after trimming; shorter ones show a hint. */
export const SEARCH_MIN_LENGTH = 2;
/** Longest query the integration accepts. */
export const SEARCH_MAX_LENGTH = 100;

/** What the results area shows; `query` is the trimmed query the state answers. */
export type SearchState =
  | { status: 'hint' }
  | { status: 'loading'; query: string }
  | { status: 'ok'; query: string; items: SearchResultItem[]; truncated: boolean }
  | { status: 'error'; query: string; message: string };

export interface SearchModeDeps {
  /** Runs one search (the trimmed query). */
  search: (query: string) => Promise<SearchResult>;
  /** Follows every inventory's updates (see `SharedUpdates.listen`); returns the stop. */
  listen: (onUpdate: () => void) => () => void;
  /** The state changed. */
  onChange: (state: SearchState) => void;
  /** The query to start with (a deep link); searched after the debounce once started. */
  query?: string;
}

/**
 * One search session of the panel, DOM-free: the query, the debounced search, dropping answers
 * to superseded searches, and re-running the query when any inventory changes. `start` once,
 * `stop` once when search mode is left (or the panel detached).
 */
export class SearchMode {
  private _query: string;
  private _state: SearchState = { status: 'hint' };
  private timer: ReturnType<typeof setTimeout> | undefined = undefined;
  /** Bumped by every search and every query change; only the latest search's answer counts. */
  private generation = 0;
  private stopListening: (() => void) | undefined = undefined;
  private stopped = false;

  constructor(private readonly deps: SearchModeDeps) {
    this._query = deps.query ?? '';
  }

  /** The query as typed (untrimmed). */
  get query(): string {
    return this._query;
  }

  get state(): SearchState {
    return this._state;
  }

  start(): void {
    this.stopListening = this.deps.listen(() => this.schedule());
    this.setQuery(this._query);
  }

  /**
   * The user typed: a query long enough is searched after the debounce (the hint gives way to
   * loading at once), a short one hints.
   */
  setQuery(query: string): void {
    this._query = query;
    // An answer still on its way is for an older query now.
    this.generation += 1;
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      clearTimeout(this.timer);
      this.timer = undefined;
      this.setState({ status: 'hint' });
      return;
    }
    if (this._state.status === 'hint') {
      this.setState({ status: 'loading', query: trimmed });
    }
    this.schedule();
  }

  /** Searches the current query again at once (the error state's Retry). */
  retry(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    void this.run();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.generation += 1;
    this.stopListening?.();
    this.stopListening = undefined;
  }

  /** Searches the current query after the debounce; a later call restarts it. */
  private schedule(): void {
    if (this.stopped || this._query.trim().length < SEARCH_MIN_LENGTH) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.run();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async run(): Promise<void> {
    const query = this._query.trim();
    if (this.stopped || query.length < SEARCH_MIN_LENGTH) {
      return;
    }
    this.generation += 1;
    const generation = this.generation;
    if (this._state.status !== 'ok') {
      this.setState({ status: 'loading', query });
    }
    const result = await this.deps.search(query);
    if (generation !== this.generation) {
      return;
    }
    this.setState(
      result.status === 'ok'
        ? { status: 'ok', query, items: result.items, truncated: result.truncated }
        : { status: 'error', query, message: result.message },
    );
  }

  private setState(state: SearchState): void {
    this._state = state;
    this.deps.onChange(state);
  }
}
