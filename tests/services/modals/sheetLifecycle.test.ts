import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import {
  ModalUIManager,
  SHEET_CLOSED_EVENT,
  forgetDetachedSheets,
  hideSheet,
  mountSheet,
  setSheetHolds,
  showSheet,
} from '../../../src/services/modals/modalUIManager';
import { ModalFormManager } from '../../../src/services/modals/modalFormManager';
import { ModalValidationManager } from '../../../src/services/modals/modalValidationManager';
import { createAddModal, createEditModal } from '../../../src/templates/modalTemplates';
import { sheet } from '../../../src/templates/sheet';
import { CSS_CLASSES, ELEMENTS, TIMING } from '../../../src/utils/constants';
import { InventoryConfig, InventoryItem } from '../../../src/types/inventory';
import { createMockHassEntity, createMockHomeAssistant } from '../../testHelpers';
import { AcquireHold } from '../../../src/services/inventoryStore';

const config: InventoryConfig = { type: 'inventory-card', entity: 'sensor.inventory' };
const milk: InventoryItem = {
  auto_add_enabled: false,
  auto_add_id_to_description_enabled: false,
  category: '',
  description: '',
  expiry_date: '',
  location: '',
  name: 'Milk',
  quantity: 3,
  todo_list: '',
  unit: 'L',
};

describe('sheet lifecycle', () => {
  let host: HTMLElement;
  let root: ShadowRoot;
  let manager: ModalUIManager;
  let opener: HTMLButtonElement;
  /** The release of a sheet's hold; `hold` hands it out. */
  let release: Mock<() => void>;
  let hold: Mock<AcquireHold>;
  let handled: boolean[];

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.append(host);
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<button type="button" id="opener">Open</button>${createAddModal([], {}, [], [])}${createEditModal([], {}, [], [])}`;
    opener = element<HTMLButtonElement>('opener');
    release = vi.fn<() => void>();
    hold = vi.fn<AcquireHold>(() => release);
    setSheetHolds(root, hold);
    manager = new ModalUIManager(
      root,
      new ModalFormManager(root),
      new ModalValidationManager(root),
    );
    handled = [];
    // EventHandler routes card clicks the same way.
    root.addEventListener('click', (event) => {
      handled.push(manager.handleModalClick(event as MouseEvent));
    });
  });

  afterEach(() => {
    manager.destroy();
    host.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function element<T extends HTMLElement = HTMLElement>(id: string): T {
    const found = root.getElementById(id);
    if (!found) {
      throw new Error(`missing #${id}`);
    }
    return found as T;
  }

  function icon(container: Element, selector: string): HTMLElement {
    const found = container.querySelector(`${selector} ha-icon`);
    if (!(found instanceof HTMLElement)) {
      throw new Error(`missing ${selector} icon`);
    }
    return found;
  }

  function openAdd(): void {
    opener.focus();
    manager.openAddModal({});
    vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);
  }

  function openEdit(): void {
    const hass = createMockHomeAssistant({
      'sensor.inventory': createMockHassEntity('sensor.inventory', {}),
    });
    opener.focus();
    manager.openEditModal('Milk', () => ({ hass, config, items: [milk] }), {});
    vi.advanceTimersByTime(TIMING.MODAL_FOCUS_DELAY);
  }

  /** ShadowRoot has no insertAdjacentHTML. */
  function addSheet(html: string): void {
    const template = document.createElement('template');
    template.innerHTML = html;
    root.append(template.content);
  }

  /** The press that starts a click (a tap or mouse down). */
  function press(target: Element): void {
    target.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
  }

  function pressEscape(): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  }

  it('closes the add sheet from the ✕ icon and returns focus to the opener', () => {
    openAdd();
    const modal = element(ELEMENTS.ADD_MODAL);
    expect(root.activeElement?.id).toBe(`add-${ELEMENTS.NAME}`);

    icon(modal, `.${CSS_CLASSES.CLOSE_BTN}`).click();

    expect(modal.classList.contains(CSS_CLASSES.SHOW)).toBe(false);
    expect(root.activeElement).toBe(opener);
  });

  function panelOf(id: string): Element | null {
    return element(id).querySelector(`.${CSS_CLASSES.MODAL_CONTENT}`);
  }

  function stubPointer(coarse: boolean): void {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: coarse && query === '(pointer: coarse)',
        media: query,
      })),
    );
  }

  it('focuses the add sheet name field on a fine pointer', () => {
    stubPointer(false);
    openAdd();

    expect(root.activeElement?.id).toBe(`add-${ELEMENTS.NAME}`);
  });

  it('focuses the add sheet itself on a touch screen, so no keyboard pops up', () => {
    stubPointer(true);
    openAdd();

    expect(root.activeElement).toBe(panelOf(ELEMENTS.ADD_MODAL));
  });

  it('focuses the edit sheet itself, never the name field', () => {
    stubPointer(false);
    openEdit();

    expect(root.activeElement).toBe(panelOf(ELEMENTS.EDIT_MODAL));
    const name = element<HTMLInputElement>(`edit-${ELEMENTS.NAME}`);
    expect(name.selectionStart).toBe(name.selectionEnd);
  });

  it('closes the edit sheet on a backdrop tap and returns focus to the opener', () => {
    openEdit();
    const modal = element(ELEMENTS.EDIT_MODAL);

    press(modal);
    modal.click();

    expect(modal.classList.contains(CSS_CLASSES.SHOW)).toBe(false);
    expect(root.activeElement).toBe(opener);
    expect(hold).toHaveBeenCalledWith('page', ELEMENTS.EDIT_MODAL);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases the add sheet hold on close, once, like the edit sheet', () => {
    openAdd();
    expect(hold).toHaveBeenCalledWith('background', ELEMENTS.ADD_MODAL);

    manager.closeAddModal();
    manager.closeAddModal();

    expect(release).toHaveBeenCalledTimes(1);
  });

  it('takes no hold for a sheet shown again while open, and releases none for a closed one', () => {
    manager.closeEditModal();
    openEdit();
    showSheet(root, element(ELEMENTS.EDIT_MODAL));

    expect(hold).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
  });

  it('releases the hold of a sheet its own card removed, and only through that card', () => {
    const other = document.createElement('div');
    const otherRoot = other.attachShadow({ mode: 'open' });
    openAdd();
    element(ELEMENTS.ADD_MODAL).remove();

    forgetDetachedSheets(otherRoot);
    expect(release).not.toHaveBeenCalled();

    forgetDetachedSheets(root);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases the holds of the sheets a full render replaced', () => {
    openEdit();
    root.innerHTML = createEditModal([], {}, [], []);

    forgetDetachedSheets(root);

    expect(release).toHaveBeenCalledTimes(1);
  });

  it('keeps the hold of a sheet whose card is only detached, whatever another card does', () => {
    openEdit();
    host.remove();
    const otherHost = document.createElement('div');
    document.body.append(otherHost);
    const otherRoot = otherHost.attachShadow({ mode: 'open' });
    const otherRelease = vi.fn<() => void>();
    setSheetHolds(otherRoot, () => otherRelease);
    const otherSheet = mountSheet(
      otherRoot,
      sheet({
        id: ELEMENTS.HISTORY_MODAL,
        title: 'Other',
        closeLabel: 'Close',
        bodyHtml: '',
        actionsHtml: '',
      }),
    );

    // The other card opens a sheet and renders while this one is detached.
    showSheet(otherRoot, otherSheet);
    forgetDetachedSheets(otherRoot);
    document.body.append(host);

    expect(release).not.toHaveBeenCalled();
    expect(element(ELEMENTS.EDIT_MODAL).classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    manager.closeEditModal();
    expect(release).toHaveBeenCalledTimes(1);
    hideSheet(otherSheet);
    expect(otherRelease).toHaveBeenCalledTimes(1);
    otherHost.remove();
  });

  it('closes the open sheet on Escape and returns focus to the opener', () => {
    openEdit();

    pressEscape();

    expect(element(ELEMENTS.EDIT_MODAL).classList.contains(CSS_CLASSES.SHOW)).toBe(false);
    expect(root.activeElement).toBe(opener);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('keeps the sheet open for clicks inside it', () => {
    openAdd();

    element(`add-${ELEMENTS.NAME}`).click();

    expect(element(ELEMENTS.ADD_MODAL).classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    expect(handled.at(-1)).toBe(false);
  });

  it('closes any other sheet by ✕, backdrop and Escape', () => {
    addSheet(
      sheet({
        id: 'other-sheet',
        title: 'Other',
        closeLabel: 'Close',
        bodyHtml: '<p>Body</p>',
        actionsHtml: '',
      }),
    );
    const other = element('other-sheet');
    const isOpen = (): boolean => other.classList.contains(CSS_CLASSES.SHOW);

    opener.focus();
    showSheet(root, other);
    expect(isOpen()).toBe(true);
    icon(other, `.${CSS_CLASSES.CLOSE_BTN}`).click();
    expect(isOpen()).toBe(false);
    expect(root.activeElement).toBe(opener);

    showSheet(root, other);
    press(other);
    other.click();
    expect(isOpen()).toBe(false);

    showSheet(root, other);
    pressEscape();
    expect(isOpen()).toBe(false);
  });

  it('keeps a sheet open when a press inside it ends on the backdrop', () => {
    openEdit();
    const modal = element(ELEMENTS.EDIT_MODAL);
    addSheet(
      sheet({
        id: 'other-sheet',
        title: 'Other',
        closeLabel: 'Close',
        bodyHtml: '',
        actionsHtml: '',
      }),
    );
    const other = element('other-sheet');
    showSheet(root, other);

    // e.g. selecting text in the name field and releasing over the scrim
    press(element(`edit-${ELEMENTS.NAME}`));
    modal.click();
    press(icon(other, `.${CSS_CLASSES.CLOSE_BTN}`));
    other.click();

    expect(modal.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    expect(other.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    expect(release).not.toHaveBeenCalled();
  });

  it('leaves Escape to a control that handled it, and to an IME composition', () => {
    openEdit();
    const modal = element(ELEMENTS.EDIT_MODAL);
    const name = element(`edit-${ELEMENTS.NAME}`);
    name.addEventListener('keydown', (event) => event.preventDefault(), { once: true });

    name.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    expect(modal.classList.contains(CSS_CLASSES.SHOW)).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true }));
    expect(modal.classList.contains(CSS_CLASSES.SHOW)).toBe(true);

    pressEscape();
    expect(modal.classList.contains(CSS_CLASSES.SHOW)).toBe(false);
  });

  it('forgets sheets a re-render removed, so Escape never refocuses their opener', () => {
    addSheet(
      sheet({
        id: 'other-sheet',
        title: 'Other',
        closeLabel: 'Close',
        bodyHtml: '',
        actionsHtml: '',
      }),
    );
    const stale = element('other-sheet');
    opener.focus();
    showSheet(root, stale);
    stale.remove(); // the card re-rendered while the sheet was open
    const later = document.createElement('button');
    root.append(later);
    later.focus();

    pressEscape();

    expect(root.activeElement).toBe(later);
  });

  it('returns focus to the ⋮ toggle after a menu pick', () => {
    openEdit();
    const menu = element<HTMLDetailsElement>(ELEMENTS.EDIT_MENU);

    menu.open = true;
    icon(menu, `#${ELEMENTS.EDIT_DELETE_BTN}`).click();

    expect(menu.open).toBe(false);
    expect(root.activeElement).toBe(menu.querySelector('summary'));
  });

  it('hideSheet leaves focus alone when the opener is gone', () => {
    addSheet(
      sheet({
        id: 'other-sheet',
        title: 'Other',
        closeLabel: 'Close',
        bodyHtml: '',
        actionsHtml: '',
      }),
    );
    const other = element('other-sheet');
    opener.focus();
    showSheet(root, other);
    opener.remove();
    const focus = vi.spyOn(opener, 'focus');

    hideSheet(other);

    expect(focus).not.toHaveBeenCalled();
  });

  it('closes the edit ⋮ menu after a pick, a click elsewhere, or closing the sheet', () => {
    openEdit();
    const menu = element<HTMLDetailsElement>(ELEMENTS.EDIT_MENU);

    menu.open = true;
    icon(menu, `#${ELEMENTS.EDIT_HISTORY_BTN}`).click();
    expect(menu.open).toBe(false);
    expect(handled.at(-1)).toBe(false); // EventHandler still routes the pick

    menu.open = true;
    element(`edit-${ELEMENTS.NAME}`).click();
    expect(menu.open).toBe(false);

    menu.open = true;
    pressEscape();
    expect(menu.open).toBe(false);
  });
});

describe('sheet lifecycle helpers', () => {
  let host: HTMLElement;
  let root: ShadowRoot;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = host.attachShadow({ mode: 'open' });
  });

  afterEach(() => {
    host.remove();
  });

  describe('mountSheet', () => {
    it('appends the parsed sheet to the root and returns it', () => {
      const modal = mountSheet(
        root,
        '\n  <div id="demo-sheet" class="modal si-sheet"><p>first</p></div>\n',
      );

      expect(modal.parentNode).toBe(root);
      expect(modal.id).toBe('demo-sheet');
      expect(modal.textContent).toBe('first');
    });

    it('reuses an existing sheet with the same id, replacing its classes and content', () => {
      const first = mountSheet(
        root,
        '<div id="demo-sheet" class="modal si-sheet"><p>first</p></div>',
      );
      first.classList.add('stale');

      const second = mountSheet(
        root,
        '<div id="demo-sheet" class="modal si-sheet wide"><p>second</p></div>',
      );

      expect(second).toBe(first);
      expect(root.querySelectorAll('#demo-sheet')).toHaveLength(1);
      expect(second.className).toBe('modal si-sheet wide');
      expect(second.textContent).toBe('second');
    });
  });

  describe('hideSheet', () => {
    it('dispatches the closed event once when an open sheet closes', () => {
      const modal = mountSheet(root, '<div id="demo-sheet" class="modal si-sheet"></div>');
      const closed = vi.fn();
      modal.addEventListener(SHEET_CLOSED_EVENT, closed);

      showSheet(root, modal);
      hideSheet(modal);

      expect(modal.classList.contains(CSS_CLASSES.SHOW)).toBe(false);
      expect(closed).toHaveBeenCalledTimes(1);

      hideSheet(modal);
      expect(closed).toHaveBeenCalledTimes(1);
    });
  });
});
