export interface SanitizedItemData {
  autoAddEnabled: boolean;
  autoAddIdToDescriptionEnabled: boolean;
  autoAddToListQuantity: number;
  barcode: string;
  category: string;
  description: string;
  desiredQuantity: number;
  expiryAlertDays: number;
  expiryDate: string;
  location: string;
  name: string;
  price: number;
  quantity: number;
  todoList: string;
  todoQuantityPlacement: string;
  unit: string;
}

export interface ItemData {
  autoAddEnabled?: boolean;
  autoAddIdToDescriptionEnabled?: boolean;
  autoAddToListQuantity?: number;
  barcode?: string;
  category?: string;
  description?: string;
  desiredQuantity?: number;
  expiryAlertDays?: number;
  expiryDate?: string;
  location?: string;
  locationQuantities?: string[];
  name: string;
  price?: number;
  quantity?: number;
  todoList?: string;
  todoQuantityPlacement?: string;
  unit?: string;
}

export interface RawFormData {
  autoAddEnabled: boolean;
  autoAddIdToDescriptionEnabled: boolean;
  autoAddToListQuantity: string;
  barcode: string;
  category: string;
  description: string;
  desiredQuantity: string;
  expiryAlertDays: string;
  expiryDate: string;
  location: string;
  name: string;
  price: string;
  quantity: string;
  todoList: string;
  todoQuantityPlacement: string;
  unit: string;
}
