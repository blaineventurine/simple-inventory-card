import { Overview, OverviewResult } from './overviewClient';

/** Pause after the last live update before the overview is fetched again. */
export const HOME_REFRESH_DEBOUNCE_MS = 500;

/** An attention section of Home, by its key in the overview. */
export type HomeSection = Exclude<keyof Overview, 'inventories'>;

/** The sections, in the order Home shows them. */
export const HOME_SECTIONS: readonly HomeSection[] = [
  'expired',
  'expiring_soon',
  'out_of_stock',
  'low_stock',
];

export function isHomeSection(value: string | undefined): value is HomeSection {
  return HOME_SECTIONS.some((section) => section === value);
}

/** What Home shows. */
export type HomeState =
  | { status: 'loading' }
  | { status: 'ok'; overview: Overview }
  | { status: 'error'; message: string };

export interface HomeModeDeps {
  /** Fetches the overview. */
  fetch: () => Promise<OverviewResult>;
  /** Follows every inventory's updates (see `SharedUpdates.listen`); returns the stop. */
  listen: (onUpdate: () => void) => () => void;
  /** The state or the expanded sections changed. */
  onChange: (state: HomeState) => void;
}

/**
 * One visit of Home, DOM-free: the overview (fetched on start, and again shortly after any
 * inventory changed, keeping the shown one meanwhile), dropping answers a later fetch
 * superseded, and the sections the user expanded. `start` once, `stop` once when Home is left.
 */
export class HomeMode {
  private _state: HomeState = { status: 'loading' };
  private readonly _expanded = new Set<HomeSection>();
  private timer: ReturnType<typeof setTimeout> | undefined = undefined;
  /** Bumped by every fetch and by `stop`; only the latest fetch's answer counts. */
  private generation = 0;
  private stopListening: (() => void) | undefined = undefined;
  private stopped = false;

  constructor(private readonly deps: HomeModeDeps) {}

  get state(): HomeState {
    return this._state;
  }

  /** Sections showing all their rows ("Show all"). */
  get expanded(): ReadonlySet<HomeSection> {
    return this._expanded;
  }

  start(): void {
    this.stopListening = this.deps.listen(() => this.schedule());
    void this.run();
  }

  /** Loads again at once, showing the loading state meanwhile (the error state's Retry). */
  retry(): void {
    this.setState({ status: 'loading' });
    this.refresh();
  }

  /** Fetches again at once, keeping the shown overview meanwhile (e.g. inventories changed). */
  refresh(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    void this.run();
  }

  expand(section: HomeSection): void {
    this._expanded.add(section);
    this.deps.onChange(this._state);
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.generation += 1;
    this.stopListening?.();
    this.stopListening = undefined;
  }

  private schedule(): void {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.run();
    }, HOME_REFRESH_DEBOUNCE_MS);
  }

  private async run(): Promise<void> {
    if (this.stopped) return;
    this.generation += 1;
    const generation = this.generation;
    const result = await this.deps.fetch();
    if (generation !== this.generation) return;
    this.setState(
      result.status === 'ok'
        ? { status: 'ok', overview: result.overview }
        : { status: 'error', message: result.message },
    );
  }

  private setState(state: HomeState): void {
    this._state = state;
    this.deps.onChange(state);
  }
}
