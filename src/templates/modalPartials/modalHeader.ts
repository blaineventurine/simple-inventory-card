import { ModalConfig } from '@/types/modalConfig';
import { CSS_CLASSES } from '@/utils/constants';

export function modalHeader(config: ModalConfig): string {
  return `
    <div class="modal-header">
      <h3>${config.title}</h3>
      <button class="${CSS_CLASSES.CLOSE_BTN}" ${config.closeAction ? `data-action="${config.closeAction}"` : ''}>
        ×
      </button>
    </div>
  `;
}
