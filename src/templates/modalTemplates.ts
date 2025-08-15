import { ELEMENTS, ACTIONS } from '../utils/constants';
import { TodoList } from '../types/todoList';
import { ModalConfig } from '../types/modalConfig';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { autoAddCheckbox } from './modalPartials/autoAddCheckbox';
import { expiryAlertDays } from './modalPartials/expiryAlertDays';
import { itemCategory } from './modalPartials/itemCategory';
import { itemExpiryDate } from './modalPartials/itemExpiryDate';
import { itemName } from './modalPartials/itemName';
import { itemQuantity } from './modalPartials/itemQuantity';
import { itemUnit } from './modalPartials/itemUnit';
import { modalHeader } from './modalPartials/modalHeader';
import { autoAddControls } from './modalPartials/autoAddControls';

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

          ${itemCategory(prefix, translations)}
          ${itemExpiryDate(prefix, translations)}
          ${expiryAlertDays(prefix, translations)}

          <div class="form-group auto-add-section">
            ${autoAddCheckbox(prefix, translations)}
            ${autoAddControls(prefix, todoLists, translations)}
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
