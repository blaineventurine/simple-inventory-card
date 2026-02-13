export interface HistoryEvent {
  id: string;
  item_id: string;
  inventory_id: string;
  event_type: string;
  amount: number;
  quantity_before: number;
  quantity_after: number;
  source: string;
  location_from: string;
  location_to: string;
  timestamp: string;
  metadata: string;
}
