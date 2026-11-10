import { ItemData } from '@/types/inventoryItem';
import { ServiceResult } from '@/types/serviceResult';
import { BatchUpdate, RestockOptions } from '@/types/batchOptions';

export interface InventoryServices {
  addItem(inventoryId: string, itemData: ItemData): Promise<ServiceResult>;
  updateItem(inventoryId: string, oldName: string, itemData: ItemData): Promise<ServiceResult>;
  incrementItem(
    inventoryId: string,
    itemName: string,
    amount?: number,
    restock?: RestockOptions,
  ): Promise<ServiceResult>;
  updateBatch(inventoryId: string, batchId: string, update: BatchUpdate): Promise<ServiceResult>;
  removeBatch(inventoryId: string, batchId: string): Promise<ServiceResult>;
}
