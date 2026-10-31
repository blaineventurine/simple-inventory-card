import { InventoryItem } from '@/types/inventory';
import { RawFormData } from '@/types/inventoryItem';
import {
  ITEM_FORM_FIELDS,
  ITEM_FORM_KEYS,
  ItemFormKey,
  ItemFormPrefix,
  collectItemForm,
} from '../../utils/itemFormFields';

/** Reads, fills and clears the add/edit item sheets, field by field from `ITEM_FORM_FIELDS`. */
export class ModalFormManager {
  constructor(private readonly shadowRoot: ShadowRoot) {}

  getRawAddModalData(): RawFormData {
    return this.readForm('add');
  }

  getRawEditModalData(): RawFormData {
    return this.readForm('edit');
  }

  populateEditModal(item: InventoryItem): void {
    for (const key of ITEM_FORM_KEYS) {
      this.writeField('edit', key, ITEM_FORM_FIELDS[key].format(item));
    }
  }

  /** Resets the add sheet to its defaults. */
  clearAddModalForm(): void {
    for (const key of ITEM_FORM_KEYS) {
      this.writeField('add', key, ITEM_FORM_FIELDS[key].blank);
    }
  }

  private readForm(prefix: ItemFormPrefix): RawFormData {
    return collectItemForm<RawFormData>((key) =>
      ITEM_FORM_FIELDS[key].read(this.element(prefix, key)),
    );
  }

  /** Checkboxes take a boolean (`checked`), every other field a string (`value`). */
  private writeField(
    prefix: ItemFormPrefix,
    key: ItemFormKey,
    value: string | boolean | undefined,
  ): void {
    const element = this.element(prefix, key);
    if (!element) {
      return;
    }
    if (typeof value === 'boolean') {
      element.checked = value;
    } else if (value !== undefined) {
      element.value = value;
    }
  }

  /** The `${prefix}-${element}` input of a field; the id names an input-like element. */
  private element(prefix: ItemFormPrefix, key: ItemFormKey): HTMLInputElement | null {
    return this.shadowRoot.getElementById(
      `${prefix}-${ITEM_FORM_FIELDS[key].element}`,
    ) as HTMLInputElement | null;
  }
}
