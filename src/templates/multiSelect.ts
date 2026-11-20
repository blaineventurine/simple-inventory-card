import { MultiSelectConfig } from '@/types/multiSelectConfig';
import { Utilities } from '@/utils/utilities';
import { ACTIONS } from '@/utils/constants';

/** Filter field: trigger row that expands an inline group of toggle chips (one per option). */
export function createMultiSelect(config: MultiSelectConfig): string {
  return `
    <div class="multi-select-container">
      <div class="multi-select-trigger" id="${config.id}-trigger" data-action="${ACTIONS.TOGGLE_FILTER_DROPDOWN}">
        <span class="multi-select-label" data-placeholder="${config.placeholder}">
          ${config.selected && config.selected.length > 0 ? `${config.selected.length} selected` : config.placeholder}
        </span>
        <ha-icon class="multi-select-arrow" icon="mdi:menu-down" aria-hidden="true"></ha-icon>
      </div>
      <div class="multi-select-dropdown" id="${config.id}-dropdown" hidden>
        ${config.options
          .map((option) => {
            const safeOption = Utilities.sanitizeHtml(option);
            const safeLabel = Utilities.sanitizeHtml(config.labels?.[option] || option);
            return `
              <label class="multi-select-option si-chip si-toggle-chip">
                <input type="checkbox" value="${safeOption}" ${config.selected && config.selected.includes(option) ? 'checked' : ''}>
                <ha-icon class="si-toggle-chip__check" icon="mdi:check" aria-hidden="true"></ha-icon>
                <span>${safeLabel}</span>
              </label>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}
