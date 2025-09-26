import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createUnifiedModal,
  createAddModal,
  createEditModal,
} from '../../src/templates/modalTemplates';
import { TodoList } from '../../src/types/todoList';
import { ModalConfig } from '../../src/types/modalConfig';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn((_translations: any, _key: string, _params: any, fallback: string) => {
      return fallback;
    }),
  },
}));

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
  let mockTranslations: TranslationData;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTodoLists = [
      { id: 'grocery-1', name: 'Grocery List', entity_id: 'todo.grocery' },
      { id: 'shopping-2', name: 'Shopping List', entity_id: 'todo.shopping' },
      { id: 'household-3', name: 'Household Tasks' },
    ];

    mockTranslations = {
      modal: {
        name_required: 'Name *',
        quantity: 'Quantity',
        unit: 'Unit',
        unit_placeholder: 'kg, pcs, etc.',
        category: 'Category',
        category_placeholder: 'Food, Cleaning, etc.',
        expiry_date: 'Expiry Date',
        expiry_alert_threshold: 'Expiry Alert Threshold',
        days_before_expiry: '(days before expiry)',
        set_expiry_first: 'Set expiry date first',
        expiry_help_text: 'How many days before expiry to show alerts',
        auto_add_when_low: 'Auto-add to todo list when low',
        quantity_threshold: 'Quantity Threshold',
        minimum_quantity: 'Minimum quantity',
        todo_list: 'Todo List',
        select_list: 'Select list...',
        cancel: 'Cancel',
        add_item: 'Add Item',
        edit_item: 'Edit Item',
        save_changes: 'Save Changes',
        auto_add_settings: 'Auto-add Settings',
      },
    };
  });

  describe('createUnifiedModal', () => {
    describe('basic modal structure', () => {
      it('should create modal with correct structure', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test Modal',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

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

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain('<h3>');
        expect(result).toContain('Custom Title');
        expect(result).toContain('</h3>');
      });

      it('should include close button with CSS class', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain('class="close-btn"');
        expect(result).toContain('×');
        expect(result).toContain('</button>');
      });

      it('should include primary button with text', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Custom Save',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain('class="save-btn"');
        expect(result).toContain('Custom Save');
        expect(result).toContain('</button>');
      });

      it('should include cancel button', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain('class="cancel-btn"');
        expect(result).toContain('Cancel');
        expect(result).toContain('</button>');
      });
    });

    describe('form fields', () => {
      it('should include all basic form fields', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

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
        expect(result).toContain('kg, pcs, etc.');

        // Category field
        expect(result).toContain('id="edit-category"');
        expect(result).toContain('Food, Tools, Supplies, etc.');

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

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain('id="edit-expiry-alert-days"');
        expect(result).toContain('min="1"');
        expect(result).toContain('max="365"');
        expect(result).toContain('Set expiry date first');
        expect(result).toContain('disabled');
        expect(result).toContain('How many days before expiry to show alerts');
      });

      it('should include auto-add checkbox and controls', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        // Auto-add checkbox
        expect(result).toContain('id="edit-auto-add-enabled"');
        expect(result).toContain('type="checkbox"');
        expect(result).toContain('Auto-add to todo list when low');

        // Auto-add controls
        expect(result).toContain('id="edit-auto-add-controls"');
        expect(result).toContain('id="edit-auto-add-quantity"');
        expect(result).toContain('class="auto-add-required"');
        expect(result).toContain('Quantity Threshold');
        expect(result).toContain('Minimum quantity');
        expect(result).toContain('Auto-add Settings');
      });
    });

    describe('todo list generation', () => {
      it('should generate todo list options', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain('id="edit-todo-list"');
        expect(result).toContain('value=""');
        expect(result).toContain('Select list...');
        expect(result).toContain('value="grocery-1"');
        expect(result).toContain('Grocery List');
        expect(result).toContain('value="shopping-2"');
        expect(result).toContain('Shopping List');
        expect(result).toContain('value="household-3"');
        expect(result).toContain('Household Tasks');
      });

      it('should handle empty todo lists array', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal([], config, mockTranslations);

        expect(result).toContain('id="edit-todo-list"');
        expect(result).toContain('Select list...');
        expect(result).not.toContain('value="grocery-1"');
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

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain('data-action="close_modal"');
        expect(result.match(/data-action="close_modal"/g)).toHaveLength(2);
      });

      it('should include primary button ID when provided', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
          primaryButtonId: 'save-button',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain('id="save-button"');
      });
    });
  });

  describe('createAddModal', () => {
    it('should create add modal with correct configuration', () => {
      const result = createAddModal(mockTodoLists, mockTranslations);

      expect(result).toContain('id="add-modal"');
      expect(result).toContain('Add Item');
      expect(result).toContain('id="add-item-btn"');
      expect(result).toContain('data-action="close_add_modal"');
    });

    it('should use add prefix for form fields', () => {
      const result = createAddModal(mockTodoLists, mockTranslations);

      expect(result).toContain('id="add-name"');
      expect(result).toContain('id="add-quantity"');
      expect(result).toContain('id="add-category"');
      expect(result).toContain('id="add-expiry-date"');
      expect(result).toContain('id="add-auto-add-enabled"');
      expect(result).toContain('id="add-todo-list"');
    });

    it('should include todo list options', () => {
      const result = createAddModal(mockTodoLists, mockTranslations);

      expect(result).toContain('value="grocery-1"');
      expect(result).toContain('Grocery List');
      expect(result).toContain('value="shopping-2"');
      expect(result).toContain('Shopping List');
      expect(result).toContain('value="household-3"');
      expect(result).toContain('Household Tasks');
    });

    it('should handle empty todo lists', () => {
      const result = createAddModal([], mockTranslations);

      expect(result).toContain('id="add-modal"');
      expect(result).toContain('Select list...');
      expect(result).not.toContain('value="grocery-1"');
    });
  });

  describe('createEditModal', () => {
    it('should create edit modal with correct configuration', () => {
      const result = createEditModal(mockTodoLists, mockTranslations);

      expect(result).toContain('id="edit-modal"');
      expect(result).toContain('Edit Item');
      expect(result).toContain('Save Changes');
    });

    it('should not include button ID or close action', () => {
      const result = createEditModal(mockTodoLists, mockTranslations);

      expect(result).not.toContain('id="add-item-btn"');
      expect(result).not.toContain('data-action="close_add_modal"');
    });

    it('should use edit prefix for form fields', () => {
      const result = createEditModal(mockTodoLists, mockTranslations);

      expect(result).toContain('id="edit-name"');
      expect(result).toContain('id="edit-quantity"');
      expect(result).toContain('id="edit-category"');
      expect(result).toContain('id="edit-expiry-date"');
      expect(result).toContain('id="edit-auto-add-enabled"');
      expect(result).toContain('id="edit-todo-list"');
    });

    it('should include todo list options', () => {
      const result = createEditModal(mockTodoLists, mockTranslations);

      expect(result).toContain('value="grocery-1"');
      expect(result).toContain('Grocery List');
      expect(result).toContain('value="shopping-2"');
      expect(result).toContain('Shopping List');
      expect(result).toContain('value="household-3"');
      expect(result).toContain('Household Tasks');
    });

    it('should handle empty todo lists', () => {
      const result = createEditModal([], mockTranslations);

      expect(result).toContain('id="edit-modal"');
      expect(result).toContain('Select list...');
      expect(result).not.toContain('value="grocery-1"');
    });
  });

  describe('comparison between add and edit modals', () => {
    it('should have same structure but different IDs and content', () => {
      const addResult = createAddModal(mockTodoLists, mockTranslations);
      const editResult = createEditModal(mockTodoLists, mockTranslations);

      // Both should have modal structure
      expect(addResult).toContain('class="modal"');
      expect(editResult).toContain('class="modal"');

      // Different IDs
      expect(addResult).toContain('id="add-modal"');
      expect(editResult).toContain('id="edit-modal"');

      // Different titles
      expect(addResult).toContain('Add Item');
      expect(editResult).toContain('Edit Item');

      // Different button text
      expect(addResult).toContain('Add Item');
      expect(editResult).toContain('Save Changes');

      // Different field prefixes
      expect(addResult).toContain('id="add-name"');
      expect(editResult).toContain('id="edit-name"');
    });

    it('should both include same todo list options', () => {
      const addResult = createAddModal(mockTodoLists, mockTranslations);
      const editResult = createEditModal(mockTodoLists, mockTranslations);

      mockTodoLists.forEach((list) => {
        expect(addResult).toContain(`value="${list.id}"`);
        expect(addResult).toContain(list.name);
        expect(editResult).toContain(`value="${list.id}"`);
        expect(editResult).toContain(list.name);
      });
    });
  });
});
