export interface SanitizedItemData {
  autoAddEnabled: boolean;
  autoAddIdToDescriptionEnabled: boolean;
  autoAddToListQuantity: number;
  category: string;
  description: string;
  expiryAlertDays: number;
  expiryDate: string;
  location: string;
  name: string;
  quantity: number;
  todoList: string;
  unit: string;
}

export interface ItemData {
  autoAddEnabled?: boolean;
  autoAddIdToDescriptionEnabled?: boolean;
  autoAddToListQuantity?: number;
  category?: string;
  description?: string;
  expiryAlertDays?: number;
  expiryDate?: string;
  location?: string;
  name: string;
  quantity?: number;
  todoList?: string;
  unit?: string;
}

export interface RawFormData {
  autoAddEnabled: boolean;
  autoAddIdToDescriptionEnabled: boolean;
  autoAddToListQuantity: string;
  category: string;
  description: string;
  expiryAlertDays: string;
  expiryDate: string;
  location: string;
  name: string;
  quantity: string;
  todoList: string;
  unit: string;
}
