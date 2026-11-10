import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ScanHandler } from '../../src/services/scanHandler';
import { Services } from '../../src/services/services';
import { InventoryResolver } from '../../src/utils/inventoryResolver';
import { ELEMENTS, BATCH_FIELDS } from '../../src/utils/constants';
import { batchFieldValue } from '../../src/utils/batchFields';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryConfig } from '../../src/types/inventory';
import { TranslationData } from '@/types/translatableComponent';
import { createMockHomeAssistant, must, createMockCardContext } from '../testHelpers';
import { holdTracker } from '../holdTracker';
import { AcquireHold, UiHold } from '../../src/services/inventoryStore';
import {
  startScanner,
  stopScanner,
  scanSupport,
  chooseBarcodePhoto,
  nativeScanner,
  startNativeScanner,
  NativeScanHandlers,
} from '../../src/services/barcodeScanner';

vi.mock('../../src/services/barcodeScanner', () => ({
  startScanner: vi.fn(),
  stopScanner: vi.fn(),
  scanSupport: vi.fn(),
  chooseBarcodePhoto: vi.fn(),
  nativeScanner: vi.fn(),
  startNativeScanner: vi.fn(),
}));

vi.mock('../../src/utils/inventoryResolver');

interface ScanRootRefs {
  root: ShadowRoot;
  panel: HTMLElement;
  viewportContainer: HTMLElement;
  viewport: HTMLElement;
  actionBar: HTMLElement;
  errorEl: HTMLElement;
  loadingEl: HTMLElement;
  amountInput: HTMLInputElement;
  actionSelect: HTMLSelectElement;
  barcodeLabel: HTMLElement;
  itemNameEl: HTMLElement;
  itemQuantityEl: HTMLElement;
  existingControls: HTMLElement;
  addBtn: HTMLElement;
  goBtn: HTMLElement;
  photo: HTMLElement;
  photoMessage: HTMLElement;
}

function createScanRoot(omit: string[] = []): ScanRootRefs {
  const container = document.createElement('div');

  /** An omitted element is created but left out of the root, so the handler cannot find it. */
  function make(id: string, tag: 'div'): HTMLDivElement;
  function make(id: string, tag: 'input'): HTMLInputElement;
  function make(id: string, tag: 'select'): HTMLSelectElement;
  function make(id: string, tag: 'div' | 'input' | 'select' = 'div'): HTMLElement {
    const el = document.createElement(tag);
    el.id = id;
    if (!omit.includes(id)) {
      container.appendChild(el);
    }
    return el;
  }

  const panel = make(ELEMENTS.SCAN_PANEL, 'div');
  const viewportContainer = make(`${ELEMENTS.SCAN_VIEWPORT}-container`, 'div');
  const viewport = make(ELEMENTS.SCAN_VIEWPORT, 'div');
  const actionBar = make(ELEMENTS.SCAN_ACTION_BAR, 'div');
  const errorEl = make('scan-panel-error', 'div');
  const loadingEl = make('scan-panel-loading', 'div');
  const amountInput = make(ELEMENTS.SCAN_AMOUNT_INPUT, 'input');
  const actionSelect = make(ELEMENTS.SCAN_ACTION_SELECT, 'select');
  for (const value of ['increment', 'decrement']) {
    const option = document.createElement('option');
    option.value = value;
    actionSelect.appendChild(option);
  }
  const barcodeLabel = make('scan-barcode-label', 'div');
  const itemNameEl = make(ELEMENTS.SCAN_ITEM_NAME, 'div');
  const itemQuantityEl = make(ELEMENTS.SCAN_ITEM_QUANTITY, 'div');
  const existingControls = make(ELEMENTS.SCAN_EXISTING_CONTROLS, 'div');
  const addBtn = make(ELEMENTS.SCAN_ADD_BTN, 'div');
  const goBtn = make(ELEMENTS.SCAN_GO_BTN, 'div');
  const photo = make(ELEMENTS.SCAN_PHOTO, 'div');
  photo.hidden = true;
  const photoMessage = make(ELEMENTS.SCAN_PHOTO_MESSAGE, 'div');

  // ShadowRoot implements NonElementParentNode#getElementById — delegate to querySelector
  // on the real backing container (unchecked cast: container stands in for a ShadowRoot).
  const root = container as unknown as ShadowRoot;
  root.getElementById = (id: string): HTMLElement | null =>
    container.querySelector(`#${id}`) as HTMLElement | null;

  return {
    root,
    panel,
    viewportContainer,
    viewport,
    actionBar,
    errorEl,
    loadingEl,
    amountInput,
    actionSelect,
    barcodeLabel,
    itemNameEl,
    itemQuantityEl,
    existingControls,
    addBtn,
    goBtn,
    photo,
    photoMessage,
  };
}

describe('ScanHandler', () => {
  let refs: ScanRootRefs;
  let scanHandler: ScanHandler;
  let mockHass: HomeAssistant;
  let mockConfig: InventoryConfig;
  let mockTranslations: TranslationData;
  let mockServices: Services;
  let mockRenderCallback: () => void;

  const build = (omit: string[] = [], hold?: AcquireHold): void => {
    refs = createScanRoot(omit);
    scanHandler = new ScanHandler(
      refs.root,
      () =>
        createMockCardContext({
          hass: mockHass,
          config: mockConfig,
          translations: mockTranslations,
        }),
      mockServices,
      mockRenderCallback,
      hold,
    );
  };

  beforeEach(() => {
    vi.mocked(startScanner).mockReset();
    vi.mocked(stopScanner).mockReset();
    vi.mocked(nativeScanner).mockReset().mockReturnValue(undefined);
    vi.mocked(startNativeScanner).mockReset();
    vi.mocked(scanSupport).mockReset().mockReturnValue('live');
    vi.mocked(chooseBarcodePhoto).mockReset().mockResolvedValue(null);

    mockHass = createMockHomeAssistant();
    mockConfig = { type: 'inventory-card', entity: 'sensor.test_inventory' };
    mockTranslations = {};

    mockServices = {
      lookupByBarcode: vi.fn().mockResolvedValue({ items: [] }),
      lookupBarcodeProduct: vi.fn().mockResolvedValue({ barcode: '', results: [] }),
      scanBarcode: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as Services;

    mockRenderCallback = vi.fn();

    vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('test-inventory-id');

    globalThis.alert = vi.fn();

    build();
  });

  describe("showScanPanel — the companion app's native scanner", () => {
    const external = { config: { hasBarCodeScanner: 1 }, fireMessage: vi.fn() };
    let holds: { hold: AcquireHold; holds: () => UiHold[] };
    const handlers = (): NativeScanHandlers => must(vi.mocked(startNativeScanner).mock.calls[0])[2];

    beforeEach(() => {
      vi.mocked(nativeScanner).mockReturnValue(external);
      holds = holdTracker();
      build([], holds.hold);
      refs.panel.hidden = true;
    });

    it('opens the app scanner instead of the panel and the camera', async () => {
      await scanHandler.showScanPanel();

      expect(nativeScanner).toHaveBeenCalledWith(mockHass);
      expect(startNativeScanner).toHaveBeenCalledWith(
        external,
        {
          title: 'Scan barcode',
          description: "Point the camera at the item's barcode",
          alternativeOptionLabel: 'Choose a photo',
        },
        expect.any(Object),
      );
      expect(refs.panel.hidden).toBe(true);
      expect(startScanner).not.toHaveBeenCalled();
      expect(chooseBarcodePhoto).not.toHaveBeenCalled();
    });

    it('uses the app scanner on HTTP too: the app has its own camera', async () => {
      vi.mocked(scanSupport).mockReturnValue('insecure');

      await scanHandler.showScanPanel();

      expect(startNativeScanner).toHaveBeenCalledOnce();
      expect(refs.panel.hidden).toBe(true);
    });

    it('holds background work while the app scanner is open, until it ends', async () => {
      await scanHandler.showScanPanel();
      expect(holds.holds()).toEqual([{ kind: 'background', reason: 'native scanner' }]);

      handlers().onEnd?.();

      expect(holds.holds()).toEqual([]);
    });

    it("a barcode from the app shows the panel's action bar, the hold passing to the panel", async () => {
      await scanHandler.showScanPanel();

      handlers().onDetected('4006381333931');
      handlers().onEnd?.();
      expect(mockServices.lookupByBarcode).toHaveBeenCalledWith('4006381333931');

      expect(refs.panel.hidden).toBe(false);
      expect(refs.barcodeLabel.textContent).toBe('4006381333931');
      expect(holds.holds()).toEqual([{ kind: 'background', reason: 'scan panel' }]);
    });

    it('"Choose a photo" in the app shows the panel\'s photo offer, without a message', async () => {
      await scanHandler.showScanPanel();

      handlers().onChoosePhoto();
      handlers().onEnd?.();

      expect(refs.panel.hidden).toBe(false);
      expect(refs.photo.hidden).toBe(false);
      expect(refs.photoMessage.hidden).toBe(true);
      expect(refs.viewportContainer.hidden).toBe(true);
      expect(holds.holds()).toEqual([{ kind: 'background', reason: 'scan panel' }]);
    });

    it('closing (stopScanner) ends the app scanner and releases the hold', async () => {
      vi.mocked(stopScanner).mockImplementation(() => handlers().onEnd?.());
      await scanHandler.showScanPanel();

      scanHandler.hideScanPanel();

      expect(stopScanner).toHaveBeenCalled();
      expect(holds.holds()).toEqual([]);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('showScanPanel — live scan unavailable (photo fallback)', () => {
    beforeEach(() => {
      vi.mocked(scanSupport).mockReturnValue('photo');
    });

    it('opens the photo chooser right away instead of the camera', async () => {
      await scanHandler.showScanPanel();

      expect(chooseBarcodePhoto).toHaveBeenCalledOnce();
      expect(startScanner).not.toHaveBeenCalled();
    });

    it('routes a successfully decoded barcode into handleScanDetected', async () => {
      const detectedSpy = vi.spyOn(scanHandler, 'handleScanDetected').mockResolvedValue(undefined);

      await scanHandler.showScanPanel();
      vi.mocked(chooseBarcodePhoto).mock.calls[0]?.[0]('1234567890128');

      expect(detectedSpy).toHaveBeenCalledWith('1234567890128');
    });

    it('shows the error panel and schedules hideScanPanel after 3s on decode failure', async () => {
      vi.useFakeTimers();
      vi.mocked(chooseBarcodePhoto).mockResolvedValue('not_found');

      await scanHandler.showScanPanel();
      await vi.advanceTimersByTimeAsync(0);

      expect(refs.panel.hidden).toBe(false);
      expect(refs.viewportContainer.hidden).toBe(true);
      expect(refs.errorEl.textContent).toBe('No barcode found in photo');
      expect(refs.errorEl.hidden).toBe(false);

      const stopScannerSpy = vi.mocked(stopScanner);
      expect(stopScannerSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(3000);

      expect(stopScannerSpy).toHaveBeenCalled();
      expect(refs.panel.hidden).toBe(true);
    });

    it('does not schedule hideScanPanel when the panel/error elements are missing on decode failure', async () => {
      vi.useFakeTimers();
      build(['scan-panel-error']);
      vi.mocked(chooseBarcodePhoto).mockResolvedValue('not_found');

      await scanHandler.showScanPanel();
      await vi.advanceTimersByTimeAsync(3000);

      expect(stopScanner).not.toHaveBeenCalled();
    });

    it('shows the error panel without throwing when the viewport container is missing', async () => {
      vi.useFakeTimers();
      build([`${ELEMENTS.SCAN_VIEWPORT}-container`]);
      vi.mocked(chooseBarcodePhoto).mockResolvedValue('not_found');

      await scanHandler.showScanPanel();
      await vi.advanceTimersByTimeAsync(0);

      expect(refs.panel.hidden).toBe(false);
      expect(refs.errorEl.hidden).toBe(false);
    });
  });

  describe('showScanPanel — insecure (HTTP) connection', () => {
    beforeEach(() => {
      vi.mocked(scanSupport).mockReturnValue('insecure');
    });

    it('explains the HTTPS requirement and offers a photo, never starting the camera', async () => {
      await scanHandler.showScanPanel();

      expect(startScanner).not.toHaveBeenCalled();
      expect(chooseBarcodePhoto).not.toHaveBeenCalled();
      expect(refs.panel.hidden).toBe(false);
      expect(refs.viewportContainer.hidden).toBe(true);
      expect(refs.photo.hidden).toBe(false);
      expect(refs.photoMessage.textContent).toBe(
        'The camera needs a secure (HTTPS) connection to Home Assistant',
      );
    });
  });

  describe('choosePhoto (the "Choose a photo" button)', () => {
    it('decodes the chosen photo into handleScanDetected', async () => {
      const detectedSpy = vi.spyOn(scanHandler, 'handleScanDetected').mockResolvedValue(undefined);

      const chosen = scanHandler.choosePhoto();
      vi.mocked(chooseBarcodePhoto).mock.calls[0]?.[0]('4006381333931');
      await chosen;

      expect(detectedSpy).toHaveBeenCalledWith('4006381333931');
    });

    it('keeps offering a photo, saying none had a barcode', async () => {
      vi.mocked(chooseBarcodePhoto).mockResolvedValue('not_found');

      await scanHandler.choosePhoto();

      expect(refs.panel.hidden).toBe(false);
      expect(refs.photo.hidden).toBe(false);
      expect(refs.photoMessage.textContent).toBe('No barcode found in photo');
    });

    it('a detected barcode replaces the photo offer with the action bar', async () => {
      vi.mocked(startScanner).mockResolvedValue('permission_denied');
      await scanHandler.showScanPanel();

      await scanHandler.handleScanDetected('4006381333931');

      expect(refs.photo.hidden).toBe(true);
      expect(refs.actionBar.hidden).toBe(false);
    });
  });

  describe('showScanPanel — live scan available', () => {
    beforeEach(() => {
      vi.mocked(scanSupport).mockReturnValue('live');
    });

    it('returns early without starting the scanner when the panel element is missing', async () => {
      build([ELEMENTS.SCAN_PANEL]);

      await scanHandler.showScanPanel();

      expect(startScanner).not.toHaveBeenCalled();
    });

    it('does not start the scanner when the viewport element is missing', async () => {
      build([ELEMENTS.SCAN_VIEWPORT]);

      await scanHandler.showScanPanel();

      expect(refs.panel.hidden).toBe(false);
      expect(startScanner).not.toHaveBeenCalled();
      expect(refs.loadingEl.hidden).toBe(false);
    });

    it('shows the panel and loading state, then hides loading with no error on success', async () => {
      vi.mocked(startScanner).mockResolvedValue(null);

      await scanHandler.showScanPanel();

      expect(refs.panel.hidden).toBe(false);
      expect(refs.viewportContainer.hidden).toBe(false);
      expect(refs.actionBar.hidden).toBe(true);
      expect(refs.errorEl.hidden).toBe(true);
      expect(refs.errorEl.textContent).toBe('');
      expect(startScanner).toHaveBeenCalledWith(refs.viewport, expect.any(Function));
      expect(refs.loadingEl.hidden).toBe(true);
      expect(globalThis.alert).not.toHaveBeenCalled();
    });

    it('routes a detected barcode from the live scanner callback into handleScanDetected', async () => {
      let capturedCallback: ((code: string) => void) | undefined;
      vi.mocked(startScanner).mockImplementation(async (_viewport, onDetected) => {
        capturedCallback = onDetected;
        return null;
      });
      const detectedSpy = vi.spyOn(scanHandler, 'handleScanDetected').mockResolvedValue(undefined);

      await scanHandler.showScanPanel();

      must(capturedCallback)('9999999999');

      expect(detectedSpy).toHaveBeenCalledWith('9999999999');
    });

    it('keeps the panel with the permission-denied message and a photo offer on permission_denied', async () => {
      vi.mocked(startScanner).mockResolvedValue('permission_denied');

      await scanHandler.showScanPanel();

      expect(refs.loadingEl.hidden).toBe(true);
      expect(refs.panel.hidden).toBe(false);
      expect(refs.viewportContainer.hidden).toBe(true);
      expect(refs.photo.hidden).toBe(false);
      expect(refs.photoMessage.textContent).toBe('Camera access denied');
      expect(globalThis.alert).not.toHaveBeenCalled();
    });

    it('keeps the panel with the camera-not-available message and a photo offer on other errors', async () => {
      vi.mocked(startScanner).mockResolvedValue('not_available');

      await scanHandler.showScanPanel();

      expect(refs.panel.hidden).toBe(false);
      expect(refs.photo.hidden).toBe(false);
      expect(refs.photoMessage.textContent).toBe('Camera not available');
      expect(globalThis.alert).not.toHaveBeenCalled();
    });

    it('hides a previous photo offer when the camera starts again', async () => {
      vi.mocked(startScanner).mockResolvedValueOnce('permission_denied').mockResolvedValue(null);
      await scanHandler.showScanPanel();

      await scanHandler.showScanPanel();

      expect(refs.photo.hidden).toBe(true);
      expect(refs.viewportContainer.hidden).toBe(false);
    });

    it('does not throw when viewportContainer, actionBar, errorEl and loadingEl are all missing', async () => {
      build([
        `${ELEMENTS.SCAN_VIEWPORT}-container`,
        ELEMENTS.SCAN_ACTION_BAR,
        'scan-panel-error',
        'scan-panel-loading',
      ]);
      vi.mocked(startScanner).mockResolvedValue(null);

      await expect(scanHandler.showScanPanel()).resolves.toBeUndefined();

      expect(refs.panel.hidden).toBe(false);
      expect(startScanner).toHaveBeenCalledWith(refs.viewport, expect.any(Function));
    });
  });

  describe('hideScanPanel', () => {
    it('stops the scanner, clears the scanned barcode and hides the panel', async () => {
      await scanHandler.handleScanDetected('123456');
      expect(scanHandler.getScannedBarcode()).toBe('123456');

      scanHandler.hideScanPanel();

      expect(stopScanner).toHaveBeenCalled();
      expect(scanHandler.getScannedBarcode()).toBeNull();
      expect(refs.panel.hidden).toBe(true);
    });

    it('no-ops handleScanGo after hiding since scannedBarcode is cleared', async () => {
      await scanHandler.handleScanDetected('123456');
      scanHandler.hideScanPanel();

      await scanHandler.handleScanGo();

      expect(mockServices.scanBarcode).not.toHaveBeenCalled();
    });

    it('does not throw when the panel element is missing', () => {
      build([ELEMENTS.SCAN_PANEL]);

      expect(() => scanHandler.hideScanPanel()).not.toThrow();
      expect(stopScanner).toHaveBeenCalled();
    });
  });

  describe('handleScanDetected', () => {
    it('sets the scanned barcode, shows the panel and populates the barcode label', async () => {
      await scanHandler.handleScanDetected('5551234567');

      expect(scanHandler.getScannedBarcode()).toBe('5551234567');
      expect(refs.panel.hidden).toBe(false);
      expect(refs.viewportContainer.hidden).toBe(true);
      expect(refs.barcodeLabel.textContent).toBe('5551234567');
      expect(refs.actionBar.hidden).toBe(false);
      expect(refs.errorEl.hidden).toBe(true);
      expect(refs.errorEl.textContent).toBe('');
      expect(refs.amountInput.value).toBe('1');
      expect(refs.actionSelect.value).toBe('increment');
      expect(stopScanner).toHaveBeenCalled();
      expect(mockServices.lookupByBarcode).toHaveBeenCalledWith('5551234567');
    });

    it('shows item name/quantity with a unit and existing-item controls on a match', async () => {
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({
        items: [{ name: 'Milk', inventory_id: 'test-inventory-id', quantity: 5, unit: 'pieces' }],
      });

      await scanHandler.handleScanDetected('123');

      expect(refs.itemNameEl.textContent).toBe('Milk');
      expect(refs.itemNameEl.hidden).toBe(false);
      expect(refs.itemQuantityEl.textContent).toBe('In stock: 5 pieces');
      expect(refs.itemQuantityEl.hidden).toBe(false);
      expect(refs.existingControls.hidden).toBe(false);
      expect(refs.addBtn.hidden).toBe(true);
      expect(refs.goBtn.hidden).toBe(false);
    });

    it('shows item quantity without a unit using the plain quantity number', async () => {
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({
        items: [{ name: 'Eggs', inventory_id: 'test-inventory-id', quantity: 12 }],
      });

      await scanHandler.handleScanDetected('456');

      expect(refs.itemQuantityEl.textContent).toBe('In stock: 12');
    });

    it('defaults the quantity display to 0 when the matched item has no quantity', async () => {
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({
        items: [{ name: 'Salt', inventory_id: 'test-inventory-id' }],
      });

      await scanHandler.handleScanDetected('789');

      expect(refs.itemQuantityEl.textContent).toBe('In stock: 0');
    });

    it('shows the not-found hint, hides name, hides existing controls, shows add, hides go when no match', async () => {
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({
        items: [{ name: 'Other', inventory_id: 'a-different-inventory', quantity: 3 }],
      });

      await scanHandler.handleScanDetected('999');

      expect(refs.itemNameEl.textContent).toBe('');
      expect(refs.itemNameEl.hidden).toBe(true);
      expect(refs.itemQuantityEl.textContent).toBe('No item found for this barcode');
      expect(refs.itemQuantityEl.hidden).toBe(false);
      expect(refs.existingControls.hidden).toBe(true);
      expect(refs.addBtn.hidden).toBe(false);
      expect(refs.goBtn.hidden).toBe(true);
    });

    it('shows the product name from the product-DB lookup when nothing matched locally', async () => {
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({ items: [] });
      mockServices.lookupBarcodeProduct = vi.fn().mockResolvedValue({
        barcode: '555',
        results: [
          { provider: 'openfoodfacts', found: true, product: { name: 'Probiotic Yogurt' } },
        ],
      });

      await scanHandler.handleScanDetected('555');

      expect(refs.itemNameEl.textContent).toBe('Probiotic Yogurt');
      expect(refs.itemNameEl.hidden).toBe(false);
      expect(refs.itemQuantityEl.hidden).toBe(true);
      expect(refs.addBtn.hidden).toBe(false);
      expect(refs.goBtn.hidden).toBe(true);
    });

    it('falls back to the not-found hint when the product lookup also finds nothing', async () => {
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({ items: [] });
      mockServices.lookupBarcodeProduct = vi.fn().mockResolvedValue({
        barcode: '555',
        results: [{ provider: 'openfoodfacts', found: false }],
      });

      await scanHandler.handleScanDetected('555');

      expect(refs.itemNameEl.hidden).toBe(true);
      expect(refs.itemQuantityEl.textContent).toBe('No item found for this barcode');
      expect(refs.itemQuantityEl.hidden).toBe(false);
    });

    it('ignores a product-lookup result superseded by a newer scan', async () => {
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({ items: [] });
      let resolveFirst!: (value: { barcode: string; results: unknown[] }) => void;
      mockServices.lookupBarcodeProduct = vi.fn().mockImplementation((barcode: string) => {
        if (barcode === 'first') {
          // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
          return new Promise((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve({ barcode, results: [] });
      });

      const firstScan = scanHandler.handleScanDetected('first');
      await scanHandler.handleScanDetected('second');
      resolveFirst({
        barcode: 'first',
        results: [{ provider: 'openfoodfacts', found: true, product: { name: 'Stale Product' } }],
      });
      await firstScan;

      expect(refs.itemNameEl.textContent).not.toBe('Stale Product');
      expect(refs.itemQuantityEl.textContent).toBe('No item found for this barcode');
    });

    it('treats an empty items result as no match', async () => {
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({ items: [] });

      await scanHandler.handleScanDetected('000');

      expect(refs.addBtn.hidden).toBe(false);
      expect(refs.goBtn.hidden).toBe(true);
    });

    it('does not throw on a match when name/quantity/controls elements are missing', async () => {
      build([
        `${ELEMENTS.SCAN_VIEWPORT}-container`,
        ELEMENTS.SCAN_ACTION_BAR,
        'scan-barcode-label',
        'scan-panel-error',
        ELEMENTS.SCAN_AMOUNT_INPUT,
        ELEMENTS.SCAN_ACTION_SELECT,
        ELEMENTS.SCAN_ITEM_NAME,
        ELEMENTS.SCAN_ITEM_QUANTITY,
        ELEMENTS.SCAN_EXISTING_CONTROLS,
        ELEMENTS.SCAN_ADD_BTN,
        ELEMENTS.SCAN_GO_BTN,
      ]);
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({
        items: [{ name: 'Milk', inventory_id: 'test-inventory-id', quantity: 5, unit: 'pieces' }],
      });

      await expect(scanHandler.handleScanDetected('123')).resolves.toBeUndefined();

      expect(scanHandler.getScannedBarcode()).toBe('123');
      expect(refs.panel.hidden).toBe(false);
    });

    it('does not throw on no-match when name/quantity/controls elements are missing', async () => {
      build([
        `${ELEMENTS.SCAN_VIEWPORT}-container`,
        ELEMENTS.SCAN_ACTION_BAR,
        'scan-barcode-label',
        'scan-panel-error',
        ELEMENTS.SCAN_AMOUNT_INPUT,
        ELEMENTS.SCAN_ACTION_SELECT,
        ELEMENTS.SCAN_ITEM_NAME,
        ELEMENTS.SCAN_ITEM_QUANTITY,
        ELEMENTS.SCAN_EXISTING_CONTROLS,
        ELEMENTS.SCAN_ADD_BTN,
        ELEMENTS.SCAN_GO_BTN,
      ]);
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({ items: [] });

      await expect(scanHandler.handleScanDetected('999')).resolves.toBeUndefined();

      expect(scanHandler.getScannedBarcode()).toBe('999');
      expect(refs.panel.hidden).toBe(false);
    });
  });

  describe('handleScanGo', () => {
    it('is a no-op when no barcode has been scanned', async () => {
      await scanHandler.handleScanGo();

      expect(mockServices.scanBarcode).not.toHaveBeenCalled();
    });

    it('reads the action and amount, calls scanBarcode, hides the panel and renders on success', async () => {
      await scanHandler.handleScanDetected('123456');
      refs.actionSelect.value = 'decrement';
      refs.amountInput.value = '3';
      mockServices.scanBarcode = vi.fn().mockResolvedValue({ success: true });
      const hideSpy = vi.spyOn(scanHandler, 'hideScanPanel');

      await scanHandler.handleScanGo();

      expect(mockServices.scanBarcode).toHaveBeenCalledWith(
        'test-inventory-id',
        '123456',
        'decrement',
        3,
        {},
      );
      expect(hideSpy).toHaveBeenCalled();
      expect(mockRenderCallback).toHaveBeenCalled();
    });

    it('defaults the action to increment when the action select is missing', async () => {
      build([ELEMENTS.SCAN_ACTION_SELECT]);
      await scanHandler.handleScanDetected('123456');
      refs.amountInput.value = '2';
      mockServices.scanBarcode = vi.fn().mockResolvedValue({ success: true });

      await scanHandler.handleScanGo();

      expect(mockServices.scanBarcode).toHaveBeenCalledWith(
        'test-inventory-id',
        '123456',
        'increment',
        2,
        {},
      );
    });

    it('defaults the amount to 1 when the amount input is missing', async () => {
      build([ELEMENTS.SCAN_AMOUNT_INPUT]);
      await scanHandler.handleScanDetected('123456');
      mockServices.scanBarcode = vi.fn().mockResolvedValue({ success: true });

      await scanHandler.handleScanGo();

      expect(mockServices.scanBarcode).toHaveBeenCalledWith(
        'test-inventory-id',
        '123456',
        'increment',
        1,
        {},
      );
    });

    it('defaults the amount to 1 when the amount input value is not a valid number', async () => {
      await scanHandler.handleScanDetected('123456');
      refs.amountInput.value = 'not-a-number';
      mockServices.scanBarcode = vi.fn().mockResolvedValue({ success: true });

      await scanHandler.handleScanGo();

      expect(mockServices.scanBarcode).toHaveBeenCalledWith(
        'test-inventory-id',
        '123456',
        'increment',
        1,
        {},
      );
    });

    it('shows the localized not-found text for the barcode_not_found error code', async () => {
      await scanHandler.handleScanDetected('123456');
      mockServices.scanBarcode = vi.fn().mockResolvedValue({
        success: false,
        error: "Validation error: No item found for barcode '123456'",
        errorCode: 'barcode_not_found',
      });
      const hideSpy = vi.spyOn(scanHandler, 'hideScanPanel');

      await scanHandler.handleScanGo();

      expect(refs.errorEl.textContent).toBe('No item found for this barcode');
      expect(refs.errorEl.hidden).toBe(false);
      expect(hideSpy).not.toHaveBeenCalled();
      expect(mockRenderCallback).not.toHaveBeenCalled();
      expect(refs.panel.hidden).toBe(false);
    });

    it('shows the backend message verbatim when there is no error code, even if it reads like not-found', async () => {
      await scanHandler.handleScanDetected('123456');
      mockServices.scanBarcode = vi.fn().mockResolvedValue({
        success: false,
        error: "No item found for barcode '123456'",
      });

      await scanHandler.handleScanGo();

      expect(refs.errorEl.textContent).toBe("No item found for barcode '123456'");
    });

    it('shows the backend error message for other error codes', async () => {
      await scanHandler.handleScanDetected('123456');
      mockServices.scanBarcode = vi.fn().mockResolvedValue({
        success: false,
        error: "Validation error: Barcode '123456' matches items in more than one inventory",
        errorCode: 'ambiguous_barcode',
      });

      await scanHandler.handleScanGo();

      expect(refs.errorEl.textContent).toBe(
        "Validation error: Barcode '123456' matches items in more than one inventory",
      );
      expect(refs.errorEl.hidden).toBe(false);
      expect(mockRenderCallback).not.toHaveBeenCalled();
    });

    it('falls back to the localized not-found text when no error message is given', async () => {
      await scanHandler.handleScanDetected('123456');
      mockServices.scanBarcode = vi.fn().mockResolvedValue({ success: false });

      await scanHandler.handleScanGo();

      expect(refs.errorEl.textContent).toBe('No item found for this barcode');
    });

    it('does not throw on failure when the error element is missing', async () => {
      build(['scan-panel-error']);
      await scanHandler.handleScanDetected('123456');
      mockServices.scanBarcode = vi.fn().mockResolvedValue({ success: false, error: 'nope' });

      await expect(scanHandler.handleScanGo()).resolves.toBeUndefined();

      expect(mockServices.scanBarcode).toHaveBeenCalled();
    });
  });

  describe('batch details (batches feature)', () => {
    function addBatchDetails(): HTMLDetailsElement {
      const details = document.createElement('details');
      details.id = ELEMENTS.SCAN_BATCH_FIELDS;
      details.hidden = true;
      details.innerHTML = `
        <input data-batch-field="${BATCH_FIELDS.EXPIRY_DATE}" />
        <input data-batch-field="${BATCH_FIELDS.LOCATION}" />
        <input data-batch-field="${BATCH_FIELDS.UNIT_PRICE}" />
        <input data-batch-field="${BATCH_FIELDS.PURCHASED_AT}" />`;
      refs.root.appendChild(details);
      return details;
    }

    function setBatchField(details: HTMLElement, field: string, value: string): void {
      const input = details.querySelector(`[data-batch-field="${field}"]`);
      if (!(input instanceof HTMLInputElement)) {
        throw new Error(`missing ${field}`);
      }
      input.value = value;
    }

    const knownItem = { items: [{ name: 'Milk', inventory_id: 'test-inventory-id', quantity: 1 }] };

    it('sends batch details with an increment of a known item', async () => {
      const details = addBatchDetails();
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue(knownItem);
      await scanHandler.handleScanDetected('123456');
      setBatchField(details, BATCH_FIELDS.EXPIRY_DATE, '2026-11-01');
      setBatchField(details, BATCH_FIELDS.LOCATION, 'Garage');
      setBatchField(details, BATCH_FIELDS.UNIT_PRICE, '2.5');

      await scanHandler.handleScanGo();

      expect(mockServices.scanBarcode).toHaveBeenCalledWith(
        'test-inventory-id',
        '123456',
        'increment',
        1,
        { expiryDate: '2026-11-01', location: 'Garage', price: 2.5 },
      );
    });

    it('ignores batch details on a decrement', async () => {
      const details = addBatchDetails();
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue(knownItem);
      await scanHandler.handleScanDetected('123456');
      setBatchField(details, BATCH_FIELDS.LOCATION, 'Garage');
      refs.actionSelect.value = 'decrement';

      await scanHandler.handleScanGo();

      expect(mockServices.scanBarcode).toHaveBeenCalledWith(
        'test-inventory-id',
        '123456',
        'decrement',
        1,
        {},
      );
    });

    it('resets the details on every scan and shows them only to restock a known item', async () => {
      const details = addBatchDetails();
      details.open = true;
      setBatchField(details, BATCH_FIELDS.LOCATION, 'Old');

      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({ items: [] });
      await scanHandler.handleScanDetected('000');
      expect(details.open).toBe(false);
      expect(batchFieldValue(details, BATCH_FIELDS.LOCATION)).toBe('');
      expect(details.hidden).toBe(true);

      mockServices.lookupByBarcode = vi.fn().mockResolvedValue(knownItem);
      await scanHandler.handleScanDetected('123456');
      expect(details.hidden).toBe(false);

      refs.actionSelect.value = 'decrement';
      scanHandler.syncBatchFieldsVisibility();
      expect(details.hidden).toBe(true);
    });

    it("clears the previous scan's details before the next lookup answers", async () => {
      const details = addBatchDetails();
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue(knownItem);
      await scanHandler.handleScanDetected('123456');
      details.open = true;
      setBatchField(details, BATCH_FIELDS.LOCATION, 'Garage');

      let resolveLookup: (value: typeof knownItem) => void = () => {};
      // Promise.withResolvers() is unavailable under this project's TS lib target (< ES2024).
      mockServices.lookupByBarcode = vi.fn().mockReturnValue(
        new Promise<typeof knownItem>((resolve) => {
          resolveLookup = resolve;
        }),
      );
      const scan = scanHandler.handleScanDetected('654321');

      expect(details.open).toBe(false);
      expect(batchFieldValue(details, BATCH_FIELDS.LOCATION)).toBe('');
      expect(details.hidden).toBe(true);

      resolveLookup(knownItem);
      await scan;
      expect(details.hidden).toBe(false);
    });

    it('does nothing when the card was rendered without batch details', () => {
      expect(() => scanHandler.syncBatchFieldsVisibility()).not.toThrow();
    });
  });

  describe('resumeScanning (card re-attached; the pause stopped the camera)', () => {
    beforeEach(() => {
      vi.mocked(startScanner).mockResolvedValue(null);
    });

    it('restarts the camera of a panel still waiting for a barcode', async () => {
      await scanHandler.showScanPanel();
      vi.mocked(startScanner).mockClear();

      scanHandler.resumeScanning();

      expect(startScanner).toHaveBeenCalledOnce();
      expect(vi.mocked(startScanner).mock.calls[0]?.[0]).toBe(refs.viewport);
      expect(refs.panel.hidden).toBe(false);
    });

    it('leaves a closed panel closed', () => {
      refs.panel.hidden = true;

      scanHandler.resumeScanning();

      expect(startScanner).not.toHaveBeenCalled();
    });

    it('keeps showing a scanned barcode instead of the camera', async () => {
      await scanHandler.handleScanDetected('123456');

      scanHandler.resumeScanning();

      expect(startScanner).not.toHaveBeenCalled();
      expect(refs.actionBar.hidden).toBe(false);
    });
  });
});
