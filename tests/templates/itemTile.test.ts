import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createItemTileTemplate } from '../../src/templates/itemTile';
import { createItemRowTemplate } from '../../src/templates/itemRow';
import { InventoryConfig, InventoryItem } from '../../src/types/inventory';
import { RowOptions } from '../../src/types/rowOptions';
import { ImageLoader } from '../../src/services/imageLoader';
import { ACTIONS } from '../../src/utils/constants';
import { STATUS_TONE, itemStatus } from '../../src/utils/itemStatus';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

const CONFIG: InventoryConfig = { type: 'custom:simple-inventory-card', entity: 'sensor.test' };
const PATH = '/api/simple_inventory/image/item-1';

function tileOf(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  const tile = container.querySelector('.si-tile');
  if (!(tile instanceof HTMLElement)) {
    throw new Error('missing .si-tile');
  }
  return tile;
}

/** `data-action` / `data-name` of every stepper button, in order. */
function stepperActions(element: Element): Array<[string | null, string | null]> {
  return Array.from(element.querySelectorAll('.si-stepper button'), (button) => [
    button.getAttribute('data-action'),
    button.getAttribute('data-name'),
  ]);
}

describe('createItemTileTemplate', () => {
  let item: InventoryItem;
  let images: ImageLoader;
  const options = (extra: Partial<RowOptions> = {}): RowOptions => ({
    batches: false,
    expanded: new Set<string>(),
    transfers: false,
    ...extra,
  });
  const tile = (
    tileItem: InventoryItem = item,
    config: InventoryConfig = CONFIG,
    rowOptions: RowOptions = options(),
  ): HTMLElement => tileOf(createItemTileTemplate(tileItem, [], {}, config, rowOptions));

  beforeEach(() => {
    vi.useFakeTimers();
    // Local noon keeps the calendar date stable in every time zone.
    vi.setSystemTime(new Date(2026, 9, 25, 12, 0, 0));
    images = new ImageLoader(vi.fn<(path: string) => Promise<Blob>>());
    item = {
      auto_add_enabled: false,
      auto_add_id_to_description_enabled: false,
      auto_add_to_list_quantity: 0,
      category: 'Dairy',
      description: '',
      expiry_alert_days: 7,
      expiry_date: '',
      id: 'item-1',
      image: 's1',
      location: 'Fridge',
      name: 'Milk',
      price: 2,
      quantity: 3,
      todo_list: '',
      unit: 'l',
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('media', () => {
    it('shows the tile-size photo with tile_images', () => {
      const img = tile(item, CONFIG, options({ images, tileImages: true })).querySelector(
        '.si-tile__media img',
      );

      expect(img?.getAttribute('data-image-path')).toBe(`${PATH}?tile=1&v=s1`);
      expect(img?.getAttribute('alt')).toBe('');
      expect(img?.hasAttribute('src')).toBe(false);
    });

    it('sets the src at once when the tile image is already loaded', () => {
      vi.spyOn(images, 'cached').mockImplementation((path) =>
        path === `${PATH}?tile=1&v=s1` ? 'blob:tile' : undefined,
      );

      const img = tile(item, CONFIG, options({ images, tileImages: true })).querySelector('img');

      expect(img?.getAttribute('src')).toBe('blob:tile');
    });

    it('falls back to the full image with item_images only', () => {
      const img = tile(item, CONFIG, options({ images })).querySelector('.si-tile__media img');

      expect(img?.getAttribute('data-image-path')).toBe(`${PATH}?v=s1`);
    });

    it('shows the status-tinted item icon without a photo', () => {
      const expired = { ...item, image: '', icon: 'mdi:cup', expiry_date: '2026-10-01' };
      const media = tile(expired, CONFIG, options({ images })).querySelector('.si-tile__media');

      expect(media?.querySelector('img')).toBeNull();
      expect(media?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:cup');
      expect(media?.querySelector('.si-tile__icon')?.classList).toContain(
        `si-tone-${STATUS_TONE[itemStatus(expired)]}`,
      );
    });

    it('shows the icon, not the photo, with show_icon: false', () => {
      const media = tile(
        item,
        { ...CONFIG, show_icon: false },
        options({ images, tileImages: true }),
      ).querySelector('.si-tile__media');

      expect(media?.querySelector('img')).toBeNull();
      expect(media?.querySelector('ha-icon')).not.toBeNull();
    });

    it('shows the icon without the item_images feature', () => {
      const media = tile().querySelector('.si-tile__media');

      expect(media?.querySelector('img')).toBeNull();
      expect(media?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:package-variant');
    });
  });

  describe('status badge', () => {
    const badge = (tileItem: InventoryItem): string | null =>
      tile(tileItem).querySelector('.si-tile__badge')?.textContent ?? null;

    it('labels an expired item', () => {
      expect(badge({ ...item, expiry_date: '2026-10-01' })).toBe('Expired');
    });

    it('labels an item expiring soon', () => {
      expect(badge({ ...item, expiry_date: '2026-10-28' })).toBe('Expiring soon');
    });

    it('labels a low item (at its auto-add threshold)', () => {
      expect(badge({ ...item, auto_add_enabled: true, auto_add_to_list_quantity: 3 })).toBe(
        'Low stock',
      );
    });

    it('shows no badge for a normal or an out-of-stock item', () => {
      expect(badge(item)).toBeNull();
      expect(badge({ ...item, quantity: 0 })).toBeNull();
    });

    it('dims an out-of-stock tile like a row', () => {
      expect(tile({ ...item, quantity: 0 }).classList).toContain('zero-quantity');
      expect(tile().classList).not.toContain('zero-quantity');
    });
  });

  it('opens the item from the media and the name, by name and id', () => {
    const open = tile().querySelector('.si-tile__open');

    expect(open?.getAttribute('data-action')).toBe(ACTIONS.OPEN_ITEM);
    expect(open?.getAttribute('data-name')).toBe('Milk');
    expect(open?.getAttribute('data-item-id')).toBe(item.id);
    expect(open?.getAttribute('role')).toBe('button');
    expect(open?.getAttribute('tabindex')).toBe('0');
    expect(open?.querySelector('.si-tile__media')).not.toBeNull();
    expect(open?.querySelector('.si-tile__name')?.textContent).toBe('Milk');
  });

  it('has the row stepper with the same actions and item name', () => {
    const row = document.createElement('div');
    row.innerHTML = createItemRowTemplate(item, [], {}, CONFIG, options());

    expect(stepperActions(tile())).toEqual(stepperActions(row));
    expect(stepperActions(tile())).toEqual([
      ['decrement', 'Milk'],
      ['increment', 'Milk'],
    ]);
    expect(tile().querySelector('.si-stepper__value')?.textContent).toBe('3 l');
  });

  describe('secondary line', () => {
    it('shows the same parts as the row', () => {
      const element = tile({ ...item, expiry_date: '2026-11-20' });

      expect(element.querySelector('.si-secondary .location')?.textContent).toBe('Fridge');
      expect(element.querySelector('.si-secondary .category')?.textContent).toBe('Dairy');
      expect(element.querySelector('.si-secondary .expiry')).not.toBeNull();
      expect(element.querySelector('.si-secondary .item-price')?.textContent).toBe('6.00');
    });

    it('honours show_location and show_price', () => {
      const element = tile(item, { ...CONFIG, show_location: false, show_price: false });

      expect(element.querySelector('.si-secondary .location')).toBeNull();
      expect(element.querySelector('.si-secondary .item-price')).toBeNull();
      expect(element.querySelector('.si-secondary .category')?.textContent).toBe('Dairy');
    });
  });

  it('shows a name with markup as text', () => {
    const element = tile({ ...item, name: '<b>Milk</b>' });

    expect(element.querySelector('.si-tile__name')?.textContent).toBe('<b>Milk</b>');
    expect(element.querySelector('.si-tile__name b')).toBeNull();
    expect(element.querySelector('.si-tile__open')?.getAttribute('data-name')).toBe('<b>Milk</b>');
  });
});
