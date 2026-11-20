import { describe, it, expect } from 'vitest';
import { itemOptions } from '../../src/utils/itemOptions';
import { InventoryItem } from '../../src/types/inventory';

function item(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    name: '',
    quantity: 1,
    unit: '',
    description: '',
    category: '',
    location: '',
    expiry_date: '',
    todo_list: '',
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    ...overrides,
  };
}

describe('itemOptions', () => {
  it('sorts locations and categories case-insensitively', () => {
    const options = itemOptions([
      item({ locations: ['pantry', 'Fridge'], categories: ['snacks', 'Dairy'] }),
      item({ locations: ['attic'], categories: ['baking'] }),
    ]);

    expect(options.locations).toEqual(['attic', 'Fridge', 'pantry']);
    expect(options.categories).toEqual(['baking', 'Dairy', 'snacks']);
  });

  it('trims, drops blanks and de-duplicates', () => {
    const options = itemOptions([
      item({ locations: [' Fridge ', '', '  '], categories: ['Dairy ', ''] }),
      item({ locations: ['Fridge'], categories: ['Dairy'] }),
    ]);

    expect(options.locations).toEqual(['Fridge']);
    expect(options.categories).toEqual(['Dairy']);
  });

  it('falls back to the scalar fields when the arrays are missing or empty', () => {
    const options = itemOptions([
      item({ location: 'Cellar', category: 'Drinks' }),
      item({ locations: [], location: 'Garage', categories: [], category: 'Tools' }),
    ]);

    expect(options.locations).toEqual(['Cellar', 'Garage']);
    expect(options.categories).toEqual(['Drinks', 'Tools']);
  });

  it('includes locations that only hold batches', () => {
    const options = itemOptions([item({ locations: ['Fridge'], stocked_locations: ['Freezer'] })]);

    expect(options.locations).toEqual(['Freezer', 'Fridge']);
  });

  it('returns empty lists for no items', () => {
    expect(itemOptions([])).toEqual({ locations: [], categories: [] });
  });
});
