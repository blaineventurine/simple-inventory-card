import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createItemRowTemplate } from '../../src/templates/itemRow';
import { InventoryItem } from '../../src/types/homeAssistant';
import { TodoList } from '../../src/types/todoList';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn((_translations: any, _key: string, _params: any, fallback: string) => {
      return fallback;
    }),
  },
}));

describe('createItemRowTemplate', () => {
  let baseItem: InventoryItem;
  let mockTodoLists: TodoList[];
  let mockTranslations: TranslationData;

  beforeEach(() => {
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

  describe('basic HTML structure', () => {
    it('should create a basic item row with correct structure', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="item-row');
      expect(result).toContain('class="item-header"');
      expect(result).toContain('class="item-footer"');
      expect(result).toContain('class="item-controls"');
      expect(result).toContain('class="item-name"');
    });

    it('should include item name', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="item-name"');
      expect(result).toContain('Apple');
    });

    it('should include item location', () => {
      baseItem.location = 'Fridge';
      baseItem.category = '';
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="location"');
      expect(result).toContain('Fridge');
    });

    it('should include item category', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);
      expect(result).toContain('class="category"');
      expect(result).toContain('Fruit');
    });

    it('should include location and category when both are present', () => {
      baseItem.location = 'Fridge';
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);
      expect(result).toContain('class="location-category"');
      expect(result).toContain('Fridge | Fruit');
    });

    it('should include quantity and unit', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="quantity"');
      expect(result).toContain('5 pieces');
    });

    it('should include all control buttons', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="edit-btn"');
      expect(result).toContain('class="control-btn"');
      expect(result).toContain('data-action="open_edit"');
      expect(result).toContain('data-action="decrement"');
      expect(result).toContain('data-action="increment"');
      expect(result).toContain('data-action="remove"');
    });
  });

  describe('CSS classes', () => {
    it('should not include zero-quantity class when quantity > 0', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="item-row ');
      expect(result).not.toContain('zero-quantity');
    });

    it('should include zero-quantity class when quantity is 0', () => {
      const zeroQuantityItem = { ...baseItem, quantity: 0 };
      const result = createItemRowTemplate(zeroQuantityItem, mockTodoLists, mockTranslations);

      expect(result).toContain('zero-quantity');
    });

    it('should not include auto-add-enabled class when auto_add_enabled is false', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).not.toContain('auto-add-enabled');
    });

    it('should include auto-add-enabled class when auto_add_enabled is true', () => {
      const autoAddItem = { ...baseItem, auto_add_enabled: true };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists, mockTranslations);

      expect(result).toContain('auto-add-enabled');
    });

    it('should include both classes when quantity is 0 and auto-add is enabled', () => {
      const item = { ...baseItem, quantity: 0, auto_add_enabled: true };
      const result = createItemRowTemplate(item, mockTodoLists, mockTranslations);

      expect(result).toContain('zero-quantity');
      expect(result).toContain('auto-add-enabled');
    });
  });

  describe('conditional content display', () => {
    it('should display category when present', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="category"');
      expect(result).toContain('Fruit');
    });

    it('should not display category when empty', () => {
      const noCategoryItem = { ...baseItem, category: '' };
      const result = createItemRowTemplate(noCategoryItem, mockTodoLists, mockTranslations);

      expect(result).not.toContain('class="category"');
    });

    it('should display location when present', () => {
      baseItem.category = '';
      baseItem.location = 'Fridge';
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="location"');
      expect(result).toContain('Fridge');
    });

    it('should not display locatio when empty', () => {
      const noLocationItem = { ...baseItem, location: '' };
      const result = createItemRowTemplate(noLocationItem, mockTodoLists, mockTranslations);

      expect(result).not.toContain('class="location"');
    });

    it('should display expiry date when present', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="expiry expired"');
      expect(result).toContain('Expired');
      expect(result).toContain('days ago');
    });

    it('should display future expiry date correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const futureItem = { ...baseItem, expiry_date: futureDateStr };
      const result = createItemRowTemplate(futureItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="expiry');
      expect(result).toContain(futureDateStr);
    });

    it('should not display expiry date when empty', () => {
      const noExpiryItem = { ...baseItem, expiry_date: '' };
      const result = createItemRowTemplate(noExpiryItem, mockTodoLists, mockTranslations);

      expect(result).not.toContain('class="expiry"');
    });

    it('should display unit when present', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('5 pieces');
    });

    it('should handle missing unit gracefully', () => {
      const noUnitItem = { ...baseItem, unit: '' };
      const result = createItemRowTemplate(noUnitItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="quantity"');
      expect(result).toContain('5 ');
    });
  });

  describe('auto-add information display', () => {
    it('should not display auto-add info when auto_add_enabled is false', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).not.toContain('class="auto-add-info"');
    });

    it('should display auto-add info when auto_add_enabled is true', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 3,
        todo_list: 'todo.grocery',
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="auto-add-info"');
      expect(result).toContain('Auto-add at ≤ 3 → Grocery List');
    });

    it('should handle undefined auto_add_to_list_quantity', () => {
      const autoAddItem: InventoryItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'todo.grocery',
      };

      delete autoAddItem.auto_add_to_list_quantity;

      const result = createItemRowTemplate(autoAddItem, mockTodoLists, mockTranslations);

      expect(result).toContain('Auto-add at ≤ 0 → Grocery List');
    });

    it('should handle empty todo_list', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 2,
        todo_list: '',
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists, mockTranslations);

      expect(result).toContain('Auto-add at ≤ 2 →');
    });
  });

  describe('getTodoListName functionality', () => {
    it('should find todo list by entity_id', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'todo.grocery',
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists, mockTranslations);

      expect(result).toContain('→ Grocery List');
    });

    it('should find todo list by id when entity_id not matched', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'household-3',
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists, mockTranslations);

      expect(result).toContain('→ Household Tasks');
    });

    it('should return entity_id when no matching todo list found', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'unknown-list',
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists, mockTranslations);

      expect(result).toContain('→ unknown-list');
    });
  });

  describe('control buttons', () => {
    it('should include edit button with correct attributes', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="edit-btn"');
      expect(result).toContain('data-action="open_edit"');
      expect(result).toContain('data-name="Apple"');
      expect(result).toContain('⚙️');
    });

    it('should include enabled decrement button when quantity > 0', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      expect(result).toContain('data-action="decrement"');
      expect(result).toContain('data-name="Apple"');
      expect(result).toContain('➖');
      expect(result).not.toContain('disabled');
    });

    it('should include disabled decrement button when quantity is 0', () => {
      const zeroQuantityItem = { ...baseItem, quantity: 0 };
      const result = createItemRowTemplate(zeroQuantityItem, mockTodoLists, mockTranslations);

      expect(result).toContain('data-action="decrement"');
      expect(result).toContain('disabled');
      expect(result).toContain('➖');
    });

    it('should include data-name attribute for all buttons', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists, mockTranslations);

      // Count occurrences of data-name="Apple"
      const matches = result.match(/data-name="Apple"/g);
      expect(matches).toHaveLength(4); // Edit, decrement, increment, remove
    });
  });

  describe('edge cases', () => {
    it('should handle items with special characters in name', () => {
      const specialItem = { ...baseItem, name: 'Item & "Special" <chars>' };
      const result = createItemRowTemplate(specialItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="item-name"');
      expect(result).toContain('Item & "Special" <chars>');
      expect(result).toContain('data-name="Item & "Special" <chars>"');
    });

    it('should handle very long item names', () => {
      const longNameItem = { ...baseItem, name: 'A'.repeat(100) };
      const result = createItemRowTemplate(longNameItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="item-name"');
      expect(result).toContain('A'.repeat(100));
    });

    it('should handle negative quantities', () => {
      const negativeQuantityItem = { ...baseItem, quantity: -5 };
      const result = createItemRowTemplate(negativeQuantityItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="quantity"');
      expect(result).toContain('-5 pieces');
      expect(result).not.toContain('zero-quantity');
      expect(result).not.toContain('disabled');
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
      const result = createItemRowTemplate(minimalItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="item-name"');
      expect(result).toContain('Minimal Item');
      expect(result).toContain('class="quantity"');
      expect(result).toContain('1 ');
      expect(result).not.toContain('class="category"');
      expect(result).not.toContain('class="expiry"');
      expect(result).not.toContain('class="auto-add-info"');
      expect(result).not.toContain('class="location"');
    });

    it('should handle items with all optional fields populated', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const maximalItem: InventoryItem = {
        auto_add_enabled: true,
        auto_add_id_to_description_enabled: true,
        auto_add_to_list_quantity: 3,
        category: 'Test Category',
        description: 'A fully detailed item',
        expiry_alert_days: 5,
        expiry_date: futureDateStr,
        location: 'Pantry',
        name: 'Maximal Item',
        quantity: 10,
        todo_list: 'todo.grocery',
        unit: 'units',
      };
      const result = createItemRowTemplate(maximalItem, mockTodoLists, mockTranslations);

      expect(result).toContain('class="item-name"');
      expect(result).toContain('Maximal Item');
      expect(result).toContain('class="quantity"');
      expect(result).toContain('10 units');
      expect(result).toContain('class="expiry');
      expect(result).toContain(futureDateStr);
      expect(result).toContain('class="auto-add-info"');
      expect(result).toContain('Auto-add at ≤ 3 → Grocery List');
      expect(result).toContain('auto-add-enabled');
      expect(result).toContain('class="location-category"');
      expect(result).toContain('Pantry | Test Category');
    });
  });

  describe('integration scenarios', () => {
    it('should handle all button states correctly for zero quantity item', () => {
      const zeroItem = { ...baseItem, quantity: 0, auto_add_enabled: true };
      const result = createItemRowTemplate(zeroItem, mockTodoLists, mockTranslations);

      // Should have zero-quantity and auto-add-enabled classes
      expect(result).toContain('zero-quantity');
      expect(result).toContain('auto-add-enabled');

      // Should have disabled decrement button
      expect(result).toMatch(/data-action="decrement"[^>]*disabled/);

      // Should have enabled other buttons
      expect(result).toContain('data-action="open_edit"');
      expect(result).toContain('data-action="increment"');
      expect(result).toContain('data-action="remove"');
    });
  });
});
