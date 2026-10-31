import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createUnifiedModal,
  createAddModal,
  createEditModal,
} from '../../src/templates/modalTemplates';
import { TodoList } from '../../src/types/todoList';
import { ModalConfig } from '../../src/types/modalConfig';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

vi.mock('../../src/utils/constants', () => ({
  ELEMENTS: {
    ADD_MODAL: 'add-modal',
    EDIT_MODAL: 'edit-modal',
    NAME: 'name',
    ICON: 'icon',
    QUANTITY: 'quantity',
    UNIT: 'unit',
    CATEGORY: 'category',
    EXPIRY_DATE: 'expiry-date',
    EXPIRY_ALERT_DAYS: 'expiry-alert-days',
    AUTO_ADD_ENABLED: 'auto-add-enabled',
    AUTO_ADD_TO_LIST_QUANTITY: 'auto-add-quantity',
    TODO_LIST: 'todo-list',
    ADD_ITEM_BTN: 'add-item-btn',
    EDIT_BATCH_EDITOR: 'edit-batch-editor',
    EDIT_HISTORY_BTN: 'edit-history-btn',
    EDIT_DELETE_BTN: 'edit-delete-btn',
    ADD_DUPLICATE_BATCH: 'add-duplicate-batch',
  },
  CSS_CLASSES: {
    CANCEL_BTN: 'cancel-btn',
    CLOSE_BTN: 'close-btn',
    DELETE_BTN: 'delete-btn',
    HISTORY_LINK: 'history-link',
    MODAL_CONTENT: 'modal-content',
    SAVE_BTN: 'save-btn',
  },
  ACTIONS: {
    CLOSE_ADD_MODAL: 'close_add_modal',
  },
}));
describe('modalTemplates', () => {
  let mockTodoLists: TodoList[];
  let mockTranslations: TranslationData;
  let mockCategories: string[];
  let mockLocations: string[];

  beforeEach(() => {
    vi.clearAllMocks();

    mockTodoLists = [
      { id: 'grocery-1', name: 'Grocery List', entity_id: 'todo.grocery' },
      { id: 'shopping-2', name: 'Shopping List', entity_id: 'todo.shopping' },
      { id: 'household-3', name: 'Household Tasks' },
    ];

    mockCategories = ['Food', 'Cleaning', 'Tools', 'Supplies'];

    mockLocations = ['Pantry', 'Fridge', 'Garage', 'Bathroom'];

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
        expect(result).toContain('class="modal si-sheet"');
        expect(result).toContain('class="modal-content si-sheet__panel"');
        expect(result).toContain('class="si-sheet__header"');
        expect(result).toContain('class="si-sheet__body"');
        expect(result).toContain('class="si-sheet__actions"');
      });

      it('should include modal title', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Custom Title',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain(
          '<h3 id="test-modal-title" class="si-sheet__title">Custom Title</h3>',
        );
      });

      it('should include close button with CSS class', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Save',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain('class="si-icon-btn close-btn"');
        expect(result).toContain('aria-label="Close"');
        expect(result).toContain('icon="mdi:close"');
        expect(result).toContain('</button>');
      });

      it('should include primary button with text', () => {
        const config: ModalConfig = {
          id: 'test-modal',
          title: 'Test',
          primaryButtonText: 'Custom Save',
        };

        const result = createUnifiedModal(mockTodoLists, config, mockTranslations);

        expect(result).toContain('class="si-filled-btn save-btn"');
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

        expect(result).toContain('class="si-tonal-btn cancel-btn"');
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
      const result = createAddModal(mockTodoLists, mockTranslations, mockCategories, mockLocations);

      expect(result).toContain('id="add-modal"');
      expect(result).toContain('Add Item');
      expect(result).toContain('id="add-item-btn"');
      expect(result).toContain('data-action="close_add_modal"');
    });

    it('should use add prefix for form fields', () => {
      const result = createAddModal(mockTodoLists, mockTranslations, mockCategories, mockLocations);

      expect(result).toContain('id="add-name"');
      expect(result).toContain('id="add-quantity"');
      expect(result).toContain('id="add-category"');
      expect(result).toContain('id="add-expiry-date"');
      expect(result).toContain('id="add-auto-add-enabled"');
      expect(result).toContain('id="add-todo-list"');
    });

    it('should include todo list options', () => {
      const result = createAddModal(mockTodoLists, mockTranslations, mockCategories, mockLocations);

      expect(result).toContain('value="grocery-1"');
      expect(result).toContain('Grocery List');
      expect(result).toContain('value="shopping-2"');
      expect(result).toContain('Shopping List');
      expect(result).toContain('value="household-3"');
      expect(result).toContain('Household Tasks');
    });

    it('should handle empty todo lists', () => {
      const result = createAddModal([], mockTranslations, mockCategories, mockLocations);

      expect(result).toContain('id="add-modal"');
      expect(result).toContain('Select list...');
      expect(result).not.toContain('value="grocery-1"');
    });
  });

  describe('createEditModal', () => {
    it('should create edit modal with correct configuration', () => {
      const result = createEditModal(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
      );

      expect(result).toContain('id="edit-modal"');
      expect(result).toContain('Edit Item');
      expect(result).toContain('Save Changes');
    });

    it('should not include button ID or close action', () => {
      const result = createEditModal(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
      );

      expect(result).not.toContain('id="add-item-btn"');
      expect(result).not.toContain('data-action="close_add_modal"');
    });

    it('should use edit prefix for form fields', () => {
      const result = createEditModal(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
      );

      expect(result).toContain('id="edit-name"');
      expect(result).toContain('id="edit-quantity"');
      expect(result).toContain('id="edit-category"');
      expect(result).toContain('id="edit-expiry-date"');
      expect(result).toContain('id="edit-auto-add-enabled"');
      expect(result).toContain('id="edit-todo-list"');
    });

    it('should include todo list options', () => {
      const result = createEditModal(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
      );

      expect(result).toContain('value="grocery-1"');
      expect(result).toContain('Grocery List');
      expect(result).toContain('value="shopping-2"');
      expect(result).toContain('Shopping List');
      expect(result).toContain('value="household-3"');
      expect(result).toContain('Household Tasks');
    });

    it('should handle empty todo lists', () => {
      const result = createEditModal([], mockTranslations, mockCategories, mockLocations);

      expect(result).toContain('id="edit-modal"');
      expect(result).toContain('Select list...');
      expect(result).not.toContain('value="grocery-1"');
    });
  });

  describe('comparison between add and edit modals', () => {
    it('should have same structure but different IDs and content', () => {
      const addResult = createAddModal(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
      );
      const editResult = createEditModal(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
      );

      // Both should have modal structure
      expect(addResult).toContain('class="modal si-sheet"');
      expect(editResult).toContain('class="modal si-sheet"');

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
      const addResult = createAddModal(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
      );
      const editResult = createEditModal(
        mockTodoLists,
        mockTranslations,
        mockCategories,
        mockLocations,
      );

      mockTodoLists.forEach((list) => {
        expect(addResult).toContain(`value="${list.id}"`);
        expect(addResult).toContain(list.name);
        expect(editResult).toContain(`value="${list.id}"`);
        expect(editResult).toContain(list.name);
      });
    });
  });

  describe('batches', () => {
    it('renders the batch editor container only in the edit modal with batches enabled', () => {
      expect(
        createEditModal(mockTodoLists, mockTranslations, mockCategories, mockLocations),
      ).not.toContain('id="edit-batch-editor"');
      expect(
        createEditModal(mockTodoLists, mockTranslations, mockCategories, mockLocations, true),
      ).toContain('id="edit-batch-editor"');
      expect(
        createAddModal(mockTodoLists, mockTranslations, mockCategories, mockLocations),
      ).not.toContain('batch-editor');
    });

    it('wraps the expiry date in a group the batch editor can hide', () => {
      expect(
        createEditModal(mockTodoLists, mockTranslations, mockCategories, mockLocations),
      ).toContain('id="edit-expiry-date-group"');
    });
  });

  describe('item icon field', () => {
    const addConfig: ModalConfig = {
      id: 'add-modal',
      title: 'Add Item',
      primaryButtonText: 'Add Item',
    };

    it('renders no icon field without showIconField', () => {
      const result = createUnifiedModal(mockTodoLists, addConfig, mockTranslations);

      expect(result).not.toContain('id="add-icon"');
    });

    it('renders the icon field between name and description with showIconField', () => {
      const result = createUnifiedModal(
        mockTodoLists,
        { ...addConfig, showIconField: true },
        mockTranslations,
      );
      const name = result.indexOf('id="add-name"');
      const icon = result.indexOf('id="add-icon"');
      const description = result.indexOf('<textarea');

      expect(name).toBeGreaterThan(-1);
      expect(icon).toBeGreaterThan(name);
      expect(description).toBeGreaterThan(icon);
    });

    it('passes the item icons flag through createAddModal and createEditModal', () => {
      expect(createAddModal(mockTodoLists, mockTranslations, [], [], false, true)).toContain(
        'id="add-icon"',
      );
      expect(createEditModal(mockTodoLists, mockTranslations, [], [], false, true)).toContain(
        'id="edit-icon"',
      );
      expect(createAddModal(mockTodoLists, mockTranslations, [], [])).not.toContain(
        'id="add-icon"',
      );
      expect(createEditModal(mockTodoLists, mockTranslations, [], [])).not.toContain(
        'id="edit-icon"',
      );
    });
  });

  describe('sheet layout', () => {
    function parse(html: string): HTMLElement {
      const container = document.createElement('div');
      container.innerHTML = html;
      return container;
    }

    function sectionOf(element: Element | null | undefined): string | undefined {
      return element
        ?.closest('.si-form-section')
        ?.querySelector('.si-form-section__label')
        ?.textContent?.trim();
    }

    it('labels the fields in their existing order', () => {
      const form = parse(
        createEditModal(mockTodoLists, mockTranslations, mockCategories, mockLocations, true),
      );

      expect(
        [...form.querySelectorAll('.si-form-section__label')].map((label) =>
          label.textContent?.trim(),
        ),
      ).toEqual([
        'Details',
        'Barcodes & names',
        'Stock',
        'Where & what',
        'Expiry',
        'Batches',
        'Shopping list',
      ]);
      expect(sectionOf(form.querySelector('#edit-name'))).toBe('Details');
      expect(sectionOf(form.querySelector('textarea'))).toBe('Details');
      expect(sectionOf(form.querySelector('.barcode-tag-container'))).toBe('Barcodes & names');
      expect(sectionOf(form.querySelector('.alias-tag-container'))).toBe('Barcodes & names');
      expect(sectionOf(form.querySelector('.auto-add-id-container'))).toBe('Barcodes & names');
      expect(sectionOf(form.querySelector('#edit-quantity'))).toBe('Stock');
      expect(sectionOf(form.querySelector('input[step="0.01"]'))).toBe('Stock');
      expect(sectionOf(form.querySelector('#edit-category'))).toBe('Where & what');
      expect(sectionOf(form.querySelectorAll('.modal-multi-select-container')[1])).toBe(
        'Where & what',
      );
      expect(sectionOf(form.querySelector('#edit-expiry-alert-days'))).toBe('Expiry');
      expect(sectionOf(form.querySelector('#edit-batch-editor'))).toBe('Batches');
      expect(sectionOf(form.querySelector('#edit-todo-list'))).toBe('Shopping list');
    });

    it('keeps short pairs side by side and category/location full width', () => {
      const form = parse(
        createEditModal(mockTodoLists, mockTranslations, mockCategories, mockLocations),
      );
      const pairOf = (selector: string): Element | null | undefined =>
        form.querySelector(selector)?.closest('.si-field-row');

      expect(pairOf('#edit-quantity')).not.toBeNull();
      expect(pairOf('#edit-quantity')).toBe(pairOf('#edit-unit'));
      expect(pairOf('#edit-expiry-date')).not.toBeNull();
      expect(pairOf('#edit-expiry-date')).toBe(pairOf('#edit-expiry-alert-days'));
      expect(pairOf('#edit-category')).toBeNull();
    });

    it('renders checkboxes as switches next to the auto-add controls they reveal', () => {
      const form = parse(
        createAddModal(mockTodoLists, mockTranslations, mockCategories, mockLocations),
      );
      const autoAdd = form.querySelector('#add-auto-add-enabled');

      expect(autoAdd?.classList.contains('si-switch')).toBe(true);
      expect(autoAdd?.getAttribute('role')).toBe('switch');
      expect(autoAdd?.parentElement?.querySelector(':scope > .auto-add-controls')).not.toBeNull();
      const appendId = form.querySelector('.auto-add-id-container input[type="checkbox"]');
      expect(appendId?.classList.contains('si-switch')).toBe(true);
      expect(appendId?.getAttribute('role')).toBe('switch');
    });

    it('shows the validation banner first in the body', () => {
      const form = parse(
        createAddModal(mockTodoLists, mockTranslations, mockCategories, mockLocations),
      );
      const banner = form.querySelector('#add-validation-message');

      expect(form.querySelector('.si-sheet__body')?.firstElementChild).toBe(banner);
      expect(banner?.getAttribute('role')).toBe('alert');
      expect(banner?.querySelector('.validation-text')).not.toBeNull();
    });

    it('gives the add sheet Cancel and Add, without a menu', () => {
      const form = parse(
        createAddModal(mockTodoLists, mockTranslations, mockCategories, mockLocations),
      );
      const buttons = [...form.querySelectorAll('.si-sheet__actions > button')];

      expect(buttons.map((button) => button.className)).toEqual([
        'si-tonal-btn cancel-btn',
        'si-filled-btn save-btn',
      ]);
      expect(buttons[0].getAttribute('data-action')).toBe('close_add_modal');
      expect(buttons[1].id).toBe('add-item-btn');
      expect(form.querySelector('.si-sheet__menu')).toBeNull();
    });

    it('moves View history and Delete into the edit sheet ⋮ menu', () => {
      const form = parse(
        createEditModal(mockTodoLists, mockTranslations, mockCategories, mockLocations),
      );
      const menu = form.querySelector('#edit-modal-menu');

      expect(menu?.querySelector('summary')?.getAttribute('aria-label')).toBe('More actions');
      const history = menu?.querySelector('#edit-history-btn');
      expect(history?.classList.contains('history-link')).toBe(true);
      expect(history?.textContent?.trim()).toBe('View history');
      const remove = menu?.querySelector('#edit-delete-btn');
      expect(remove?.classList.contains('delete-btn')).toBe(true);
      expect(remove?.textContent?.trim()).toBe('Delete item');
      expect(
        [...form.querySelectorAll('.si-sheet__actions > button')].map((button) => button.className),
      ).toEqual(['si-tonal-btn cancel-btn', 'si-filled-btn save-btn']);
    });
  });
});
