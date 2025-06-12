import { ELEMENTS, CSS_CLASSES, MESSAGES, TIMING, DEFAULTS } from '../utils/constants';
import { HomeAssistant, InventoryItem, InventoryConfig } from '../types/home-assistant';
import { Utils } from '../utils/utils';
import { SanitizedItemData, ItemData } from '../types/inventoryItem';

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
    private readonly getInventoryId: (entityId: string) => string
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
      modal.classList.add(CSS_CLASSES.SHOW);
      this.focusElementWithDelay(ELEMENTS.NAME);
      this.setupExpiryThresholdInteraction();
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
      modal.classList.add(CSS_CLASSES.SHOW);
      this.focusElementWithDelay(ELEMENTS.NAME, true);
      this.setupExpiryThresholdInteraction();
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

  public getAddModalData(): ItemData {
    return {
      autoAddEnabled: this.getInputChecked(`add-${ELEMENTS.AUTO_ADD_ENABLED}`),
      autoAddToListQuantity: this.getInputNumber(`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`, 0),
      category: this.getInputValue(`add-${ELEMENTS.CATEGORY}`),
      expiryAlertDays: this.getInputNumber(`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`, 7),
      expiryDate: this.getInputValue(`add-${ELEMENTS.EXPIRY_DATE}`),
      name: this.getInputValue(`add-${ELEMENTS.NAME}`),
      quantity: this.getInputNumber(`add-${ELEMENTS.QUANTITY}`, DEFAULTS.QUANTITY),
      todoList: this.getInputValue(`add-${ELEMENTS.TODO_LIST}`),
      unit: this.getInputValue(`add-${ELEMENTS.UNIT}`),
    };
  }

  public getEditModalData(): ItemData {
    return {
      autoAddEnabled: this.getInputChecked(`edit-${ELEMENTS.AUTO_ADD_ENABLED}`),
      autoAddToListQuantity: this.getInputNumber(`edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`, 0),
      category: this.getInputValue(`edit-${ELEMENTS.CATEGORY}`),
      expiryAlertDays: this.getInputNumber(`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`, 7),
      expiryDate: this.getInputValue(`edit-${ELEMENTS.EXPIRY_DATE}`),
      name: this.getInputValue(`edit-${ELEMENTS.NAME}`),
      quantity: this.getInputNumber(`edit-${ELEMENTS.QUANTITY}`),
      todoList: this.getInputValue(`edit-${ELEMENTS.TODO_LIST}`),
      unit: this.getInputValue(`edit-${ELEMENTS.UNIT}`),
    };
  }

  public clearAddModalForm(): void {
    const fields: ModalField[] = [
      { id: `add-${ELEMENTS.NAME}`, value: '' },
      { id: `add-edit-${ELEMENTS.QUANTITY}`, value: '0' },
      { id: `add-${ELEMENTS.UNIT}`, value: '' },
      { id: `add-${ELEMENTS.CATEGORY}`, value: '' },
      { id: `add-${ELEMENTS.EXPIRY_DATE}`, value: '' },
      { id: `add-${ELEMENTS.EXPIRY_ALERT_DAYS}`, value: '7' },
      {
        id: `add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
        value: '0',
      },
      { id: `add--${ELEMENTS.TODO_LIST}`, value: '' },
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
      const autoAddValidation = this.validateAutoAddFields(true);
      if (!autoAddValidation.isValid) {
        this.showError(autoAddValidation.message || 'Please fill in required auto-add fields');
        return false;
      }

      const expiryValidation = this.validateExpiryThreshold(true);
      if (!expiryValidation.isValid) {
        this.showError(expiryValidation.message || 'Please check expiry threshold settings');
        return false;
      }

      const itemData = this.getAddModalData();

      const validation = Utils.validateItemData(itemData);
      if (!validation.isValid) {
        this.showError(validation.errors[0] || MESSAGES.ERROR_NO_NAME);
        return false;
      }

      const sanitizedData = Utils.sanitizeItemData(itemData);
      const inventoryId = this.getInventoryId(config.entity);
      const result = await this.services.addItem(inventoryId, sanitizedData);

      if (result.success) {
        this.clearAddModalForm();
        return true;
      } else {
        this.showError(`Error adding item: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Error in addItem:', error);
      this.showError('An error occurred while adding the item');
      return false;
    }
  }

  public async saveEditModal(config: InventoryConfig): Promise<boolean> {
    if (!this.currentEditingItem) {
      return false;
    }

    const autoAddValidation = this.validateAutoAddFields(false);
    if (!autoAddValidation.isValid) {
      this.showError(autoAddValidation.message || 'Please fill in required auto-add fields');
      return false;
    }

    const expiryValidation = this.validateExpiryThreshold(false);
    if (!expiryValidation.isValid) {
      this.showError(expiryValidation.message || 'Please check expiry threshold settings');
      return false;
    }

    const itemData = this.getEditModalData();
    const validation = Utils.validateItemData(itemData);

    if (!validation.isValid) {
      this.showError(validation.errors[0] || MESSAGES.ERROR_NO_NAME);
      return false;
    }

    const sanitizedData = Utils.sanitizeItemData(itemData);

    try {
      const inventoryId = this.getInventoryId(config.entity);
      const result = await this.services.updateItem(
        inventoryId,
        this.currentEditingItem,
        sanitizedData
      );

      if (result.success) {
        return true;
      } else {
        this.showError(`Error updating item: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Error in saveEditModal:', error);
      this.showError('An error occurred while updating the item');
      return false;
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
    // Setup for add modal
    this.setupExpiryThresholdFieldForModal(true);

    // Setup for edit modal
    this.setupExpiryThresholdFieldForModal(false);
  }

  private setupExpiryThresholdFieldForModal(isAddModal: boolean): void {
    const expiryElementId = isAddModal ? 'add' : 'edit';
    const expiryInput = this.getElement<HTMLInputElement>(
      `${expiryElementId}-${ELEMENTS.EXPIRY_DATE}`
    );

    if (!expiryInput) return;

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

  private getInputNumber(id: string, defaultValue = 0): number {
    const element = this.getElement<HTMLInputElement>(id);
    if (!element) return defaultValue;

    const value = parseInt(element.value);
    return isNaN(value) ? defaultValue : Math.max(0, value);
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

  private showError(message: string): void {
    alert(message);
  }

  private validateAutoAddFields(isAddModal = true): { isValid: boolean; message?: string } {
    const autoAddElementId = isAddModal
      ? `add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`
      : `edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`;
    const todoListElementId = isAddModal
      ? `add-${ELEMENTS.TODO_LIST}`
      : `edit-${ELEMENTS.TODO_LIST}`;

    const autoAddCheckbox = this.getElement<HTMLInputElement>(autoAddElementId);

    if (!autoAddCheckbox?.checked) {
      return { isValid: true };
    }

    const todoListSelect = this.getElement<HTMLSelectElement>(todoListElementId);

    // Reset any previous error styling
    if (todoListSelect) todoListSelect.style.borderColor = '';

    if (!todoListSelect?.value) {
      if (todoListSelect) todoListSelect.style.borderColor = 'var(--error-color)';
      return {
        isValid: false,
        message: 'Todo list selection is required when auto-add is enabled',
      };
    }

    return { isValid: true };
  }

  private validateExpiryThreshold(isAddModal = true): { isValid: boolean; message?: string } {
    const expiryElementId = isAddModal
      ? `add-${ELEMENTS.EXPIRY_DATE}`
      : `edit-${ELEMENTS.EXPIRY_DATE}`;
    const thresholdElementId = isAddModal
      ? `add-${ELEMENTS.EXPIRY_ALERT_DAYS}`
      : `edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`;

    const expiryInput = this.getElement<HTMLInputElement>(expiryElementId);
    const thresholdInput = this.getElement<HTMLInputElement>(thresholdElementId);

    // Reset any previous error styling
    if (thresholdInput) thresholdInput.style.borderColor = '';

    const hasExpiryDate = expiryInput?.value?.trim();
    const thresholdValue = thresholdInput?.value?.trim();

    // If there's an expiry date but no threshold, use default
    if (hasExpiryDate && !thresholdValue) {
      if (thresholdInput) thresholdInput.value = '7';
      return { isValid: true };
    }

    // If there's a threshold but no expiry date, that's an error
    if (thresholdValue && !hasExpiryDate) {
      if (thresholdInput) thresholdInput.style.borderColor = 'var(--error-color)';
      return {
        isValid: false,
        message: 'Expiry threshold requires an expiry date to be set',
      };
    }

    if (thresholdValue) {
      const threshold = parseFloat(thresholdValue);
      if (isNaN(threshold) || threshold < 0) {
        if (thresholdInput) thresholdInput.style.borderColor = 'var(--error-color)';
        return {
          isValid: false,
          message: 'Expiry threshold must be a positive number',
        };
      }
    }

    return { isValid: true };
  }
}
