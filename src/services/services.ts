import { DOMAIN, IMAGE_API_PATH, SERVICES, PARAMS, WS_COMMANDS } from '../utils/constants';
import { HomeAssistant } from '@/types/homeAssistant';
import { InventoryItem } from '@/types/inventory';
import { ItemData } from '@/types/inventoryItem';
import { HistoryEvent } from '@/types/historyEvent';
import { ItemConsumptionRates } from '@/types/consumptionRates';
import { FormUtils } from '../utils/formUtils';
import { itemPayload } from '../utils/itemFormFields';
import { ServiceResult, ImageResult, ImportResult } from '@/types/serviceResult';
import { BarcodeProductLookupResult, BarcodeItemLookupResult } from '@/types/barcodeResult';
import { HistoryQueryOptions } from '@/types/historyQuery';
import { WSRequest } from '@/types/wsRequest';
import { BackendInfo } from '@/types/backendInfo';
import { BatchMove, BatchTarget, BatchUpdate, RestockOptions } from '@/types/batchOptions';

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error !== null && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/** Failed result carrying the message and, when HA supplied one, the backend translation_key. */
function toFailure(error: unknown): ServiceResult {
  const result: ServiceResult = { success: false, error: extractErrorMessage(error) };
  if (
    error !== null &&
    typeof error === 'object' &&
    'translation_key' in error &&
    typeof error.translation_key === 'string'
  ) {
    result.errorCode = error.translation_key;
  }
  return result;
}

/**
 * Result of the image endpoint's POST/DELETE. Success bodies carry the new `image` stamp, error
 * bodies a `code` (`image_too_large`, `image_invalid`, `item_not_found`) that becomes `errorCode`.
 */
async function imageResult(response: Response): Promise<ImageResult> {
  const body: unknown = await response.json().catch(() => null);
  const record = body !== null && typeof body === 'object' ? body : {};
  if (response.ok) {
    return {
      success: true,
      image: 'image' in record && typeof record.image === 'string' ? record.image : '',
    };
  }
  const result: ImageResult = { success: false, error: `HTTP ${response.status}` };
  if ('code' in record && typeof record.code === 'string') {
    result.errorCode = record.code;
  }
  return result;
}

/** Service data for the optional restock fields. Only set keys are sent, so pre-batch integrations never see them. */
function restockParams(restock: RestockOptions): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (restock.expiryDate) {
    params[PARAMS.EXPIRY_DATE] = restock.expiryDate;
  }
  if (restock.location) {
    params[PARAMS.LOCATION] = restock.location;
  }
  if (restock.purchasedAt) {
    params[PARAMS.PURCHASED_AT] = restock.purchasedAt;
  }
  if (restock.price !== undefined) {
    params[PARAMS.PRICE] = restock.price;
  }
  return params;
}

export class Services {
  /** Reads the card's current hass on every call, never the one it was built with. */
  constructor(private readonly getHass: () => HomeAssistant) {}

  private get hass(): HomeAssistant {
    return this.getHass();
  }

  /** Calls one of the integration's services; a rejection is logged as `Error <doing>:` and returned as a failure. */
  private async call(
    service: string,
    data: Record<string, unknown>,
    doing: string,
  ): Promise<ServiceResult> {
    try {
      await this.hass.callService(DOMAIN, service, data);
      return { success: true };
    } catch (error) {
      console.error(`Error ${doing}:`, error);
      return toFailure(error);
    }
  }

  /**
   * Adds a new item to the inventory
   * @param inventoryId - The ID of the inventory
   * @param itemData - Data for the item to add
   * @returns Promise resolving to a service result
   */
  async addItem(inventoryId: string, itemData: ItemData): Promise<ServiceResult> {
    const sanitizedItemData = FormUtils.sanitizeItemData(itemData);
    const sanitizedInventoryId = FormUtils.sanitizeString(inventoryId, 100);
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

    const serviceData = itemPayload(sanitizedItemData, 'add', {
      [PARAMS.INVENTORY_ID]: sanitizedInventoryId,
    });
    return this.call(SERVICES.ADD_ITEM, serviceData, 'adding item');
  }

  /**
   * Removes an item from the inventory
   * @param inventoryId - The ID of the inventory
   * @param itemName - Name of the item to remove
   * @returns Promise resolving to a service result
   */
  async removeItem(inventoryId: string, itemName: string): Promise<ServiceResult> {
    return this.call(
      SERVICES.REMOVE_ITEM,
      { [PARAMS.INVENTORY_ID]: inventoryId, [PARAMS.NAME]: itemName },
      'removing item',
    );
  }

  /**
   * Increments the quantity of an item
   * @param inventoryId - The ID of the inventory
   * @param itemName - Name of the item to increment
   * @param amount - Amount to increment by (default: 1)
   * @param restock - Batch attributes of the new stock (batches feature); unset ones use backend defaults
   * @returns Promise resolving to a service result
   */
  async incrementItem(
    inventoryId: string,
    itemName: string,
    amount = 1,
    restock: RestockOptions = {},
  ): Promise<ServiceResult> {
    return this.call(
      SERVICES.INCREMENT_ITEM,
      {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.AMOUNT]: amount,
        ...restockParams(restock),
      },
      'incrementing item',
    );
  }

  /**
   * Decrements the quantity of an item
   * @param inventoryId - The ID of the inventory
   * @param itemName - Name of the item to decrement
   * @param amount - Amount to decrement by (default: 1)
   * @param target - Batch or location to take from (batches feature); empty = soonest expiry first
   * @returns Promise resolving to a service result
   */
  async decrementItem(
    inventoryId: string,
    itemName: string,
    amount = 1,
    target: BatchTarget = {},
  ): Promise<ServiceResult> {
    const data: Record<string, unknown> = {
      [PARAMS.INVENTORY_ID]: inventoryId,
      [PARAMS.NAME]: itemName,
      [PARAMS.AMOUNT]: amount,
    };
    if (target.location) {
      data[PARAMS.LOCATION] = target.location;
    }
    if (target.batchId) {
      data[PARAMS.BATCH_ID] = target.batchId;
    }
    return this.call(SERVICES.DECREMENT_ITEM, data, 'decrementing item');
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
    const sanitizedItemData = FormUtils.sanitizeItemData(itemData);
    const sanitizedInventoryId = FormUtils.sanitizeString(inventoryId, 100);

    if (!sanitizedInventoryId) {
      return {
        success: false,
        error: 'Invalid inventory ID',
      };
    }

    const parameters = itemPayload(sanitizedItemData, 'update', {
      [PARAMS.INVENTORY_ID]: sanitizedInventoryId,
      [PARAMS.OLD_NAME]: oldName,
    });
    return this.call(SERVICES.UPDATE_ITEM, parameters, 'updating item');
  }

  async scanBarcode(
    inventoryId: string,
    barcode: string,
    action: 'increment' | 'decrement',
    amount = 1,
    restock: RestockOptions = {},
  ): Promise<ServiceResult> {
    return this.call(
      SERVICES.SCAN_BARCODE,
      {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.BARCODE]: barcode,
        action,
        [PARAMS.AMOUNT]: amount,
        ...restockParams(restock),
      },
      'scanning barcode',
    );
  }

  /** Change one batch (batches feature). `quantity: 0` deletes it; `''` clears expiry/location. */
  async updateBatch(
    inventoryId: string,
    batchId: string,
    update: BatchUpdate,
  ): Promise<ServiceResult> {
    const data: Record<string, unknown> = {
      [PARAMS.INVENTORY_ID]: inventoryId,
      [PARAMS.BATCH_ID]: batchId,
    };
    if (update.quantity !== undefined) {
      data[PARAMS.QUANTITY] = update.quantity;
    }
    if (update.expiryDate !== undefined) {
      data[PARAMS.EXPIRY_DATE] = update.expiryDate;
    }
    if (update.location !== undefined) {
      data[PARAMS.LOCATION] = update.location;
    }
    if (update.unitPrice !== undefined) {
      data[PARAMS.UNIT_PRICE] = update.unitPrice;
    }
    // The service schema rejects a blank purchase date; it can only be changed, not cleared.
    if (update.purchasedAt) {
      data[PARAMS.PURCHASED_AT] = update.purchasedAt;
    }
    return this.call(SERVICES.UPDATE_BATCH, data, 'updating batch');
  }

  /** Delete one batch (batches feature). */
  async removeBatch(inventoryId: string, batchId: string): Promise<ServiceResult> {
    return this.call(
      SERVICES.REMOVE_BATCH,
      { [PARAMS.INVENTORY_ID]: inventoryId, [PARAMS.BATCH_ID]: batchId },
      'removing batch',
    );
  }

  /** Move part or all of one batch to another location (transfers feature). */
  async transferItem(
    inventoryId: string,
    itemName: string,
    move: BatchMove,
  ): Promise<ServiceResult> {
    return this.call(
      SERVICES.TRANSFER_ITEM,
      {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.BATCH_ID]: move.batchId,
        [PARAMS.AMOUNT]: move.amount,
        [PARAMS.TO_LOCATION]: move.toLocation,
      },
      'moving stock',
    );
  }

  /** An item image (`itemImagePath`) as a blob; rejects on a non-2xx answer. */
  async fetchImage(path: string): Promise<Blob> {
    const response = await this.hass.fetchWithAuth(path);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.blob();
  }

  /** Store `file` as the item's image (`item_images`); the integration resizes and re-encodes it. */
  async uploadItemImage(itemId: string, file: Blob): Promise<ImageResult> {
    const body = new FormData();
    body.append('file', file);
    try {
      const response = await this.hass.fetchWithAuth(
        `${IMAGE_API_PATH}/${encodeURIComponent(itemId)}`,
        { method: 'POST', body },
      );
      return await imageResult(response);
    } catch (error) {
      console.error('Error uploading item image:', error);
      return toFailure(error);
    }
  }

  /** Remove the item's image (`item_images`); succeeds when there was none. */
  async deleteItemImage(itemId: string): Promise<ImageResult> {
    try {
      const response = await this.hass.fetchWithAuth(
        `${IMAGE_API_PATH}/${encodeURIComponent(itemId)}`,
        { method: 'DELETE' },
      );
      return await imageResult(response);
    } catch (error) {
      console.error('Error removing item image:', error);
      return toFailure(error);
    }
  }

  /**
   * Use the barcode lookup's product photo as the item's image (`item_images`). `barcode` must
   * be one of the item's barcodes; without it the integration uses the item's first barcode.
   */
  async setItemImageFromBarcode(
    inventoryId: string,
    itemName: string,
    barcode?: string,
  ): Promise<ServiceResult> {
    const data: Record<string, unknown> = {
      [PARAMS.INVENTORY_ID]: inventoryId,
      [PARAMS.NAME]: itemName,
    };
    if (barcode) {
      data[PARAMS.LOOKUP_BARCODE] = barcode;
    }
    return this.call(SERVICES.SET_ITEM_IMAGE_FROM_BARCODE, data, 'setting item image from barcode');
  }

  /** Copy an image from HA's media (a local `media-source://` id) to the item (`item_images`). */
  async setItemImageFromMedia(
    inventoryId: string,
    itemName: string,
    mediaContentId: string,
  ): Promise<ServiceResult> {
    return this.call(
      SERVICES.SET_ITEM_IMAGE_FROM_MEDIA,
      {
        [PARAMS.INVENTORY_ID]: inventoryId,
        [PARAMS.NAME]: itemName,
        [PARAMS.MEDIA_CONTENT_ID]: mediaContentId,
      },
      'setting item image from media',
    );
  }

  /** Backend version handshake; rethrows so callers can recognise `unknown_command`. */
  async getInfo(): Promise<BackendInfo> {
    return this.hass.callWS<BackendInfo>({ type: WS_COMMANDS.GET_INFO });
  }

  async lookupBarcodeProduct(barcode: string): Promise<BarcodeProductLookupResult> {
    try {
      return await this.hass.callWS<BarcodeProductLookupResult>({
        type: WS_COMMANDS.LOOKUP_BARCODE_PRODUCT,
        barcode,
      });
    } catch {
      return { barcode, results: [] };
    }
  }

  async lookupByBarcode(barcode: string): Promise<BarcodeItemLookupResult> {
    try {
      return await this.hass.callWS<BarcodeItemLookupResult>({
        type: WS_COMMANDS.LOOKUP_BY_BARCODE,
        barcode,
      });
    } catch {
      return { items: [] };
    }
  }

  async getItems(inventoryId: string): Promise<InventoryItem[]> {
    const result = await this.hass.callWS<{ items: InventoryItem[] }>({
      type: WS_COMMANDS.LIST_ITEMS,
      inventory_id: inventoryId,
    });
    return result.items;
  }

  async getItem(inventoryId: string, name: string): Promise<InventoryItem | null> {
    try {
      const result = await this.hass.callWS<{ item: InventoryItem }>({
        type: WS_COMMANDS.GET_ITEM,
        inventory_id: inventoryId,
        name,
      });
      return result.item;
    } catch {
      return null;
    }
  }

  async getHistory(inventoryId: string, options?: HistoryQueryOptions): Promise<HistoryEvent[]> {
    const msg: WSRequest = {
      type: WS_COMMANDS.GET_HISTORY,
      inventory_id: inventoryId,
    };
    if (options?.itemName) msg.item_name = options.itemName;
    if (options?.eventType) msg.event_type = options.eventType;
    if (options?.limit) msg.limit = options.limit;
    const result = await this.hass.callWS<{ events: HistoryEvent[] }>(msg);
    return result.events;
  }

  async getItemConsumptionRates(
    inventoryId: string,
    itemName: string,
    windowDays?: number | null,
  ): Promise<ItemConsumptionRates> {
    const msg: WSRequest = {
      type: WS_COMMANDS.GET_ITEM_CONSUMPTION_RATES,
      inventory_id: inventoryId,
      item_name: itemName,
    };
    if (windowDays !== null) msg.window_days = windowDays;
    return this.hass.callWS<ItemConsumptionRates>(msg);
  }

  async exportInventory(
    inventoryId: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<{ data: unknown }> {
    return this.hass.callWS<{ data: unknown }>({
      type: WS_COMMANDS.EXPORT,
      inventory_id: inventoryId,
      format,
    });
  }

  async importInventory(
    inventoryId: string,
    data: unknown,
    format: 'json' | 'csv' = 'json',
    mergeStrategy: 'skip' | 'overwrite' | 'merge_quantities' = 'skip',
  ): Promise<ImportResult> {
    return this.hass.callWS<ImportResult>({
      type: WS_COMMANDS.IMPORT,
      inventory_id: inventoryId,
      data,
      format,
      merge_strategy: mergeStrategy,
    });
  }
}
