import { Action } from '../utils/constants';

/**
 * Click dispatch, the one convention for every control the card renders:
 *
 * - The control carries `data-action` (an `ACTIONS` value) and its payload as other `data-*`
 *   attributes (`data-name`, `data-batch-id`, `data-filter-remove`, …). Ids stay for focus,
 *   tests and a11y only; nothing is routed by id or class.
 * - `EventHandler` takes `closest('[data-action]')` of the click target once (so a tap on an
 *   inner icon or label counts) and calls the registry entry with that element.
 * - The registry is a full `Record<Action, …>` assembled from small groups (item rows, header /
 *   toolbar / filters, scan panel, sheets, batch editor): a new control is one template
 *   attribute, one `ACTIONS` name and one entry in its group; the compiler flags a missing one.
 *
 * Sheet chrome (backdrop, ✕, the edit ⋮ menu) is handled by `Modals.handleModalClick` before the
 * registry is consulted; role="button" elements also dispatch on Enter and Space.
 */
export type ActionHandler = (el: HTMLElement, event: Event) => Promise<void> | void;

/** Handlers for a subset of the actions; the groups spread into one `ActionRegistry`. */
export type ActionGroup<A extends Action> = Record<A, ActionHandler>;

export type ActionRegistry = ActionGroup<Action>;
