import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createItemsList } from '../../src/templates/itemList';
import { createItemRowTemplate } from '../../src/templates/itemRow';
import { InventoryItem } from '../../src/types/inventory';
import { RowOptions } from '../../src/types/rowOptions';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

/** The list layout with the real row template (itemList.test.ts mocks it). */
describe('createItemsList, list layout', () => {
  const list: RowOptions = {
    batches: true,
    expanded: new Set(['Milk']),
    transfers: false,
    layout: 'list',
  };
  const item = (name: string, category: string, location: string): InventoryItem => ({
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    category,
    description: `${name} description`,
    expiry_date: '2026-10-30',
    location,
    name,
    quantity: 2,
    todo_list: '',
    unit: 'pcs',
  });
  let items: InventoryItem[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 12, 0, 0));
    items = [item('Bread', 'Bakery', 'Pantry'), item('Milk', 'Dairy', 'Fridge')];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is the joined row templates, with no tile grid', () => {
    const html = createItemsList(items, 'name', [], {}, undefined, list);

    expect(html).toBe(
      items.map((entry) => createItemRowTemplate(entry, [], {}, undefined, list)).join(''),
    );
    const container = document.createElement('div');
    container.innerHTML = html;
    expect(container.querySelector('.si-tiles, .si-tile')).toBeNull();
    expect(Array.from(container.children, (child) => child.className)).toEqual([
      'item-row si-row',
      'item-row si-row',
    ]);
  });

  it('puts the rows straight under each group heading', () => {
    const container = document.createElement('div');
    container.innerHTML = createItemsList(items, 'category', [], {}, undefined, list);

    const groups = Array.from(container.querySelectorAll('.category-group'), (group) =>
      Array.from(group.children, (child) => child.classList[0]),
    );
    expect(groups).toEqual([
      ['category-header', 'item-row'],
      ['category-header', 'item-row'],
    ]);
    expect(container.querySelector('.si-tiles, .si-tile')).toBeNull();
  });
});
