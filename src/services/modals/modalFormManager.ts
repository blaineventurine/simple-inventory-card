import { ELEMENTS, DEFAULTS } from '../../utils/constants';
import { InventoryItem } from '../../types/homeAssistant';
import { RawFormData } from '../../types/inventoryItem';

type ModalField = {
  id: string;
  value: string;
  defaultValue?: string | number | boolean;
};

export class ModalFormManager {
  constructor(private readonly shadowRoot: ShadowRoot) {}

  /**
   * Extracts raw form data from the add modal
   */
  getRawAddModalData(): RawFormData {
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
      location: this.getInputValue(`add-${ELEMENTS.LOCATION}`),
    };
  }

  /**
   * Extracts raw form data from the edit modal
   */
  getRawEditModalData(): RawFormData {
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
      location: this.getInputValue(`edit-${ELEMENTS.LOCATION}`),
    };
  }

  /**
   * Populates the edit modal with item data
   */
  populateEditModal(item: InventoryItem): void {
    const fields: ModalField[] = [
      { id: `edit-${ELEMENTS.NAME}`, value: item.name ?? '' },
      { id: `edit-${ELEMENTS.QUANTITY}`, value: (item.quantity ?? DEFAULTS.QUANTITY).toString() },
      { id: `edit-${ELEMENTS.UNIT}`, value: item.unit ?? DEFAULTS.UNIT },
      { id: `edit-${ELEMENTS.CATEGORY}`, value: item.category ?? DEFAULTS.CATEGORY },
      { id: `edit-${ELEMENTS.LOCATION}`, value: item.location ?? DEFAULTS.LOCATION },
      { id: `edit-${ELEMENTS.EXPIRY_DATE}`, value: item.expiry_date ?? DEFAULTS.EXPIRY_DATE },
      {
        id: `edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`,
        value: (item.expiry_alert_days ?? DEFAULTS.EXPIRY_ALERT_DAYS).toString(),
      },
      {
        id: `edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
        value: (item.auto_add_to_list_quantity ?? DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY).toString(),
      },
      { id: `edit-${ELEMENTS.TODO_LIST}`, value: item.todo_list ?? DEFAULTS.TODO_LIST },
    ];

    this.setFormValues(fields);

    const autoAddCheckbox = this.getElement<HTMLInputElement>(`edit-${ELEMENTS.AUTO_ADD_ENABLED}`);
    if (autoAddCheckbox) {
      autoAddCheckbox.checked = item.auto_add_enabled ?? false;
    }
  }

  /**
   * Clears the add modal form and resets to defaults
   */
  clearAddModalForm(): void {
    const fields: ModalField[] = [
      { id: `add-${ELEMENTS.NAME}`, value: '' },
      { id: `add-${ELEMENTS.QUANTITY}`, value: DEFAULTS.QUANTITY.toString() },
      { id: `add-${ELEMENTS.UNIT}`, value: DEFAULTS.UNIT },
      { id: `add-${ELEMENTS.CATEGORY}`, value: DEFAULTS.CATEGORY },
      { id: `add-${ELEMENTS.LOCATION}`, value: DEFAULTS.LOCATION },
      { id: `add-${ELEMENTS.EXPIRY_DATE}`, value: DEFAULTS.EXPIRY_DATE },
      { id: `add-${ELEMENTS.EXPIRY_ALERT_DAYS}`, value: DEFAULTS.EXPIRY_ALERT_DAYS.toString() },
      {
        id: `add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
        value: DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY.toString(),
      },
      { id: `add-${ELEMENTS.TODO_LIST}`, value: DEFAULTS.TODO_LIST },
    ];

    this.setFormValues(fields);

    const autoAddCheckbox = this.getElement<HTMLInputElement>(`add-${ELEMENTS.AUTO_ADD_ENABLED}`);
    if (autoAddCheckbox) {
      autoAddCheckbox.checked = DEFAULTS.AUTO_ADD_ENABLED;
    }
  }

  /**
   * Sets values for multiple form fields
   */
  private setFormValues(fields: ModalField[]): void {
    for (const { id, value } of fields) {
      const element = this.getElement<HTMLInputElement>(id);
      if (element) {
        element.value = value;
      }
    }
  }

  /**
   * Gets the value of an input element by ID
   */
  private getInputValue(id: string): string {
    const element = this.getElement<HTMLInputElement>(id);
    return element?.value?.trim() ?? '';
  }

  /**
   * Gets the checked state of a checkbox by ID
   */
  private getInputChecked(id: string): boolean {
    const element = this.getElement<HTMLInputElement>(id);
    return element?.checked ?? false;
  }

  /**
   * Gets an element from the shadow root by ID
   */
  private getElement<T extends HTMLElement>(id: string): T | null {
    return this.shadowRoot.getElementById(id) as T | null;
  }
}
