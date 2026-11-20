import { ELEMENTS, CSS_CLASSES, TIMING } from '../../utils/constants';
import { InventoryItem } from '@/types/inventory';
import { CardContext } from '@/types/cardContext';
import type { HomeAssistant } from '@/types/homeAssistant';
import { ModalFormManager } from './modalFormManager';
import { ModalValidationManager } from './modalValidationManager';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '../translationManager';
import {
  closeBarcodeScanner,
  initializeBarcodeTagInput,
  stopAllBarcodeScanners,
} from '../barcodeTagInput';
import { initializeAliasTagInput } from '../aliasTagInput';
import { initializeIconField } from '../iconFieldInput';
import type { AcquireHold, HoldKind } from '../inventoryStore';

/** An open sheet: the element focused when it opened and the release of the hold it took. */
interface OpenSheet {
  opener: HTMLElement | undefined;
  release: (() => void) | undefined;
}

/** Each card root's open sheets: one card never sees, forgets or releases another's. */
const openSheetsByRoot = new WeakMap<ShadowRoot, Map<HTMLElement, OpenSheet>>();

/** The open sheets of `root`. */
function openSheets(root: ShadowRoot): Map<HTMLElement, OpenSheet> {
  let sheets = openSheetsByRoot.get(root);
  if (!sheets) {
    sheets = new Map();
    openSheetsByRoot.set(root, sheets);
  }
  return sheets;
}

/** The root each open sheet was shown in, so `hideSheet` finds its card's registry. */
const sheetRoots = new WeakMap<HTMLElement, ShadowRoot>();

/** Each card root's hold acquirer (`setSheetHolds`). */
const sheetHolds = new WeakMap<ShadowRoot, AcquireHold>();

/**
 * The hold each sheet takes while open, by sheet id. `page`: staged edits and the import
 * outcome (its own entity update would wipe it at once); `background`: the add and history
 * sheets. Other sheets hold nothing.
 */
const SHEET_HOLD_KINDS: Readonly<Record<string, HoldKind>> = {
  [ELEMENTS.EDIT_MODAL]: 'page',
  [ELEMENTS.IMPORT_RESULT_MODAL]: 'page',
  [ELEMENTS.ADD_MODAL]: 'background',
  [ELEMENTS.HISTORY_MODAL]: 'background',
};

/** Sheets shown in `root` hold renders through `hold` while open. */
export function setSheetHolds(root: ShadowRoot, hold: AcquireHold): void {
  sheetHolds.set(root, hold);
}

/**
 * Forget the sheets a re-render removed from `root`, releasing their holds: closing them would
 * only steal focus. A sheet of a card that is merely detached is still in its root and stays.
 * A full render calls this once it replaced the card.
 */
export function forgetDetachedSheets(root: ShadowRoot): void {
  const sheets = openSheets(root);
  for (const [modal, entry] of sheets) {
    if (!root.contains(modal)) {
      sheets.delete(modal);
      sheetRoots.delete(modal);
      entry.release?.();
    }
  }
}

/**
 * Show a `.modal` sheet, take its hold and remember what had focus so closing can return focus
 * there.
 */
export function showSheet(root: ShadowRoot, modal: HTMLElement): void {
  forgetDetachedSheets(root);
  const sheets = openSheets(root);
  if (!sheets.has(modal)) {
    const active = root.activeElement;
    const kind = SHEET_HOLD_KINDS[modal.id];
    sheets.set(modal, {
      opener: active instanceof HTMLElement ? active : undefined,
      release: kind ? sheetHolds.get(root)?.(kind, modal.id) : undefined,
    });
    sheetRoots.set(modal, root);
  }
  modal.classList.add(CSS_CLASSES.SHOW);
}

/** Event fired on a sheet's `.modal` element whenever an open sheet is hidden, by any route. */
export const SHEET_CLOSED_EVENT = 'si-sheet-closed';

/**
 * Hide a sheet, release its hold and return focus to its opener when that is still on the
 * page. Every close route (✕, backdrop, Escape, Cancel, Save, programmatic) ends here. The
 * closed event goes out before the release, so a closer that refreshes on its own (the import
 * result sheet) replaces the held refresh instead of adding a second one.
 */
export function hideSheet(modal: HTMLElement): void {
  const wasOpen = modal.classList.contains(CSS_CLASSES.SHOW);
  modal.classList.remove(CSS_CLASSES.SHOW);
  const root = sheetRoots.get(modal);
  sheetRoots.delete(modal);
  const sheets = root ? openSheets(root) : undefined;
  const entry = sheets?.get(modal);
  sheets?.delete(modal);
  if (entry?.opener?.isConnected) {
    entry.opener.focus();
  }
  if (wasOpen) {
    modal.dispatchEvent(new CustomEvent(SHEET_CLOSED_EVENT));
  }
  entry?.release?.();
}

/**
 * Put `sheet()` markup into the card root. A sheet already mounted under the same id is
 * reused (classes and content replaced) so repeated opens never stack duplicates.
 */
export function mountSheet(root: ShadowRoot, html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const fresh = template.content.firstElementChild;
  if (!(fresh instanceof HTMLElement)) {
    throw new Error('Sheet markup has no root element');
  }
  const existing = root.querySelector<HTMLElement>(`#${fresh.id}`);
  if (!existing) {
    root.appendChild(fresh);
    return fresh;
  }
  existing.className = fresh.className;
  existing.replaceChildren(...Array.from(fresh.childNodes));
  return existing;
}

export class ModalUIManager {
  private boundEscHandler: ((e: KeyboardEvent) => void) | undefined = undefined;
  /** Where the current click's press started; only a press on the scrim itself closes a sheet. */
  private pressTarget: EventTarget | undefined = undefined;
  private readonly recordPress = (e: Event): void => {
    this.pressTarget = e.composedPath()[0];
  };

  constructor(
    private readonly shadowRoot: ShadowRoot,
    private readonly formManager: ModalFormManager,
    private readonly validationManager: ModalValidationManager,
    /** The card's current hass, for the barcode field's companion app scanner. */
    private readonly getHass?: () => HomeAssistant | undefined,
  ) {
    this.addDocumentListeners();
  }

  /**
   * Opens the add item modal
   */
  openAddModal(translations: TranslationData, onBarcodeAdded?: (barcode: string) => void): void {
    const modal = this.getElement<HTMLElement>(ELEMENTS.ADD_MODAL);
    if (modal) {
      this.validationManager.clearError(true);
      showSheet(this.shadowRoot, modal);
      this.focusOnOpen(modal, `add-${ELEMENTS.NAME}`);
      this.setupExpiryThresholdInteraction(translations);
      this.validationManager.setupValidationListeners();
      initializeBarcodeTagInput(this.shadowRoot, 'add', translations, onBarcodeAdded, this.getHass);
      initializeAliasTagInput(this.shadowRoot, 'add', translations);
      initializeIconField(this.shadowRoot, 'add');
    } else {
      console.warn('Add modal not found in DOM');
    }
  }

  /**
   * Closes the add item modal
   */
  closeAddModal(): void {
    closeBarcodeScanner(this.shadowRoot, 'add');
    const modal = this.getElement<HTMLElement>(ELEMENTS.ADD_MODAL);
    if (modal) {
      hideSheet(modal);
    }
  }

  /**
   * Opens the edit item modal with populated data
   */
  openEditModal(
    itemName: string,
    getContext: () => Pick<CardContext, 'hass' | 'config' | 'items'>,
    translations: TranslationData,
  ): { item: InventoryItem | undefined; found: boolean } {
    const { hass, config, items } = getContext();
    const entityId = config.entity;
    const state = hass.states[entityId];

    if (!state) {
      console.warn(`Entity not found: ${entityId}`);
      return { item: undefined, found: false };
    }

    const item = items.find((index) => index.name === itemName);

    if (!item) {
      console.warn(`Item not found: ${itemName}`);
      return { item: undefined, found: false };
    }

    this.formManager.populateEditModal(item);

    const modal = this.getElement<HTMLElement>(ELEMENTS.EDIT_MODAL);
    if (modal) {
      this.validationManager.clearError(false);
      showSheet(this.shadowRoot, modal);
      // The sheet itself, not the name: no keyboard pop-up and no selected text on phones.
      this.focusOnOpen(modal, undefined);
      this.setupExpiryThresholdInteraction(translations);
      this.validationManager.setupValidationListeners();
      initializeBarcodeTagInput(this.shadowRoot, 'edit', translations, undefined, this.getHass);
      initializeAliasTagInput(this.shadowRoot, 'edit', translations);
      initializeIconField(this.shadowRoot, 'edit');
    }

    return { item, found: true };
  }

  /**
   * Closes the edit item modal
   */
  closeEditModal(): void {
    closeBarcodeScanner(this.shadowRoot, 'edit');
    const modal = this.getElement<HTMLElement>(ELEMENTS.EDIT_MODAL);
    if (modal) {
      this.getElement<HTMLDetailsElement>(ELEMENTS.EDIT_MENU)?.removeAttribute('open');
      hideSheet(modal);
    }
  }

  /**
   * Closes all modals
   */
  closeAllModals(): void {
    this.closeAddModal();
    this.closeEditModal();
  }

  /**
   * Handles sheet clicks: backdrop and ✕ close the sheet; the edit ⋮ menu closes after a pick
   * or a click elsewhere. Returns true when the click was consumed.
   */
  handleModalClick(e: MouseEvent): boolean {
    const target = e.target as HTMLElement;
    // A press inside the panel released over the scrim (e.g. a text drag) is no backdrop tap.
    const pressedHere = this.pressTarget === target;
    this.pressTarget = undefined;
    this.closeEditMenuAfter(target);

    // Backdrop: a click on the overlay itself, outside the panel
    if (pressedHere && (target.id === ELEMENTS.ADD_MODAL || target.id === ELEMENTS.EDIT_MODAL)) {
      e.preventDefault();
      e.stopPropagation();

      if (target.id === ELEMENTS.ADD_MODAL) {
        this.closeAddModal();
      } else {
        this.closeEditModal();
      }

      return true;
    }

    if (pressedHere && openSheets(this.shadowRoot).has(target)) {
      e.preventDefault();
      e.stopPropagation();
      hideSheet(target);
      return true;
    }

    // ✕ buttons: the click may land on the icon inside the button
    const closeButton = target.classList.contains(CSS_CLASSES.CLOSE_BTN)
      ? target
      : target.closest<HTMLElement>(`.${CSS_CLASSES.CLOSE_BTN}`);
    if (!closeButton) {
      return false;
    }
    if (closeButton.closest(`#${ELEMENTS.ADD_MODAL}`)) {
      e.preventDefault();
      e.stopPropagation();
      this.closeAddModal();
      return true;
    }
    if (closeButton.closest(`#${ELEMENTS.EDIT_MODAL}`)) {
      e.preventDefault();
      e.stopPropagation();
      this.closeEditModal();
      return true;
    }
    const otherSheet = closeButton.closest<HTMLElement>('.si-sheet');
    if (otherSheet) {
      e.preventDefault();
      e.stopPropagation();
      hideSheet(otherSheet);
      return true;
    }
    return false;
  }

  /**
   * Sets up expiry threshold interactions for both modals
   */
  setupExpiryThresholdInteraction(translations: TranslationData): void {
    this.setupExpiryThresholdFieldForModal(true, translations); // Add modal
    this.setupExpiryThresholdFieldForModal(false, translations); // Edit modal
  }

  /**
   * Sets up expiry threshold field interactions for a specific modal
   */
  private setupExpiryThresholdFieldForModal(
    isAddModal: boolean,
    translations: TranslationData,
  ): void {
    const expiryElementId = isAddModal ? 'add' : 'edit';
    const expiryInput = this.getElement<HTMLInputElement>(
      `${expiryElementId}-${ELEMENTS.EXPIRY_DATE}`,
    );

    if (!expiryInput) {
      return;
    }

    this.updateExpiryThresholdState(isAddModal, translations);

    expiryInput.addEventListener('input', () => {
      this.updateExpiryThresholdState(isAddModal, translations);
    });

    expiryInput.addEventListener('change', () => {
      this.updateExpiryThresholdState(isAddModal, translations);
    });
  }

  /**
   * Updates the expiry threshold field state based on expiry date input
   */
  private updateExpiryThresholdState(isAddModal: boolean, translations: TranslationData): void {
    const modalType = isAddModal ? 'add' : 'edit';

    const expiryInput = this.getElement<HTMLInputElement>(`${modalType}-${ELEMENTS.EXPIRY_DATE}`);
    const thresholdInput = this.getElement<HTMLInputElement>(
      `${modalType}-${ELEMENTS.EXPIRY_ALERT_DAYS}`,
    );

    if (!expiryInput || !thresholdInput) {
      return;
    }

    const hasExpiryDate = expiryInput.value.trim() !== '';

    if (hasExpiryDate) {
      thresholdInput.disabled = false;
      thresholdInput.placeholder = TranslationManager.localize(
        translations,
        'modal.expiry_threshold_placeholder',
        undefined,
        'Days before expiry to alert (default: 0)',
      );

      if (!thresholdInput.value.trim()) {
        thresholdInput.value = '0';
      }
    } else {
      thresholdInput.disabled = true;
      thresholdInput.value = '';
      const placeholder = TranslationManager.localize(
        translations,
        'modal.set_expiry_first',
        undefined,
        'Set expiry date first',
      );

      thresholdInput.placeholder = placeholder;
    }
  }

  /**
   * Close the edit sheet's ⋮ menu once an entry is picked or the click lands elsewhere. A pick
   * returns focus to the ⋮ toggle, so e.g. Delete item → Cancel keeps focus in the sheet.
   */
  private closeEditMenuAfter(target: HTMLElement): void {
    const menu = this.getElement<HTMLDetailsElement>(ELEMENTS.EDIT_MENU);
    if (!menu?.open) {
      return;
    }
    if (target.closest('.si-sheet__menu-item')) {
      menu.open = false;
      menu.querySelector<HTMLElement>('summary')?.focus();
    } else if (!menu.contains(target)) {
      menu.open = false;
    }
  }

  /**
   * Listens on the document for Escape and for where presses start; `destroy` removes both.
   * Adds them once however often it is called.
   */
  addDocumentListeners(): void {
    if (!this.boundEscHandler) {
      this.boundEscHandler = this.handleEscapeKey.bind(this);
      document.addEventListener('keydown', this.boundEscHandler as EventListener);
      document.addEventListener('pointerdown', this.recordPress, true);
    }
  }

  /**
   * Escape closes the add/edit sheets and every other sheet this card opened, unless a control
   * inside already handled it (dropdowns, pickers) or an IME composition is in progress.
   * A hidden card (an inactive tab of the Inventory panel) keeps its sheets: the key was meant
   * for the visible one.
   */
  private handleEscapeKey(e: KeyboardEvent): void {
    if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) {
      return;
    }
    const host: unknown = this.shadowRoot.host;
    if (host instanceof HTMLElement && host.hidden) {
      return;
    }
    this.closeAllModals();
    forgetDetachedSheets(this.shadowRoot);
    for (const modal of Array.from(openSheets(this.shadowRoot).keys())) {
      hideSheet(modal);
    }
  }

  /**
   * After the open delay, focuses `fieldId` on a fine pointer; otherwise (touch screens, or no
   * field) the sheet panel, so a phone keyboard does not pop up.
   */
  private focusOnOpen(modal: HTMLElement, fieldId: string | undefined): void {
    setTimeout(() => {
      const coarse = globalThis.matchMedia?.('(pointer: coarse)').matches === true;
      const field = fieldId && !coarse ? this.getElement<HTMLElement>(fieldId) : undefined;
      (field ?? modal.querySelector<HTMLElement>(`.${CSS_CLASSES.MODAL_CONTENT}`))?.focus();
    }, TIMING.MODAL_FOCUS_DELAY);
  }

  /**
   * Gets an element from the shadow root by ID
   */
  private getElement<T extends HTMLElement>(id: string): T | undefined {
    return this.shadowRoot.getElementById(id) as T | undefined;
  }

  /**
   * Cleanup method to remove event listeners
   */
  destroy(): void {
    stopAllBarcodeScanners();
    if (this.boundEscHandler) {
      document.removeEventListener('keydown', this.boundEscHandler);
      document.removeEventListener('pointerdown', this.recordPress, true);
      this.boundEscHandler = undefined;
    }
  }
}
