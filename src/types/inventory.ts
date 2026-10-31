import { LovelaceCardConfig } from './homeAssistant';

/** One stock lot of an item (integration 0.8.0+, `batches` feature). */
export interface InventoryBatch {
  id: string;
  quantity: number;
  /** YYYY-MM-DD, or '' when the batch does not expire. */
  expiry_date: string;
  /** Where the batch is stored; '' when unknown. */
  location: string;
  /** 0 = unknown. */
  unit_price: number;
  /** YYYY-MM-DD. */
  purchased_at: string;
}

export interface InventoryItem {
  aliases?: string[];
  auto_add_enabled: boolean;
  auto_add_id_to_description_enabled: boolean;
  auto_add_to_list_quantity?: number;
  barcodes?: string[];
  /** Stock lots in consumption order (soonest expiry first); only from batch-aware integrations. */
  batches?: InventoryBatch[];
  categories?: string[];
  category: string;
  description: string;
  desired_quantity?: number;
  expiry_alert_days?: number;
  /** Earliest batch expiry when the integration tracks batches. */
  expiry_date: string;
  /** mdi icon (`prefix:name`); '' or absent → default icon. Sent by `item_icons` integrations. */
  icon?: string;
  /** Item UUID; addresses the item's image endpoint. */
  id?: string;
  /** Image version stamp; '' or absent → no image. Sent by `item_images` integrations. */
  image?: string;
  location: string;
  locations?: string[];
  name: string;
  price?: number;
  quantity: number;
  /** Distinct batch locations, in batch order. */
  stocked_locations?: string[];
  todo_list: string;
  todo_quantity_placement?: string;
  unit: string;
}

/** How the item list renders: rows, or a grid of photo tiles. */
export type Layout = 'list' | 'tiles';

export interface InventoryConfig extends LovelaceCardConfig {
  type: string;
  entity: string;
  show_header?: boolean;
  show_search?: boolean;
  show_sort?: boolean;
  show_add_button?: boolean;
  show_description?: boolean;
  show_location?: boolean;
  show_category?: boolean;
  show_expiry?: boolean;
  show_auto_add_info?: boolean;
  show_price?: boolean;
  /** Show the status-tinted item icon on each row (default on); off moves status to a left bar. */
  show_icon?: boolean;
  /** Default layout (default `list`); a layout picked with the toolbar toggle is saved and wins. */
  layout?: Layout;
}
