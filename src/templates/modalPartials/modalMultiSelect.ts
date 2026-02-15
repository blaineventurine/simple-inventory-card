export interface ModalMultiSelectConfig {
  id: string;
  placeholder: string;
  options: string[];
}

export function createModalMultiSelect(config: ModalMultiSelectConfig): string {
  return `
    <input type="hidden" id="${config.id}" value="" />
    <div class="modal-multi-select-container">
      <div class="modal-multi-select-trigger" id="${config.id}-trigger">
        <div class="modal-multi-select-chips" id="${config.id}-chips"></div>
        <span class="modal-multi-select-label">${config.placeholder}</span>
      </div>
      <div class="modal-multi-select-dropdown" id="${config.id}-dropdown" style="display: none;">
        <div class="modal-multi-select-options" id="${config.id}-options">
          ${config.options
            .map(
              (option) => `
                <label class="modal-multi-select-option">
                  <input type="checkbox" value="${option}">
                  <span>${option}</span>
                </label>
              `,
            )
            .join('')}
        </div>
        <div class="modal-multi-select-add-new">
          <input type="text" id="${config.id}-new-input" placeholder="Add new..." />
          <button type="button" id="${config.id}-add-btn" class="modal-multi-select-add-btn">+</button>
        </div>
      </div>
    </div>
  `;
}
