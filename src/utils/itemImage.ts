import { InventoryItem } from '@/types/inventory';
import { IMAGE_API_PATH } from './constants';

/** Stored sizes of an item image: 128px thumbnail, 384px tile (`tile_images`), full image. */
export type ImageSize = 'thumb' | 'tile' | 'full';

const SIZE_QUERY: Record<ImageSize, string> = {
  thumb: 'thumb=1&',
  tile: 'tile=1&',
  full: '',
};

/**
 * Path of an item's image on the integration (`item_images`) at the given size, versioned by the
 * item's image stamp so a changed image never hits a stale cache.
 * `null` when the item has no image (or no id to address it by).
 */
export function itemImagePath(
  item: Pick<InventoryItem, 'id' | 'image'>,
  size: ImageSize,
): string | null {
  if (!item.id || !item.image) {
    return null;
  }
  const base = `${IMAGE_API_PATH}/${encodeURIComponent(item.id)}`;
  return `${base}?${SIZE_QUERY[size]}v=${encodeURIComponent(item.image)}`;
}
