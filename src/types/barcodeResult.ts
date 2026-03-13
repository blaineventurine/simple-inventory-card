export interface BarcodeProduct {
  provider: string;
  found: boolean;
  product?: Record<string, string>;
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
