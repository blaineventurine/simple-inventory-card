import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { TranslationManager } from '../../src/services/translationManager';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import { CSS_CLASSES, ELEMENTS, WS_COMMANDS } from '../../src/utils/constants';
import { createMockHassEntity, createMockHomeAssistant, must } from '../testHelpers';

vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    shadowRoot: HTMLElement;
    constructor() {
      const root = document.createElement('div');
      // `host` stands in for the card element (the card mirrors its layout on it).
      Object.assign(root, {
        getElementById: (id: string) => root.querySelector(`#${id}`),
        host: document.createElement('div'),
      });
      this.shadowRoot = root;
    }
    attachShadow(): HTMLElement {
      return this.shadowRoot;
    }
    get renderRoot(): HTMLElement {
      return this.shadowRoot;
    }
    connectedCallback(): void {}
    disconnectedCallback(): void {}
  },
  css: vi.fn((strings: TemplateStringsArray) => ({
    cssText: strings.join(''),
    toString: () => strings.join(''),
  })),
}));

const FULL = '/api/simple_inventory/image/apples?v=1';
const THUMB = '/api/simple_inventory/image/apples?thumb=1&v=1';

describe('full-screen photo viewer in the card (integration)', () => {
  let card: SimpleInventoryCard;
  let root: HTMLElement;
  let wsTypes: string[];
  let changes: number;
  /** Image paths fetched with the user's token, across every hass object. */
  let imageFetches: string[];

  function makeHass(): HomeAssistant {
    const hass = createMockHomeAssistant({
      'sensor.pantry': createMockHassEntity('sensor.pantry', {
        state: '1',
        last_changed: `2026-10-27T10:00:${String(changes).padStart(2, '0')}Z`,
        attributes: { inventory_id: 'pantry' },
      }),
    });
    hass.callWS = vi.fn().mockImplementation(async (msg: { type: string }) => {
      wsTypes.push(msg.type);
      if (msg.type === WS_COMMANDS.LIST_ITEMS) {
        const item: InventoryItem = {
          id: 'apples',
          image: '1',
          name: 'Apples',
          quantity: 3,
          unit: '',
          description: '',
          category: '',
          location: '',
          expiry_date: '',
          todo_list: '',
          auto_add_enabled: false,
          auto_add_id_to_description_enabled: false,
        };
        return { items: [item] };
      }
      return { version: '0.10.0', api_version: 2, features: ['item_images'] };
    });
    hass.fetchWithAuth = vi.fn(async (path: string) => {
      imageFetches.push(path);
      return new Response('img', { status: 200 });
    });
    return hass;
  }

  function viewer(): HTMLElement | null {
    return root.querySelector<HTMLElement>(`#${ELEMENTS.IMAGE_VIEWER}`);
  }

  function viewerOpen(): boolean {
    return viewer()?.classList.contains(CSS_CLASSES.SHOW) === true;
  }

  function fetched(): number {
    return wsTypes.filter((type) => type === WS_COMMANDS.LIST_ITEMS).length;
  }

  function pressEscape(): void {
    const focused = document.activeElement ?? document.body;
    focused.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  async function openFromDetails(): Promise<HTMLElement> {
    must(
      root.querySelector<HTMLElement>('[data-action="toggle_batches"][data-name="Apples"]'),
    ).click();
    await vi.advanceTimersByTimeAsync(0);
    const button = must(
      root.querySelector<HTMLElement>('[data-action="view_image"][data-name="Apples"]'),
      'no details image button',
    );
    button.click();
    await vi.advanceTimersByTimeAsync(0);
    return button;
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    let blobs = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn<(blob: Blob) => string>(() => `blob:test/${++blobs}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn<(url: string) => void>(),
    });
    vi.spyOn(TranslationManager, 'loadTranslations').mockResolvedValue({
      items: { no_items: 'No items' },
    });
    wsTypes = [];
    changes = 0;
    imageFetches = [];
    localStorage.clear();
    history.replaceState(null, '');

    card = new SimpleInventoryCard();
    root = card.shadowRoot as unknown as HTMLElement; // the mocked shadow root is a <div>
    document.body.append(root);
    card.setConfig({ type: 'custom:simple-inventory-card', entity: 'sensor.pantry' });
    card.connectedCallback();
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
  });

  afterEach(() => {
    card.disconnectedCallback();
    root.remove();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens the details-panel photo full screen, labelled, and returns focus on close', async () => {
    const button = await openFromDetails();

    expect(viewerOpen()).toBe(true);
    expect(viewer()?.getAttribute('aria-label')).toBe('Photo of Apples');
    const img = must(viewer()?.querySelector('img'));
    expect(img.getAttribute('data-image-path')).toBe(FULL);
    // The full image was loaded for the details panel already: shown at once.
    expect(img.getAttribute('src')).toMatch(/^blob:test\//);
    expect(button.getAttribute('aria-label')).toBe('View photo of Apples');
    expect(imageFetches).toEqual(expect.arrayContaining([THUMB, FULL]));

    pressEscape();
    expect(viewerOpen()).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it('holds a background refresh while open and runs it once closed', async () => {
    await openFromDetails();
    const before = fetched();

    changes += 1;
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
    expect(fetched()).toBe(before);
    expect(viewerOpen()).toBe(true);

    pressEscape();
    await vi.advanceTimersByTimeAsync(300);
    expect(fetched()).toBe(before + 1);
  });

  it('keeps the viewer through a user-initiated refresh too, and refreshes once closed', async () => {
    await openFromDetails();
    const overlay = viewer();
    const before = fetched();

    // E.g. a save started before the viewer opened finishing while it is open.
    await card['_fetchItems']();
    await vi.advanceTimersByTimeAsync(300);

    expect(viewer()).toBe(overlay);
    expect(viewerOpen()).toBe(true);
    expect(fetched()).toBe(before);

    pressEscape();
    await vi.advanceTimersByTimeAsync(300);
    expect(viewerOpen()).toBe(false);
    expect(fetched()).toBe(before + 1);
  });

  it('opens the edit sheet preview above the sheet; Escape closes only the viewer', async () => {
    must(root.querySelector<HTMLElement>('.si-row__open')).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await vi.advanceTimersByTimeAsync(300);
    const sheet = must(root.querySelector<HTMLElement>(`#${ELEMENTS.EDIT_MODAL}`));
    expect(sheet.classList.contains(CSS_CLASSES.SHOW)).toBe(true);

    const preview = must(
      root.querySelector<HTMLElement>('#edit-image-preview .si-image-field__open'),
      'no preview button',
    );
    preview.click();

    expect(viewerOpen()).toBe(true);
    expect(viewer()?.querySelector('img')?.getAttribute('data-image-path')).toBe(FULL);

    pressEscape();
    expect(viewerOpen()).toBe(false);
    expect(sheet.classList.contains(CSS_CLASSES.SHOW)).toBe(true);
    expect(document.activeElement).toBe(preview);
  });
});
