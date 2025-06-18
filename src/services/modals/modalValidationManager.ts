import { ELEMENTS } from '../../utils/constants';
import { ValidationError } from '../../types/validationError';

export class ModalValidationManager {
  constructor(private readonly shadowRoot: ShadowRoot) {}

  /**
   * Highlights invalid form fields with error styling
   */
  highlightInvalidFields(errors: ValidationError[], isAddModal: boolean): void {
    const prefix = isAddModal ? 'add' : 'edit';

    this.clearFieldErrors(isAddModal);

    errors.forEach((error) => {
      let elementId = '';

      switch (error.field) {
        case 'name':
          elementId = `${prefix}-${ELEMENTS.NAME}`;
          break;
        case 'quantity':
          elementId = `${prefix}-${ELEMENTS.QUANTITY}`;
          break;
        case 'autoAddToListQuantity':
          elementId = `${prefix}-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`;
          break;
        case 'todoList':
          elementId = `${prefix}-${ELEMENTS.TODO_LIST}`;
          break;
        case 'expiryDate':
          elementId = `${prefix}-${ELEMENTS.EXPIRY_DATE}`;
          break;
        case 'expiryAlertDays':
          elementId = `${prefix}-${ELEMENTS.EXPIRY_ALERT_DAYS}`;
          break;
      }

      if (elementId) {
        const element = this.getElement<HTMLInputElement>(elementId);
        if (element) {
          element.classList.add('input-error');
        }
      }
    });
  }

  /**
   * Clears error highlighting from all form fields
   */
  clearFieldErrors(isAddModal: boolean): void {
    const modalId = isAddModal ? ELEMENTS.ADD_MODAL : ELEMENTS.EDIT_MODAL;

    const modal = this.getElement<HTMLElement>(modalId);
    if (modal) {
      modal.querySelectorAll('.input-error').forEach((field) => {
        field.classList.remove('input-error');
      });
    }
  }

  /**
   * Shows validation error message in the modal
   */
  showError(message: string, isAddModal: boolean = true): void {
    const prefix = isAddModal ? 'add' : 'edit';
    const validationMessage = this.getElement<HTMLElement>(`${prefix}-validation-message`);
    const validationText = validationMessage?.querySelector('.validation-text');

    if (validationMessage && validationText) {
      validationText.textContent = message;
      validationMessage.classList.add('show');

      const modalContent = validationMessage.closest('.modal-content');
      if (modalContent) {
        modalContent.scrollTop = 0;
      }

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        this.clearError(isAddModal);
      }, 5000);
    } else {
      console.error('Validation Error:', message);
    }
  }

  /**
   * Clears validation error message from the modal
   */
  clearError(isAddModal: boolean = true): void {
    const prefix = isAddModal ? 'add' : 'edit';
    const validationMessage = this.getElement<HTMLElement>(`${prefix}-validation-message`);

    if (validationMessage) {
      validationMessage.classList.remove('show');
    }
  }

  /**
   * Sets up input listeners to clear errors when user starts typing
   */
  setupValidationListeners(): void {
    this.setupClearErrorsForModal(true); // Add modal
    this.setupClearErrorsForModal(false); // Edit modal
  }

  /**
   * Sets up error clearing listeners for a specific modal
   */
  private setupClearErrorsForModal(isAddModal: boolean): void {
    const prefix = isAddModal ? 'add' : 'edit';

    const fields = [
      this.getElement<HTMLInputElement>(`${prefix}-${ELEMENTS.QUANTITY}`),
      this.getElement<HTMLInputElement>(`${prefix}-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`),
      this.getElement<HTMLSelectElement>(`${prefix}-${ELEMENTS.TODO_LIST}`),
      this.getElement<HTMLInputElement>(`${prefix}-${ELEMENTS.NAME}`),
      this.getElement<HTMLInputElement>(`${prefix}-${ELEMENTS.EXPIRY_DATE}`),
    ];

    const autoAddCheckbox = this.getElement<HTMLInputElement>(
      `${prefix}-${ELEMENTS.AUTO_ADD_ENABLED}`,
    );
    const quantityThresholdField = this.getElement<HTMLInputElement>(
      `${prefix}-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
    );
    const todoListField = this.getElement<HTMLSelectElement>(`${prefix}-${ELEMENTS.TODO_LIST}`);

    // Set up input/change listeners for all fields
    fields.forEach((field) => {
      if (field) {
        const clearErrorHandler = () => {
          field.classList.remove('input-error');
          this.clearError(isAddModal);
        };

        field.addEventListener('input', clearErrorHandler);
        field.addEventListener('change', clearErrorHandler);
      }
    });

    // Special handling for auto-add checkbox
    if (autoAddCheckbox) {
      autoAddCheckbox.addEventListener('change', () => {
        if (!autoAddCheckbox.checked) {
          quantityThresholdField?.classList.remove('input-error');
          todoListField?.classList.remove('input-error');
          this.clearError(isAddModal);
        }
      });
    }
  }

  /**
   * Gets an element from the shadow root by ID
   */
  private getElement<T extends HTMLElement>(id: string): T | null {
    return this.shadowRoot.getElementById(id) as T | null;
  }
}
