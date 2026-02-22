export interface ItemConsumptionRates {
  item_name: string;
  current_quantity: number;
  unit: string;
  decrement_count: number;
  total_consumed: number;
  window_days: number | null;
  daily_rate: number | null;
  weekly_rate: number | null;
  days_until_depletion: number | null;
  avg_restock_days: number | null;
  has_sufficient_data: boolean;
  daily_spend_rate: number | null;
  weekly_spend_rate: number | null;
  total_spend: number | null;
}
