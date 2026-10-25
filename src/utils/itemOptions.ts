import { InventoryItem } from '@/types/inventory';

export interface ItemOptions {
  locations: string[];
  categories: string[];
}

function addTrimmed(target: Set<string>, values: readonly (string | undefined)[]): void {
  values.forEach((value) => {
    const trimmed = value?.trim();
    if (trimmed) target.add(trimmed);
  });
}

/**
 * The location and category choices offered by the filter dropdowns and the item sheet pickers:
 * every distinct trimmed value in the inventory (the array field when it has entries, otherwise
 * the legacy scalar; locations include those holding only batches), sorted case-insensitively.
 */
export function itemOptions(items: readonly InventoryItem[]): ItemOptions {
  const locations = new Set<string>();
  const categories = new Set<string>();
  items.forEach((item) => {
    addTrimmed(locations, item.locations?.length ? item.locations : [item.location]);
    addTrimmed(locations, item.stocked_locations ?? []);
    addTrimmed(categories, item.categories?.length ? item.categories : [item.category]);
  });
  const byName = (a: string, b: string): number =>
    a.localeCompare(b, undefined, { sensitivity: 'base' });
  return { locations: [...locations].sort(byName), categories: [...categories].sort(byName) };
}
