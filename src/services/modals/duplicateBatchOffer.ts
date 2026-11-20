import { ACTIONS, ELEMENTS } from '../../utils/constants';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '../translationManager';

/**
 * The Add Item modal's "Add {quantity} as a new batch of {name}" button, shown next to the
 * duplicate-name error. Its container is only rendered with the batches feature, so without
 * it `show` does nothing and the modal keeps the plain error.
 */
export class DuplicateBatchOffer {
  private name: string | undefined = undefined;
  private translations: TranslationData = {};

  constructor(private readonly shadowRoot: ShadowRoot) {}

  /** Canonical name of the existing item while the offer is shown. */
  get itemName(): string | undefined {
    return this.name;
  }

  show(itemName: string, translations: TranslationData): void {
    const container = this.shadowRoot.getElementById(ELEMENTS.ADD_DUPLICATE_BATCH);
    if (!container) {
      return;
    }
    this.name = itemName;
    this.translations = translations;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = ELEMENTS.ADD_DUPLICATE_BATCH_BTN;
    button.dataset.action = ACTIONS.ADD_AS_BATCH;
    button.className = 'si-tonal-btn duplicate-batch-btn';
    button.setAttribute('aria-describedby', ELEMENTS.ADD_DUPLICATE_BATCH_NOTE);
    const note = document.createElement('p');
    note.id = ELEMENTS.ADD_DUPLICATE_BATCH_NOTE;
    note.className = 'duplicate-batch-note';
    note.textContent = TranslationManager.localize(
      translations,
      'batches.add_as_batch_note',
      undefined,
      'Only the quantity, expiry date, first location and unit price are used. Description, category, barcode, aliases and auto-add settings are not changed.',
    );
    container.replaceChildren(button, note);
    container.hidden = false;
    this.updateLabel();
    this.watchForm();
  }

  hide(): void {
    this.name = undefined;
    const container = this.shadowRoot.getElementById(ELEMENTS.ADD_DUPLICATE_BATCH);
    if (container) {
      container.hidden = true;
      container.replaceChildren();
    }
  }

  private updateLabel(): void {
    const button = this.shadowRoot.getElementById(ELEMENTS.ADD_DUPLICATE_BATCH_BTN);
    const quantityInput = this.shadowRoot.getElementById(`add-${ELEMENTS.QUANTITY}`);
    if (!button || this.name === undefined) {
      return;
    }
    const typed = quantityInput instanceof HTMLInputElement ? Number(quantityInput.value) : 0;
    const quantity = String(Number.isFinite(typed) ? typed : 0);
    button.textContent = TranslationManager.localize(
      this.translations,
      'batches.add_as_batch',
      { quantity, name: this.name },
      `Add ${quantity} as a new batch of ${this.name}`,
    );
  }

  /** Keep the label on the typed quantity; a different name withdraws the offer. */
  private watchForm(): void {
    const quantityInput = this.shadowRoot.getElementById(`add-${ELEMENTS.QUANTITY}`);
    const nameInput = this.shadowRoot.getElementById(`add-${ELEMENTS.NAME}`);
    // The add modal is reopened without being recreated: bind once per rendered form.
    if (!quantityInput || !nameInput || nameInput.hasAttribute('data-batch-offer-bound')) {
      return;
    }
    nameInput.setAttribute('data-batch-offer-bound', 'true');
    quantityInput.addEventListener('input', () => this.updateLabel());
    nameInput.addEventListener('input', () => this.hide());
  }
}
