import { HomeAssistant, InventoryConfig } from '../types/home-assistant';
import { ModalFormManager } from './modals/modalFormManager';
import { ModalUIManager } from './modals/modalUIManager';
import { ModalValidationManager } from './modals/modalValidationManager';
import { SanitizedItemData } from '../types/inventoryItem';
import { Utils } from '../utils/utils';

export interface InventoryServiceResult {
  success: boolean;
  error?: string;
}

export interface InventoryServices {
  addItem(inventoryId: string, itemData: SanitizedItemData): Promise<InventoryServiceResult>;
  updateItem(
    inventoryId: string,
    oldName: string,
    itemData: SanitizedItemData,
  ): Promise<InventoryServiceResult>;
}

export class Modals {
  private formManager: ModalFormManager;
  private validationManager: ModalValidationManager;
  private uiManager: ModalUIManager;
  private currentEditingItem: string | null = null;

  constructor(
    shadowRoot: ShadowRoot,
    private readonly services: InventoryServices,
    private readonly getInventoryId: (entityId: string) => string,
    private readonly onDataChanged?: () => void,
  ) {
    this.formManager = new ModalFormManager(shadowRoot);
    this.validationManager = new ModalValidationManager(shadowRoot);
    this.uiManager = new ModalUIManager(shadowRoot, this.formManager, this.validationManager);
  }

  public openAddModal(): void {
    this.uiManager.openAddModal();
  }

  public closeAddModal(): void {
    this.uiManager.closeAddModal();
  }

  public openEditModal(itemName: string, hass: HomeAssistant, config: InventoryConfig): void {
    const result = this.uiManager.openEditModal(itemName, hass, config);
    if (result.found) {
      this.currentEditingItem = itemName;
    }
  }
  public closeEditModal(): void {
    this.uiManager.closeEditModal();
    this.currentEditingItem = null;
  }

  public closeAllModals(): void {
    this.closeAddModal();
    this.closeEditModal();
  }

  public clearAddModalForm(): void {
    this.formManager.clearAddModalForm();
  }

  public handleModalClick(e: MouseEvent): boolean {
    return this.uiManager.handleModalClick(e);
  }

  public destroy(): void {
    this.uiManager.destroy();
  }

  public async addItem(config: InventoryConfig): Promise<boolean> {
    try {
      this.validationManager.clearError(true);

      const sanitizedData = this.validateAndPrepareFormData(true);
      if (!sanitizedData) {
        return false;
      }

      const result = await this.services.addItem(this.getInventoryId(config.entity), sanitizedData);

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

      const sanitizedData = this.validateAndPrepareFormData(false);
      if (!sanitizedData) {
        return false;
      }

      const result = await this.services.updateItem(
        this.getInventoryId(config.entity),
        this.currentEditingItem,
        sanitizedData,
      );

      return this.handleEditResult(result);
    } catch (error) {
      return this.handleException(error, 'updating', false);
    }
  }

  private validateAndPrepareFormData(isAddModal: boolean): SanitizedItemData | null {
    const rawFormData = isAddModal
      ? this.formManager.getRawAddModalData()
      : this.formManager.getRawEditModalData();

    const validation = Utils.validateRawFormData(rawFormData);

    if (!validation.isValid) {
      this.validationManager.highlightInvalidFields(validation.errors, isAddModal);
      this.validationManager.showError(validation.errors[0].message, isAddModal);
      return null;
    }

    const itemData = Utils.convertRawFormDataToItemData(rawFormData);
    return Utils.sanitizeItemData(itemData);
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
}
