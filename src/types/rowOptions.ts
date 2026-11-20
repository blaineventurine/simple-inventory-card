import { ImageLoader } from '@/services/imageLoader';
import { Layout } from '@/types/inventory';

/**
 * How item rows render, beyond the item and the card config: what the integration supports
 * (from the card's `Capabilities`) plus the card's UI state. Built once per render by the
 * `RenderingCoordinator` and handed down unchanged through the list to every row.
 */
export interface RowOptions {
  /** The integration supports batches: details panels list them. */
  batches: boolean;
  /** Names of items whose details panel (image, description, auto-add, batches) is open. */
  expanded: ReadonlySet<string>;
  /** The integration supports transfers: batch rows offer Move…. */
  transfers: boolean;
  /**
   * The integration supports `item_images`: rows show item photos, and the already-loaded ones
   * come from here so re-renders do not flash. Absent without the feature.
   */
  images?: ImageLoader;
  /**
   * Set with `images`: the integration stores a tile size (`tile_images`), so tiles load
   * `?tile=1`; without it they load the full image.
   */
  tileImages?: boolean;
  /** Rows or tiles (see `getLayout`); absent = rows. */
  layout?: Layout;
  /** Formats a price in HA's currency (built once per render; see `valueFormatter`). */
  formatValue?: (value: number) => string;
}
