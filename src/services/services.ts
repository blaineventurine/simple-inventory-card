import { DOMAIN, SERVICES, PARAMS } from '../utils/constants';
import { HomeAssistant } from '../types/homeAssistant';
import { ItemData } from '../types/inventoryItem';
import { Utilities } from '../utils/utilities';

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
      const sanitizedItemData = Utilities.sanitizeItemData(itemData);
      const sanitizedInventoryId = Utilities.sanitizeString(inventoryId, 100);
      if (!sanitizedInventoryId) {
        return {
          success: false,
          error: 'Invalid inventory ID',
        };
      }

      if (!sanitizedItemData.name) {
        return {
          success: false,
          error: 'Item name cannot be empty',
        };
      }

      await this.hass.callService(DOMAIN, SERVICES.ADD_ITEM, {
        [PARAMS.AUTO_ADD_ENABLED]: sanitizedItemData.autoAddEnabled,
        [PARAMS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED]:
          sanitizedItemData.autoAddIdToDescriptionEnabled,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: sanitizedItemData.autoAddToListQuantity,
        [PARAMS.CATEGORY]: sanitizedItemData.category,
        [PARAMS.DESCRIPTION]: sanitizedItemData.description,
        [PARAMS.EXPIRY_ALERT_DAYS]: sanitizedItemData.expiryAlertDays,
        [PARAMS.EXPIRY_DATE]: sanitizedItemData.expiryDate,
        [PARAMS.INVENTORY_ID]: sanitizedInventoryId,
        [PARAMS.LOCATION]: sanitizedItemData.location,
        [PARAMS.NAME]: sanitizedItemData.name,
        [PARAMS.QUANTITY]: sanitizedItemData.quantity,
        [PARAMS.TODO_LIST]: sanitizedItemData.todoList,
        [PARAMS.UNIT]: sanitizedItemData.unit,
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
      const sanitizedItemData = Utilities.sanitizeItemData(itemData);
      const sanitizedInventoryId = Utilities.sanitizeString(inventoryId, 100);

      if (!sanitizedInventoryId) {
        return {
          success: false,
          error: 'Invalid inventory ID',
        };
      }

      const parameters = {
        [PARAMS.AUTO_ADD_ENABLED]: sanitizedItemData.autoAddEnabled,
        [PARAMS.AUTO_ADD_ID_TO_DESCRIPTION_ENABLED]:
          sanitizedItemData.autoAddIdToDescriptionEnabled,
        [PARAMS.AUTO_ADD_TO_LIST_QUANTITY]: sanitizedItemData.autoAddToListQuantity,
        [PARAMS.CATEGORY]: sanitizedItemData.category,
        [PARAMS.DESCRIPTION]: sanitizedItemData.description,
        [PARAMS.EXPIRY_ALERT_DAYS]: sanitizedItemData.expiryAlertDays,
        [PARAMS.EXPIRY_DATE]: sanitizedItemData.expiryDate,
        [PARAMS.INVENTORY_ID]: sanitizedInventoryId,
        [PARAMS.LOCATION]: sanitizedItemData.location,
        [PARAMS.NAME]: sanitizedItemData.name,
        [PARAMS.OLD_NAME]: oldName,
        [PARAMS.QUANTITY]: sanitizedItemData.quantity,
        [PARAMS.TODO_LIST]: sanitizedItemData.todoList,
        [PARAMS.UNIT]: sanitizedItemData.unit,
      };
      await this.hass.callService(DOMAIN, SERVICES.UPDATE_ITEM, parameters);
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
