import { ItemData } from '@/types/inventoryItem';
import { ServiceResult } from '@/types/serviceResult';

export interface InventoryServices {
  addItem(inventoryId: string, itemData: ItemData): Promise<ServiceResult>;
  updateItem(inventoryId: string, oldName: string, itemData: ItemData): Promise<ServiceResult>;
}
