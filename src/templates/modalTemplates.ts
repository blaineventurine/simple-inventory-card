import { ELEMENTS, ACTIONS, CSS_CLASSES } from '../utils/constants';
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
import { itemLocation } from './modalPartials/itemLocation';
import { itemUnit } from './modalPartials/itemUnit';
import { modalHeader } from './modalPartials/modalHeader';
import { autoAddControls } from './modalPartials/autoAddControls';
import { itemBarcode } from './modalPartials/itemBarcode';
import { itemDescription } from './modalPartials/itemDescription';
import { autoAddIdCheckbox } from './modalPartials/autoAddIdCheckbox';

export function createUnifiedModal(
  todoLists: TodoList[],
  config: ModalConfig,
  translations: TranslationData,
  categories: string[] = [],
  locations: string[] = [],
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
          ${itemDescription(prefix, translations)}
          ${itemBarcode(prefix, translations)}
          ${autoAddIdCheckbox(prefix, translations)}

          <div class="form-row">
            ${itemQuantity(prefix, translations)}
            ${itemUnit(prefix, translations)}
          </div>

          <div class="form-row">
            ${itemCategory(prefix, translations, categories)}
            ${itemLocation(prefix, translations, locations)}
          </div>

          <div class="form-row">
            ${itemExpiryDate(prefix, translations)}
            ${expiryAlertDays(prefix, translations)}
          </div>

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
        ${
          config.showHistory || config.showDelete
            ? `<div class="modal-secondary-actions">
              ${config.showHistory ? `<button id="${ELEMENTS.EDIT_HISTORY_BTN}" class="${CSS_CLASSES.HISTORY_LINK}">${TranslationManager.localize(translations, 'modal.view_history', undefined, 'View History')}</button>` : '<span></span>'}
              ${config.showDelete ? `<button id="${ELEMENTS.EDIT_DELETE_BTN}" class="${CSS_CLASSES.DELETE_BTN}">${TranslationManager.localize(translations, 'modal.delete_item', undefined, 'Delete Item')}</button>` : ''}
            </div>`
            : ''
        }
      </div>
    </div>
  `;
}

export function createAddModal(
  todoLists: TodoList[],
  translations: TranslationData,
  categories: string[],
  locations: string[],
): string {
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
    categories,
    locations,
  );
}

export function createEditModal(
  todoLists: TodoList[],
  translations: TranslationData,
  categories: string[],
  locations: string[],
): string {
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
      showHistory: true,
      showDelete: true,
    },
    translations,
    categories,
    locations,
  );
}
