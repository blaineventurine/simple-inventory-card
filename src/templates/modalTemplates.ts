import { ELEMENTS, CSS_CLASSES, ACTIONS } from '../utils/constants';
import { TodoList } from '../types/todoList';
import { ModalConfig } from '../types/modalConfig';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';

export function createUnifiedModal(
  todoLists: TodoList[],
  config: ModalConfig,
  translations: TranslationData,
): string {
  const prefix = config.id === ELEMENTS.ADD_MODAL ? 'add' : 'edit';

  return `
    <div id="${config.id}" class="modal">
      <div class="modal-content">

        ${modalHeader(config)}

        <div class="modal-body">
          <div id="${prefix}-validation-message" class="validation-message">
            <span class="validation-text"></span>
          </div>

          ${itemName(prefix, translations)}

          <div class="form-row">
            ${itemQuantity(prefix, translations)}
            ${itemUnit(prefix, translations)}
          </div>

          <div class="form-group">
            ${itemCategory(prefix, translations)}
          </div>

          <div class="form-group">
            ${itemExpiryDate(prefix, translations)}
          </div>
          
          <div class="form-group expiry-threshold-section">
            <label for="${prefix}-${ELEMENTS.EXPIRY_ALERT_DAYS}" class="form-label">
              ${TranslationManager.localize(
                translations,
                'modal.expiry_alert_threshold',
                undefined,
                'Expiry Alert Threshold',
              )}
              <span class="optional">${TranslationManager.localize(
                translations,
                'modal.days_before_expiry',
                undefined,
                '(days before expiry)',
              )}</span>
            </label>
            <input 
              type="number" 
              id="${prefix}-${ELEMENTS.EXPIRY_ALERT_DAYS}" 
              min="1" 
              max="365"
              placeholder="${TranslationManager.localize(
                translations,
                'modal.set_expiry_first',
                undefined,
                'Set expiry date first',
              )}"
              disabled
            />
            <small class="help-text">${TranslationManager.localize(
              translations,
              'modal.expiry_help_text',
              undefined,
              'How many days before expiry to show alerts',
            )}</small>
          </div>

          <div class="form-group auto-add-section">
            <input type="checkbox" id="${prefix}-${ELEMENTS.AUTO_ADD_ENABLED}" class="auto-add-checkbox" />
            <label for="${prefix}-${ELEMENTS.AUTO_ADD_ENABLED}" class="checkbox-label">
              ${TranslationManager.localize(
                translations,
                'modal.auto_add_when_low',
                undefined,
                'Auto-add to todo list when low',
              )}
            </label>

            <div class="auto-add-controls" id="${prefix}-auto-add-controls">
              <div class="form-row">
                <div class="input-group">
                  <label for="${prefix}-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}">
                    ${TranslationManager.localize(
                      translations,
                      'modal.quantity_threshold',
                      undefined,
                      'Quantity Threshold',
                    )}
                  </label>
                  <input 
                    type="number" 
                    id="${prefix}-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}" 
                    min="0"
                    class="auto-add-required"
                    placeholder="${TranslationManager.localize(
                      translations,
                      'modal.minimum_quantity',
                      undefined,
                      'Minimum quantity',
                    )}"
                  />
                </div>

                <div class="input-group">
                  <label for="${prefix}-${ELEMENTS.TODO_LIST}">${TranslationManager.localize(
                    translations,
                    'modal.todo_list',
                    undefined,
                    'Todo List',
                  )}</label>
                  <select id="${prefix}-${ELEMENTS.TODO_LIST}" class="auto-add-required">
                    <option value="">${TranslationManager.localize(
                      translations,
                      'modal.select_list',
                      undefined,
                      'Select list...',
                    )}</option>
                    ${todoLists
                      .map((list) => `<option value="${list.id}">${list.name}</option>`)
                      .join('')}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-buttons">
          <button ${config.primaryButtonId ? `id="${config.primaryButtonId}"` : ''} class="save-btn">${config.primaryButtonText}</button>
          <button class="cancel-btn" ${config.closeAction ? `data-action="${config.closeAction}"` : ''}>
            ${TranslationManager.localize(translations, 'modal.cancel', undefined, 'Cancel')}
          </button>
        </div>
      </div>
    </div>
`;
}

export function createAddModal(todoLists: TodoList[], translations: TranslationData): string {
  return createUnifiedModal(
    todoLists,
    {
      id: ELEMENTS.ADD_MODAL,
      title: TranslationManager.localize(translations, 'modal.add_item', undefined, 'Add Item'),
      primaryButtonText: TranslationManager.localize(
        translations,
        'modal.add_item',
        undefined,
        'Add Item',
      ),
      primaryButtonId: ELEMENTS.ADD_ITEM_BTN,
      closeAction: ACTIONS.CLOSE_ADD_MODAL,
    },
    translations,
  );
}

export function createEditModal(todoLists: TodoList[], translations: TranslationData): string {
  return createUnifiedModal(
    todoLists,
    {
      id: ELEMENTS.EDIT_MODAL,
      title: TranslationManager.localize(translations, 'modal.edit_item', undefined, 'Edit Item'),
      primaryButtonText: TranslationManager.localize(
        translations,
        'modal.save_changes',
        undefined,
        'Save Changes',
      ),
    },
    translations,
  );
}

function modalHeader(config: ModalConfig): string {
  return `
    <div class="modal-header">
      <h3>${config.title}</h3>
      <button class="${CSS_CLASSES.CLOSE_BTN}" ${config.closeAction ? `data-action="${config.closeAction}"` : ''}>
        ×
      </button>
    </div>
  `;
}

function itemName(prefix: string, translations: TranslationData): string {
  return `
    <div class="form-group">
      <label for="${prefix}-${ELEMENTS.NAME}" class="form-label">
        ${TranslationManager.localize(translations, 'modal.name_required', undefined, 'Name *')}
      </label>
      <input type="text" id="${prefix}-${ELEMENTS.NAME}" required />
    </div> 
  `;
}

function itemQuantity(prefix: string, translations: TranslationData): string {
  return `
    <div class="input-group">
      <label for="${prefix}-${ELEMENTS.QUANTITY}">
        ${TranslationManager.localize(translations, 'modal.quantity', undefined, 'Quantity')}
      </label>
      <input type="number" id="${prefix}-${ELEMENTS.QUANTITY}" min="0" />
    </div>
  `;
}

function itemUnit(prefix: string, translations: TranslationData): string {
  return `
    <div class="input-group">
      <label for="${prefix}-${ELEMENTS.UNIT}">
        ${TranslationManager.localize(translations, 'modal.unit', undefined, 'Unit')}
      </label>
      <input type="text" id="${prefix}-${ELEMENTS.UNIT}" placeholder="${TranslationManager.localize(
        translations,
        'modal.unit_placeholder',
        undefined,
        'kg, pcs, etc.',
      )}" />
    </div>
  `;
}

function itemCategory(prefix: string, translations: TranslationData): string {
  return `
    <label for="${prefix}-${ELEMENTS.CATEGORY}" class="form-label">
      ${TranslationManager.localize(translations, 'modal.category', undefined, 'Category')}
    </label>
    <input type="text" id="${prefix}-${ELEMENTS.CATEGORY}" placeholder="${TranslationManager.localize(
      translations,
      'modal.category_placeholder',
      undefined,
      'Food, Cleaning, etc.',
    )}" />
  `;
}

function itemExpiryDate(prefix: string, translations: TranslationData): string {
  return `
    <label for="${prefix}-${ELEMENTS.EXPIRY_DATE}" class="form-label">
      ${TranslationManager.localize(translations, 'modal.expiry_date', undefined, 'Expiry Date')}
    </label>
    <input type="date" id="${prefix}-${ELEMENTS.EXPIRY_DATE}" />
  `;
}
