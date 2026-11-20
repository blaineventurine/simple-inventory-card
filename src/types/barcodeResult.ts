export interface BarcodeProduct {
  provider: string;
  found: boolean;
  product?: Record<string, string>;
}

/** A lookup result that found the product. */
export interface FoundBarcodeProduct extends BarcodeProduct {
  product: Record<string, string>;
}

export interface BarcodeProductLookupResult {
  barcode: string;
  results: BarcodeProduct[];
}

export interface BarcodeItemResult {
  name: string;
  inventory_id: string;
  [key: string]: unknown;
}

export interface BarcodeItemLookupResult {
  items: BarcodeItemResult[];
}
