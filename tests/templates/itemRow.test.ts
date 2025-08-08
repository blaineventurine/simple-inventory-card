// tests/templates/itemRow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createItemRowTemplate } from '../../src/templates/itemRow';
import { InventoryItem } from '../../src/types/homeAssistant';
import { TodoList } from '../../src/types/todoList';

describe('createItemRowTemplate', () => {
  let baseItem: InventoryItem;
  let mockTodoLists: TodoList[];

  beforeEach(() => {
    baseItem = {
      name: 'Apple',
      quantity: 5,
      category: 'Fruit',
      unit: 'pieces',
      expiry_date: '2024-12-31',
      expiry_alert_days: 7,
      auto_add_enabled: false,
      auto_add_to_list_quantity: 2,
      todo_list: 'grocery',
    };

    mockTodoLists = [
      { id: 'grocery-1', name: 'Grocery List', entity_id: 'todo.grocery' },
      { id: 'shopping-2', name: 'Shopping List', entity_id: 'todo.shopping' },
      { id: 'household-3', name: 'Household Tasks' }, // No entity_id
    ];
  });

  describe('basic HTML structure', () => {
    it('should create a basic item row with correct structure', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('class="item-row');
      expect(result).toContain('class="item-header"');
      expect(result).toContain('class="item-footer"');
      expect(result).toContain('class="item-controls"');
      expect(result).toContain('class="item-name"');
    });

    it('should include item name', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('<span class="item-name">Apple</span>');
    });

    it('should include quantity and unit', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('<span class="quantity">5 pieces</span>');
    });

    it('should include all control buttons', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

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
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('class="item-row ');
      expect(result).not.toContain('zero-quantity');
    });

    it('should include zero-quantity class when quantity is 0', () => {
      const zeroQuantityItem = { ...baseItem, quantity: 0 };
      const result = createItemRowTemplate(zeroQuantityItem, mockTodoLists);

      expect(result).toContain('zero-quantity');
    });

    it('should not include auto-add-enabled class when auto_add_enabled is false', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).not.toContain('auto-add-enabled');
    });

    it('should include auto-add-enabled class when auto_add_enabled is true', () => {
      const autoAddItem = { ...baseItem, auto_add_enabled: true };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists);

      expect(result).toContain('auto-add-enabled');
    });

    it('should include both classes when quantity is 0 and auto-add is enabled', () => {
      const item = { ...baseItem, quantity: 0, auto_add_enabled: true };
      const result = createItemRowTemplate(item, mockTodoLists);

      expect(result).toContain('zero-quantity');
      expect(result).toContain('auto-add-enabled');
    });
  });

  describe('conditional content display', () => {
    it('should display category when present', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('<span class="category">Fruit</span>');
    });

    it('should not display category when empty', () => {
      const noCategoryItem = { ...baseItem, category: '' };
      const result = createItemRowTemplate(noCategoryItem, mockTodoLists);

      expect(result).not.toContain('<span class="category">');
    });

    it('should not display category when undefined', () => {
      const noCategoryItem = { ...baseItem, category: undefined as any };
      const result = createItemRowTemplate(noCategoryItem, mockTodoLists);

      expect(result).not.toContain('<span class="category">');
    });

    it('should display expiry date when present', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('class="expiry expired"');
      expect(result).toContain('Expired');
      expect(result).toContain('days ago');
    });

    it('should display future expiry date correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const futureItem = { ...baseItem, expiry_date: futureDateStr };
      const result = createItemRowTemplate(futureItem, mockTodoLists);

      expect(result).toContain('<span class="expiry');
      expect(result).toContain(futureDateStr);
    });

    it('should not display expiry date when empty', () => {
      const noExpiryItem = { ...baseItem, expiry_date: '' };
      const result = createItemRowTemplate(noExpiryItem, mockTodoLists);

      expect(result).not.toContain('<span class="expiry">');
    });

    it('should display unit when present', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('5 pieces');
    });

    it('should handle missing unit gracefully', () => {
      const noUnitItem = { ...baseItem, unit: '' };
      const result = createItemRowTemplate(noUnitItem, mockTodoLists);

      expect(result).toContain('<span class="quantity">5 </span>');
    });

    it('should handle undefined unit gracefully', () => {
      const noUnitItem = { ...baseItem, unit: undefined as any };
      const result = createItemRowTemplate(noUnitItem, mockTodoLists);

      expect(result).toContain('<span class="quantity">5 </span>');
    });
  });

  describe('auto-add information display', () => {
    it('should not display auto-add info when auto_add_enabled is false', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).not.toContain('<span class="auto-add-info">');
    });

    it('should display auto-add info when auto_add_enabled is true', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 3,
        todo_list: 'todo.grocery',
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists);

      expect(result).toContain('<span class="auto-add-info">');
      expect(result).toContain('Auto-add at ≤3 → Grocery List');
    });

    it('should handle undefined auto_add_to_list_quantity', () => {
      const autoAddItem: InventoryItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'todo.grocery',
      };

      delete autoAddItem.auto_add_to_list_quantity;

      const result = createItemRowTemplate(autoAddItem, mockTodoLists);

      expect(result).toContain('Auto-add at ≤0 → Grocery List');
    });

    it('should handle empty todo_list', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 2,
        todo_list: '',
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists);

      expect(result).toContain('Auto-add at ≤2 → ');
    });

    it('should handle undefined todo_list', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 2,
        todo_list: undefined as any,
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists);

      expect(result).toContain('Auto-add at ≤2 → ');
    });
  });

  describe('getTodoListName functionality', () => {
    it('should find todo list by entity_id', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'todo.grocery',
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists);

      expect(result).toContain('→ Grocery List');
    });

    it('should find todo list by id when entity_id not matched', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'household-3',
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists);

      expect(result).toContain('→ Household Tasks');
    });

    it('should return entity_id when no matching todo list found', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'unknown-list',
      };
      const result = createItemRowTemplate(autoAddItem, mockTodoLists);

      expect(result).toContain('→ unknown-list');
    });

    it('should handle empty todoLists array', () => {
      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'some-list',
      };
      const result = createItemRowTemplate(autoAddItem, []);

      expect(result).toContain('→ some-list');
    });

    it('should find first matching todo list by entity_id or id', () => {
      const todoListsWithDuplicate = [
        { id: 'duplicate', name: 'First Match', entity_id: 'other.entity' },
        { id: 'other-id', name: 'Second Match', entity_id: 'duplicate' },
      ];

      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'duplicate',
      };
      const result = createItemRowTemplate(autoAddItem, todoListsWithDuplicate);

      // Should find the first list that matches (by id in this case)
      expect(result).toContain('→ First Match');
    });

    it('should find by entity_id when id does not match', () => {
      const todoListsEntityMatch = [
        { id: 'no-match', name: 'No Match', entity_id: 'other.entity' },
        { id: 'other-id', name: 'Entity Match', entity_id: 'target-entity' },
      ];

      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'target-entity',
      };
      const result = createItemRowTemplate(autoAddItem, todoListsEntityMatch);

      expect(result).toContain('→ Entity Match');
    });

    it('should find by id when entity_id does not match', () => {
      const todoListsIdMatch = [
        { id: 'target-id', name: 'ID Match', entity_id: 'other.entity' },
        { id: 'other-id', name: 'No Match', entity_id: 'other.entity2' },
      ];

      const autoAddItem = {
        ...baseItem,
        auto_add_enabled: true,
        todo_list: 'target-id',
      };
      const result = createItemRowTemplate(autoAddItem, todoListsIdMatch);

      expect(result).toContain('→ ID Match');
    });
  });

  describe('control buttons', () => {
    it('should include edit button with correct attributes', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('class="edit-btn"');
      expect(result).toContain('data-action="open_edit"');
      expect(result).toContain('data-name="Apple"');
      expect(result).toContain('⚙️');
    });

    it('should include increment button', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('data-action="increment"');
      expect(result).toContain('data-name="Apple"');
      expect(result).toContain('➕');
    });

    it('should include remove button', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('data-action="remove"');
      expect(result).toContain('data-name="Apple"');
      expect(result).toContain('❌');
    });

    it('should include enabled decrement button when quantity > 0', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toContain('data-action="decrement"');
      expect(result).toContain('data-name="Apple"');
      expect(result).toContain('➖');
      expect(result).not.toContain('disabled');
    });

    it('should include disabled decrement button when quantity is 0', () => {
      const zeroQuantityItem = { ...baseItem, quantity: 0 };
      const result = createItemRowTemplate(zeroQuantityItem, mockTodoLists);

      expect(result).toContain('data-action="decrement"');
      expect(result).toContain('disabled');
      expect(result).toContain('➖');
    });

    it('should include data-name attribute for all buttons', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      // Count occurrences of data-name="Apple"
      const matches = result.match(/data-name="Apple"/g);
      expect(matches).toHaveLength(4); // Edit, decrement, increment, remove
    });
  });

  describe('edge cases', () => {
    it('should handle items with special characters in name', () => {
      const specialItem = { ...baseItem, name: 'Item & "Special" <chars>' };
      const result = createItemRowTemplate(specialItem, mockTodoLists);

      expect(result).toContain('<span class="item-name">Item & "Special" <chars></span>');
      expect(result).toContain('data-name="Item & "Special" <chars>"');
    });

    it('should handle very long item names', () => {
      const longNameItem = { ...baseItem, name: 'A'.repeat(100) };
      const result = createItemRowTemplate(longNameItem, mockTodoLists);

      expect(result).toContain(`<span class="item-name">${'A'.repeat(100)}</span>`);
    });

    it('should handle negative quantities', () => {
      const negativeQuantityItem = { ...baseItem, quantity: -5 };
      const result = createItemRowTemplate(negativeQuantityItem, mockTodoLists);

      expect(result).toContain('<span class="quantity">-5 pieces</span>');
      expect(result).not.toContain('zero-quantity');
      expect(result).not.toContain('disabled'); // Should not disable decrement for negative
    });

    it('should handle very large quantities', () => {
      const largeQuantityItem = { ...baseItem, quantity: 999_999 };
      const result = createItemRowTemplate(largeQuantityItem, mockTodoLists);

      expect(result).toContain('<span class="quantity">999999 pieces</span>');
    });

    it('should handle items with all optional fields empty', () => {
      const minimalItem: InventoryItem = {
        name: 'Minimal Item',
        quantity: 1,
        category: '',
        unit: '',
        expiry_date: '',
        auto_add_enabled: false,
        auto_add_to_list_quantity: 0,
        todo_list: '',
      };
      const result = createItemRowTemplate(minimalItem, mockTodoLists);

      expect(result).toContain('<span class="item-name">Minimal Item</span>');
      expect(result).toContain('<span class="quantity">1 </span>');
      expect(result).not.toContain('<span class="category">');
      expect(result).not.toContain('<span class="expiry">');
      expect(result).not.toContain('<span class="auto-add-info">');
    });

    it('should handle items with all optional fields populated', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const maximalItem: InventoryItem = {
        name: 'Maximal Item',
        quantity: 10,
        category: 'Test Category',
        unit: 'units',
        expiry_date: futureDateStr,
        expiry_alert_days: 5,
        auto_add_enabled: true,
        auto_add_to_list_quantity: 3,
        todo_list: 'todo.grocery',
      };
      const result = createItemRowTemplate(maximalItem, mockTodoLists);

      expect(result).toContain('<span class="item-name">Maximal Item</span>');
      expect(result).toContain('<span class="quantity">10 units</span>');
      expect(result).toContain('<span class="category">Test Category</span>');
      expect(result).toContain(`<span class="expiry expiry-safe">${futureDateStr}</span>`);
      expect(result).toContain('<span class="auto-add-info">Auto-add at ≤3 → Grocery List</span>');
      expect(result).toContain('auto-add-enabled');
    });
  });

  describe('HTML structure validation', () => {
    it('should produce valid nested HTML structure', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      expect(result).toMatch(/<div class="item-row[^"]*">[\s\S]*<\/div>/);
      expect(result).toMatch(/<div class="item-header">[\s\S]*<\/div>/);
      expect(result).toMatch(/<div class="item-footer">[\s\S]*<\/div>/);
      expect(result).toMatch(/<div class="item-controls">[\s\S]*<\/div>/);
    });

    it('should have all buttons as siblings in controls section', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      // Extract the controls section
      const controlsMatch = result.match(/<div class="item-controls">([\s\S]*?)<\/div>/);
      expect(controlsMatch).toBeTruthy();

      const controlsContent = controlsMatch![1];
      const buttonCount = (controlsContent.match(/<button/g) || []).length;
      expect(buttonCount).toBe(4); // Edit, decrement, increment, remove
    });

    it('should maintain consistent spacing and formatting', () => {
      const result = createItemRowTemplate(baseItem, mockTodoLists);

      // Should contain proper spacing
      expect(result).toContain('\n');
      expect(result.trim()).toBeTruthy(); // Should not be just whitespace
    });
  });

  describe('integration scenarios', () => {
    it('should work with complex todo list configurations', () => {
      const complexTodoLists = [
        { id: 'list1', name: 'List 1', entity_id: 'todo.list1' },
        { id: 'list2', name: 'List 2' }, // No entity_id
        { id: 'todo.list3', name: 'List 3', entity_id: 'todo.list3' }, // id matches entity_id
      ];

      const item1 = { ...baseItem, auto_add_enabled: true, todo_list: 'todo.list1' };
      const item2 = { ...baseItem, auto_add_enabled: true, todo_list: 'list2' };
      const item3 = { ...baseItem, auto_add_enabled: true, todo_list: 'todo.list3' };

      expect(createItemRowTemplate(item1, complexTodoLists)).toContain('→ List 1');
      expect(createItemRowTemplate(item2, complexTodoLists)).toContain('→ List 2');
      expect(createItemRowTemplate(item3, complexTodoLists)).toContain('→ List 3');
    });

    it('should handle all button states correctly for zero quantity item', () => {
      const zeroItem = { ...baseItem, quantity: 0, auto_add_enabled: true };
      const result = createItemRowTemplate(zeroItem, mockTodoLists);

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
