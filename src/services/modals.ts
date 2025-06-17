import { ELEMENTS, CSS_CLASSES, TIMING, DEFAULTS } from '../utils/constants';
import { HomeAssistant, InventoryItem, InventoryConfig } from '../types/home-assistant';
import { Utils } from '../utils/utils';
import { SanitizedItemData, RawFormData } from '../types/inventoryItem';
import { ValidationError } from '../types/validationError';

export interface InventoryServiceResult {
  success: boolean;
  error?: string;
}

export interface InventoryServices {
  addItem(inventoryId: string, itemData: SanitizedItemData): Promise<InventoryServiceResult>;
  updateItem(
    inventoryId: string,
    oldName: string,
    itemData: SanitizedItemData
  ): Promise<InventoryServiceResult>;
}

type ModalField = {
  id: string;
  value: string;
  defaultValue?: string | number | boolean;
};

export class Modals {
  private currentEditingItem: string | null = null;
  private boundEscHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    private readonly shadowRoot: ShadowRoot,
    private readonly services: InventoryServices,
    private readonly getInventoryId: (entityId: string) => string,
    private readonly onDataChanged?: () => void
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.boundEscHandler) {
      this.boundEscHandler = this.handleEscapeKey.bind(this);
      document.addEventListener('keydown', this.boundEscHandler);
    }
  }

  private handleEscapeKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.closeAllModals();
    }
  }

  public openAddModal(): void {
    const modal = this.getElement<HTMLElement>(ELEMENTS.ADD_MODAL);
    if (modal) {
      this.clearError(true);
      modal.classList.add(CSS_CLASSES.SHOW);
      this.focusElementWithDelay(ELEMENTS.NAME);
      this.setupExpiryThresholdInteraction();
      this.setupValidationListeners();
    } else {
      console.warn('Add modal not found in DOM');
    }
  }

  public closeAddModal(): void {
    const modal = this.getElement<HTMLElement>(ELEMENTS.ADD_MODAL);
    if (modal) {
      modal.classList.remove(CSS_CLASSES.SHOW);
    }
  }

  public openEditModal(itemName: string, hass: HomeAssistant, config: InventoryConfig): void {
    const entityId = config.entity;
    const state = hass.states[entityId];

    if (!state) {
      console.warn(`Entity not found: ${entityId}`);
      return;
    }

    const items: readonly InventoryItem[] = state.attributes?.items || [];
    const item = items.find((i) => i.name === itemName);

    if (!item) {
      console.warn(`Item not found: ${itemName}`);
      return;
    }

    this.currentEditingItem = itemName;
    this.populateEditModal(item);

    const modal = this.getElement<HTMLElement>(ELEMENTS.EDIT_MODAL);
    if (modal) {
      this.clearError(false);
      modal.classList.add(CSS_CLASSES.SHOW);
      this.focusElementWithDelay(ELEMENTS.NAME, true);
      this.setupExpiryThresholdInteraction();
      this.setupValidationListeners();
    }
  }

  public closeEditModal(): void {
    const modal = this.getElement<HTMLElement>(ELEMENTS.EDIT_MODAL);
    if (modal) {
      modal.classList.remove(CSS_CLASSES.SHOW);
    }
    this.currentEditingItem = null;
  }

  public closeAllModals(): void {
    this.closeAddModal();
    this.closeEditModal();
  }

  private populateEditModal(item: InventoryItem): void {
    const fields: ModalField[] = [
      { id: `edit-${ELEMENTS.NAME}`, value: item.name ?? '' },
      { id: `edit-${ELEMENTS.QUANTITY}`, value: (item.quantity ?? 0).toString() },
      { id: `edit-${ELEMENTS.UNIT}`, value: item.unit ?? '' },
      { id: `edit-${ELEMENTS.CATEGORY}`, value: item.category ?? '' },
      { id: `edit-${ELEMENTS.EXPIRY_DATE}`, value: item.expiry_date ?? '' },
      { id: `edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`, value: (item.expiry_alert_days ?? 7).toString() },
      {
        id: `edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
        value: (item.auto_add_to_list_quantity ?? 0).toString(),
      },
      { id: `edit-${ELEMENTS.TODO_LIST}`, value: item.todo_list ?? '' },
    ];

    this.setFormValues(fields);

    const autoAddCheckbox = this.getElement<HTMLInputElement>(`edit-${ELEMENTS.AUTO_ADD_ENABLED}`);
    if (autoAddCheckbox) {
      autoAddCheckbox.checked = item.auto_add_enabled ?? false;
    }

    this.updateExpiryThresholdState(false);
  }

  private updateExpiryThresholdState(isAddModal: boolean): void {
    const modalType = isAddModal ? 'add' : 'edit';

    const expiryInput = this.getElement<HTMLInputElement>(`${modalType}-${ELEMENTS.EXPIRY_DATE}`);
    const thresholdInput = this.getElement<HTMLInputElement>(
      `${modalType}-${ELEMENTS.EXPIRY_ALERT_DAYS}`
    );

    if (!expiryInput || !thresholdInput) {
      return;
    }

    const hasExpiryDate = expiryInput.value.trim() !== '';

    if (hasExpiryDate) {
      thresholdInput.disabled = false;
      thresholdInput.placeholder = 'Days before expiry to alert (default: 7)';

      if (!thresholdInput.value.trim()) {
        thresholdInput.value = '7';
      }
    } else {
      thresholdInput.disabled = true;
      thresholdInput.value = '';
      thresholdInput.placeholder = 'Set expiry date first';
    }
  }

  public getRawAddModalData(): RawFormData {
    return {
      name: this.getInputValue(`add-${ELEMENTS.NAME}`),
      quantity: this.getInputValue(`add-${ELEMENTS.QUANTITY}`),
      autoAddEnabled: this.getInputChecked(`add-${ELEMENTS.AUTO_ADD_ENABLED}`),
      autoAddToListQuantity: this.getInputValue(`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`),
      todoList: this.getInputValue(`add-${ELEMENTS.TODO_LIST}`),
      expiryDate: this.getInputValue(`add-${ELEMENTS.EXPIRY_DATE}`),
      expiryAlertDays: this.getInputValue(`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`),
      category: this.getInputValue(`add-${ELEMENTS.CATEGORY}`),
      unit: this.getInputValue(`add-${ELEMENTS.UNIT}`),
    };
  }

  public getRawEditModalData(): RawFormData {
    return {
      name: this.getInputValue(`edit-${ELEMENTS.NAME}`),
      quantity: this.getInputValue(`edit-${ELEMENTS.QUANTITY}`),
      autoAddEnabled: this.getInputChecked(`edit-${ELEMENTS.AUTO_ADD_ENABLED}`),
      autoAddToListQuantity: this.getInputValue(`edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`),
      todoList: this.getInputValue(`edit-${ELEMENTS.TODO_LIST}`),
      expiryDate: this.getInputValue(`edit-${ELEMENTS.EXPIRY_DATE}`),
      expiryAlertDays: this.getInputValue(`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`),
      category: this.getInputValue(`edit-${ELEMENTS.CATEGORY}`),
      unit: this.getInputValue(`edit-${ELEMENTS.UNIT}`),
    };
  }

  public clearAddModalForm(): void {
    const fields: ModalField[] = [
      { id: `add-${ELEMENTS.NAME}`, value: '' },
      { id: `add-${ELEMENTS.QUANTITY}`, value: '0' },
      { id: `add-${ELEMENTS.UNIT}`, value: '' },
      { id: `add-${ELEMENTS.CATEGORY}`, value: '' },
      { id: `add-${ELEMENTS.EXPIRY_DATE}`, value: '' },
      { id: `add-${ELEMENTS.EXPIRY_ALERT_DAYS}`, value: '7' },
      {
        id: `add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
        value: '0',
      },
      { id: `add-${ELEMENTS.TODO_LIST}`, value: '' },
    ];

    this.setFormValues(fields);

    const autoAddCheckbox = this.getElement<HTMLInputElement>(`add-${ELEMENTS.AUTO_ADD_ENABLED}`);
    if (autoAddCheckbox) {
      autoAddCheckbox.checked = DEFAULTS.AUTO_ADD_ENABLED;
    }
    setTimeout(() => {
      this.updateExpiryThresholdState(true);
    }, 10);
  }

  public async addItem(config: InventoryConfig): Promise<boolean> {
    try {
      this.clearError(true);

      const rawFormData = this.getRawAddModalData();
      const validation = Utils.validateRawFormData(rawFormData);

      if (!validation.isValid) {
        this.highlightInvalidFields(validation.errors, true);
        this.showError(validation.errors[0].message, true);
        return false;
      }

      const itemData = Utils.convertRawFormDataToItemData(rawFormData);
      const sanitizedData = Utils.sanitizeItemData(itemData);
      const inventoryId = this.getInventoryId(config.entity);
      const result = await this.services.addItem(inventoryId, sanitizedData);

      if (result.success) {
        this.clearAddModalForm();
        if (this.onDataChanged) {
          this.onDataChanged();
        }
        return true;
      } else {
        this.showError(`Error adding item: ${result.error}`, true);
        return false;
      }
    } catch (error) {
      console.error('Error in addItem:', error);
      this.showError('An error occurred while adding the item', true);
      return false;
    }
  }

  public async saveEditModal(config: InventoryConfig): Promise<boolean> {
    if (!this.currentEditingItem) {
      return false;
    }

    try {
      this.clearError(false);

      const rawFormData = this.getRawEditModalData();
      const validation = Utils.validateRawFormData(rawFormData);

      if (!validation.isValid) {
        this.highlightInvalidFields(validation.errors, false);
        this.showError(validation.errors[0].message, false);
        return false;
      }

      const itemData = Utils.convertRawFormDataToItemData(rawFormData);
      const sanitizedData = Utils.sanitizeItemData(itemData);
      const inventoryId = this.getInventoryId(config.entity);
      const result = await this.services.updateItem(
        inventoryId,
        this.currentEditingItem,
        sanitizedData
      );

      if (result.success) {
        if (this.onDataChanged) {
          this.onDataChanged();
        }

        return true;
      } else {
        this.showError(`Error updating item: ${result.error}`, false);
        return false;
      }
    } catch (error) {
      console.error('Error in saveEditModal:', error);
      this.showError('An error occurred while updating the item', false);
      return false;
    }
  }

  private highlightInvalidFields(errors: ValidationError[], isAddModal: boolean): void {
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

  private clearFieldErrors(isAddModal: boolean): void {
    const modalId = isAddModal ? ELEMENTS.ADD_MODAL : ELEMENTS.EDIT_MODAL;

    const modal = this.getElement<HTMLElement>(modalId);
    if (modal) {
      modal.querySelectorAll('.input-error').forEach((field) => {
        field.classList.remove('input-error');
      });
    }
  }

  public handleModalClick(e: MouseEvent): boolean {
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
      target.dataset.action === 'close_add_modal' ||
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

  public destroy(): void {
    if (this.boundEscHandler) {
      document.removeEventListener('keydown', this.boundEscHandler);
      this.boundEscHandler = null;
    }
  }

  public setupExpiryThresholdInteraction(): void {
    this.setupExpiryThresholdFieldForModal(true);
    this.setupExpiryThresholdFieldForModal(false);
  }

  private setupExpiryThresholdFieldForModal(isAddModal: boolean): void {
    const expiryElementId = isAddModal ? 'add' : 'edit';
    const expiryInput = this.getElement<HTMLInputElement>(
      `${expiryElementId}-${ELEMENTS.EXPIRY_DATE}`
    );

    if (!expiryInput) {
      return;
    }

    this.updateExpiryThresholdState(isAddModal);

    expiryInput.addEventListener('input', () => {
      this.updateExpiryThresholdState(isAddModal);
    });

    expiryInput.addEventListener('change', () => {
      this.updateExpiryThresholdState(isAddModal);
    });
  }

  private getElement<T extends HTMLElement>(id: string): T | null {
    return this.shadowRoot.getElementById(id) as T | null;
  }

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

  private getInputValue(id: string): string {
    const element = this.getElement<HTMLInputElement>(id);
    return element?.value?.trim() ?? '';
  }

  private getInputChecked(id: string): boolean {
    const element = this.getElement<HTMLInputElement>(id);
    return element?.checked ?? false;
  }

  private setFormValues(fields: ModalField[]): void {
    fields.forEach(({ id, value }) => {
      const element = this.getElement<HTMLInputElement>(id);
      if (element) {
        element.value = value;
      }
    });
  }

  private showError(message: string, isAddModal: boolean = true): void {
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

      setTimeout(() => {
        this.clearError(isAddModal);
      }, 5000);
    } else {
      console.error('Validation Error:', message);
    }
  }

  private clearError(isAddModal: boolean = true): void {
    const prefix = isAddModal ? 'add' : 'edit';
    const validationMessage = this.getElement<HTMLElement>(`${prefix}-validation-message`);

    if (validationMessage) {
      validationMessage.classList.remove('show');
    }
  }

  public setupValidationListeners(): void {
    const setupClearErrorsForModal = (isAddModal: boolean) => {
      const prefix = isAddModal ? 'add' : 'edit';

      const quantityField = this.getElement<HTMLInputElement>(`${prefix}-${ELEMENTS.QUANTITY}`);
      const quantityThresholdField = this.getElement<HTMLInputElement>(
        `${prefix}-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`
      );
      const todoListField = this.getElement<HTMLSelectElement>(`${prefix}-${ELEMENTS.TODO_LIST}`);
      const autoAddCheckbox = this.getElement<HTMLInputElement>(
        `${prefix}-${ELEMENTS.AUTO_ADD_ENABLED}`
      );
      const nameField = this.getElement<HTMLInputElement>(`${prefix}-${ELEMENTS.NAME}`);
      const expiryField = this.getElement<HTMLInputElement>(`${prefix}-${ELEMENTS.EXPIRY_DATE}`);

      [quantityField, quantityThresholdField, todoListField, nameField, expiryField].forEach(
        (field) => {
          if (field) {
            field.addEventListener('input', () => {
              field.classList.remove('input-error');
              this.clearError(isAddModal);
            });
            field.addEventListener('change', () => {
              field.classList.remove('input-error');
              this.clearError(isAddModal);
            });
          }
        }
      );

      if (autoAddCheckbox) {
        autoAddCheckbox.addEventListener('change', () => {
          if (!autoAddCheckbox.checked) {
            quantityThresholdField?.classList.remove('input-error');
            todoListField?.classList.remove('input-error');
            this.clearError(isAddModal);
          }
        });
      }
    };

    setupClearErrorsForModal(true); // Add modal
    setupClearErrorsForModal(false); // Edit modal
  }
}
