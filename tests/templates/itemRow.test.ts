import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createItemRowTemplate } from '../../src/templates/itemRow';
import { InventoryConfig, InventoryItem } from '../../src/types/inventory';
import { TodoList } from '../../src/types/todoList';
import { TranslationData } from '@/types/translatableComponent';
import { RowOptions } from '../../src/types/rowOptions';
import { ACTIONS } from '../../src/utils/constants';
import { ImageLoader } from '../../src/services/imageLoader';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

function render(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function rowOf(html: string): HTMLElement {
  const row = render(html).querySelector('.item-row');
  if (!(row instanceof HTMLElement)) {
    throw new Error('missing .item-row');
  }
  return row;
}

function secondaryText(row: HTMLElement): string {
  return row.querySelector('.si-secondary')?.textContent ?? '';
}

describe('createItemRowTemplate', () => {
  let baseItem: InventoryItem;
  let mockTodoLists: TodoList[];
  let mockTranslations: TranslationData;
  const defaultConfig: InventoryConfig = {
    type: 'custom:simple-inventory-card',
    entity: 'sensor.test',
  };
  const row = (
    item: InventoryItem = baseItem,
    config?: InventoryConfig,
    rowOptions?: RowOptions,
  ): HTMLElement =>
    rowOf(createItemRowTemplate(item, mockTodoLists, mockTranslations, config, rowOptions));

  beforeEach(() => {
    vi.useFakeTimers();
    // Local noon keeps the calendar date stable in every time zone.
    vi.setSystemTime(new Date(2026, 9, 25, 12, 0, 0));

    baseItem = {
      auto_add_enabled: false,
      auto_add_id_to_description_enabled: false,
      auto_add_to_list_quantity: 2,
      category: 'Fruit',
      description: 'Fresh red apples',
      expiry_alert_days: 7,
      expiry_date: '2024-12-31',
      location: '',
      name: 'Apple',
      quantity: 5,
      todo_list: 'grocery',
      unit: 'pieces',
    };

    mockTodoLists = [
      { id: 'grocery-1', name: 'Grocery List', entity_id: 'todo.grocery' },
      { id: 'shopping-2', name: 'Shopping List', entity_id: 'todo.shopping' },
      { id: 'household-3', name: 'Household Tasks' }, // No entity_id
    ];

    mockTranslations = {
      expiry: {
        expired_day_ago: 'Expired {days} day ago',
        expired_days_ago: 'Expired {days} days ago',
        expires_in_day: 'Expires in {days} day',
        expires_in_days: 'Expires in {days} days',
        expires_today: 'Expires today',
      },
      items: {
        auto_add_info: 'Auto-add at ≤{quantity} → {list}',
      },
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic HTML structure', () => {
    it('should create a basic item row with correct structure', () => {
      const element = row();

      expect(element.querySelector('.si-row__main .si-row__open .si-icon-circle')).not.toBeNull();
      expect(element.querySelector('.si-row__open .si-row__text .item-name')).not.toBeNull();
      expect(element.querySelector('.si-row__main .si-stepper')).not.toBeNull();
    });

    it('should include item name', () => {
      expect(row().querySelector('.item-name')?.textContent).toBe('Apple');
    });

    it('should include item location', () => {
      baseItem.location = 'Fridge';
      baseItem.category = '';

      expect(row().querySelector('.si-secondary .location')?.textContent).toBe('Fridge');
    });

    it('should include item category', () => {
      expect(row().querySelector('.si-secondary .category')?.textContent).toBe('Fruit');
    });

    it('should include location and category when both are present', () => {
      baseItem.location = 'Fridge';
      baseItem.expiry_date = '';

      expect(secondaryText(row())).toBe('Fridge · Fruit');
    });

    it('joins all locations and all categories, locations first', () => {
      baseItem.expiry_date = '';
      baseItem.locations = ['Pantry', 'Kitchen'];
      baseItem.categories = ['Spreads', 'Breakfast'];

      expect(secondaryText(row())).toBe('Pantry, Kitchen · Spreads, Breakfast');
    });

    it('skips blank entries when joining locations and categories', () => {
      baseItem.expiry_date = '';
      baseItem.locations = ['', 'Pantry', '  '];
      baseItem.categories = ['Spreads'];

      expect(secondaryText(row())).toBe('Pantry · Spreads');
    });

    it('should include quantity and unit', () => {
      expect(row().querySelector('.si-stepper__value')?.textContent).toBe('5 pieces');
    });

    it('formats the quantity without trailing zeros', () => {
      const value = row({ ...baseItem, quantity: 2.5 }).querySelector('.si-stepper__value');

      expect(value?.textContent).toBe('2.5 pieces');
    });

    it('should include control buttons', () => {
      const buttons = [...row().querySelectorAll<HTMLElement>('.si-stepper .control-btn')];

      expect(buttons.map((b) => b.dataset.action)).toEqual(['decrement', 'increment']);
      expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
        'Decrease Apple',
        'Increase Apple',
      ]);
    });
  });

  describe('status', () => {
    const circleClasses = (item: InventoryItem): DOMTokenList | undefined =>
      row(item).querySelector('.si-icon-circle')?.classList;

    it('should not include zero-quantity class when quantity > 0', () => {
      expect(row().classList).not.toContain('zero-quantity');
    });

    it('should include zero-quantity class when quantity is 0', () => {
      expect(row({ ...baseItem, quantity: 0 }).classList).toContain('zero-quantity');
    });

    it('tints the icon by item status', () => {
      const fresh = { ...baseItem, expiry_date: '' };

      expect(circleClasses(fresh)).toContain('si-tone-primary');
      expect(circleClasses({ ...fresh, quantity: 0 })).toContain('si-tone-disabled');
      expect(circleClasses({ ...fresh, expiry_date: '2026-10-01' })).toContain('si-tone-error');
      expect(circleClasses({ ...fresh, expiry_date: '2026-10-27' })).toContain('si-tone-warning');
      expect(row(fresh).dataset.status).toBe('normal');
    });

    it('keeps the status tint when show_expiry is off', () => {
      const expired = { ...baseItem, expiry_date: '2026-10-01' };
      const config = { ...defaultConfig, show_expiry: false };

      expect(row(expired, config).querySelector('.si-icon-circle')?.classList).toContain(
        'si-tone-error',
      );
      expect(row(expired, config).querySelector('.expiry')).toBeNull();
    });

    it('warns when auto-add is on and stock is at or below its threshold', () => {
      const low = { ...baseItem, expiry_date: '', quantity: 2, auto_add_enabled: true };

      expect(circleClasses(low)).toContain('si-tone-warning');
      expect(circleClasses({ ...low, auto_add_enabled: false })).toContain('si-tone-primary');
    });

    describe('with show_icon off', () => {
      const noIcon = { ...defaultConfig, show_icon: false };
      const fresh = (): InventoryItem => ({ ...baseItem, expiry_date: '' });

      it('renders no icon circle', () => {
        const hidden = row(fresh(), noIcon);

        expect(hidden.querySelector('.si-icon-circle')).toBeNull();
        expect(hidden.classList).toContain('si-row--no-icon');
        expect(row(fresh(), defaultConfig).classList).not.toContain('si-row--no-icon');
      });

      it('marks expired and warning rows for the status bar, but not normal or empty ones', () => {
        const statusOf = (item: InventoryItem): string | undefined =>
          row(item, noIcon).dataset.status;

        expect(statusOf({ ...fresh(), expiry_date: '2026-10-01' })).toBe('expired');
        expect(statusOf({ ...fresh(), expiry_date: '2026-10-27' })).toBe('warning');
        expect(statusOf(fresh())).toBe('normal');
        expect(statusOf({ ...fresh(), quantity: 0 })).toBe('out');
      });

      it('keeps the open-edit target, chevron and stepper', () => {
        const hidden = row(fresh(), noIcon);

        expect(hidden.querySelector(`[data-action="${ACTIONS.OPEN_EDIT_MODAL}"]`)).not.toBeNull();
        expect(hidden.querySelectorAll('.control-btn')).toHaveLength(2);
      });
    });

    it("shows the item's icon, or the default icon", () => {
      const iconOf = (item: InventoryItem): string | null | undefined =>
        row(item).querySelector('.si-icon-circle ha-icon')?.getAttribute('icon');

      expect(iconOf({ ...baseItem, icon: 'mdi:apple' })).toBe('mdi:apple');
      expect(iconOf(baseItem)).toBe('mdi:package-variant');
      expect(iconOf({ ...baseItem, icon: '' })).toBe('mdi:package-variant');
    });
  });

  describe('conditional content display', () => {
    it('should not display category when empty', () => {
      expect(row({ ...baseItem, category: '' }).querySelector('.category')).toBeNull();
    });

    it('should not display location when empty', () => {
      expect(row({ ...baseItem, location: '' }).querySelector('.location')).toBeNull();
    });

    it('should display expiry date when present', () => {
      const expiry = row().querySelector('.si-secondary .expiry');

      expect(expiry?.classList).toContain('expired');
      expect(expiry?.classList).toContain('si-tone-error');
      expect(expiry?.textContent).toMatch(/^Expired \d+ days ago$/);
    });

    it('colours an expiry inside the alert window as a warning', () => {
      const expiry = row({ ...baseItem, expiry_date: '2026-10-28' }).querySelector('.expiry');

      expect(expiry?.classList).toContain('expiring-soon');
      expect(expiry?.classList).toContain('si-tone-warning');
      expect(expiry?.textContent).toBe('Expires in 3 days');
    });

    it('should display future expiry date correctly', () => {
      const expiry = row({ ...baseItem, expiry_date: '2026-11-24' }).querySelector('.expiry');

      expect(expiry?.classList).toContain('expiry-safe');
      expect(expiry?.className).not.toContain('si-tone-');
      expect(expiry?.textContent).toBe('2026-11-24');
    });

    it('should not display expiry date when empty', () => {
      expect(row({ ...baseItem, expiry_date: '' }).querySelector('.expiry')).toBeNull();
    });

    it('shows the total value only when the item has a price', () => {
      const priced = row({ ...baseItem, expiry_date: '', price: 6.4 });

      expect(priced.querySelector('.item-price')?.textContent).toBe('32.00');
      expect(secondaryText(priced)).toBe('Fruit · 32.00');
      expect(row({ ...baseItem, price: 0 }).querySelector('.item-price')).toBeNull();
    });

    it('omits the secondary line when nothing is left to show', () => {
      const bare = { ...baseItem, category: '', expiry_date: '' };

      expect(row(bare).querySelector('.si-secondary')).toBeNull();
    });

    it('should handle missing unit gracefully', () => {
      expect(row({ ...baseItem, unit: '' }).querySelector('.si-stepper__value')?.textContent).toBe(
        '5',
      );
    });
  });

  describe('details panel and chevron', () => {
    const plain = (): InventoryItem => ({ ...baseItem, description: '', auto_add_enabled: false });
    const chevronOf = (element: HTMLElement): HTMLElement | null =>
      element.querySelector<HTMLElement>('.batch-toggle');
    const panelOf = (element: HTMLElement): HTMLElement | null =>
      element.querySelector<HTMLElement>('.item-details-panel');

    it('has no chevron and no panel when there is nothing to show', () => {
      const element = row(plain());

      expect(chevronOf(element)).toBeNull();
      expect(panelOf(element)).toBeNull();
    });

    it('shows the chevron for a description, only with show_description on', () => {
      const described = { ...plain(), description: 'Fresh red apples' };

      expect(chevronOf(row(described))).not.toBeNull();
      expect(chevronOf(row(described, { ...defaultConfig, show_description: false }))).toBeNull();
      expect(chevronOf(row({ ...plain(), description: '   ' }))).toBeNull();
    });

    it('shows the chevron for auto-add info, only with show_auto_add_info on', () => {
      const autoAdd = { ...plain(), auto_add_enabled: true };

      expect(chevronOf(row(autoAdd))).not.toBeNull();
      expect(chevronOf(row(autoAdd, { ...defaultConfig, show_auto_add_info: false }))).toBeNull();
    });

    it('always shows the chevron with the batches feature', () => {
      const element = row(plain(), undefined, {
        batches: true,
        expanded: new Set(),
        transfers: false,
      });

      expect(chevronOf(element)).not.toBeNull();
      expect(panelOf(element)?.querySelector('.batch-panel')).not.toBeNull();
    });

    it('is a labelled collapsed disclosure that toggles the item details', () => {
      const element = row();
      const chevron = chevronOf(element);

      expect(chevron?.tagName).toBe('BUTTON');
      expect(chevron?.getAttribute('type')).toBe('button');
      expect(chevron?.dataset.action).toBe(ACTIONS.TOGGLE_BATCHES);
      expect(chevron?.dataset.name).toBe('Apple');
      expect(chevron?.getAttribute('aria-label')).toBe('Details for Apple');
      expect(chevron?.getAttribute('aria-expanded')).toBe('false');
      expect(chevron?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:chevron-down');
      expect(panelOf(element)?.hidden).toBe(true);
    });

    it('sits between the open area and the stepper', () => {
      const main = row().querySelector('.si-row__main');

      expect([...(main?.children ?? [])].map((child) => child.classList[0])).toEqual([
        'si-row__open',
        'si-icon-btn',
        'si-stepper',
      ]);
    });

    it('opens remembered items without batches too', () => {
      const element = row(baseItem, undefined, {
        batches: false,
        expanded: new Set(['Apple']),
        transfers: false,
      });

      expect(chevronOf(element)?.getAttribute('aria-expanded')).toBe('true');
      expect(panelOf(element)?.hidden).toBe(false);
    });

    it('points the chevron at its panel with aria-controls', () => {
      const element = row({ ...baseItem, name: 'Oat "milk" & <co>' });
      const controls = chevronOf(element)?.getAttribute('aria-controls') ?? '';

      expect(controls).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(panelOf(element)?.id).toBe(controls);
      expect(chevronOf(element)?.dataset.name).toBe('Oat "milk" & <co>');
    });

    it('gives different items different panel ids', () => {
      const ids = ['a b', 'a_b', 'a-b'].map((name) =>
        chevronOf(row({ ...baseItem, name }))?.getAttribute('aria-controls'),
      );

      expect(new Set(ids).size).toBe(3);
    });

    it('puts the description into the panel, not the row', () => {
      const element = row();

      expect(element.querySelector('.si-row__main .item-description')).toBeNull();
      expect(panelOf(element)?.querySelector('.item-description')?.textContent).toBe(
        'Fresh red apples',
      );
    });
  });

  describe('auto-add information display', () => {
    const autoAddText = (item: InventoryItem): string | null | undefined =>
      row(item).querySelector('.item-details-panel .auto-add-info')?.textContent;

    it('should not display auto-add info when auto_add_enabled is false', () => {
      expect(row().querySelector('.auto-add-info')).toBeNull();
    });

    it('should display auto-add info when auto_add_enabled is true', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 3,
        todo_list: 'todo.grocery',
      };

      expect(autoAddText(autoAddItem)).toBe('Auto-add at ≤ 3 → Grocery List');
    });

    it('should handle undefined auto_add_to_list_quantity', () => {
      const autoAddItem: InventoryItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'todo.grocery',
      };
      delete autoAddItem.auto_add_to_list_quantity;

      expect(autoAddText(autoAddItem)).toBe('Auto-add at ≤ 0 → Grocery List');
    });

    it('should handle empty todo_list', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 2,
        todo_list: '',
      };

      expect(autoAddText(autoAddItem)).toBe('Auto-add at ≤ 2 → ');
    });

    it('should show the desired-quantity phrasing when desired_quantity is set', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 3,
        desired_quantity: 10,
        todo_list: 'todo.grocery',
      };

      expect(autoAddText(autoAddItem)).toBe('Auto-add at ≤ 3, up to 10 → Grocery List');
    });

    it('should use the legacy phrasing when desired_quantity is 0 or unset', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 3,
        desired_quantity: 0,
        todo_list: 'todo.grocery',
      };

      expect(autoAddText(autoAddItem)).toBe('Auto-add at ≤ 3 → Grocery List');
    });

    it('should render auto-add-info in the details panel, not in the row line', () => {
      const element = row({ ...baseItem, auto_add_enabled: true, todo_list: 'todo.grocery' });

      expect(element.querySelector('.si-row__main .auto-add-info')).toBeNull();
      expect(element.querySelector('.item-details-panel .auto-add-info')).not.toBeNull();
    });
  });

  describe('getTodoListName functionality', () => {
    const listName = (todoList: string): string | null | undefined =>
      row({ ...baseItem, auto_add_enabled: true, todo_list: todoList }).querySelector(
        '.auto-add-info',
      )?.textContent;

    it('should find todo list by entity_id', () => {
      expect(listName('todo.grocery')).toContain('→ Grocery List');
    });

    it('should find todo list by id when entity_id not matched', () => {
      expect(listName('household-3')).toContain('→ Household Tasks');
    });

    it('should return entity_id when no matching todo list found', () => {
      expect(listName('unknown-list')).toContain('→ unknown-list');
    });
  });

  describe('control buttons', () => {
    it('should make the icon and text one edit trigger', () => {
      const open = row().querySelector<HTMLElement>('.si-row__open');

      expect(open?.dataset.action).toBe('open_edit');
      expect(open?.dataset.name).toBe('Apple');
      expect(open?.getAttribute('role')).toBe('button');
      expect(open?.getAttribute('tabindex')).toBe('0');
      expect(open?.querySelector('.si-icon-circle')).not.toBeNull();
      expect(open?.querySelector('.item-name')).not.toBeNull();
    });

    it('should not include a separate gear edit button', () => {
      const html = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(html).not.toContain('class="edit-btn"');
      expect(html).not.toContain('⚙️');
    });

    it('should include enabled decrement button when quantity > 0', () => {
      const decrement = row().querySelector<HTMLElement>('[data-action="decrement"]');

      expect(decrement?.dataset.name).toBe('Apple');
      expect(decrement?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:minus');
      expect(decrement?.hasAttribute('disabled')).toBe(false);
    });

    it('should include disabled decrement button when quantity is 0', () => {
      const decrement = row({ ...baseItem, quantity: 0 }).querySelector(
        '[data-action="decrement"]',
      );

      expect(decrement?.hasAttribute('disabled')).toBe(true);
    });

    it('should include data-name attribute for the edit trigger and both control buttons', () => {
      const named = [...row({ ...baseItem, description: '' }).querySelectorAll('[data-name]')];

      // open area, decrement, increment (no chevron: nothing in the details panel)
      expect(named).toHaveLength(3);
      expect(named.every((element) => element.getAttribute('data-name') === 'Apple')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle items with special characters in name', () => {
      const element = row({ ...baseItem, name: 'Item & "Special" <chars>' });

      expect(element.querySelector('.item-name')?.textContent).toBe('Item & "Special" <chars>');
      expect(element.querySelector<HTMLElement>('.si-row__open')?.dataset.name).toBe(
        'Item & "Special" <chars>',
      );
    });

    it('should handle very long item names', () => {
      expect(
        row({ ...baseItem, name: 'A'.repeat(100) }).querySelector('.item-name')?.textContent,
      ).toBe('A'.repeat(100));
    });

    it('treats negative quantities as out of stock', () => {
      const element = row({ ...baseItem, quantity: -5 });

      expect(element.querySelector('.si-stepper__value')?.textContent).toBe('-5 pieces');
      expect(element.classList).toContain('zero-quantity');
      expect(element.querySelector('[data-action="decrement"]')?.hasAttribute('disabled')).toBe(
        true,
      );
    });

    it('should handle items with all optional fields empty', () => {
      const minimalItem: InventoryItem = {
        auto_add_enabled: false,
        auto_add_id_to_description_enabled: false,
        auto_add_to_list_quantity: 0,
        category: '',
        description: '',
        expiry_date: '',
        location: '',
        name: 'Minimal Item',
        quantity: 1,
        todo_list: '',
        unit: '',
      };
      const element = row(minimalItem);

      expect(element.querySelector('.item-name')?.textContent).toBe('Minimal Item');
      expect(element.querySelector('.si-stepper__value')?.textContent).toBe('1');
      expect(element.querySelector('.si-secondary')).toBeNull();
      expect(element.querySelector('.auto-add-info')).toBeNull();
      expect(element.querySelector('.batch-toggle')).toBeNull();
    });

    it('should handle items with all optional fields populated', () => {
      const maximalItem: InventoryItem = {
        auto_add_enabled: true,
        auto_add_id_to_description_enabled: true,
        auto_add_to_list_quantity: 3,
        category: 'Test Category',
        description: 'A fully detailed item',
        expiry_alert_days: 5,
        expiry_date: '2026-11-24',
        location: 'Pantry',
        name: 'Maximal Item',
        price: 1.5,
        quantity: 10,
        todo_list: 'todo.grocery',
        unit: 'units',
      };
      const element = row(maximalItem);

      expect(element.querySelector('.item-name')?.textContent).toBe('Maximal Item');
      expect(element.querySelector('.si-stepper__value')?.textContent).toBe('10 units');
      expect(secondaryText(element)).toBe('Pantry · Test Category · 2026-11-24 · 15.00');
      expect(element.querySelector('.item-description')?.textContent).toBe('A fully detailed item');
      expect(element.querySelector('.auto-add-info')?.textContent).toBe(
        'Auto-add at ≤ 3 → Grocery List',
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle all button states correctly for zero quantity item', () => {
      const element = row({ ...baseItem, quantity: 0, auto_add_enabled: true });

      expect(element.classList).toContain('zero-quantity');
      expect(element.querySelector('[data-action="decrement"]')?.hasAttribute('disabled')).toBe(
        true,
      );
      expect(element.querySelector('[data-action="open_edit"]')).not.toBeNull();
      expect(element.querySelector('[data-action="increment"]')?.hasAttribute('disabled')).toBe(
        false,
      );
      expect(element.querySelector('.batch-toggle')?.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('field visibility toggles', () => {
    const everything = (): InventoryItem => ({
      ...baseItem,
      location: 'Fridge',
      auto_add_enabled: true,
      todo_list: 'todo.grocery',
    });

    it('should show all fields when config is undefined (defaults)', () => {
      const element = row(everything());

      expect(element.querySelector('.item-description')).not.toBeNull();
      expect(element.querySelector('.location')).not.toBeNull();
      expect(element.querySelector('.category')).not.toBeNull();
      expect(element.querySelector('.expiry')).not.toBeNull();
      expect(element.querySelector('.auto-add-info')).not.toBeNull();
    });

    it('should show all fields when all toggles are true', () => {
      const element = row(everything(), {
        ...defaultConfig,
        show_description: true,
        show_location: true,
        show_category: true,
        show_expiry: true,
        show_auto_add_info: true,
        show_price: true,
      });

      expect(element.querySelector('.item-description')).not.toBeNull();
      expect(element.querySelector('.location')).not.toBeNull();
      expect(element.querySelector('.category')).not.toBeNull();
      expect(element.querySelector('.expiry')).not.toBeNull();
      expect(element.querySelector('.auto-add-info')).not.toBeNull();
    });

    it('should hide description when show_description is false', () => {
      const element = row(baseItem, { ...defaultConfig, show_description: false });

      expect(element.querySelector('.item-description')).toBeNull();
    });

    it('should hide location when show_location is false', () => {
      const element = row(
        { ...baseItem, location: 'Fridge', category: '' },
        { ...defaultConfig, show_location: false },
      );

      expect(element.querySelector('.location')).toBeNull();
      expect(element.textContent).not.toContain('Fridge');
    });

    it('should hide category when show_category is false', () => {
      const element = row(baseItem, { ...defaultConfig, show_category: false });

      expect(element.querySelector('.category')).toBeNull();
      expect(element.textContent).not.toContain('Fruit');
    });

    it('should show only location when show_category is false and both exist', () => {
      const element = row(
        { ...baseItem, location: 'Fridge', expiry_date: '' },
        { ...defaultConfig, show_category: false },
      );

      expect(secondaryText(element)).toBe('Fridge');
    });

    it('should show only category when show_location is false and both exist', () => {
      const element = row(
        { ...baseItem, location: 'Fridge', expiry_date: '' },
        { ...defaultConfig, show_location: false },
      );

      expect(secondaryText(element)).toBe('Fruit');
    });

    it('should hide expiry when show_expiry is false', () => {
      expect(
        row(baseItem, { ...defaultConfig, show_expiry: false }).querySelector('.expiry'),
      ).toBeNull();
    });

    it('should hide the total value when show_price is false', () => {
      const element = row({ ...baseItem, price: 2 }, { ...defaultConfig, show_price: false });

      expect(element.querySelector('.item-price')).toBeNull();
    });

    it('should hide auto-add info when show_auto_add_info is false', () => {
      const element = row(
        { ...baseItem, auto_add_enabled: true, todo_list: 'todo.grocery' },
        { ...defaultConfig, show_auto_add_info: false },
      );

      expect(element.querySelector('.auto-add-info')).toBeNull();
    });

    it('should always show name, quantity, and controls regardless of config', () => {
      const element = row(baseItem, {
        ...defaultConfig,
        show_description: false,
        show_location: false,
        show_category: false,
        show_expiry: false,
        show_auto_add_info: false,
        show_price: false,
      });

      expect(element.querySelector('.item-name')?.textContent).toBe('Apple');
      expect(element.querySelector('.si-stepper__value')?.textContent).toBe('5 pieces');
      expect(element.querySelector('[data-action="open_edit"]')).not.toBeNull();
      expect(element.querySelector('[data-action="decrement"]')).not.toBeNull();
      expect(element.querySelector('[data-action="increment"]')).not.toBeNull();
      expect(element.querySelector('.si-secondary')).toBeNull();
    });

    it('should hide location and category when both toggles are false', () => {
      const element = row(
        { ...baseItem, location: 'Fridge' },
        { ...defaultConfig, show_location: false, show_category: false },
      );

      expect(element.querySelector('.location')).toBeNull();
      expect(element.querySelector('.category')).toBeNull();
    });
  });

  describe('XSS protection', () => {
    const EVIL = '"><script>alert(1)</script>';

    it('escapes a malicious item name at every interpolation site (name text, edit trigger, chevron, stepper buttons)', () => {
      const html = createItemRowTemplate(
        { ...baseItem, name: EVIL },
        mockTodoLists,
        mockTranslations,
      );
      const element = rowOf(html);

      expect(html).not.toContain(EVIL);
      expect(element.querySelector('script')).toBeNull();
      expect(element.querySelector('.item-name')?.textContent).toBe(EVIL);
      const named = [...element.querySelectorAll('[data-name]')].map((e) =>
        e.getAttribute('data-name'),
      );
      expect(named).toEqual([EVIL, EVIL, EVIL, EVIL]);
      expect(element.querySelector('.batch-toggle')?.getAttribute('aria-label')).toBe(
        `Details for ${EVIL}`,
      );
    });

    it('escapes a malicious item description so it does not break out of its element', () => {
      const html = createItemRowTemplate(
        { ...baseItem, description: 'foo" onmouseover="alert(1)<b>x</b>' },
        mockTodoLists,
        mockTranslations,
      );

      expect(html).not.toContain('foo" onmouseover="alert(1)');
      expect(rowOf(html).querySelector('.item-description b')).toBeNull();
      expect(rowOf(html).querySelector('.item-description')?.textContent).toBe(
        'foo" onmouseover="alert(1)<b>x</b>',
      );
    });

    it('escapes the unit, locations, categories, icon and todo list name', () => {
      const element = row({
        ...baseItem,
        unit: '<b>u</b>',
        location: '<b>l</b>',
        category: '<b>c</b>',
        icon: '"><b>i</b>',
        auto_add_enabled: true,
        todo_list: '<b>t</b>',
      });

      expect(element.querySelector('b')).toBeNull();
      expect(element.querySelector('.si-stepper__value')?.textContent).toBe('5 <b>u</b>');
      expect(element.querySelector('.location')?.textContent).toBe('<b>l</b>');
      expect(element.querySelector('.category')?.textContent).toBe('<b>c</b>');
      expect(element.querySelector('.si-icon-circle ha-icon')?.getAttribute('icon')).toBe(
        '"><b>i</b>',
      );
      expect(element.querySelector('.auto-add-info')?.textContent).toContain('→ <b>t</b>');
    });
  });

  describe('batches', () => {
    const panelOf = (element: HTMLElement): HTMLElement | null =>
      element.querySelector<HTMLElement>('.batch-panel');
    const withBatches = (): InventoryItem => ({
      ...baseItem,
      expiry_date: '2000-01-01',
      batches: [
        {
          id: 'b1',
          quantity: 2,
          expiry_date: '2000-01-01',
          location: 'Fridge',
          unit_price: 0,
          purchased_at: '1999-12-01',
        },
        {
          id: 'b2',
          quantity: 3,
          expiry_date: '2099-01-01',
          location: 'Pantry',
          unit_price: 0,
          purchased_at: '2026-10-01',
        },
      ],
    });

    it('renders no batch UI without the batches feature', () => {
      const disabled = createItemRowTemplate(
        withBatches(),
        mockTodoLists,
        mockTranslations,
        undefined,
        {
          batches: false,
          expanded: new Set(['Apple']),
          transfers: false,
        },
      );
      const legacyCall = createItemRowTemplate(withBatches(), mockTodoLists, mockTranslations);

      for (const result of [disabled, legacyCall]) {
        expect(result).not.toContain('batch-panel');
      }
    });

    it('adds a collapsed chevron and the batch panel inside the hidden details with the batches feature', () => {
      const element = row(withBatches(), undefined, {
        batches: true,
        expanded: new Set(),
        transfers: false,
      });

      expect(element.querySelector('.batch-toggle')?.getAttribute('aria-expanded')).toBe('false');
      expect(element.querySelector<HTMLElement>('.item-details-panel')?.hidden).toBe(true);
      expect(panelOf(element)?.closest('.item-details-panel')).not.toBeNull();
    });

    it('treats an item without a batches field like an item with no stock', () => {
      const noBatchesField: InventoryItem = { ...baseItem };
      expect(noBatchesField).not.toHaveProperty('batches');
      const render = (batches?: InventoryItem['batches']): string =>
        createItemRowTemplate(
          batches === undefined ? noBatchesField : { ...noBatchesField, batches },
          mockTodoLists,
          mockTranslations,
          undefined,
          { batches: true, expanded: new Set(['Apple']), transfers: false },
        );

      const missing = rowOf(render());

      expect(missing.querySelector('.batch-toggle')).not.toBeNull();
      expect(panelOf(missing)?.querySelectorAll('.batch-row')).toHaveLength(0);
      expect(panelOf(missing)?.querySelector('.restock-open-btn')).not.toBeNull();
      expect(render()).toBe(render([]));
    });

    it('keeps a remembered item expanded across renders', () => {
      const element = row(withBatches(), undefined, {
        batches: true,
        expanded: new Set(['Apple']),
        transfers: false,
      });

      expect(element.querySelector('.batch-toggle')?.getAttribute('aria-expanded')).toBe('true');
      expect(element.querySelector<HTMLElement>('.item-details-panel')?.hidden).toBe(false);
    });

    it('offers Move… on batch rows only with the transfers feature', () => {
      const render = (transfers: boolean): HTMLElement =>
        row(withBatches(), undefined, {
          batches: true,
          expanded: new Set(['Apple']),
          transfers,
        });

      expect(panelOf(render(true))?.querySelectorAll('.batch-move-btn')).toHaveLength(2);
      expect(panelOf(render(false))?.querySelector('.batch-move-btn')).toBeNull();
    });

    it('keeps the total quantity and the one-tap row buttons', () => {
      const element = row(withBatches(), undefined, {
        batches: true,
        expanded: new Set(['Apple']),
        transfers: false,
      });

      expect(element.querySelector('.si-stepper__value')?.textContent).toBe('5 pieces');
      expect(element.querySelector('.si-row__main [data-action="decrement"]')).not.toBeNull();
      expect(element.querySelector('.si-row__main [data-action="increment"]')).not.toBeNull();
    });

    it("drives the row expiry from the item's expiry_date (earliest batch) while batch rows show their own", () => {
      const element = row(withBatches(), undefined, {
        batches: true,
        expanded: new Set(['Apple']),
        transfers: false,
      });

      const rowBadge = element.querySelector('.si-secondary .expiry');
      expect(rowBadge?.classList.contains('expired')).toBe(true);
      const batchExpiry = [...element.querySelectorAll('.batch-row .batch-expiry')].map((b) => [
        b.classList.contains('expired'),
        b.classList.contains('si-tone-error'),
      ]);
      expect(batchExpiry).toEqual([
        [true, true],
        [false, false],
      ]);
    });
  });

  describe('item images', () => {
    const THUMB = '/api/simple_inventory/image/item-1?thumb=1&v=s1';
    const FULL = '/api/simple_inventory/image/item-1?v=s1';
    let images: ImageLoader;
    const withPhoto = (): InventoryItem => ({
      ...baseItem,
      description: '',
      expiry_date: '',
      id: 'item-1',
      image: 's1',
    });
    const imageRow = (item: InventoryItem, config: InventoryConfig = defaultConfig): HTMLElement =>
      rowOf(
        createItemRowTemplate(item, mockTodoLists, mockTranslations, config, {
          batches: false,
          expanded: new Set<string>(),
          transfers: false,
          images,
        }),
      );

    beforeEach(() => {
      images = new ImageLoader(vi.fn<(path: string) => Promise<Blob>>());
    });

    it('shows the thumbnail in the circle, over the item icon, and moves status to the bar', () => {
      const element = imageRow({ ...withPhoto(), expiry_date: '2026-10-01' });
      const circle = element.querySelector('.si-row__open .si-icon-circle');

      expect(circle?.classList).toContain('si-photo');
      expect(circle?.querySelector('ha-icon')).not.toBeNull();
      const img = circle?.querySelector('img.si-photo__img');
      expect(img?.getAttribute('data-image-path')).toBe(THUMB);
      expect(img?.getAttribute('alt')).toBe('');
      expect(img?.hasAttribute('src')).toBe(false);
      expect(element.classList).toContain('si-row--photo');
      expect(element.classList).not.toContain('si-row--no-icon');
      expect(element.dataset.status).toBe('expired');
    });

    it('sets the src at once when the thumbnail is already loaded', () => {
      vi.spyOn(images, 'cached').mockImplementation((path) =>
        path === THUMB ? 'blob:thumb' : undefined,
      );

      const img = imageRow(withPhoto()).querySelector('.si-photo__img');

      expect(img?.getAttribute('src')).toBe('blob:thumb');
    });

    it('keeps the icon circle for items without an image', () => {
      const element = imageRow({ ...withPhoto(), image: '' });

      expect(element.querySelector('.si-photo')).toBeNull();
      expect(element.querySelector('.si-icon-circle')).not.toBeNull();
      expect(element.classList).not.toContain('si-row--photo');
    });

    it('shows no photos without the item_images feature', () => {
      const element = rowOf(
        createItemRowTemplate(withPhoto(), mockTodoLists, mockTranslations, defaultConfig),
      );

      expect(element.querySelector('img')).toBeNull();
      expect(element.querySelector('.si-row__chevron')).toBeNull();
    });

    it('hides the row photo with show_icon off, like the icon', () => {
      const element = imageRow(withPhoto(), { ...defaultConfig, show_icon: false });

      expect(element.querySelector('.si-row__open img')).toBeNull();
      expect(element.querySelector('.si-icon-circle')).toBeNull();
      expect(element.classList).toContain('si-row--no-icon');
      expect(element.classList).not.toContain('si-row--photo');
    });

    it('puts the full image first in the details panel, which the photo alone makes available', () => {
      const element = imageRow({ ...withPhoto(), description: 'Fresh red apples' });
      const panel = element.querySelector('.si-details');
      const view = panel?.firstElementChild;
      const img = view?.querySelector('img');

      expect(element.querySelector('.si-row__chevron')).not.toBeNull();
      expect(img?.classList).toContain('si-details__image');
      expect(img?.getAttribute('data-image-path')).toBe(FULL);
      expect(img?.getAttribute('alt')).toBe('Photo of Apple');
      expect(view?.nextElementSibling?.classList).toContain('si-details__description');
      expect(imageRow(withPhoto()).querySelector('.si-row__chevron')).not.toBeNull();
    });

    it('makes the details image a button that opens the photo viewer', () => {
      const view = imageRow(withPhoto()).querySelector('.si-details > button');

      expect(view?.getAttribute('type')).toBe('button');
      expect(view?.getAttribute('data-action')).toBe('view_image');
      expect(view?.getAttribute('data-name')).toBe('Apple');
      expect(view?.getAttribute('aria-label')).toBe('View photo of Apple');
      expect(view?.querySelector('img.si-details__image')).not.toBeNull();
    });

    it('keeps the details image with show_icon off', () => {
      const element = imageRow(withPhoto(), { ...defaultConfig, show_icon: false });

      expect(element.querySelector('.si-details__image')?.getAttribute('data-image-path')).toBe(
        FULL,
      );
    });
  });
});
