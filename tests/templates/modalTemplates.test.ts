import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createUnifiedModal,
  createAddModal,
  createEditModal,
} from '../../src/templates/modalTemplates';
import { TodoList } from '../../src/types/todoList';
import { ModalConfig } from '../../src/types/modalConfig';

vi.mock('../../src/utils/constants', () => ({
  ELEMENTS: {
    ADD_MODAL: 'add-modal',
    EDIT_MODAL: 'edit-modal',
    NAME: 'name',
    QUANTITY: 'quantity',
    UNIT: 'unit',
    CATEGORY: 'category',
    EXPIRY_DATE: 'expiry-date',
    EXPIRY_ALERT_DAYS: 'expiry-alert-days',
    AUTO_ADD_ENABLED: 'auto-add-enabled',
    AUTO_ADD_TO_LIST_QUANTITY: 'auto-add-quantity',
    TODO_LIST: 'todo-list',
    ADD_ITEM_BTN: 'add-item-btn',
  },
  CSS_CLASSES: {
    CLOSE_BTN: 'close-btn',
  },
  ACTIONS: {
    CLOSE_ADD_MODAL: 'close_add_modal',
  },
}));

describe('modalTemplates', () => {
  let mockTodoLists: TodoList[];

  beforeEach(() => {
    vi.clearAllMocks();

    mockTodoLists = [
      { id: 'grocery-1', name: 'Grocery List', entity_id: 'todo.grocery' },
      { id: 'shopping-2', name: 'Shopping List', entity_id: 'todo.shopping' },
      { id: 'household-3', name: 'Household Tasks' },
    ];
  });

  describe('createUnifiedModal', () => {
    describe('basic modal structure', () => {
      it('should create modal with correct structure', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test Modal',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('id="test-modal"');
        expect(result).toContain('class="modal"');
        expect(result).toContain('class="modal-content"');
        expect(result).toContain('class="modal-header"');
        expect(result).toContain('class="modal-body"');
        expect(result).toContain('class="modal-buttons"');
      });

      it('should include modal title', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Custom Title',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('<h3>Custom Title</h3>');
      });

      it('should include close button with CSS class', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('class="close-btn"');
        expect(result).toContain('>×</button>');
      });

      it('should include primary button with text', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Custom Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('class="save-btn"');
        expect(result).toContain('>Custom Save</button>');
      });

      it('should include cancel button', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('class="cancel-btn"');
        expect(result).toContain('>Cancel</button>');
      });
    });

    describe('prefix generation', () => {
      it('should use "add" prefix for add modal', () => {
        const config: ModalConfig = {
          id: 'add-modal',
          title: 'Add Item',
          primaryButtonText: 'Add',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('id="add-name"');
        expect(result).toContain('id="add-quantity"');
        expect(result).toContain('id="add-validation-message"');
      });

      it('should use "edit" prefix for non-add modal', () => {
        const config: ModalConfig = {
          id: 'edit-modal',
          title: 'Edit Item',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('id="edit-name"');
        expect(result).toContain('id="edit-quantity"');
        expect(result).toContain('id="edit-validation-message"');
      });

      it('should use "edit" prefix for custom modal ID', () => {
        const config: ModalConfig = {
          id: 'custom-modal',
          title: 'Custom Modal',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('id="edit-name"');
        expect(result).toContain('id="edit-quantity"');
      });
    });

    describe('form fields', () => {
      it('should include all basic form fields', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        // Name field (required)
        expect(result).toContain('id="edit-name"');
        expect(result).toContain('required');
        expect(result).toContain('Name *');

        // Quantity field
        expect(result).toContain('id="edit-quantity"');
        expect(result).toContain('type="number"');
        expect(result).toContain('min="0"');

        // Unit field
        expect(result).toContain('id="edit-unit"');
        expect(result).toContain('placeholder="kg, pcs, etc."');

        // Category field
        expect(result).toContain('id="edit-category"');
        expect(result).toContain('placeholder="Food, Cleaning, etc."');

        // Expiry date field
        expect(result).toContain('id="edit-expiry-date"');
        expect(result).toContain('type="date"');
      });

      it('should include expiry alert days field with proper configuration', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('id="edit-expiry-alert-days"');
        expect(result).toContain('min="1"');
        expect(result).toContain('max="365"');
        expect(result).toContain('placeholder="Set expiry date first"');
        expect(result).toContain('disabled');
        expect(result).toContain('How many days before expiry to show alerts');
      });

      it('should include auto-add checkbox and controls', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        // Auto-add checkbox
        expect(result).toContain('id="edit-auto-add-enabled"');
        expect(result).toContain('type="checkbox"');
        expect(result).toContain('Auto-add to todo list when low');

        // Auto-add controls
        expect(result).toContain('id="edit-auto-add-controls"');
        expect(result).toContain('id="edit-auto-add-quantity"');
        expect(result).toContain('class="auto-add-required"');
        expect(result).toContain('Quantity Threshold');
        expect(result).toContain('placeholder="Minimum quantity"');
      });

      it('should include validation message container', () => {
        const config: ModalConfig = {
          id: 'add-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('id="add-validation-message"');
        expect(result).toContain('class="validation-message"');
        expect(result).toContain('class="validation-text"');
      });
    });

    describe('todo list generation', () => {
      it('should generate todo list options', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('id="edit-todo-list"');
        expect(result).toContain('<option value="">Select list...</option>');
        expect(result).toContain('<option value="grocery-1">Grocery List</option>');
        expect(result).toContain('<option value="shopping-2">Shopping List</option>');
        expect(result).toContain('<option value="household-3">Household Tasks</option>');
      });

      it('should handle empty todo lists array', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal([], config);

        expect(result).toContain('id="edit-todo-list"');
        expect(result).toContain('<option value="">Select list...</option>');
        expect(result).not.toContain('<option value="grocery-1">');
      });

      it('should handle todo lists with special characters', () => {
        const specialTodoLists = [{ id: 'special&id', name: 'List & "Special" <chars>' }];

        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(specialTodoLists, config);

        expect(result).toContain('<option value="special&id">List & "Special" <chars></option>');
      });
    });

    describe('conditional attributes', () => {
      it('should include close action when provided', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
          closeAction: 'close_modal',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('data-action="close_modal"');
        // Should appear on both close button and cancel button
        expect(result.match(/data-action="close_modal"/g)).toHaveLength(2);
      });

      it('should not include close action when not provided', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).not.toContain('data-action=');
      });

      it('should include primary button ID when provided', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
          primaryButtonId: 'save-button',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('id="save-button"');
      });

      it('should not include primary button ID when not provided', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        // Should only contain the modal ID, not a save button ID
        expect(
          result
            .match(/id="[^"]*"/g)
            ?.filter(
              (match) =>
                !match.includes('test-modal') &&
                !match.includes('-name') &&
                !match.includes('-quantity'),
            ),
        ).not.toContain('id="save-button"');
      });
    });

    describe('edge cases', () => {
      it('should handle very long titles', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'A'.repeat(100),
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain(`<h3>${'A'.repeat(100)}</h3>`);
      });

      it('should handle special characters in config', () => {
        const config: ModalConfig = {
          id: 'test&modal',
          title: 'Title & "Special" <chars>',
          primaryButtonText: 'Save & Close',
          primaryButtonId: 'button&id',
          closeAction: 'close&action',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('id="test&modal"');
        expect(result).toContain('<h3>Title & "Special" <chars></h3>');
        expect(result).toContain('>Save & Close</button>');
        expect(result).toContain('id="button&id"');
        expect(result).toContain('data-action="close&action"');
      });

      it('should handle minimal config', () => {
        const config: ModalConfig = {
          id: 'minimal',
          title: '',
          primaryButtonText: '',
        };

        const result = createUnifiedModal(mockTodoLists, config);

        expect(result).toContain('id="minimal"');
        expect(result).toContain('<h3></h3>');
        expect(result).toContain('></button>'); // Empty button text
      });
    });
  });

  describe('createAddModal', () => {
    it('should create add modal with correct configuration', () => {
      const result = createAddModal(mockTodoLists);

      expect(result).toContain('id="add-modal"');
      expect(result).toContain('<h3>Add Item</h3>');
      expect(result).toContain('>Add Item</button>');
      expect(result).toContain('id="add-item-btn"');
      expect(result).toContain('data-action="close_add_modal"');
    });

    it('should use add prefix for form fields', () => {
      const result = createAddModal(mockTodoLists);

      expect(result).toContain('id="add-name"');
      expect(result).toContain('id="add-quantity"');
      expect(result).toContain('id="add-category"');
      expect(result).toContain('id="add-expiry-date"');
      expect(result).toContain('id="add-auto-add-enabled"');
      expect(result).toContain('id="add-todo-list"');
    });

    it('should include todo list options', () => {
      const result = createAddModal(mockTodoLists);

      expect(result).toContain('<option value="grocery-1">Grocery List</option>');
      expect(result).toContain('<option value="shopping-2">Shopping List</option>');
      expect(result).toContain('<option value="household-3">Household Tasks</option>');
    });

    it('should handle empty todo lists', () => {
      const result = createAddModal([]);

      expect(result).toContain('id="add-modal"');
      expect(result).toContain('<option value="">Select list...</option>');
      expect(result).not.toContain('<option value="grocery-1">');
    });
  });

  describe('createEditModal', () => {
    it('should create edit modal with correct configuration', () => {
      const result = createEditModal(mockTodoLists);

      expect(result).toContain('id="edit-modal"');
      expect(result).toContain('<h3>Edit Item</h3>');
      expect(result).toContain('>Save Changes</button>');
    });

    it('should not include button ID or close action', () => {
      const result = createEditModal(mockTodoLists);

      expect(result).not.toContain('id="add-item-btn"');
      expect(result).not.toContain('data-action="close_add_modal"');
    });

    it('should use edit prefix for form fields', () => {
      const result = createEditModal(mockTodoLists);

      expect(result).toContain('id="edit-name"');
      expect(result).toContain('id="edit-quantity"');
      expect(result).toContain('id="edit-category"');
      expect(result).toContain('id="edit-expiry-date"');
      expect(result).toContain('id="edit-auto-add-enabled"');
      expect(result).toContain('id="edit-todo-list"');
    });

    it('should include todo list options', () => {
      const result = createEditModal(mockTodoLists);

      expect(result).toContain('<option value="grocery-1">Grocery List</option>');
      expect(result).toContain('<option value="shopping-2">Shopping List</option>');
      expect(result).toContain('<option value="household-3">Household Tasks</option>');
    });

    it('should handle empty todo lists', () => {
      const result = createEditModal([]);

      expect(result).toContain('id="edit-modal"');
      expect(result).toContain('<option value="">Select list...</option>');
      expect(result).not.toContain('<option value="grocery-1">');
    });
  });

  describe('HTML structure validation', () => {
    it('should produce valid nested HTML structure', () => {
      const result = createAddModal(mockTodoLists);

      // Check modal structure
      expect(result).toMatch(/<div id="add-modal" class="modal">[\s\S]*<\/div>/);
      expect(result).toMatch(/<div class="modal-content">[\s\S]*<\/div>/);
      expect(result).toMatch(/<div class="modal-header">[\s\S]*<\/div>/);
      expect(result).toMatch(/<div class="modal-body">[\s\S]*<\/div>/);
      expect(result).toMatch(/<div class="modal-buttons">[\s\S]*<\/div>/);
    });

    it('should have proper form structure', () => {
      const result = createAddModal(mockTodoLists);

      // Check form groups
      expect(result).toMatch(/<div class="form-group">[\s\S]*?<\/div>/g);
      expect(result).toMatch(/<div class="form-row">[\s\S]*?<\/div>/g);
      expect(result).toMatch(/<div class="input-group">[\s\S]*?<\/div>/g);
    });

    it('should have consistent labeling', () => {
      const result = createAddModal(mockTodoLists);

      // Check that each input has a corresponding label
      expect(result).toContain('for="add-name"');
      expect(result).toContain('for="add-quantity"');
      expect(result).toContain('for="add-unit"');
      expect(result).toContain('for="add-category"');
      expect(result).toContain('for="add-expiry-date"');
      expect(result).toContain('for="add-expiry-alert-days"');
      expect(result).toContain('for="add-auto-add-enabled"');
      expect(result).toContain('for="add-auto-add-quantity"');
      expect(result).toContain('for="add-todo-list"');
    });
  });

  describe('comparison between add and edit modals', () => {
    it('should have same structure but different IDs and content', () => {
      const addResult = createAddModal(mockTodoLists);
      const editResult = createEditModal(mockTodoLists);

      // Both should have modal structure
      expect(addResult).toContain('class="modal"');
      expect(editResult).toContain('class="modal"');

      // Different IDs
      expect(addResult).toContain('id="add-modal"');
      expect(editResult).toContain('id="edit-modal"');

      // Different titles
      expect(addResult).toContain('<h3>Add Item</h3>');
      expect(editResult).toContain('<h3>Edit Item</h3>');

      // Different button text
      expect(addResult).toContain('>Add Item</button>');
      expect(editResult).toContain('>Save Changes</button>');

      // Different field prefixes
      expect(addResult).toContain('id="add-name"');
      expect(editResult).toContain('id="edit-name"');
    });

    it('should both include same todo list options', () => {
      const addResult = createAddModal(mockTodoLists);
      const editResult = createEditModal(mockTodoLists);

      mockTodoLists.forEach((list) => {
        const optionHtml = `<option value="${list.id}">${list.name}</option>`;
        expect(addResult).toContain(optionHtml);
        expect(editResult).toContain(optionHtml);
      });
    });
  });
});
