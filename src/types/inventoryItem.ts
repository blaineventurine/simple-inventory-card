export interface SanitizedItemData {
  autoAddEnabled: boolean;
  autoAddToListQuantity: number;
  category: string;
  expiryAlertDays: number;
  expiryDate: string;
  name: string;
  quantity: number;
  todoList: string;
  unit: string;
}

export interface ItemData {
  autoAddEnabled?: boolean;
  autoAddToListQuantity?: number;
  category?: string;
  expiryAlertDays?: number;
  expiryDate?: string;
  name: string;
  quantity?: number;
  todoList?: string;
  unit?: string;
}
