export interface ServiceResult {
  success: boolean;
  error?: string;
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}
