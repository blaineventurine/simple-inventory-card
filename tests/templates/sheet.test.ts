import { describe, it, expect } from 'vitest';
import { sheet } from '../../src/templates/sheet';

function render(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  const modal = container.firstElementChild;
  if (!(modal instanceof HTMLElement)) {
    throw new Error('sheet rendered no element');
  }
  return modal;
}

describe('sheet', () => {
  it('keeps the modal hooks and adds the sheet frame', () => {
    const modal = render(
      sheet({
        id: 'add-modal',
        title: 'Add <Item>',
        closeLabel: 'Close',
        bodyHtml: '<p class="body-probe">Body</p>',
        actionsHtml: '<button type="button" class="save-btn">Save</button>',
        closeAttrs: { 'data-action': 'close_add_modal' },
      }),
    );

    expect(modal.id).toBe('add-modal');
    expect(modal.classList.contains('modal')).toBe(true);
    expect(modal.classList.contains('si-sheet')).toBe(true);
    const panel = modal.querySelector('.modal-content.si-sheet__panel');
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.getAttribute('aria-modal')).toBe('true');
    expect(panel?.getAttribute('aria-labelledby')).toBe('add-modal-title');
    // Focus target on open (touch screens, edit sheet): focusable by script only.
    expect(panel?.getAttribute('tabindex')).toBe('-1');
    expect(modal.querySelector('#add-modal-title')?.textContent).toBe('Add <Item>');
    const close = modal.querySelector('.si-sheet__header .close-btn');
    expect(close?.getAttribute('type')).toBe('button');
    expect(close?.getAttribute('aria-label')).toBe('Close');
    expect(close?.getAttribute('data-action')).toBe('close_add_modal');
    expect(close?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:close');
    expect(modal.querySelector('.si-sheet__body .body-probe')).not.toBeNull();
    expect(modal.querySelector('.si-sheet__actions .save-btn')).not.toBeNull();
    expect(modal.querySelector('.si-sheet__menu')).toBeNull();
  });

  it('renders no action bar without actions or a menu', () => {
    const modal = render(
      sheet({
        id: 'info',
        title: 'Info',
        closeLabel: 'Close',
        bodyHtml: '<p>Hi</p>',
        actionsHtml: '',
      }),
    );

    expect(modal.querySelector('.si-sheet__actions')).toBeNull();
  });

  it('puts the overflow menu at the start of the action bar', () => {
    const modal = render(
      sheet({
        id: 'edit-modal',
        title: 'Edit',
        closeLabel: 'Close',
        bodyHtml: '',
        actionsHtml: '<button type="button" class="save-btn">Save</button>',
        menu: {
          label: 'More actions',
          itemsHtml: '<button type="button" id="edit-history-btn">History</button>',
        },
        className: 'si-sheet--probe',
      }),
    );

    const menu = modal.querySelector('details.si-sheet__menu');
    expect(menu?.id).toBe('edit-modal-menu');
    expect(modal.querySelector('.si-sheet__actions')?.firstElementChild).toBe(menu);
    const toggle = menu?.querySelector('summary');
    expect(toggle?.getAttribute('aria-label')).toBe('More actions');
    expect(toggle?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:dots-vertical');
    expect(menu?.querySelector('.si-sheet__menu-list #edit-history-btn')).not.toBeNull();
    expect(modal.classList.contains('si-sheet--probe')).toBe(true);
  });
});
