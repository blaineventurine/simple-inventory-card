import { ACTIONS, BATCH_FIELDS } from '../utils/constants';
import { batchFieldValue, readRestockFields } from '../utils/batchFields';
import { withBusy } from '../utils/busy';
import { GetCardContext } from '@/types/cardContext';
import { ActionGroup, ActionHandler } from './actionRegistry';
import { ImageLoader, hydrateImages } from './imageLoader';
import type { AcquireHold } from './inventoryStore';
import { ItemActions } from './itemActions';
import { State } from './state';
import { TranslationManager } from './translationManager';

export type ItemRowAction = (typeof ACTIONS)[
  | 'TOGGLE_BATCHES'
  | 'OPEN_RESTOCK'
  | 'CANCEL_RESTOCK'
  | 'OPEN_MOVE'
  | 'CANCEL_MOVE'
  | 'VIEW_IMAGE'
  | 'INCREMENT'
  | 'DECREMENT'
  | 'DECREMENT_BATCH'
  | 'SUBMIT_RESTOCK'
  | 'SUBMIT_MOVE'
  | 'REMOVE'
  | 'OPEN_EDIT_MODAL'
  | 'VIEW_HISTORY'];

export interface ItemRowActionsDeps {
  getContext: GetCardContext;
  state: State;
  itemActions: ItemActions;
  /** Holds background work while a restock/move form is open (and on screen). */
  hold: AcquireHold | undefined;
  /** Loads the full image of a details panel when it opens (`item_images`). */
  imageLoader: ImageLoader | undefined;
}

/** The inline forms that hold background work while open. */
const OPEN_FORMS = '.restock-form:not([hidden]), .move-form:not([hidden])';

/**
 * The item rows' action group: every control carries the item's `data-name`; the row DOM is
 * read here and the work goes to `ItemActions`.
 */
export class ItemRowActions {
  /** The open restock/move forms on screen, with the release of their holds. */
  private readonly formHolds = new Map<HTMLElement, () => void>();

  constructor(private readonly deps: ItemRowActionsDeps) {}

  /**
   * Rows, the card or the item page were replaced: the forms no longer in the document lose
   * their holds (an open form still on screen, e.g. on the item page, keeps its hold).
   */
  rowsReplaced(): void {
    for (const [form, release] of this.formHolds) {
      if (!form.isConnected) {
        this.formHolds.delete(form);
        release();
      }
    }
  }

  handlers(): ActionGroup<ItemRowAction> {
    const { itemActions } = this.deps;
    /** The item a control acts on, unless the control is disabled. */
    const itemOf = (control: HTMLElement): string | undefined =>
      control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true'
        ? undefined
        : control.dataset.name;
    // Details toggle, restock/move form open/cancel and the photo: pure DOM flips, so they
    // take no processing lock and keep keyboard focus where the user expects it.
    const flip =
      (run: (control: HTMLElement, itemName: string) => void): ActionHandler =>
      (control) => {
        const itemName = itemOf(control);
        if (itemName) {
          run(control, itemName);
        }
      };
    // Service calls: the control is busy while they run.
    const busy =
      (run: (control: HTMLElement, itemName: string) => Promise<unknown>): ActionHandler =>
      async (control) => {
        const itemName = itemOf(control);
        if (!itemName) {
          return;
        }
        try {
          await withBusy(control, () => run(control, itemName));
        } catch (error) {
          console.error(`Error performing ${control.dataset.action} on ${itemName}:`, error);
        }
      };

    return {
      [ACTIONS.TOGGLE_BATCHES]: flip((control, itemName) => this.toggleDetails(control, itemName)),
      [ACTIONS.OPEN_RESTOCK]: flip((control) => this.setRestockFormOpen(control, true)),
      [ACTIONS.CANCEL_RESTOCK]: flip((control) => this.setRestockFormOpen(control, false)),
      [ACTIONS.OPEN_MOVE]: flip((control) => this.setMoveFormOpen(control, true)),
      [ACTIONS.CANCEL_MOVE]: flip((control) => this.setMoveFormOpen(control, false)),
      [ACTIONS.VIEW_IMAGE]: flip((control, itemName) => itemActions.viewImage(itemName, control)),
      [ACTIONS.INCREMENT]: busy((_control, itemName) => itemActions.increment(itemName)),
      [ACTIONS.DECREMENT]: busy((_control, itemName) => itemActions.decrement(itemName)),
      [ACTIONS.DECREMENT_BATCH]: busy(async (control, itemName) => {
        const batchId = control.dataset.batchId;
        if (batchId) {
          await itemActions.takeFromBatch(itemName, batchId, Number(control.dataset.amount) || 1);
        }
      }),
      [ACTIONS.SUBMIT_RESTOCK]: busy((control, itemName) => this.submitRestock(control, itemName)),
      [ACTIONS.SUBMIT_MOVE]: busy(async (control, itemName) => {
        const form = control.closest('.move-form');
        const batchId = control.dataset.batchId;
        if (form instanceof HTMLElement && batchId) {
          await this.submitMove(form, itemName, batchId);
        }
      }),
      [ACTIONS.REMOVE]: busy((_control, itemName) => itemActions.remove(itemName)),
      [ACTIONS.OPEN_EDIT_MODAL]: busy(async (_control, itemName) => {
        itemActions.openEdit(itemName);
      }),
      [ACTIONS.VIEW_HISTORY]: busy((_control, itemName) => itemActions.showHistory(itemName)),
    };
  }

  /** The row's details chevron. No refetch; State lets the next full render keep it open. */
  private toggleDetails(toggle: HTMLElement, itemName: string): void {
    const expanded = this.deps.state.toggleBatchesExpanded(itemName);
    toggle.setAttribute('aria-expanded', String(expanded));
    const panel = toggle.closest('.item-row')?.querySelector('.item-details-panel');
    if (panel instanceof HTMLElement) {
      panel.hidden = !expanded;
      if (expanded && this.deps.imageLoader) {
        hydrateImages(panel, this.deps.imageLoader);
      }
      // Forms left open in a collapsed panel are off screen: they hold again once it reopens.
      for (const form of panel.querySelectorAll<HTMLElement>(OPEN_FORMS)) {
        this.setFormHeld(form, expanded);
      }
    }
  }

  /** Takes or releases the hold of an inline form (once per form). */
  private setFormHeld(form: HTMLElement, held: boolean): void {
    const release = this.formHolds.get(form);
    if (held && !release) {
      const reason = form.classList.contains('move-form') ? 'move form' : 'restock form';
      const acquired = this.deps.hold?.('background', reason);
      if (acquired) {
        this.formHolds.set(form, acquired);
      }
    } else if (!held && release) {
      this.formHolds.delete(form);
      release();
    }
  }

  /** The open form holds background work; hiding it releases the hold. */
  private setRestockFormOpen(control: HTMLElement, open: boolean): void {
    const panel = control.closest('.batch-panel');
    const form = panel?.querySelector('.restock-form');
    if (!(form instanceof HTMLElement)) {
      return;
    }
    form.hidden = !open;
    this.setFormHeld(form, open);
    if (open) {
      form.querySelector('input')?.focus();
      return;
    }
    form.querySelector('.restock-error')?.remove();
    panel?.querySelector<HTMLElement>('.restock-open-btn')?.focus();
  }

  /** The open form holds background work; hiding it releases the hold. */
  private setMoveFormOpen(control: HTMLElement, open: boolean): void {
    const row = control.closest('.batch-row');
    const form = row?.querySelector('.move-form');
    if (!(form instanceof HTMLElement)) {
      return;
    }
    form.hidden = !open;
    this.setFormHeld(form, open);
    if (open) {
      form.querySelector<HTMLElement>(`[data-batch-field="${BATCH_FIELDS.LOCATION}"]`)?.focus();
      return;
    }
    form.querySelector('.move-error')?.remove();
    row?.querySelector<HTMLElement>('.batch-move-btn')?.focus();
  }

  private async submitRestock(control: HTMLElement, itemName: string): Promise<void> {
    const form = control.closest('.restock-form');
    if (!(form instanceof HTMLElement)) {
      return;
    }
    const amount = Number.parseFloat(batchFieldValue(form, BATCH_FIELDS.AMOUNT));
    const result = await this.deps.itemActions.restock(
      itemName,
      amount > 0 ? amount : 1,
      readRestockFields(form),
    );
    if (result.success) {
      form.querySelector('.restock-error')?.remove();
      // The save's own refresh (already started) re-lists the rows without the form.
      this.setFormHeld(form, false);
      return;
    }
    // Keep the form and the user's values; say why next to it.
    const error = result.error ?? '';
    this.showInlineError(
      form,
      'restock-error',
      TranslationManager.localize(
        this.deps.getContext().translations,
        'batches.restock_failed',
        { error },
        `Restock failed: ${error}`,
      ),
    );
  }

  /**
   * Sends `transfer_item` for the form's batch. A blank destination or an amount that is
   * not above 0 is refused here; on any failure the form and its values stay, with the
   * reason next to them.
   */
  private async submitMove(form: HTMLElement, itemName: string, batchId: string): Promise<void> {
    const translations = this.deps.getContext().translations;
    const toLocation = batchFieldValue(form, BATCH_FIELDS.LOCATION);
    const amount = Number(batchFieldValue(form, BATCH_FIELDS.AMOUNT));
    if (toLocation === '') {
      this.showInlineError(
        form,
        'move-error',
        TranslationManager.localize(
          translations,
          'batches.move_destination_required',
          undefined,
          'Choose where to move it',
        ),
      );
      return;
    }
    if (!(amount > 0)) {
      this.showInlineError(
        form,
        'move-error',
        TranslationManager.localize(
          translations,
          'batches.move_invalid_amount',
          undefined,
          'Enter an amount greater than 0',
        ),
      );
      return;
    }
    const result = await this.deps.itemActions.move(itemName, batchId, amount, toLocation);
    if (result.success) {
      form.querySelector('.move-error')?.remove();
      // The save's own refresh (already started) re-lists the rows without the form.
      this.setFormHeld(form, false);
      return;
    }
    const error = result.error ?? '';
    this.showInlineError(
      form,
      'move-error',
      TranslationManager.localize(
        this.deps.getContext().translations,
        'batches.move_failed',
        { error },
        `Move failed: ${error}`,
      ),
    );
  }

  /** Shows `message` in the form's `role="alert"` element of class `errorClass`. */
  private showInlineError(form: HTMLElement, errorClass: string, message: string): void {
    let errorEl = form.querySelector(`.${errorClass}`);
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = errorClass;
      errorEl.setAttribute('role', 'alert');
      form.appendChild(errorEl);
    }
    errorEl.textContent = message;
  }
}
