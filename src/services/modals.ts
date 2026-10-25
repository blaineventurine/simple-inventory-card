import { InventoryConfig, InventoryItem } from '@/types/inventory';
import { CardContext, GetCardContext } from '@/types/cardContext';
import { ItemData } from '@/types/inventoryItem';
import { ModalFormManager } from './modals/modalFormManager';
import { ModalUIManager } from './modals/modalUIManager';
import { ModalValidationManager } from './modals/modalValidationManager';
import { BatchEditor } from './modals/batchEditor';
import { DuplicateBatchOffer } from './modals/duplicateBatchOffer';
import { TranslationManager } from './translationManager';
import { FormUtils } from '../utils/formUtils';
import { foldCase } from '../utils/foldCase';
import { TranslationData } from '@/types/translatableComponent';
import { initializeModalMultiSelect } from './modalMultiSelect';
import { resumeBarcodeScanner } from './barcodeTagInput';
import { CSS_CLASSES, ELEMENTS } from '@/utils/constants';
import { ServiceResult } from '@/types/serviceResult';
import { InventoryServices } from '@/types/inventoryServices';
import { RestockOptions } from '@/types/batchOptions';
import { firstLocation, isIsoDate } from '@/utils/batchFields';
import { ItemImageField } from './modals/itemImageField';

export class Modals {
  private formManager: ModalFormManager;
  private validationManager: ModalValidationManager;
  private uiManager: ModalUIManager;
  private batchEditor: BatchEditor;
  private duplicateOffer: DuplicateBatchOffer;
  private addTranslations: TranslationData = {};
  private currentEditingItem: string | undefined = undefined;
  /** An add or edit save (image step included) is running; another one is ignored. */
  private isSaving = false;
  private shadowRoot: ShadowRoot;

  constructor(
    shadowRoot: ShadowRoot,
    private readonly services: InventoryServices,
    private readonly getInventoryId: (entityId: string) => string,
    private readonly onDataChanged?: () => void,
    private readonly getContext?: GetCardContext,
    /** The sheets' image field (`item_images`); its staged image is saved after the item. */
    private readonly imageField?: ItemImageField,
  ) {
    this.formManager = new ModalFormManager(shadowRoot);
    this.validationManager = new ModalValidationManager(shadowRoot);
    this.uiManager = new ModalUIManager(
      shadowRoot,
      this.formManager,
      this.validationManager,
      () => this.getContext?.().hass,
    );
    this.batchEditor = new BatchEditor(shadowRoot);
    this.duplicateOffer = new DuplicateBatchOffer(shadowRoot);
    this.shadowRoot = shadowRoot;
  }

  public openAddModal(
    translations: TranslationData,
    locations: string[] = [],
    categories: string[] = [],
    onBarcodeAdded?: (barcode: string) => void,
  ): void {
    this.addTranslations = translations;
    this.duplicateOffer.hide();
    this.uiManager.openAddModal(translations, onBarcodeAdded);
    this.imageField?.open('add', translations);
    this.initializeAutoCompleteInputs('add', locations, categories);
  }

  public closeAddModal(): void {
    this.uiManager.closeAddModal();
  }

  public openEditModal(
    itemName: string,
    getContext: () => Pick<CardContext, 'hass' | 'config' | 'items'>,
    translations: TranslationData,
    locations: string[] = [],
    categories: string[] = [],
  ): void {
    const result = this.uiManager.openEditModal(itemName, getContext, translations);
    if (result.found) {
      this.currentEditingItem = itemName;
      if (result.item) {
        this.batchEditor.open(result.item, translations);
        this.imageField?.open('edit', translations, result.item);
      }
      this.initializeAutoCompleteInputs('edit', locations, categories);
    }
  }

  public closeEditModal(): void {
    this.uiManager.closeEditModal();
    this.currentEditingItem = undefined;
  }

  public getCurrentEditingItem(): string | undefined {
    return this.currentEditingItem;
  }

  /** Mark a batch in the edit modal for removal on save, or keep it again. */
  public toggleBatchRemoved(batchId: string): void {
    this.batchEditor.toggleRemoved(batchId);
  }

  /** Append a blank new-batch row to the edit modal's batch editor. */
  public addBatchRow(): void {
    this.batchEditor.addRow();
  }

  /** Drop an unsaved new-batch row from the edit modal. */
  public discardBatchRow(rowKey: string): void {
    this.batchEditor.discardRow(rowKey);
  }

  public showError(message: string, isAddModal: boolean): void {
    this.validationManager.showError(message, isAddModal);
  }

  public closeAllModals(): void {
    this.closeAddModal();
    this.closeEditModal();
  }

  public clearAddModalForm(): void {
    this.formManager.clearAddModalForm();
    this.duplicateOffer.hide();
  }

  public handleModalClick(event: MouseEvent): boolean {
    return this.uiManager.handleModalClick(event);
  }

  public destroy(): void {
    this.uiManager.destroy();
  }

  /**
   * Undoes `destroy`: the sheets listen on the document again (Esc, backdrop presses), and an
   * open sheet's barcode scanner that was showing its camera starts it again.
   */
  public resume(): void {
    this.uiManager.addDocumentListeners();
    for (const [modalId, prefix] of [
      [ELEMENTS.ADD_MODAL, 'add'],
      [ELEMENTS.EDIT_MODAL, 'edit'],
    ]) {
      if (this.shadowRoot.getElementById(modalId)?.classList.contains(CSS_CLASSES.SHOW)) {
        resumeBarcodeScanner(this.shadowRoot, prefix);
      }
    }
  }

  public addItem(config: InventoryConfig): Promise<boolean> {
    return this.whileSaving(ELEMENTS.ADD_MODAL, () => this.saveNewItem(config));
  }

  public saveEditModal(config: InventoryConfig): Promise<boolean> {
    return this.whileSaving(ELEMENTS.EDIT_MODAL, () => this.saveEditedItem(config));
  }

  /**
   * Runs one save at a time: a second add/edit save while one runs returns false, and the
   * sheet's primary button stays disabled until the save, image included, has finished.
   */
  private async whileSaving(sheetId: string, save: () => Promise<boolean>): Promise<boolean> {
    if (this.isSaving) {
      return false;
    }
    this.isSaving = true;
    const button = this.shadowRoot.querySelector(`#${sheetId} .${CSS_CLASSES.SAVE_BTN}`);
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    }
    try {
      return await save();
    } finally {
      this.isSaving = false;
      if (button instanceof HTMLButtonElement) {
        button.disabled = false;
      }
    }
  }

  private async saveNewItem(config: InventoryConfig): Promise<boolean> {
    try {
      this.validationManager.clearError(true);
      this.duplicateOffer.hide();

      const itemData = this.validateAndPrepareFormData(true);
      if (!itemData) {
        return false;
      }

      // Client-side duplicate name check
      const existing = itemData.name ? this.findItem(itemData.name) : undefined;
      if (existing) {
        this.validationManager.highlightInvalidFields(
          [{ field: 'name', message: 'Duplicate name' }],
          true,
        );
        this.validationManager.showError(
          `An item named "${itemData.name}" already exists in this inventory.`,
          true,
        );
        this.duplicateOffer.show(existing.name, this.addTranslations);
        return false;
      }

      const inventoryId = this.getInventoryId(config.entity);
      const result = await this.services.addItem(inventoryId, itemData);
      if (!result.success && result.errorCode === 'duplicate_item_name') {
        this.handleAddResult(result);
        this.duplicateOffer.show(
          this.findItem(itemData.name)?.name ?? itemData.name,
          this.addTranslations,
        );
        return false;
      }
      if (result.success) {
        // The image needs the new item's id, so it is saved second (I14); a failure keeps the item.
        // Looked up under the name `addItem` created it with (sanitised, at most 100 characters).
        const createdName = FormUtils.sanitizeString(itemData.name, 100);
        await this.imageField?.apply('add', inventoryId, createdName);
      }

      return this.handleAddResult(result);
    } catch (error) {
      return this.handleException(error, 'adding', true);
    }
  }

  /**
   * Add the Add Item form's quantity to the existing item the duplicate offer names, as a new
   * batch (or a top-up, D4) with the form's expiry, first location and price. The other fields
   * describe the item, not the stock, and are left alone. Leaves closing the modal to the caller.
   */
  public async addItemAsBatch(config: InventoryConfig): Promise<boolean> {
    const itemName = this.duplicateOffer.itemName;
    if (itemName === undefined) {
      return false;
    }

    try {
      this.validationManager.clearError(true);
      const raw = this.formManager.getRawAddModalData();

      const quantity = Number(raw.quantity.trim() || Number.NaN);
      if (!(quantity > 0)) {
        const message = this.localizeAdd(
          'batches.invalid_new_quantity',
          'New batch quantity must be greater than 0',
        );
        this.validationManager.highlightInvalidFields([{ field: 'quantity', message }], true);
        this.validationManager.showError(message, true);
        return false;
      }

      const restock: RestockOptions = {};
      const expiryDate = raw.expiryDate.trim();
      if (expiryDate !== '') {
        if (!isIsoDate(expiryDate)) {
          const message = this.localizeAdd(
            'batches.invalid_date',
            'Enter a valid date (YYYY-MM-DD)',
          );
          this.validationManager.highlightInvalidFields([{ field: 'expiryDate', message }], true);
          this.validationManager.showError(message, true);
          return false;
        }
        restock.expiryDate = expiryDate;
      }
      const location = firstLocation(raw.location);
      if (location !== '') {
        restock.location = location;
      }
      const price = Number.parseFloat(raw.price);
      if (price > 0) {
        restock.price = price;
      }

      const result = await this.services.incrementItem(
        this.getInventoryId(config.entity),
        itemName,
        quantity,
        restock,
      );
      if (!result.success) {
        const error = result.error ?? '';
        this.validationManager.showError(
          this.localizeAdd('batches.add_failed', `Error adding batch: ${error}`, { error }),
          true,
        );
        return false;
      }

      this.clearAddModalForm();
      this.triggerDataChanged();
      return true;
    } catch (error) {
      return this.handleException(error, 'adding', true);
    }
  }

  private async saveEditedItem(config: InventoryConfig): Promise<boolean> {
    if (!this.currentEditingItem) {
      return false;
    }

    try {
      this.validationManager.clearError(false);

      const itemData = this.validateAndPrepareFormData(false);
      if (!itemData) {
        return false;
      }

      const batchEdits = this.batchEditor.collect();
      if (!batchEdits.valid) {
        this.validationManager.showError(batchEdits.message, false);
        return false;
      }

      // Client-side duplicate name check
      if (
        itemData.name &&
        foldCase(itemData.name) !== foldCase(this.currentEditingItem) &&
        this.findItem(itemData.name)
      ) {
        this.validationManager.highlightInvalidFields(
          [{ field: 'name', message: 'Duplicate name' }],
          false,
        );
        this.validationManager.showError(
          `An item named "${itemData.name}" already exists in this inventory.`,
          false,
        );
        return false;
      }

      const inventoryId = this.getInventoryId(config.entity);
      const result = await this.services.updateItem(inventoryId, this.currentEditingItem, itemData);
      if (!result.success) {
        return this.handleEditResult(result);
      }
      // A retry after a failed batch change must address the item by its saved name.
      this.currentEditingItem = itemData.name;

      // Batches go second: the form's quantity/expiry still hold the values loaded at open,
      // which D6 treats as unchanged. Changing batches first would make them stale.
      const batchResult = await this.batchEditor.apply(
        this.services,
        inventoryId,
        this.currentEditingItem,
        batchEdits.operations,
      );
      if (!batchResult.success) {
        this.validationManager.showError(batchResult.error ?? '', false);
        // The item update already landed; the card holds this refresh until the modal closes.
        this.triggerDataChanged();
        return false;
      }
      await this.imageField?.apply('edit', inventoryId, this.currentEditingItem);

      return this.handleEditResult(result);
    } catch (error) {
      return this.handleException(error, 'updating', false);
    }
  }

  private validateAndPrepareFormData(isAddModal: boolean): ItemData | undefined {
    const rawFormData = isAddModal
      ? this.formManager.getRawAddModalData()
      : this.formManager.getRawEditModalData();

    const validation = FormUtils.validateRawFormData(rawFormData);

    if (!validation.isValid) {
      this.validationManager.highlightInvalidFields(validation.errors, isAddModal);
      this.validationManager.showError(validation.errors[0].message, isAddModal);
      return undefined;
    }

    return FormUtils.convertRawFormDataToItemData(rawFormData);
  }

  private handleAddResult(result: ServiceResult): boolean {
    if (result.success) {
      this.clearAddModalForm();
      this.triggerDataChanged();
      return true;
    } else {
      this.validationManager.showError(`Error adding item: ${result.error}`, true);
      return false;
    }
  }

  private handleEditResult(result: ServiceResult): boolean {
    if (result.success) {
      this.triggerDataChanged();
      return true;
    } else {
      this.validationManager.showError(`Error updating item: ${result.error}`, false);
      return false;
    }
  }

  private handleException(error: unknown, operation: string, isAddModal: boolean): boolean {
    console.error(`Error in ${operation} item:`, error);
    this.validationManager.showError(`An error occurred while ${operation} the item`, isAddModal);
    return false;
  }

  private triggerDataChanged(): void {
    if (this.onDataChanged) {
      this.onDataChanged();
    }
  }

  private findItem(name: string): InventoryItem | undefined {
    if (!this.getContext) {
      return undefined;
    }

    const { items } = this.getContext();
    return items.find((item) => foldCase(item.name) === foldCase(name));
  }

  private localizeAdd(key: string, fallback: string, params?: Record<string, string>): string {
    return TranslationManager.localize(this.addTranslations, key, params, fallback);
  }

  private initializeAutoCompleteInputs(
    prefix: string,
    locations: string[],
    categories: string[],
  ): void {
    setTimeout(() => {
      initializeModalMultiSelect({
        id: `${prefix}-${ELEMENTS.LOCATION}`,
        options: locations,
        shadowRoot: this.shadowRoot,
      });

      initializeModalMultiSelect({
        id: `${prefix}-${ELEMENTS.CATEGORY}`,
        options: categories,
        shadowRoot: this.shadowRoot,
      });
    }, 0);
  }
}
