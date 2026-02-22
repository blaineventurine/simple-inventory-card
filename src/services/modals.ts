import { HomeAssistant, InventoryConfig, InventoryItem } from '../types/homeAssistant';
import { ItemData } from '../types/inventoryItem';
import { ModalFormManager } from './modals/modalFormManager';
import { ModalUIManager } from './modals/modalUIManager';
import { ModalValidationManager } from './modals/modalValidationManager';
import { Utilities } from '../utils/utilities';
import { TranslationData } from '@/types/translatableComponent';
import { initializeModalMultiSelect } from './modalMultiSelect';
import { ELEMENTS } from '@/utils/constants';

export interface InventoryServiceResult {
  success: boolean;
  error?: string;
}

export interface InventoryServices {
  addItem(inventoryId: string, itemData: ItemData): Promise<InventoryServiceResult>;
  updateItem(
    inventoryId: string,
    oldName: string,
    itemData: ItemData,
  ): Promise<InventoryServiceResult>;
}

export class Modals {
  private formManager: ModalFormManager;
  private validationManager: ModalValidationManager;
  private uiManager: ModalUIManager;
  private currentEditingItem: string | undefined = undefined;
  private shadowRoot: ShadowRoot;

  constructor(
    shadowRoot: ShadowRoot,
    private readonly services: InventoryServices,
    private readonly getInventoryId: (entityId: string) => string,
    private readonly onDataChanged?: () => void,
    private getFreshState?: () => { hass: HomeAssistant; config: InventoryConfig },
  ) {
    this.formManager = new ModalFormManager(shadowRoot);
    this.validationManager = new ModalValidationManager(shadowRoot);
    this.uiManager = new ModalUIManager(shadowRoot, this.formManager, this.validationManager);
    this.shadowRoot = shadowRoot;
  }

  public openAddModal(
    translations: TranslationData,
    locations: string[] = [],
    categories: string[] = [],
    onBarcodeAdded?: (barcode: string) => void,
  ): void {
    this.uiManager.openAddModal(translations, onBarcodeAdded);
    this.initializeAutoCompleteInputs('add', locations, categories);
  }

  public closeAddModal(): void {
    this.uiManager.closeAddModal();
  }

  public openEditModal(
    itemName: string,
    getFreshData: () => { hass: HomeAssistant; config: InventoryConfig },
    translations: TranslationData,
    locations: string[] = [],
    categories: string[] = [],
  ): void {
    const result = this.uiManager.openEditModal(itemName, getFreshData, translations);
    if (result.found) {
      this.currentEditingItem = itemName;
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

  public closeAllModals(): void {
    this.closeAddModal();
    this.closeEditModal();
  }

  public clearAddModalForm(): void {
    this.formManager.clearAddModalForm();
  }

  public handleModalClick(event: MouseEvent): boolean {
    return this.uiManager.handleModalClick(event);
  }

  public destroy(): void {
    this.uiManager.destroy();
  }

  public async addItem(config: InventoryConfig): Promise<boolean> {
    try {
      this.validationManager.clearError(true);

      const itemData = this.validateAndPrepareFormData(true);
      if (!itemData) {
        return false;
      }

      // Client-side duplicate name check
      if (itemData.name && this.itemNameExists(itemData.name)) {
        this.validationManager.highlightInvalidFields(
          [{ field: 'name', message: 'Duplicate name' }],
          true,
        );
        this.validationManager.showError(
          `An item named "${itemData.name}" already exists in this inventory.`,
          true,
        );
        return false;
      }

      const result = await this.services.addItem(this.getInventoryId(config.entity), itemData);

      return this.handleAddResult(result);
    } catch (error) {
      return this.handleException(error, 'adding', true);
    }
  }

  public async saveEditModal(config: InventoryConfig): Promise<boolean> {
    if (!this.currentEditingItem) {
      return false;
    }

    try {
      this.validationManager.clearError(false);

      const itemData = this.validateAndPrepareFormData(false);
      if (!itemData) {
        return false;
      }

      // Client-side duplicate name check
      if (
        itemData.name &&
        itemData.name.toLowerCase() !== this.currentEditingItem.toLowerCase() &&
        this.itemNameExists(itemData.name)
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

      const result = await this.services.updateItem(
        this.getInventoryId(config.entity),
        this.currentEditingItem,
        itemData,
      );

      return this.handleEditResult(result);
    } catch (error) {
      return this.handleException(error, 'updating', false);
    }
  }

  private validateAndPrepareFormData(isAddModal: boolean): ItemData | undefined {
    const rawFormData = isAddModal
      ? this.formManager.getRawAddModalData()
      : this.formManager.getRawEditModalData();

    const validation = Utilities.validateRawFormData(rawFormData);

    if (!validation.isValid) {
      this.validationManager.highlightInvalidFields(validation.errors, isAddModal);
      this.validationManager.showError(validation.errors[0].message, isAddModal);
      return undefined;
    }

    return Utilities.convertRawFormDataToItemData(rawFormData);
  }

  private handleAddResult(result: InventoryServiceResult): boolean {
    if (result.success) {
      this.clearAddModalForm();
      this.triggerDataChanged();
      return true;
    } else {
      this.validationManager.showError(`Error adding item: ${result.error}`, true);
      return false;
    }
  }

  private handleEditResult(result: InventoryServiceResult): boolean {
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

  public setFreshState(
    getFreshState: () => { hass: HomeAssistant; config: InventoryConfig },
  ): void {
    this.getFreshState = getFreshState;
  }

  private itemNameExists(name: string): boolean {
    if (!this.getFreshState) {
      return false;
    }

    const { hass, config } = this.getFreshState();
    const state = hass.states[config.entity];
    if (!state?.attributes?.items) {
      return false;
    }

    const items: readonly InventoryItem[] = state.attributes.items;
    return items.some((item) => item.name.toLowerCase() === name.toLowerCase());
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
