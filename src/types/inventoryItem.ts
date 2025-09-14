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
  location: string;
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
  location?: string;
}

export interface RawFormData {
  name: string;
  quantity: string;
  autoAddEnabled: boolean;
  autoAddToListQuantity: string;
  todoList: string;
  expiryDate: string;
  expiryAlertDays: string;
  category: string;
  unit: string;
  location: string;
}
