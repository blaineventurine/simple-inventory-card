import { DOMAIN, SERVICES, PARAMS, DEFAULTS } from '../utils/constants';
import { HomeAssistant } from '../types/home-assistant';
import { ItemData } from '../types/inventoryItem';

export interface ServiceResult {
  success: boolean;
  error?: string;
}

export class Services {
  private hass: HomeAssistant;

  constructor(hass: HomeAssistant) {
    this.hass = hass;
  }

  /**
   * Adds a new item to the inventory
   * @param inventoryId - The ID of the inventory
   * @param itemData - Data for the item to add
   * @returns Promise resolving to a service result
   */
  async addItem(inventoryId: string, itemData: ItemData): Promise<ServiceResult> {
    try {
      await this.hass.callService(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemData.name,
        [PARAMS.QUANTITY]: itemData.quantity ?? DEFAULTS.QUANTITY,
        [PARAMS.UNIT]: itemData.unit ?? DEFAULTS.UNIT,
        [PARAMS.CATEGORY]: itemData.category ?? DEFAULTS.CATEGORY,
        [PARAMS.EXPIRY_DATE]: itemData.expiryDate ?? DEFAULTS.EXPIRY_DATE,
        [PARAMS.TODO_LIST]: itemData.todoList ?? DEFAULTS.TODO_LIST,
        [PARAMS.EXPIRY_ALERT_DAYS]: itemData.expiryAlertDays ?? 7,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: itemData.autoAddToListQuantity ?? 0,
        [PARAMS.AUTO_ADD_ENABLED]: itemData.autoAddEnabled ?? DEFAULTS.AUTO_ADD_ENABLED,
      });
      return { success: true };
    } catch (error) {
      console.error('Error adding item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Removes an item from the inventory
   * @param inventoryId - The ID of the inventory
   * @param itemName - Name of the item to remove
   * @returns Promise resolving to a service result
   */
  async removeItem(inventoryId: string, itemName: string): Promise<ServiceResult> {
    try {
      await this.hass.callService(DOMAIN, SERVICES.REMOVE_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
      });
      return { success: true };
    } catch (error) {
      console.error('Error removing item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Increments the quantity of an item
   * @param inventoryId - The ID of the inventory
   * @param itemName - Name of the item to increment
   * @param amount - Amount to increment by (default: 1)
   * @returns Promise resolving to a service result
   */
  async incrementItem(inventoryId: string, itemName: string, amount = 1): Promise<ServiceResult> {
    try {
      await this.hass.callService(DOMAIN, SERVICES.INCREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.AMOUNT]: amount,
      });
      return { success: true };
    } catch (error) {
      console.error('Error incrementing item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Decrements the quantity of an item
   * @param inventoryId - The ID of the inventory
   * @param itemName - Name of the item to decrement
   * @param amount - Amount to decrement by (default: 1)
   * @returns Promise resolving to a service result
   */
  async decrementItem(inventoryId: string, itemName: string, amount = 1): Promise<ServiceResult> {
    try {
      await this.hass.callService(DOMAIN, SERVICES.DECREMENT_ITEM, {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.AMOUNT]: amount,
      });
      return { success: true };
    } catch (error) {
      console.error('Error decrementing item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Updates an existing item in the inventory
   * @param inventoryId - The ID of the inventory
   * @param oldName - Original name of the item
   * @param itemData - Updated data for the item
   * @returns Promise resolving to a service result
   */
  async updateItem(
    inventoryId: string,
    oldName: string,
    itemData: ItemData,
  ): Promise<ServiceResult> {
    try {
      const params = {
        [PARAMS.AUTO_ADD_ENABLED]: itemData.autoAddEnabled ?? DEFAULTS.AUTO_ADD_ENABLED,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: itemData.autoAddToListQuantity ?? 0,
        [PARAMS.CATEGORY]: itemData.category ?? DEFAULTS.CATEGORY,
        [PARAMS.EXPIRY_ALERT_DAYS]: itemData.expiryAlertDays ?? 7,
        [PARAMS.EXPIRY_DATE]: itemData.expiryDate ?? DEFAULTS.EXPIRY_DATE,
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemData.name,
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.QUANTITY]: itemData.quantity,
        [PARAMS.TODO_LIST]: itemData.todoList ?? DEFAULTS.TODO_LIST,
        [PARAMS.UNIT]: itemData.unit ?? DEFAULTS.UNIT,
      };
      await this.hass.callService(DOMAIN, SERVICES.UPDATE_ITEM, params);
      return { success: true };
    } catch (error) {
      console.error('Error updating item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
