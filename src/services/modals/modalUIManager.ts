import { ELEMENTS, CSS_CLASSES, TIMING, ACTIONS } from '../../utils/constants';
import { HomeAssistant, InventoryItem, InventoryConfig } from '../../types/homeAssistant';
import { ModalFormManager } from './modalFormManager';
import { ModalValidationManager } from './modalValidationManager';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '../translationManager';

export class ModalUIManager {
  private boundEscHandler: ((e: KeyboardEvent) => void) | undefined = undefined;

  constructor(
    private readonly shadowRoot: ShadowRoot,
    private readonly formManager: ModalFormManager,
    private readonly validationManager: ModalValidationManager,
  ) {
    this.setupEventListeners();
  }

  /**
   * Opens the add item modal
   */
  openAddModal(translations: TranslationData): void {
    const modal = this.getElement<HTMLElement>(ELEMENTS.ADD_MODAL);
    if (modal) {
      this.validationManager.clearError(true);
      modal.classList.add(CSS_CLASSES.SHOW);
      this.focusElementWithDelay(ELEMENTS.NAME);
      this.setupExpiryThresholdInteraction(translations);
      this.validationManager.setupValidationListeners();
    } else {
      console.warn('Add modal not found in DOM');
    }
  }

  /**
   * Closes the add item modal
   */
  closeAddModal(): void {
    const modal = this.getElement<HTMLElement>(ELEMENTS.ADD_MODAL);
    if (modal) {
      modal.classList.remove(CSS_CLASSES.SHOW);
    }
  }

  /**
   * Opens the edit item modal with populated data
   */
  openEditModal(
    itemName: string,
    getFreshData: () => { hass: HomeAssistant; config: InventoryConfig },
    translations: TranslationData,
  ): { item: InventoryItem | undefined; found: boolean } {
    const { hass, config } = getFreshData();
    const entityId = config.entity;
    const state = hass.states[entityId];

    if (!state) {
      console.warn(`Entity not found: ${entityId}`);
      return { item: undefined, found: false };
    }

    const items: readonly InventoryItem[] = state.attributes?.items || [];
    const item = items.find((index) => index.name === itemName);

    if (!item) {
      console.warn(`Item not found: ${itemName}`);
      return { item: undefined, found: false };
    }

    this.formManager.populateEditModal(item);

    const modal = this.getElement<HTMLElement>(ELEMENTS.EDIT_MODAL);
    if (modal) {
      this.validationManager.clearError(false);
      modal.classList.add(CSS_CLASSES.SHOW);
      this.focusElementWithDelay(ELEMENTS.NAME, true);
      this.setupExpiryThresholdInteraction(translations);
      this.validationManager.setupValidationListeners();
    }

    return { item, found: true };
  }

  /**
   * Closes the edit item modal
   */
  closeEditModal(): void {
    const modal = this.getElement<HTMLElement>(ELEMENTS.EDIT_MODAL);
    if (modal) {
      modal.classList.remove(CSS_CLASSES.SHOW);
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
   * Handles modal click events (backdrop clicks, close buttons)
   */
  handleModalClick(e: MouseEvent): boolean {
    const target = e.target as HTMLElement;

    // Handle modal backdrop clicks (only if clicking directly on modal background)
    if (target.id === ELEMENTS.ADD_MODAL || target.id === ELEMENTS.EDIT_MODAL) {
      e.preventDefault();
      e.stopPropagation();

      if (target.id === ELEMENTS.ADD_MODAL) {
        this.closeAddModal();
      } else {
        this.closeEditModal();
      }

      return true;
    }

    if (
      target.dataset.action === ACTIONS.CLOSE_ADD_MODAL ||
      (target.classList.contains(CSS_CLASSES.CLOSE_BTN) && target.closest(`#${ELEMENTS.ADD_MODAL}`))
    ) {
      e.preventDefault();
      e.stopPropagation();
      this.closeAddModal();
      return true;
    }

    if (
      target.classList.contains(CSS_CLASSES.CLOSE_BTN) &&
      target.closest(`#${ELEMENTS.EDIT_MODAL}`)
    ) {
      e.preventDefault();
      e.stopPropagation();
      this.closeEditModal();
      return true;
    }

    // IMPORTANT: Don't close modal for clicks inside modal content
    if (target.closest(`.${CSS_CLASSES.MODAL_CONTENT}`)) {
      // Allow normal interaction with modal content
      return false; // Let other handlers process this
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
   * Sets up global event listeners (escape key)
   */
  private setupEventListeners(): void {
    if (!this.boundEscHandler) {
      this.boundEscHandler = this.handleEscapeKey.bind(this);
      document.addEventListener('keydown', this.boundEscHandler as EventListener);
    }
  }

  /**
   * Handles escape key to close modals
   */
  private handleEscapeKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.closeAllModals();
    }
  }

  /**
   * Focuses an element after a delay, optionally selecting all text
   */
  private focusElementWithDelay(elementId: string, selectAll = false): void {
    setTimeout(() => {
      const element = this.getElement<HTMLInputElement>(elementId);
      if (element) {
        element.focus();
        if (selectAll && element.select) {
          element.select();
        }
      }
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
    if (this.boundEscHandler) {
      document.removeEventListener('keydown', this.boundEscHandler);
      this.boundEscHandler = undefined;
    }
  }
}
