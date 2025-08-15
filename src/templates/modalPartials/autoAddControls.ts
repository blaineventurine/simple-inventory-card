import { TranslationManager } from '@/services/translationManager';
import { TodoList } from '@/types/todoList';
import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '@/utils/constants';

export function autoAddControls(
  prefix: string,
  todoLists: TodoList[],
  translations: TranslationData,
): string {
  return `
    <div class="auto-add-controls" id="${prefix}-auto-add-controls">
      <div class="auto-add-header">${TranslationManager.localize(
        translations,
        'modal.auto_add_settings',
        undefined,
        'Auto-add Settings',
      )}</div>
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
            ${todoLists.map((list) => `<option value="${list.id}">${list.name}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  `;
}
