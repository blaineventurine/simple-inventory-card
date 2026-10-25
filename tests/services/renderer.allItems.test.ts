import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Renderer } from '../../src/services/renderer';
import { ELEMENTS } from '../../src/utils/constants';
import { InventoryItem } from '../../src/types/inventory';
import { FilterState } from '../../src/types/filterState';
import { createMockHassEntity } from '../testHelpers';

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

describe('Renderer with an active filter (real templates)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the header counts and the filter options of the whole inventory', () => {
    const milk = item({
      name: 'Milk',
      categories: ['Dairy'],
      locations: ['Fridge'],
      expiry_date: '2026-10-28',
      expiry_alert_days: 7,
    });
    const yoghurt = item({
      name: 'Old yoghurt',
      categories: ['Snacks'],
      locations: ['Cellar'],
      expiry_date: '2026-10-01',
    });
    const filters: FilterState = {
      category: ['Dairy'],
      expiry: [],
      location: [],
      quantity: [],
      searchText: '',
      showAdvanced: true,
    };
    const root = document.createElement('div');
    const renderer = new Renderer(root as unknown as ShadowRoot); // a <div> stands in for the shadow root

    renderer.renderCard(
      createMockHassEntity('sensor.pantry', { attributes: { friendly_name: 'Pantry' } }),
      'sensor.pantry',
      [milk],
      [milk, yoghurt],
      filters,
      'name',
      [],
      {},
    );

    expect(root.querySelectorAll('.items-container .item-row')).toHaveLength(1);
    expect(root.querySelector(`#${ELEMENTS.HEADER_EXPIRED_BADGE}`)?.textContent?.trim()).toBe('1');
    expect(root.querySelector(`#${ELEMENTS.HEADER_EXPIRING_BADGE}`)?.textContent?.trim()).toBe('1');
    const options = Array.from(
      root.querySelectorAll<HTMLInputElement>('.multi-select-dropdown input[type="checkbox"]'),
    ).map((checkbox) => `${checkbox.closest('.multi-select-dropdown')?.id}:${checkbox.value}`);
    expect(options).toEqual(
      expect.arrayContaining([
        `${ELEMENTS.FILTER_CATEGORY}-dropdown:Dairy`,
        `${ELEMENTS.FILTER_CATEGORY}-dropdown:Snacks`,
        `${ELEMENTS.FILTER_LOCATION}-dropdown:Cellar`,
        `${ELEMENTS.FILTER_LOCATION}-dropdown:Fridge`,
      ]),
    );
  });

  it('orders the filter options case-insensitively, like the item sheet pickers', () => {
    const stock = [
      item({ name: 'A', categories: ['baking'], locations: ['cellar'] }),
      item({ name: 'B', categories: ['Dairy'], locations: ['Fridge'] }),
    ];
    const root = document.createElement('div');
    const renderer = new Renderer(root as unknown as ShadowRoot); // a <div> stands in for the shadow root

    renderer.renderCard(
      createMockHassEntity('sensor.pantry', { attributes: { friendly_name: 'Pantry' } }),
      'sensor.pantry',
      stock,
      stock,
      {
        category: [],
        expiry: [],
        location: [],
        quantity: [],
        searchText: '',
        showAdvanced: true,
      },
      'name',
      [],
      {},
    );

    const optionsOf = (id: string): string[] =>
      Array.from(
        root.querySelectorAll<HTMLInputElement>(`#${id}-dropdown input[type="checkbox"]`),
      ).map((checkbox) => checkbox.value);
    expect(optionsOf(ELEMENTS.FILTER_LOCATION)).toEqual(['cellar', 'Fridge']);
    expect(optionsOf(ELEMENTS.FILTER_CATEGORY)).toEqual(['baking', 'Dairy']);
  });
});
