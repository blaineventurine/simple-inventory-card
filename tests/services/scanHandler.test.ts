import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ScanHandler } from '../../src/services/scanHandler';
import { Services } from '../../src/services/services';
import { InventoryResolver } from '../../src/utils/inventoryResolver';
import { ELEMENTS } from '../../src/utils/constants';
import { HomeAssistant, InventoryConfig } from '../../src/types/homeAssistant';
import { TranslationData } from '@/types/translatableComponent';
import { createMockHomeAssistant } from '../testHelpers';
import {
  startScanner,
  stopScanner,
  isLiveScanAvailable,
  decodeFromFile,
} from '../../src/services/barcodeScanner';

vi.mock('../../src/services/barcodeScanner', () => ({
  startScanner: vi.fn(),
  stopScanner: vi.fn(),
  isLiveScanAvailable: vi.fn(),
  decodeFromFile: vi.fn(),
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
}

function createScanRoot(omit: string[] = []): ScanRootRefs {
  const container = document.createElement('div');

  function make(id: string, tag: 'div'): HTMLDivElement | null;
  function make(id: string, tag: 'input'): HTMLInputElement | null;
  function make(id: string, tag: 'select'): HTMLSelectElement | null;
  function make(id: string, tag: 'div' | 'input' | 'select' = 'div'): HTMLElement | null {
    if (omit.includes(id)) return null;
    const el = document.createElement(tag);
    el.id = id;
    container.appendChild(el);
    return el;
  }

  const panel = make(ELEMENTS.SCAN_PANEL, 'div')!;
  const viewportContainer = make(`${ELEMENTS.SCAN_VIEWPORT}-container`, 'div')!;
  const viewport = make(ELEMENTS.SCAN_VIEWPORT, 'div')!;
  const actionBar = make(ELEMENTS.SCAN_ACTION_BAR, 'div')!;
  const errorEl = make('scan-panel-error', 'div')!;
  const loadingEl = make('scan-panel-loading', 'div')!;
  const amountInput = make(ELEMENTS.SCAN_AMOUNT_INPUT, 'input')!;
  const actionSelect = make(ELEMENTS.SCAN_ACTION_SELECT, 'select')!;
  if (actionSelect) {
    for (const value of ['increment', 'decrement']) {
      const option = document.createElement('option');
      option.value = value;
      actionSelect.appendChild(option);
    }
  }
  const barcodeLabel = make('scan-barcode-label', 'div')!;
  const itemNameEl = make(ELEMENTS.SCAN_ITEM_NAME, 'div')!;
  const itemQuantityEl = make(ELEMENTS.SCAN_ITEM_QUANTITY, 'div')!;
  const existingControls = make(ELEMENTS.SCAN_EXISTING_CONTROLS, 'div')!;
  const addBtn = make(ELEMENTS.SCAN_ADD_BTN, 'div')!;
  const goBtn = make(ELEMENTS.SCAN_GO_BTN, 'div')!;

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

  const build = (omit: string[] = []): void => {
    refs = createScanRoot(omit);
    scanHandler = new ScanHandler(
      refs.root,
      () => mockHass,
      () => mockConfig,
      () => mockTranslations,
      mockServices,
      mockRenderCallback,
    );
  };

  beforeEach(() => {
    vi.mocked(startScanner).mockReset();
    vi.mocked(stopScanner).mockReset();
    vi.mocked(isLiveScanAvailable).mockReset().mockReturnValue(true);
    vi.mocked(decodeFromFile).mockReset();

    mockHass = createMockHomeAssistant();
    mockConfig = { type: 'inventory-card', entity: 'sensor.test_inventory' };
    mockTranslations = {};

    mockServices = {
      lookupByBarcode: vi.fn().mockResolvedValue({ items: [] }),
      scanBarcode: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as Services;

    mockRenderCallback = vi.fn();

    vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('test-inventory-id');

    globalThis.alert = vi.fn();

    build();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('showScanPanel — live scan unavailable (file input fallback)', () => {
    beforeEach(() => {
      vi.mocked(isLiveScanAvailable).mockReturnValue(false);
    });

    it('creates a hidden file input, appends it to document.body and clicks it', async () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      await scanHandler.showScanPanel();

      expect(appendSpy).toHaveBeenCalledOnce();
      const input = appendSpy.mock.calls[0][0] as HTMLInputElement;
      expect(input.type).toBe('file');
      expect(input.accept).toBe('image/*');
      expect(clickSpy).toHaveBeenCalledOnce();
    });

    it('routes a successfully decoded barcode into handleScanDetected', async () => {
      let capturedFile: File | undefined;
      vi.mocked(decodeFromFile).mockImplementation(async (file, onDetected) => {
        capturedFile = file;
        onDetected('1234567890128');
        return null;
      });

      let capturedInput: HTMLInputElement | null = null;
      vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
        capturedInput = el as HTMLInputElement;
        return el;
      });
      vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      const detectedSpy = vi.spyOn(scanHandler, 'handleScanDetected').mockResolvedValue(undefined);

      await scanHandler.showScanPanel();

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(capturedInput!, 'files', { value: [file], configurable: true });
      capturedInput!.dispatchEvent(new Event('change'));

      // decodeFromFile's mock body (including the onDetected callback) runs synchronously
      // up to its first await, so the detection is already routed by this point.
      expect(capturedFile).toBe(file);
      expect(detectedSpy).toHaveBeenCalledWith('1234567890128');
    });

    it('does nothing when the change event fires with no file selected', async () => {
      let capturedInput: HTMLInputElement | null = null;
      vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
        capturedInput = el as HTMLInputElement;
        return el;
      });
      const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      await scanHandler.showScanPanel();

      Object.defineProperty(capturedInput!, 'files', { value: [], configurable: true });
      capturedInput!.dispatchEvent(new Event('change'));

      expect(removeSpy).toHaveBeenCalledWith(capturedInput);
      expect(decodeFromFile).not.toHaveBeenCalled();
    });

    it('shows the error panel and schedules hideScanPanel after 3s on decode failure', async () => {
      vi.useFakeTimers();
      vi.mocked(decodeFromFile).mockResolvedValue('not_found');

      let capturedInput: HTMLInputElement | null = null;
      vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
        capturedInput = el as HTMLInputElement;
        return el;
      });
      vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      await scanHandler.showScanPanel();

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(capturedInput!, 'files', { value: [file], configurable: true });
      capturedInput!.dispatchEvent(new Event('change'));

      await vi.advanceTimersByTimeAsync(0);

      expect(refs.panel.style.display).toBe('block');
      expect(refs.viewportContainer.style.display).toBe('none');
      expect(refs.errorEl.textContent).toBe('No barcode found in photo');
      expect(refs.errorEl.style.display).toBe('block');

      const stopScannerSpy = vi.mocked(stopScanner);
      expect(stopScannerSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(3000);

      expect(stopScannerSpy).toHaveBeenCalled();
      expect(refs.panel.style.display).toBe('none');
    });

    it('does not schedule hideScanPanel when the panel/error elements are missing on decode failure', async () => {
      vi.useFakeTimers();
      build(['scan-panel-error']);
      vi.mocked(isLiveScanAvailable).mockReturnValue(false);
      vi.mocked(decodeFromFile).mockResolvedValue('not_found');

      let capturedInput: HTMLInputElement | null = null;
      vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
        capturedInput = el as HTMLInputElement;
        return el;
      });
      vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      await scanHandler.showScanPanel();

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(capturedInput!, 'files', { value: [file], configurable: true });
      capturedInput!.dispatchEvent(new Event('change'));

      await vi.advanceTimersByTimeAsync(3000);

      expect(stopScanner).not.toHaveBeenCalled();
    });

    it('shows the error panel without throwing when the viewport container is missing', async () => {
      vi.useFakeTimers();
      build([`${ELEMENTS.SCAN_VIEWPORT}-container`]);
      vi.mocked(isLiveScanAvailable).mockReturnValue(false);
      vi.mocked(decodeFromFile).mockResolvedValue('not_found');

      let capturedInput: HTMLInputElement | null = null;
      vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
        capturedInput = el as HTMLInputElement;
        return el;
      });
      vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      await scanHandler.showScanPanel();

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(capturedInput!, 'files', { value: [file], configurable: true });
      capturedInput!.dispatchEvent(new Event('change'));

      await vi.advanceTimersByTimeAsync(0);

      expect(refs.panel.style.display).toBe('block');
      expect(refs.errorEl.style.display).toBe('block');
    });
  });

  describe('showScanPanel — live scan available', () => {
    beforeEach(() => {
      vi.mocked(isLiveScanAvailable).mockReturnValue(true);
    });

    it('returns early without starting the scanner when the panel element is missing', async () => {
      build([ELEMENTS.SCAN_PANEL]);

      await scanHandler.showScanPanel();

      expect(startScanner).not.toHaveBeenCalled();
    });

    it('does not start the scanner when the viewport element is missing', async () => {
      build([ELEMENTS.SCAN_VIEWPORT]);

      await scanHandler.showScanPanel();

      expect(refs.panel.style.display).toBe('block');
      expect(startScanner).not.toHaveBeenCalled();
      expect(refs.loadingEl.style.display).toBe('flex');
    });

    it('shows the panel and loading state, then hides loading with no error on success', async () => {
      vi.mocked(startScanner).mockResolvedValue(null);

      await scanHandler.showScanPanel();

      expect(refs.panel.style.display).toBe('block');
      expect(refs.viewportContainer.style.display).toBe('block');
      expect(refs.actionBar.style.display).toBe('none');
      expect(refs.errorEl.style.display).toBe('none');
      expect(refs.errorEl.textContent).toBe('');
      expect(startScanner).toHaveBeenCalledWith(refs.viewport, expect.any(Function));
      expect(refs.loadingEl.style.display).toBe('none');
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

      capturedCallback!('9999999999');

      expect(detectedSpy).toHaveBeenCalledWith('9999999999');
    });

    it('hides the panel and alerts with the permission-denied message on permission_denied', async () => {
      vi.mocked(startScanner).mockResolvedValue('permission_denied');
      const hideSpy = vi.spyOn(scanHandler, 'hideScanPanel');

      await scanHandler.showScanPanel();

      expect(refs.loadingEl.style.display).toBe('none');
      expect(hideSpy).toHaveBeenCalled();
      expect(globalThis.alert).toHaveBeenCalledWith('Camera access denied');
    });

    it('hides the panel and alerts with the camera-not-available message on other errors', async () => {
      vi.mocked(startScanner).mockResolvedValue('camera_not_available');
      const hideSpy = vi.spyOn(scanHandler, 'hideScanPanel');

      await scanHandler.showScanPanel();

      expect(hideSpy).toHaveBeenCalled();
      expect(globalThis.alert).toHaveBeenCalledWith('Camera not available');
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

      expect(refs.panel.style.display).toBe('block');
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
      expect(refs.panel.style.display).toBe('none');
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
      expect(refs.panel.style.display).toBe('block');
      expect(refs.viewportContainer.style.display).toBe('none');
      expect(refs.barcodeLabel.textContent).toBe('5551234567');
      expect(refs.actionBar.style.display).toBe('flex');
      expect(refs.errorEl.style.display).toBe('none');
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
      expect(refs.itemNameEl.style.display).toBe('');
      expect(refs.itemQuantityEl.textContent).toBe('In stock: 5 pieces');
      expect(refs.itemQuantityEl.style.display).toBe('');
      expect(refs.existingControls.style.display).toBe('');
      expect(refs.addBtn.style.display).toBe('none');
      expect(refs.goBtn.style.display).toBe('');
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

    it('clears and hides name/quantity, hides existing controls, shows add, hides go when no match', async () => {
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({
        items: [{ name: 'Other', inventory_id: 'a-different-inventory', quantity: 3 }],
      });

      await scanHandler.handleScanDetected('999');

      expect(refs.itemNameEl.textContent).toBe('');
      expect(refs.itemNameEl.style.display).toBe('none');
      expect(refs.itemQuantityEl.textContent).toBe('');
      expect(refs.itemQuantityEl.style.display).toBe('none');
      expect(refs.existingControls.style.display).toBe('none');
      expect(refs.addBtn.style.display).toBe('');
      expect(refs.goBtn.style.display).toBe('none');
    });

    it('treats an empty items result as no match', async () => {
      mockServices.lookupByBarcode = vi.fn().mockResolvedValue({ items: [] });

      await scanHandler.handleScanDetected('000');

      expect(refs.addBtn.style.display).toBe('');
      expect(refs.goBtn.style.display).toBe('none');
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
      expect(refs.panel.style.display).toBe('block');
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
      expect(refs.panel.style.display).toBe('block');
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
      );
    });

    it('shows the barcode-not-found error without hiding the panel on failure', async () => {
      await scanHandler.handleScanDetected('123456');
      mockServices.scanBarcode = vi.fn().mockResolvedValue({ success: false, error: 'nope' });
      const hideSpy = vi.spyOn(scanHandler, 'hideScanPanel');

      await scanHandler.handleScanGo();

      expect(refs.errorEl.textContent).toBe('No item found for this barcode');
      expect(refs.errorEl.style.display).toBe('block');
      expect(hideSpy).not.toHaveBeenCalled();
      expect(mockRenderCallback).not.toHaveBeenCalled();
      expect(refs.panel.style.display).toBe('block');
    });

    it('does not throw on failure when the error element is missing', async () => {
      build(['scan-panel-error']);
      await scanHandler.handleScanDetected('123456');
      mockServices.scanBarcode = vi.fn().mockResolvedValue({ success: false, error: 'nope' });

      await expect(scanHandler.handleScanGo()).resolves.toBeUndefined();

      expect(mockServices.scanBarcode).toHaveBeenCalled();
    });
  });
});
