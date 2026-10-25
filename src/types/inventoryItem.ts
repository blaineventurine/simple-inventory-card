/** A parsed item form (`FormUtils.convertRawFormDataToItemData`), as the services send it. */
export interface ItemData {
  aliases: string;
  autoAddEnabled: boolean;
  autoAddIdToDescriptionEnabled: boolean;
  autoAddToListQuantity: number;
  barcode: string;
  category: string;
  description: string;
  desiredQuantity: number;
  expiryAlertDays: number;
  expiryDate: string;
  /** Only present when the form rendered the icon field (`item_icons` feature); '' = default icon. */
  icon?: string;
  location: string;
  name: string;
  price: number;
  quantity: number;
  todoList: string;
  todoQuantityPlacement: string;
  unit: string;
}

/** The item form as read from the DOM: trimmed strings, checkbox states. */
export interface RawFormData {
  aliases: string;
  autoAddEnabled: boolean;
  autoAddIdToDescriptionEnabled: boolean;
  autoAddToListQuantity: string;
  barcode: string;
  category: string;
  description: string;
  desiredQuantity: string;
  expiryAlertDays: string;
  expiryDate: string;
  /** Only present when the form rendered the icon field (`item_icons` feature); '' = default icon. */
  icon?: string;
  location: string;
  name: string;
  price: string;
  quantity: string;
  todoList: string;
  todoQuantityPlacement: string;
  unit: string;
}
