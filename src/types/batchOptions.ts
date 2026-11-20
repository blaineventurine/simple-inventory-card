/** Optional batch attributes of an increment (D4); unset ones take the integration's defaults. */
export interface RestockOptions {
  expiryDate?: string;
  location?: string;
  purchasedAt?: string;
  /** Unit price of the added units; also becomes the item's last known price. */
  price?: number;
}

/** Narrows which stock a decrement takes (D3); empty = soonest expiry first. */
export interface BatchTarget {
  location?: string;
  batchId?: string;
}

/** Fields to change on one batch through `update_batch`; omitted fields stay as they are. */
export interface BatchUpdate {
  quantity?: number;
  expiryDate?: string;
  location?: string;
  unitPrice?: number;
  purchasedAt?: string;
}

/** Part or all of one batch sent to another location through `transfer_item`. */
export interface BatchMove {
  batchId: string;
  amount: number;
  toLocation: string;
}
