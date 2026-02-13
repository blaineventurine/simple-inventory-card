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
      autoAddEnabled: this.getInputChecked(`add-${ELEMENTS.AUTO_ADD_ENABLED}`),
      autoAddIdToDescriptionEnabled: this.getInputChecked(
        `add-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`,
      ),
      autoAddToListQuantity: this.getInputValue(`add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`),
      barcode: this.getInputValue(`add-${ELEMENTS.BARCODE}`),
      category: this.getInputValue(`add-${ELEMENTS.CATEGORY}`),
      description: this.getInputValue(`add-${ELEMENTS.DESCRIPTION}`),
      desiredQuantity: this.getInputValue(`add-${ELEMENTS.DESIRED_QUANTITY}`),
      expiryAlertDays: this.getInputValue(`add-${ELEMENTS.EXPIRY_ALERT_DAYS}`),
      expiryDate: this.getInputValue(`add-${ELEMENTS.EXPIRY_DATE}`),
      location: this.getInputValue(`add-${ELEMENTS.LOCATION}`),
      name: this.getInputValue(`add-${ELEMENTS.NAME}`),
      quantity: this.getInputValue(`add-${ELEMENTS.QUANTITY}`),
      todoList: this.getInputValue(`add-${ELEMENTS.TODO_LIST}`),
      todoQuantityPlacement: this.getInputValue(`add-${ELEMENTS.TODO_QUANTITY_PLACEMENT}`),
      unit: this.getInputValue(`add-${ELEMENTS.UNIT}`),
    };
  }

  /**
   * Extracts raw form data from the edit modal
   */
  getRawEditModalData(): RawFormData {
    return {
      autoAddEnabled: this.getInputChecked(`edit-${ELEMENTS.AUTO_ADD_ENABLED}`),
      autoAddIdToDescriptionEnabled: this.getInputChecked(
        `edit-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`,
      ),
      autoAddToListQuantity: this.getInputValue(`edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`),
      barcode: this.getInputValue(`edit-${ELEMENTS.BARCODE}`),
      category: this.getInputValue(`edit-${ELEMENTS.CATEGORY}`),
      description: this.getInputValue(`edit-${ELEMENTS.DESCRIPTION}`),
      desiredQuantity: this.getInputValue(`edit-${ELEMENTS.DESIRED_QUANTITY}`),
      expiryAlertDays: this.getInputValue(`edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`),
      expiryDate: this.getInputValue(`edit-${ELEMENTS.EXPIRY_DATE}`),
      location: this.getInputValue(`edit-${ELEMENTS.LOCATION}`),
      name: this.getInputValue(`edit-${ELEMENTS.NAME}`),
      quantity: this.getInputValue(`edit-${ELEMENTS.QUANTITY}`),
      todoList: this.getInputValue(`edit-${ELEMENTS.TODO_LIST}`),
      todoQuantityPlacement: this.getInputValue(`edit-${ELEMENTS.TODO_QUANTITY_PLACEMENT}`),
      unit: this.getInputValue(`edit-${ELEMENTS.UNIT}`),
    };
  }

  /**
   * Populates the edit modal with item data
   */
  populateEditModal(item: InventoryItem): void {
    const fields: ModalField[] = [
      {
        id: `edit-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
        value: (item.auto_add_to_list_quantity ?? DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY).toString(),
      },

      {
        id: `edit-${ELEMENTS.BARCODE}`,
        value: item.barcodes?.length ? item.barcodes[0] : DEFAULTS.BARCODE,
      },
      {
        id: `edit-${ELEMENTS.CATEGORY}`,
        value: item.categories?.length
          ? item.categories.join(', ')
          : (item.category ?? DEFAULTS.CATEGORY),
      },
      { id: `edit-${ELEMENTS.DESCRIPTION}`, value: item.description ?? DEFAULTS.DESCRIPTION },
      {
        id: `edit-${ELEMENTS.DESIRED_QUANTITY}`,
        value:
          (item.desired_quantity ?? DEFAULTS.DESIRED_QUANTITY) === 0
            ? ''
            : (item.desired_quantity ?? DEFAULTS.DESIRED_QUANTITY).toString(),
      },
      {
        id: `edit-${ELEMENTS.EXPIRY_ALERT_DAYS}`,
        value: (item.expiry_alert_days ?? DEFAULTS.EXPIRY_ALERT_DAYS).toString(),
      },
      { id: `edit-${ELEMENTS.EXPIRY_DATE}`, value: item.expiry_date ?? DEFAULTS.EXPIRY_DATE },
      {
        id: `edit-${ELEMENTS.LOCATION}`,
        value: item.locations?.length
          ? item.locations.join(', ')
          : (item.location ?? DEFAULTS.LOCATION),
      },
      { id: `edit-${ELEMENTS.NAME}`, value: item.name ?? '' },
      { id: `edit-${ELEMENTS.QUANTITY}`, value: (item.quantity ?? DEFAULTS.QUANTITY).toString() },
      { id: `edit-${ELEMENTS.TODO_LIST}`, value: item.todo_list ?? DEFAULTS.TODO_LIST },
      {
        id: `edit-${ELEMENTS.TODO_QUANTITY_PLACEMENT}`,
        value: item.todo_quantity_placement ?? DEFAULTS.TODO_QUANTITY_PLACEMENT,
      },
      { id: `edit-${ELEMENTS.UNIT}`, value: item.unit ?? DEFAULTS.UNIT },
    ];

    this.setFormValues(fields);

    const autoAddCheckbox = this.getElement<HTMLInputElement>(`edit-${ELEMENTS.AUTO_ADD_ENABLED}`);
    const autoAddIdCheckbox = this.getElement<HTMLInputElement>(
      `edit-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`,
    );

    if (autoAddCheckbox) {
      autoAddCheckbox.checked = item.auto_add_enabled ?? false;
    }

    if (autoAddIdCheckbox) {
      autoAddIdCheckbox.checked = item.auto_add_id_to_description_enabled ?? false;
    }
  }

  /**
   * Clears the add modal form and resets to defaults
   */
  clearAddModalForm(): void {
    const fields: ModalField[] = [
      {
        id: `add-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}`,
        value: DEFAULTS.AUTO_ADD_TO_LIST_QUANTITY.toString(),
      },

      { id: `add-${ELEMENTS.BARCODE}`, value: DEFAULTS.BARCODE },
      { id: `add-${ELEMENTS.CATEGORY}`, value: DEFAULTS.CATEGORY },
      { id: `add-${ELEMENTS.DESCRIPTION}`, value: DEFAULTS.DESCRIPTION },
      {
        id: `add-${ELEMENTS.DESIRED_QUANTITY}`,
        value: '',
      },
      { id: `add-${ELEMENTS.EXPIRY_ALERT_DAYS}`, value: DEFAULTS.EXPIRY_ALERT_DAYS.toString() },
      { id: `add-${ELEMENTS.EXPIRY_DATE}`, value: DEFAULTS.EXPIRY_DATE },
      { id: `add-${ELEMENTS.LOCATION}`, value: DEFAULTS.LOCATION },
      { id: `add-${ELEMENTS.NAME}`, value: '' },
      { id: `add-${ELEMENTS.QUANTITY}`, value: DEFAULTS.QUANTITY.toString() },
      { id: `add-${ELEMENTS.TODO_LIST}`, value: DEFAULTS.TODO_LIST },
      {
        id: `add-${ELEMENTS.TODO_QUANTITY_PLACEMENT}`,
        value: DEFAULTS.TODO_QUANTITY_PLACEMENT,
      },
      { id: `add-${ELEMENTS.UNIT}`, value: DEFAULTS.UNIT },
    ];

    this.setFormValues(fields);

    const autoAddCheckbox = this.getElement<HTMLInputElement>(`add-${ELEMENTS.AUTO_ADD_ENABLED}`);
    const autoAddIdCheckbox = this.getElement<HTMLInputElement>(
      `add-${ELEMENTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED}`,
    );

    if (autoAddCheckbox) {
      autoAddCheckbox.checked = DEFAULTS.AUTO_ADD_ENABLED;
    }

    if (autoAddIdCheckbox) {
      autoAddIdCheckbox.checked = DEFAULTS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED;
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
