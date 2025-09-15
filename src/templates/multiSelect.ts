import { MultiSelectConfig } from '@/types/multiSelectConfig';

export function createMultiSelect(config: MultiSelectConfig): string {
  return `
    <div class="multi-select-container">
      <div class="multi-select-trigger" id="${config.id}-trigger">
        <span class="multi-select-label">
          ${config.selected.length > 0 ? `${config.selected.length} selected` : config.placeholder}
        </span>
        <span class="multi-select-arrow">▼</span>
      </div>
      <div class="multi-select-dropdown" id="${config.id}-dropdown" style="display: none;">
        ${config.options
          .map(
            (option) => `
              <label class="multi-select-option">
                <input type="checkbox" value="${option}" ${config.selected.includes(option) ? 'checked' : ''}>
                <span>${option}</span>
              </label>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}
