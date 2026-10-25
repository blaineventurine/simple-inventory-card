export interface ServiceResult {
  success: boolean;
  error?: string;
  /** Backend `translation_key` (e.g. `barcode_not_found`) when the integration supplied one. */
  errorCode?: string;
}

/** Outcome of an image upload/delete; `image` is the item's new version stamp ('' = none). */
export interface ImageResult extends ServiceResult {
  image?: string;
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}
