import { ELEMENTS } from '../utils/constants';
import { GetCardContext } from '@/types/cardContext';
import { Services } from './services';
import { TranslationManager } from './translationManager';
import { InventoryResolver } from '../utils/inventoryResolver';
import {
  chooseBarcodePhoto,
  nativeScanner,
  scanSupport,
  startNativeScanner,
  startScanner,
  stopScanner,
} from './barcodeScanner';
import { nativeScanTexts, scannerText } from './scannerText';
import { RestockOptions } from '@/types/batchOptions';
import { readRestockFields } from '../utils/batchFields';
import type { AcquireHold } from './inventoryStore';

export class ScanHandler {
  private renderRoot: ShadowRoot;
  private getContext: GetCardContext;
  private services: Services;
  private renderCallback: () => void;

  private scannedBarcode: string | null = null;
  private scannedItemFound = false;
  /** Releases the background hold taken while the scan panel shows. */
  private release: (() => void) | undefined;
  /** Releases the background hold taken while the companion app's scanner is open. */
  private releaseNative: (() => void) | undefined;
  /** Keeps the hold in step with the panel's `hidden`, whichever route flips it. */
  private readonly panelObserver = new MutationObserver(() => this.syncHold());

  constructor(
    renderRoot: ShadowRoot,
    getContext: GetCardContext,
    services: Services,
    renderCallback: () => void,
    /** Holds background work while the scan panel shows; released when it hides or is replaced. */
    private readonly hold?: AcquireHold,
  ) {
    this.renderRoot = renderRoot;
    this.getContext = getContext;
    this.services = services;
    this.renderCallback = renderCallback;
  }

  getScannedBarcode(): string | null {
    return this.scannedBarcode;
  }

  async showScanPanel(): Promise<void> {
    const { hass, translations } = this.getContext();

    // The companion app draws its own scanner (it has its own camera, HTTPS or not).
    const external = nativeScanner(hass);
    if (external) {
      startNativeScanner(external, nativeScanTexts(translations), {
        onDetected: (code) => {
          this.handleScanDetected(code);
        },
        onChoosePhoto: () => this.offerPhoto(''),
        onEnd: () => {
          const release = this.releaseNative;
          this.releaseNative = undefined;
          release?.();
        },
      });
      // After the start: it ends a scan still open, releasing that scan's hold.
      this.releaseNative ??= this.hold?.('background', 'native scanner');
      return;
    }

    const support = scanSupport();

    if (support === 'photo') {
      void chooseBarcodePhoto((code) => {
        this.handleScanDetected(code);
      }).then((error) => {
        if (!error) return;
        const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
        const viewportContainer = this.renderRoot.getElementById(
          `${ELEMENTS.SCAN_VIEWPORT}-container`,
        );
        const errorEl = this.renderRoot.getElementById('scan-panel-error');
        if (panel && errorEl) {
          this.showPanel(panel);
          if (viewportContainer) viewportContainer.hidden = true;
          errorEl.textContent = scannerText(translations, 'no_barcode');
          errorEl.hidden = false;
          setTimeout(() => this.hideScanPanel(), 3000);
        }
      });
      return;
    }

    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    if (!panel) return;

    if (support === 'insecure') {
      this.offerPhoto(scannerText(translations, 'insecure'));
      return;
    }

    this.showPanel(panel);
    const viewportContainer = this.renderRoot.getElementById(`${ELEMENTS.SCAN_VIEWPORT}-container`);
    const viewport = this.renderRoot.getElementById(ELEMENTS.SCAN_VIEWPORT);
    const actionBar = this.renderRoot.getElementById(ELEMENTS.SCAN_ACTION_BAR);
    const errorEl = this.renderRoot.getElementById('scan-panel-error');
    const loadingEl = this.renderRoot.getElementById('scan-panel-loading');
    const photo = this.renderRoot.getElementById(ELEMENTS.SCAN_PHOTO);

    if (viewportContainer) viewportContainer.hidden = false;
    if (actionBar) actionBar.hidden = true;
    if (photo) photo.hidden = true;
    if (loadingEl) loadingEl.hidden = false;
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }

    if (viewport) {
      const error = await startScanner(viewport, (code: string) => {
        this.handleScanDetected(code);
      });
      if (loadingEl) loadingEl.hidden = true;
      if (error) {
        this.offerPhoto(scannerText(translations, error));
      }
    }
  }

  /** "Choose a photo" (after a camera problem): the chosen photo's barcode is handled as scanned. */
  async choosePhoto(): Promise<void> {
    const error = await chooseBarcodePhoto((code) => {
      this.handleScanDetected(code);
    });
    if (error) {
      this.offerPhoto(scannerText(this.getContext().translations, 'no_barcode'));
    }
  }

  /** The panel offers "Choose a photo" instead of the camera, saying why (`message`). */
  private offerPhoto(message: string): void {
    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    if (!panel) return;
    this.showPanel(panel);
    for (const id of [
      `${ELEMENTS.SCAN_VIEWPORT}-container`,
      ELEMENTS.SCAN_ACTION_BAR,
      'scan-panel-error',
    ]) {
      const el = this.renderRoot.getElementById(id);
      if (el) el.hidden = true;
    }
    const photo = this.renderRoot.getElementById(ELEMENTS.SCAN_PHOTO);
    const photoMessage = this.renderRoot.getElementById(ELEMENTS.SCAN_PHOTO_MESSAGE);
    if (photo) photo.hidden = false;
    if (photoMessage) {
      photoMessage.textContent = message;
      photoMessage.hidden = message === '';
    }
  }

  hideScanPanel(): void {
    stopScanner();
    this.scannedBarcode = null;
    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    if (panel) panel.hidden = true;
    const photo = this.renderRoot.getElementById(ELEMENTS.SCAN_PHOTO);
    if (photo) photo.hidden = true;
    this.syncHold();
  }

  /**
   * A full render replaced the panel (it comes back hidden): the old one's hold goes with it,
   * and the new one is followed from now on.
   */
  panelReplaced(): void {
    this.panelObserver.disconnect();
    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    if (panel) {
      this.panelObserver.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    }
    this.syncHold();
  }

  private showPanel(panel: HTMLElement): void {
    panel.hidden = false;
    this.syncHold();
  }

  /** Holds background work exactly while the panel shows. */
  private syncHold(): void {
    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    const open = panel instanceof HTMLElement && !panel.hidden;
    if (open && !this.release) {
      this.release = this.hold?.('background', 'scan panel');
    } else if (!open && this.release) {
      const release = this.release;
      this.release = undefined;
      release();
    }
  }

  /**
   * Card re-attached (the pause stopped the camera): a panel still showing the camera, i.e.
   * waiting for a barcode, starts it again. A panel showing a scanned barcode stays as it is.
   */
  resumeScanning(): void {
    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    const viewportContainer = this.renderRoot.getElementById(`${ELEMENTS.SCAN_VIEWPORT}-container`);
    if (!panel || panel.hidden || !viewportContainer || viewportContainer.hidden) {
      return;
    }
    void this.showScanPanel();
  }

  async handleScanDetected(barcode: string): Promise<void> {
    stopScanner();
    this.scannedBarcode = barcode;

    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    if (panel) this.showPanel(panel);

    const viewportContainer = this.renderRoot.getElementById(`${ELEMENTS.SCAN_VIEWPORT}-container`);
    const actionBar = this.renderRoot.getElementById(ELEMENTS.SCAN_ACTION_BAR);
    const label = this.renderRoot.getElementById('scan-barcode-label');
    const errorEl = this.renderRoot.getElementById('scan-panel-error');
    const amountInput = this.renderRoot.getElementById(
      ELEMENTS.SCAN_AMOUNT_INPUT,
    ) as HTMLInputElement | null;
    const actionSelect = this.renderRoot.getElementById(
      ELEMENTS.SCAN_ACTION_SELECT,
    ) as HTMLSelectElement | null;
    const itemNameEl = this.renderRoot.getElementById(ELEMENTS.SCAN_ITEM_NAME);
    const itemQuantityEl = this.renderRoot.getElementById(ELEMENTS.SCAN_ITEM_QUANTITY);
    const existingControls = this.renderRoot.getElementById(ELEMENTS.SCAN_EXISTING_CONTROLS);
    const addBtn = this.renderRoot.getElementById(ELEMENTS.SCAN_ADD_BTN);
    const goBtn = this.renderRoot.getElementById(ELEMENTS.SCAN_GO_BTN);

    if (viewportContainer) viewportContainer.hidden = true;
    const photo = this.renderRoot.getElementById(ELEMENTS.SCAN_PHOTO);
    if (photo) photo.hidden = true;
    if (label) label.textContent = barcode;
    if (actionBar) actionBar.hidden = false;
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }
    if (amountInput) amountInput.value = '1';
    if (actionSelect) actionSelect.value = 'increment';
    // Reset the previous scan's batch details before the lookup round-trip.
    this.scannedItemFound = false;
    const batchDetails = this.renderRoot.getElementById(ELEMENTS.SCAN_BATCH_FIELDS);
    if (batchDetails instanceof HTMLDetailsElement) {
      batchDetails.open = false;
      for (const input of batchDetails.querySelectorAll('input')) {
        input.value = '';
      }
    }
    this.syncBatchFieldsVisibility();

    const { config, hass, translations } = this.getContext();
    const inventoryId = InventoryResolver.getInventoryId(hass, config.entity);
    const result = await this.services.lookupByBarcode(barcode);
    const localItems = result.items.filter((item) => item.inventory_id === inventoryId);

    if (localItems.length > 0) {
      const item = localItems[0];
      if (itemNameEl) {
        itemNameEl.textContent = item.name;
        itemNameEl.hidden = false;
      }
      if (itemQuantityEl) {
        const qty = item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity ?? 0);
        itemQuantityEl.textContent = TranslationManager.localize(
          translations,
          'scanner.in_stock',
          { quantity: qty },
          `In stock: ${qty}`,
        );
        itemQuantityEl.hidden = false;
      }
      if (existingControls) existingControls.hidden = false;
      if (addBtn) addBtn.hidden = true;
      if (goBtn) goBtn.hidden = false;
    } else {
      if (itemNameEl) {
        itemNameEl.textContent = '';
        itemNameEl.hidden = true;
      }
      if (itemQuantityEl) {
        itemQuantityEl.textContent = '';
        itemQuantityEl.hidden = true;
      }
      if (existingControls) existingControls.hidden = true;
      if (addBtn) addBtn.hidden = false;
      if (goBtn) goBtn.hidden = true;
    }

    this.scannedItemFound = localItems.length > 0;
    this.syncBatchFieldsVisibility();
  }

  async handleScanGo(): Promise<void> {
    if (!this.scannedBarcode) return;

    const actionSelect = this.renderRoot.getElementById(
      ELEMENTS.SCAN_ACTION_SELECT,
    ) as HTMLSelectElement | null;
    const amountInput = this.renderRoot.getElementById(
      ELEMENTS.SCAN_AMOUNT_INPUT,
    ) as HTMLInputElement | null;

    const action = (actionSelect?.value || 'increment') as 'increment' | 'decrement';
    const amount = parseFloat(amountInput?.value || '1') || 1;

    const { config, hass } = this.getContext();
    const inventoryId = InventoryResolver.getInventoryId(hass, config.entity);
    const batchDetails = this.renderRoot.getElementById(ELEMENTS.SCAN_BATCH_FIELDS);
    // Batch details describe new stock, so only an increment sends them.
    const restock: RestockOptions =
      action === 'increment' && batchDetails ? readRestockFields(batchDetails) : {};
    const result = await this.services.scanBarcode(
      inventoryId,
      this.scannedBarcode,
      action,
      amount,
      restock,
    );

    if (result.success) {
      this.hideScanPanel();
      this.renderCallback();
    } else {
      const errorEl = this.renderRoot.getElementById('scan-panel-error');
      if (errorEl) {
        // The backend's not-found error gets the localized scanner text; any other
        // failure shows the backend's own (already translated) message.
        errorEl.textContent =
          result.error && result.errorCode !== 'barcode_not_found'
            ? result.error
            : TranslationManager.localize(
                this.getContext().translations,
                'scanner.barcode_not_found',
                undefined,
                'No item found for this barcode',
              );
        errorEl.hidden = false;
      }
    }
  }

  /** Batch details apply only to restocking a known item; hide them otherwise. */
  syncBatchFieldsVisibility(): void {
    const details = this.renderRoot.getElementById(ELEMENTS.SCAN_BATCH_FIELDS);
    if (!details) {
      return;
    }
    const actionSelect = this.renderRoot.getElementById(ELEMENTS.SCAN_ACTION_SELECT);
    const action = actionSelect instanceof HTMLSelectElement ? actionSelect.value : 'increment';
    details.hidden = !this.scannedItemFound || action !== 'increment';
  }
}
