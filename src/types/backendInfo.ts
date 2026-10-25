/** Result of the integration's `simple_inventory/get_info` WebSocket command. */
export interface BackendInfo {
  version: string;
  api_version: number;
  features: string[];
}
