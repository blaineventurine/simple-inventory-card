// Response from the external bus when requesting configuration settings
export interface ConfigGetResult {
  hasSettingsScreen?: boolean;
  hasSidebar?: boolean;
  canWriteTag?: boolean;
  hasExoPlayer?: boolean;
  canCommissionMatter?: boolean;
  canImportThreadCredentials?: boolean;
  canTransferThreadCredentialsToKeychain?: boolean;
  hasAssist?: boolean;
  hasBarCodeScanner?: number;
  canSetupImprov?: boolean;
  appVersion?: string;
  hasEntityAddTo?: boolean;
  hasAssistSettings?: boolean;
}

// Response from the external bus to an initiated barcode scan request
export interface BarcodeScanResult {
  rawValue: string;
  format: string;
}

// Payload sent to the external bus to initiate a barcode scan request
export interface BarcodeScanPayload {
  title: string;
  description: string;
  alternative_option_label?: string;
}

// General message structure for communication with the external bus
export interface ExternalBusMessage {
  id: number;
  type: 'result' | 'command' | 'error' | 'config/get' | 'bar_code/scan' | 'bar_code/close';
  success?: boolean;
  result?: ConfigGetResult | BarcodeScanResult;
  command?: string;
  payload?: BarcodeScanPayload | Record<string, unknown>;
  error?: string;
}

// Custom interface for managing listeners and message handling for the external bus
export interface Bridge {
  listeners: Map<number, (message: ExternalBusMessage) => void>;
  typeListeners: Set<(message: ExternalBusMessage) => void>;
  original: ((message: string) => unknown) | null;
  wrapper: ((message: string) => unknown) | null;
}
