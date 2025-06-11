import { ELEMENTS, CSS_CLASSES, MESSAGES, TIMING, DEFAULTS } from '../utils/constants';
import { HomeAssistant, InventoryItem, InventoryConfig } from '../types/home-assistant';
import { Utils } from '../utils/utils';

export interface ItemData {
  autoAddEnabled: boolean;
  category: string;
  expiryDate: string;
  expiryThreshold: number;
  name: string;
  quantity: number;
  threshold: number; // Quantity threshold for auto-add
  todoList: string;
  unit: string;
}

export interface InventoryServiceResult {
  success: boolean;
  error?: string;
}

export interface InventoryServices {
  addItem(inventoryId: string, itemData: ItemData): Promise<InventoryServiceResult>;
  updateItem(
    inventoryId: string,
    oldName: string,
    itemData: ItemData
  ): Promise<InventoryServiceResult>;
}

type ModalField = {
  id: string;
  value: string;
  defaultValue?: string | number | boolean;
};

export class Modals {
  private currentSettingsItem: string | null = null;
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
      this.focusElementWithDelay(ELEMENTS.ITEM_NAME);
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

  public openSettingsModal(itemName: string, hass: HomeAssistant, config: InventoryConfig): void {
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

    this.currentSettingsItem = itemName;
    this.populateSettingsModal(item);

    const modal = this.getElement<HTMLElement>(ELEMENTS.SETTINGS_MODAL);
    if (modal) {
      modal.classList.add(CSS_CLASSES.SHOW);
      this.focusElementWithDelay(ELEMENTS.MODAL_ITEM_NAME, true);
      this.setupExpiryThresholdInteraction();
    }
  }

  public closeSettingsModal(): void {
    const modal = this.getElement<HTMLElement>(ELEMENTS.SETTINGS_MODAL);
    if (modal) {
      modal.classList.remove(CSS_CLASSES.SHOW);
    }
    this.currentSettingsItem = null;
  }

  public closeAllModals(): void {
    this.closeAddModal();
    this.closeSettingsModal();
  }

  private populateSettingsModal(item: InventoryItem): void {
    const fields: ModalField[] = [
      { id: ELEMENTS.MODAL_ITEM_NAME, value: item.name ?? '' },
      { id: ELEMENTS.MODAL_ITEM_QUANTITY, value: (item.quantity ?? 0).toString() },
      { id: ELEMENTS.MODAL_ITEM_UNIT, value: item.unit ?? '' },
      { id: ELEMENTS.MODAL_ITEM_CATEGORY, value: item.category ?? '' },
      { id: ELEMENTS.MODAL_ITEM_EXPIRY, value: item.expiry_date ?? '' },
      { id: ELEMENTS.MODAL_THRESHOLD, value: (item.threshold ?? 0).toString() },
      { id: ELEMENTS.MODAL_EXPIRY_THRESHOLD, value: (item.threshold ?? 7).toString() },
      { id: ELEMENTS.MODAL_TODO_LIST, value: item.todo_list ?? '' },
    ];

    this.setFormValues(fields);

    const autoAddCheckbox = this.getElement<HTMLInputElement>(ELEMENTS.MODAL_AUTO_ADD);
    if (autoAddCheckbox) {
      autoAddCheckbox.checked = item.auto_add_enabled ?? false;
    }

    this.updateExpiryThresholdState(false);
  }

  private updateExpiryThresholdState(isAddModal: boolean): void {
    console.log('updateExpiryThresholdState called', { isAddModal });

    const expiryElementId = isAddModal ? ELEMENTS.ITEM_EXPIRY : ELEMENTS.MODAL_ITEM_EXPIRY;
    const thresholdElementId = isAddModal
      ? ELEMENTS.ITEM_EXPIRY_THRESHOLD
      : ELEMENTS.MODAL_EXPIRY_THRESHOLD;

    console.log('Looking for elements:', { expiryElementId, thresholdElementId });

    const expiryInput = this.getElement<HTMLInputElement>(expiryElementId);
    const thresholdInput = this.getElement<HTMLInputElement>(thresholdElementId);

    console.log('Found elements:', {
      expiryInput: !!expiryInput,
      thresholdInput: !!thresholdInput,
      expiryValue: expiryInput?.value,
      thresholdValue: thresholdInput?.value,
    });

    if (!expiryInput || !thresholdInput) {
      console.warn('Elements not found!');
      return;
    }

    const hasExpiryDate = expiryInput.value.trim() !== '';
    console.log('Has expiry date:', hasExpiryDate);

    if (hasExpiryDate) {
      console.log('Enabling threshold field');
      thresholdInput.disabled = false;
      thresholdInput.placeholder = 'Days before expiry to alert (default: 7)';

      if (!thresholdInput.value.trim()) {
        thresholdInput.value = '7';
        console.log('Set default threshold value: 7');
      }
    } else {
      console.log('Disabling threshold field');
      thresholdInput.disabled = true;
      thresholdInput.value = '';
      thresholdInput.placeholder = 'Set expiry date first';
    }
  }

  public getAddModalData(): ItemData {
    return {
      name: this.getInputValue(ELEMENTS.ITEM_NAME),
      quantity: this.getInputNumber(ELEMENTS.ITEM_QUANTITY, DEFAULTS.QUANTITY),
      unit: this.getInputValue(ELEMENTS.ITEM_UNIT),
      category: this.getInputValue(ELEMENTS.ITEM_CATEGORY),
      expiryDate: this.getInputValue(ELEMENTS.ITEM_EXPIRY),
      expiryThreshold: this.getInputNumber(ELEMENTS.ITEM_EXPIRY_THRESHOLD, 7), // NEW
      todoList: this.getInputValue(ELEMENTS.ITEM_TODO_LIST),
      threshold: this.getInputNumber(ELEMENTS.ITEM_THRESHOLD, DEFAULTS.THRESHOLD), // Quantity threshold
      autoAddEnabled: this.getInputChecked(ELEMENTS.ITEM_AUTO_ADD),
    };
  }

  public getSettingsModalData(): ItemData {
    return {
      name: this.getInputValue(ELEMENTS.MODAL_ITEM_NAME),
      quantity: this.getInputNumber(ELEMENTS.MODAL_ITEM_QUANTITY),
      unit: this.getInputValue(ELEMENTS.MODAL_ITEM_UNIT),
      category: this.getInputValue(ELEMENTS.MODAL_ITEM_CATEGORY),
      expiryDate: this.getInputValue(ELEMENTS.MODAL_ITEM_EXPIRY),
      expiryThreshold: this.getInputNumber(ELEMENTS.MODAL_EXPIRY_THRESHOLD, 7), // NEW
      todoList: this.getInputValue(ELEMENTS.MODAL_TODO_LIST),
      threshold: this.getInputNumber(ELEMENTS.MODAL_THRESHOLD), // Quantity threshold
      autoAddEnabled: this.getInputChecked(ELEMENTS.MODAL_AUTO_ADD),
    };
  }

  public clearAddModalForm(): void {
    const fields: ModalField[] = [
      { id: ELEMENTS.ITEM_NAME, value: '' },
      { id: ELEMENTS.ITEM_UNIT, value: '' },
      { id: ELEMENTS.ITEM_CATEGORY, value: '' },
      { id: ELEMENTS.ITEM_EXPIRY, value: '' },
      { id: ELEMENTS.ITEM_EXPIRY_THRESHOLD, value: '' },
      { id: ELEMENTS.ITEM_TODO_LIST, value: '' },
      { id: ELEMENTS.ITEM_QUANTITY, value: DEFAULTS.QUANTITY.toString() },
      { id: ELEMENTS.ITEM_THRESHOLD, value: DEFAULTS.THRESHOLD.toString() },
    ];

    this.setFormValues(fields);

    const autoAddCheckbox = this.getElement<HTMLInputElement>(ELEMENTS.ITEM_AUTO_ADD);
    if (autoAddCheckbox) {
      autoAddCheckbox.checked = DEFAULTS.AUTO_ADD_ENABLED;
    }
    setTimeout(() => {
      this.updateExpiryThresholdState(true); // true = add modal
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

  public async saveSettingsModal(config: InventoryConfig): Promise<boolean> {
    if (!this.currentSettingsItem) {
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

    const itemData = this.getSettingsModalData();
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
        this.currentSettingsItem,
        sanitizedData
      );

      if (result.success) {
        return true;
      } else {
        this.showError(`Error updating item: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Error in saveSettingsModal:', error);
      this.showError('An error occurred while updating the item');
      return false;
    }
  }

  public handleModalClick(e: MouseEvent): boolean {
    const target = e.target as HTMLElement;

    // Handle modal backdrop clicks (only if clicking directly on modal background)
    if (target.id === ELEMENTS.ADD_MODAL || target.id === ELEMENTS.SETTINGS_MODAL) {
      e.preventDefault();
      e.stopPropagation();

      if (target.id === ELEMENTS.ADD_MODAL) {
        this.closeAddModal();
      } else {
        this.closeSettingsModal();
      }

      return true;
    }

    // Handle close button clicks
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
      target.closest(`#${ELEMENTS.SETTINGS_MODAL}`)
    ) {
      e.preventDefault();
      e.stopPropagation();
      this.closeSettingsModal();
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
    this.setupThresholdFieldForModal(true);

    // Setup for settings modal
    this.setupThresholdFieldForModal(false);
  }

  private setupThresholdFieldForModal(isAddModal: boolean): void {
    const expiryElementId = isAddModal ? ELEMENTS.ITEM_EXPIRY : ELEMENTS.MODAL_ITEM_EXPIRY;
    const expiryInput = this.getElement<HTMLInputElement>(expiryElementId);

    if (!expiryInput) return;

    // Update state immediately
    this.updateExpiryThresholdState(isAddModal);

    // Listen for changes
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
    const autoAddElementId = isAddModal ? ELEMENTS.ITEM_AUTO_ADD : ELEMENTS.MODAL_AUTO_ADD;
    const todoListElementId = isAddModal ? ELEMENTS.ITEM_TODO_LIST : ELEMENTS.MODAL_TODO_LIST;

    const autoAddCheckbox = this.getElement<HTMLInputElement>(autoAddElementId);

    if (!autoAddCheckbox?.checked) {
      return { isValid: true }; // No validation needed if auto-add is disabled
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
    const expiryElementId = isAddModal ? ELEMENTS.ITEM_EXPIRY : ELEMENTS.MODAL_ITEM_EXPIRY;
    const thresholdElementId = isAddModal
      ? ELEMENTS.ITEM_EXPIRY_THRESHOLD
      : ELEMENTS.MODAL_EXPIRY_THRESHOLD;

    const expiryInput = this.getElement<HTMLInputElement>(expiryElementId);
    const thresholdInput = this.getElement<HTMLInputElement>(thresholdElementId);

    // Reset any previous error styling
    if (thresholdInput) thresholdInput.style.borderColor = '';

    const hasExpiryDate = expiryInput?.value?.trim();
    const thresholdValue = thresholdInput?.value?.trim();

    // If there's an expiry date but no threshold, use default
    if (hasExpiryDate && !thresholdValue) {
      if (thresholdInput) thresholdInput.value = '7'; // Set default
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

    // If threshold is set, validate it's a positive number
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
