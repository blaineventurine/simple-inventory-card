import { CSS_CLASSES } from '@/utils/constants';
import { Utilities } from '@/utils/utilities';
import { Attrs, iconButton } from './primitives';

export interface SheetOptions {
  /** Id of the `.modal` overlay; existing modal ids stay the hooks. */
  id: string;
  title: string;
  /** Accessible name of the ✕ button. */
  closeLabel: string;
  bodyHtml: string;
  /** Buttons of the bottom action bar; '' (and no menu) renders no bar. */
  actionsHtml: string;
  /** ⋮ menu at the start of the action bar; its `<details>` gets the id `${id}-menu`. */
  menu?: { label: string; itemsHtml: string };
  className?: string;
  /** Extra attributes for the ✕ button, e.g. its `data-action`. */
  closeAttrs?: Attrs;
}

/**
 * Dialog frame shared by every sheet: header (title + ✕), scrolling body, bottom action bar.
 * Bottom sheet at ≤ 600px, centred dialog above (styles/modals.ts). Opening/closing, Esc and
 * focus return live in services/modals/modalUIManager (`showSheet` / `hideSheet`).
 */
export function sheet(o: SheetOptions): string {
  const id = Utilities.sanitizeHtml(o.id);
  const className = o.className ? ` ${Utilities.sanitizeHtml(o.className)}` : '';
  let menuHtml = '';
  if (o.menu) {
    const label = Utilities.sanitizeHtml(o.menu.label);
    menuHtml = `
          <details class="si-sheet__menu" id="${id}-menu">
            <summary class="si-icon-btn" aria-label="${label}" title="${label}" aria-haspopup="true"><ha-icon icon="mdi:dots-vertical"></ha-icon></summary>
            <div class="si-sheet__menu-list">${o.menu.itemsHtml}</div>
          </details>`;
  }
  const actionsHtml =
    o.actionsHtml || menuHtml
      ? `<div class="si-sheet__actions">${menuHtml}<span class="si-sheet__spacer"></span>${o.actionsHtml}</div>`
      : '';

  return `
    <div id="${id}" class="modal si-sheet${className}">
      <div class="${CSS_CLASSES.MODAL_CONTENT} si-sheet__panel" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="${id}-title">
        <div class="si-sheet__header">
          <h3 id="${id}-title" class="si-sheet__title">${Utilities.sanitizeHtml(o.title)}</h3>
          ${iconButton({ icon: 'mdi:close', label: o.closeLabel, className: CSS_CLASSES.CLOSE_BTN, attrs: o.closeAttrs ?? {} })}
        </div>
        <div class="si-sheet__body">${o.bodyHtml}</div>
        ${actionsHtml}
      </div>
    </div>
  `;
}
