import { ELEMENTS, CSS_CLASSES, ACTIONS } from '../utils/constants';
import { TodoList } from '../types/todoList';
import { ModalConfig } from '../types/modalConfig';

export function createUnifiedModal(todoLists: TodoList[], config: ModalConfig): string {
  const prefix = config.id === ELEMENTS.ADD_MODAL ? 'add' : 'edit';

  return `
    <div id="${config.id}" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${config.title}</h3>
          <button class="${CSS_CLASSES.CLOSE_BTN}" ${config.closeAction ? `data-action="${config.closeAction}"` : ''}>×</button>
        </div>

        <div class="modal-body">
          <!-- Add validation message container -->
          <div id="${prefix}-validation-message" class="validation-message">
            <span class="validation-text"></span>
          </div>

          <div class="form-group">
            <label for="${prefix}-${ELEMENTS.NAME}" class="form-label">Name *</label>
            <input type="text" id="${prefix}-${ELEMENTS.NAME}" required />
          </div>
          
          <div class="form-row">
            <div class="input-group">
              <label for="${prefix}-${ELEMENTS.QUANTITY}">Quantity</label>
              <input type="number" id="${prefix}-${ELEMENTS.QUANTITY}" min="0" />
            </div>
            
            <div class="input-group">
              <label for="${prefix}-${ELEMENTS.UNIT}">Unit</label>
              <input type="text" id="${prefix}-${ELEMENTS.UNIT}" placeholder="kg, pcs, etc." />
            </div>
          </div>
          
          <div class="form-group">
            <label for="${prefix}-${ELEMENTS.CATEGORY}" class="form-label">Category</label>
            <input type="text" id="${prefix}-${ELEMENTS.CATEGORY}" placeholder="Food, Cleaning, etc." />
          </div>
          
          <div class="form-group">
            <label for="${prefix}-${ELEMENTS.EXPIRY_DATE}" class="form-label">Expiry Date</label>
            <input type="date" id="${prefix}-${ELEMENTS.EXPIRY_DATE}" />
          </div>
          
          <div class="form-group expiry-threshold-section">
            <label for="${prefix}-${ELEMENTS.EXPIRY_ALERT_DAYS}" class="form-label">
              Expiry Alert Threshold
              <span class="optional">(days before expiry)</span>
            </label>
            <input 
              type="number" 
              id="${prefix}-${ELEMENTS.EXPIRY_ALERT_DAYS}" 
              min="1" 
              max="365"
              placeholder="Set expiry date first"
              disabled
            />
            <small class="help-text">How many days before expiry to show alerts</small>
          </div>
          
          <div class="form-group auto-add-section">
            <input type="checkbox" id="${prefix}-${ELEMENTS.AUTO_ADD_ENABLED}" class="auto-add-checkbox" />
            <label for="${prefix}-${ELEMENTS.AUTO_ADD_ENABLED}" class="checkbox-label">
              Auto-add to todo list when low
            </label>
            
            <div class="auto-add-controls" id="${prefix}-auto-add-controls">
              <div class="form-row">
                <div class="input-group">
                  <label for="${prefix}-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}">
                    Quantity Threshold
                  </label>
                  <input 
                    type="number" 
                    id="${prefix}-${ELEMENTS.AUTO_ADD_TO_LIST_QUANTITY}" 
                    min="0"
                    class="auto-add-required"
                    placeholder="Minimum quantity"
                  />
                </div>
                
                <div class="input-group">
                  <label for="${prefix}-${ELEMENTS.TODO_LIST}">Todo List</label>
                  <select id="${prefix}-${ELEMENTS.TODO_LIST}" class="auto-add-required">
                    <option value="">Select list...</option>
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
          <button class="cancel-btn" ${config.closeAction ? `data-action="${config.closeAction}"` : ''}>Cancel</button>
        </div>
      </div>
    </div>
  `;
}

export function createAddModal(todoLists: TodoList[]): string {
  return createUnifiedModal(todoLists, {
    id: ELEMENTS.ADD_MODAL,
    title: 'Add Item',
    primaryButtonText: 'Add Item',
    primaryButtonId: ELEMENTS.ADD_ITEM_BTN,
    closeAction: ACTIONS.CLOSE_ADD_MODAL,
  });
}

export function createEditModal(todoLists: TodoList[]): string {
  return createUnifiedModal(todoLists, {
    id: ELEMENTS.EDIT_MODAL,
    title: 'Edit Item',
    primaryButtonText: 'Save Changes',
  });
}
