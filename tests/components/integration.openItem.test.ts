import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { TranslationManager } from '../../src/services/translationManager';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import { CSS_CLASSES, ELEMENTS, WS_COMMANDS } from '../../src/utils/constants';
import { createMockHassEntity, createMockHomeAssistant } from '../testHelpers';

vi.mock('../../src/services/barcodeScanner', () => ({
  startScanner: vi.fn(async () => null),
  stopScanner: vi.fn(),
  isScannerActive: vi.fn(() => false),
  scanSupport: vi.fn(() => 'live'),
  chooseBarcodePhoto: vi.fn(async () => null),
  nativeScanner: vi.fn(() => undefined),
  startNativeScanner: vi.fn(),
}));

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

function item(name: string): InventoryItem {
  return {
    id: name.toLowerCase(),
    name,
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
}

describe('SimpleInventoryCard.openItem (integration)', () => {
  let card: SimpleInventoryCard;
  let root: HTMLElement;
  /** Resolves the pending list_items calls, in order. */
  let releaseLoads: Array<() => void>;

  function makeHass(): HomeAssistant {
    const hass = createMockHomeAssistant({
      'sensor.pantry': createMockHassEntity('sensor.pantry', {
        state: '2',
        attributes: { inventory_id: 'pantry' },
      }),
    });
    hass.callWS = vi.fn().mockImplementation((msg: { type: string }) => {
      if (msg.type === WS_COMMANDS.LIST_ITEMS) {
        // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
        return new Promise((resolve) => {
          releaseLoads.push(() => resolve({ items: [item('Apples'), item('Bananas')] }));
        });
      }
      return Promise.resolve({ version: '0.10.0', api_version: 2, features: [] });
    });
    return hass;
  }

  function editSheet(): HTMLElement | null {
    return root.querySelector<HTMLElement>(`#${ELEMENTS.EDIT_MODAL}`);
  }

  function editSheetOpen(): boolean {
    return editSheet()?.classList.contains(CSS_CLASSES.SHOW) === true;
  }

  function editName(): string | undefined {
    return root.querySelector<HTMLInputElement>(`#${ELEMENTS.EDIT_MODAL} #edit-name`)?.value;
  }

  async function loadItems(): Promise<void> {
    await vi.advanceTimersByTimeAsync(0);
    for (const release of releaseLoads.splice(0)) {
      release();
    }
    await vi.advanceTimersByTimeAsync(300);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(TranslationManager, 'loadTranslations').mockResolvedValue({
      items: { no_items: 'No items' },
    });
    releaseLoads = [];
    localStorage.clear();
    card = new SimpleInventoryCard();
    root = card.shadowRoot as unknown as HTMLElement; // the mocked shadow root is a <div>
    document.body.append(root);
    card.setConfig({ type: 'custom:simple-inventory-card', entity: 'sensor.pantry' });
    card.connectedCallback();
  });

  afterEach(() => {
    card.disconnectedCallback();
    root.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens the edit sheet of a loaded item', async () => {
    card.hass = makeHass();
    await loadItems();
    expect(editSheetOpen()).toBe(false);

    card.openItem('Bananas');

    expect(editSheetOpen()).toBe(true);
    expect(editName()).toBe('Bananas');
  });

  it('waits for the first load when called before hass', async () => {
    card.openItem('Apples');
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
    expect(editSheetOpen()).toBe(false);

    await loadItems();

    expect(editSheetOpen()).toBe(true);
    expect(editName()).toBe('Apples');
  });

  it('waits for the first load when called while the items are loading', async () => {
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
    card.openItem('Apples');
    expect(editSheetOpen()).toBe(false);

    await loadItems();

    expect(editSheetOpen()).toBe(true);
    expect(editName()).toBe('Apples');
  });

  it('does nothing for an unknown name, now or after a later load', async () => {
    const warn = vi.spyOn(console, 'warn');
    card.hass = makeHass();
    await loadItems();

    card.openItem('Cherries');
    expect(editSheetOpen()).toBe(false);

    // The request was dropped: a later render does not open anything either.
    card.render();
    await vi.advanceTimersByTimeAsync(300);
    expect(editSheetOpen()).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('opens only the last of two requests made before the load', async () => {
    card.hass = makeHass();
    card.openItem('Apples');
    card.openItem('Bananas');

    await loadItems();

    expect(editSheetOpen()).toBe(true);
    expect(editName()).toBe('Bananas');
  });

  it('holds renders with the edit sheet page hold once opened', async () => {
    card.openItem('Apples');
    card.hass = makeHass();
    await loadItems();

    expect(card['_store'].holds()).toEqual([{ kind: 'page', reason: ELEMENTS.EDIT_MODAL }]);
  });
});
