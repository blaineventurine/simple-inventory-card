import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import Quagga from '@ericblade/quagga2';
import { SimpleInventoryCard } from '../../src/components/simpleInventoryCard';
import { TranslationManager } from '../../src/services/translationManager';
import { isScannerActive } from '../../src/services/barcodeScanner';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryItem } from '../../src/types/inventory';
import { ELEMENTS, WS_COMMANDS } from '../../src/utils/constants';
import { createMockHassEntity, createMockHomeAssistant, must } from '../testHelpers';
import { BarCodeMessage } from '../../src/types/externalBus';

// The real scanner module over the Quagga double from tests/setup.ts: `init` answers only when
// the test finishes it, like a camera that takes a moment to open.

vi.mock('lit-element', () => ({
  LitElement: class MockLitElement {
    shadowRoot: HTMLElement;
    isConnected = true;
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
    attributeChangedCallback(): void {}
  },
  css: vi.fn((strings: TemplateStringsArray) => ({
    cssText: strings.join(''),
    toString: () => strings.join(''),
  })),
}));

describe('card camera across detach / re-attach (real scanner module)', () => {
  let card: SimpleInventoryCard;
  let root: HTMLElement;
  /** Pending `Quagga.init` callbacks, oldest first. */
  let pendingInits: Array<(err: Error | null) => void>;

  function makeHass(): HomeAssistant {
    const hass = createMockHomeAssistant({
      'sensor.pantry': createMockHassEntity('sensor.pantry', {
        state: '1',
        attributes: { inventory_id: 'pantry' },
      }),
    });
    hass.callWS = vi.fn().mockImplementation(async (msg: { type: string }) => {
      if (msg.type === WS_COMMANDS.LOOKUP_BY_BARCODE) {
        return { items: [] };
      }
      if (msg.type === WS_COMMANDS.LIST_ITEMS) {
        const item: InventoryItem = {
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
      return { version: '0.10.0', api_version: 2, features: [] };
    });
    return hass;
  }

  function element(id: string): HTMLElement {
    const el = root.querySelector<HTMLElement>(`#${id}`);
    if (!el) throw new Error(`no #${id}`);
    return el;
  }

  /** Lets the camera that is opening finish opening. */
  async function finishInit(): Promise<void> {
    const finish = pendingInits.shift();
    if (!finish) throw new Error('no camera is opening');
    finish(null);
    await vi.advanceTimersByTimeAsync(0);
  }

  async function reattach(): Promise<void> {
    card.disconnectedCallback();
    card.connectedCallback();
    await vi.advanceTimersByTimeAsync(0);
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    pendingInits = [];
    vi.mocked(Quagga.init).mockReset();
    vi.mocked(Quagga.init).mockImplementation((_config, callback) => {
      pendingInits.push((err) => callback?.(err));
      return Promise.resolve();
    });
    vi.mocked(Quagga.start).mockClear();
    vi.mocked(Quagga.stop).mockClear();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      writable: true,
      value: { getUserMedia: vi.fn() },
    });
    vi.spyOn(TranslationManager, 'loadTranslations').mockResolvedValue({
      items: { no_items: 'No items' },
    });
    localStorage.clear();

    card = new SimpleInventoryCard();
    root = card.shadowRoot as unknown as HTMLElement; // the mocked shadow root is a <div>
    document.body.append(root);
    card.setConfig({ type: 'custom:simple-inventory-card', entity: 'sensor.pantry' });
    card.connectedCallback();
    card.hass = makeHass();
    await vi.advanceTimersByTimeAsync(300);
  });

  afterEach(async () => {
    card.disconnectedCallback();
    // Settle every opening camera so the next test's starts do not queue behind it.
    while (pendingInits.length > 0) {
      await finishInit();
    }
    root.remove();
    Reflect.deleteProperty(navigator, 'mediaDevices');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('releases a header scan camera that finishes opening after the card was detached', async () => {
    element(ELEMENTS.HEADER_SCAN_BTN).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(pendingInits).toHaveLength(1);

    card.disconnectedCallback();
    await finishInit();

    expect(Quagga.start).not.toHaveBeenCalled();
    expect(Quagga.stop).toHaveBeenCalledTimes(1);
    expect(isScannerActive()).toBe(false);
  });

  it('releases an add sheet camera that finishes opening after the card was detached', async () => {
    element(ELEMENTS.OPEN_ADD_MODAL).click();
    await vi.advanceTimersByTimeAsync(0);
    element(`add-${ELEMENTS.BARCODE_SCAN_BTN}`).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(pendingInits).toHaveLength(1);

    card.disconnectedCallback();
    await finishInit();

    expect(Quagga.start).not.toHaveBeenCalled();
    expect(Quagga.stop).toHaveBeenCalledTimes(1);
    expect(isScannerActive()).toBe(false);
  });

  it('stops the camera while the card is hidden (inactive panel tab) and resumes it when shown', async () => {
    element(ELEMENTS.HEADER_SCAN_BTN).click();
    await vi.advanceTimersByTimeAsync(0);
    await finishInit();
    expect(isScannerActive()).toBe(true);

    card.attributeChangedCallback('hidden', null, '');
    expect(isScannerActive()).toBe(false);
    expect(Quagga.stop).toHaveBeenCalledTimes(1);

    // Re-setting an already set attribute is not a change.
    card.attributeChangedCallback('hidden', '', '');
    expect(Quagga.init).toHaveBeenCalledTimes(1);

    card.attributeChangedCallback('hidden', '', null);
    await vi.advanceTimersByTimeAsync(0);
    await finishInit();
    expect(Quagga.init).toHaveBeenCalledTimes(2);
    expect(isScannerActive()).toBe(true);
  });

  it('stops an add sheet camera while the card is hidden', async () => {
    element(ELEMENTS.OPEN_ADD_MODAL).click();
    await vi.advanceTimersByTimeAsync(0);
    element(`add-${ELEMENTS.BARCODE_SCAN_BTN}`).click();
    await vi.advanceTimersByTimeAsync(0);
    await finishInit();
    expect(isScannerActive()).toBe(true);

    card.attributeChangedCallback('hidden', null, '');

    expect(isScannerActive()).toBe(false);
  });

  it('opens the camera again only after the one cut short by a quick detach is released', async () => {
    element(ELEMENTS.HEADER_SCAN_BTN).click();
    await vi.advanceTimersByTimeAsync(0);

    await reattach();
    // The restart waits: quagga2 holds a single stream, a second init would orphan the first.
    expect(Quagga.init).toHaveBeenCalledTimes(1);

    await finishInit();
    expect(Quagga.stop).toHaveBeenCalledTimes(1);
    expect(Quagga.init).toHaveBeenCalledTimes(2);

    await finishInit();
    expect(Quagga.start).toHaveBeenCalledTimes(1);
    expect(isScannerActive()).toBe(true);
    expect(element(ELEMENTS.SCAN_PANEL).hidden).toBe(false);
  });

  it("hides a closed sheet's scanner, so re-opening the sheet and re-attaching opens no camera", async () => {
    element(ELEMENTS.OPEN_ADD_MODAL).click();
    await vi.advanceTimersByTimeAsync(0);
    element(`add-${ELEMENTS.BARCODE_SCAN_BTN}`).click();
    await vi.advanceTimersByTimeAsync(0);
    await finishInit();
    expect(isScannerActive()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(isScannerActive()).toBe(false);
    expect(element(`add-${ELEMENTS.BARCODE_SCANNER}`).hidden).toBe(true);

    element(ELEMENTS.OPEN_ADD_MODAL).click();
    await vi.advanceTimersByTimeAsync(0);
    await reattach();

    expect(Quagga.init).toHaveBeenCalledTimes(1);
    expect(isScannerActive()).toBe(false);
  });

  describe('a camera that does not open (real photo chooser)', () => {
    const photoInput = (): HTMLInputElement => {
      const input = document.body.querySelector<HTMLInputElement>('input[type="file"]');
      if (!input) throw new Error('no photo input');
      return input;
    };

    async function choosePhoto(): Promise<void> {
      const input = photoInput();
      Object.defineProperty(input, 'files', { value: [new File(['x'], 'photo.jpg')] });
      input.dispatchEvent(new Event('change'));
      await vi.advanceTimersByTimeAsync(0);
    }

    beforeEach(() => {
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
      vi.stubGlobal(
        'createImageBitmap',
        vi.fn(async () => ({ close: vi.fn() })),
      );
      vi.stubGlobal(
        'BarcodeDetector',
        vi.fn(function () {
          return { detect: async () => [{ rawValue: '4006381333931' }] };
        }),
      );
    });

    afterEach(() => {
      document.body.querySelectorAll('input[type="file"]').forEach((input) => input.remove());
      vi.unstubAllGlobals();
    });

    it('the scan panel keeps the error, and a chosen photo shows its barcode', async () => {
      element(ELEMENTS.HEADER_SCAN_BTN).click();
      await vi.advanceTimersByTimeAsync(0);
      pendingInits.shift()?.(new Error('NotAllowedError: Permission denied'));
      await vi.advanceTimersByTimeAsync(0);

      expect(element(ELEMENTS.SCAN_PANEL).hidden).toBe(false);
      expect(element(ELEMENTS.SCAN_PHOTO).hidden).toBe(false);
      expect(element(ELEMENTS.SCAN_PHOTO_MESSAGE).textContent).toBe('Camera access denied');

      element(ELEMENTS.SCAN_PHOTO).querySelector<HTMLElement>('.scan-photo-btn')?.click();
      await vi.advanceTimersByTimeAsync(0);
      await choosePhoto();

      expect(element(ELEMENTS.SCAN_PHOTO).hidden).toBe(true);
      expect(element('scan-barcode-label').textContent).toBe('4006381333931');
    });

    it('the add sheet offers a photo and adds its barcode', async () => {
      element(ELEMENTS.OPEN_ADD_MODAL).click();
      await vi.advanceTimersByTimeAsync(0);
      element(`add-${ELEMENTS.BARCODE_SCAN_BTN}`).click();
      await vi.advanceTimersByTimeAsync(0);
      pendingInits.shift()?.(new Error('NotFoundError: Requested device not found'));
      await vi.advanceTimersByTimeAsync(0);

      expect(element(`add-${ELEMENTS.BARCODE_PHOTO}`).hidden).toBe(false);
      expect(element(`add-${ELEMENTS.BARCODE_PHOTO_MESSAGE}`).textContent).toBe(
        'Camera not available',
      );

      element(`add-${ELEMENTS.BARCODE_PHOTO_BTN}`).click();
      await choosePhoto();

      const barcodes = element(`add-${ELEMENTS.BARCODE}`);
      expect(barcodes instanceof HTMLInputElement && barcodes.value).toBe('4006381333931');
      expect(element(`add-${ELEMENTS.BARCODE_PHOTO}`).hidden).toBe(true);
    });
  });

  describe('in the companion app (native scanner)', () => {
    let fireMessage: Mock<(message: BarCodeMessage) => void>;
    /** HA's own `window.externalBus`. */
    let haReceive: Mock<(message: unknown) => void>;

    const sent = (): BarCodeMessage[] => fireMessage.mock.calls.map(([message]) => message);

    function appReads(rawValue: string): void {
      must(window.externalBus)({
        id: 4,
        type: 'command',
        command: 'bar_code/scan_result',
        payload: { rawValue, format: 'ean_13' },
      });
    }

    beforeEach(async () => {
      haReceive = vi.fn();
      window.externalBus = haReceive;
      fireMessage = vi.fn();
      card.hass = {
        ...makeHass(),
        auth: { external: { config: { hasBarCodeScanner: 1 }, fireMessage } },
      };
      await vi.advanceTimersByTimeAsync(300);
    });

    afterEach(() => {
      Reflect.deleteProperty(window, 'externalBus');
    });

    it("the header scan opens the app's scanner, and its barcode shows in the scan panel", async () => {
      element(ELEMENTS.HEADER_SCAN_BTN).click();
      await vi.advanceTimersByTimeAsync(0);

      expect(sent()).toEqual([
        {
          type: 'bar_code/scan',
          payload: {
            title: 'Scan barcode',
            description: "Point the camera at the item's barcode",
            alternative_option_label: 'Choose a photo',
          },
        },
      ]);
      expect(Quagga.init).not.toHaveBeenCalled();
      expect(element(ELEMENTS.SCAN_PANEL).hidden).toBe(true);

      appReads('4006381333931');
      await vi.advanceTimersByTimeAsync(0);

      expect(haReceive).toHaveBeenCalledOnce();
      expect(sent().at(-1)).toEqual({ type: 'bar_code/close' });
      expect(element(ELEMENTS.SCAN_PANEL).hidden).toBe(false);
      expect(element('scan-barcode-label').textContent).toBe('4006381333931');
    });

    it('the add sheet adds the barcode the app read', async () => {
      element(ELEMENTS.OPEN_ADD_MODAL).click();
      await vi.advanceTimersByTimeAsync(0);
      element(`add-${ELEMENTS.BARCODE_SCAN_BTN}`).click();

      expect(sent()[0]?.type).toBe('bar_code/scan');
      appReads('4006381333931');

      const barcodes = element(`add-${ELEMENTS.BARCODE}`);
      expect(barcodes instanceof HTMLInputElement && barcodes.value).toBe('4006381333931');
      expect(Quagga.init).not.toHaveBeenCalled();
    });

    it("detaching the card closes the app's scanner", async () => {
      element(ELEMENTS.HEADER_SCAN_BTN).click();
      await vi.advanceTimersByTimeAsync(0);

      card.disconnectedCallback();

      expect(sent().at(-1)).toEqual({ type: 'bar_code/close' });
      appReads('4006381333931');
      expect(element(ELEMENTS.SCAN_PANEL).hidden).toBe(true);
    });
  });
});
