import { ELEMENTS } from '../utils/constants';
import { HomeAssistant, InventoryConfig } from '@/types/homeAssistant';
import { Services } from './services';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';
import { InventoryResolver } from '../utils/inventoryResolver';
import { startScanner, stopScanner, isLiveScanAvailable, decodeFromFile } from './barcodeScanner';

export class ScanHandler {
  private renderRoot: ShadowRoot;
  private getHass: () => HomeAssistant;
  private getConfig: () => InventoryConfig;
  private getTranslations: () => TranslationData;
  private services: Services;
  private renderCallback: () => void;

  private scannedBarcode: string | null = null;

  constructor(
    renderRoot: ShadowRoot,
    getHass: () => HomeAssistant,
    getConfig: () => InventoryConfig,
    getTranslations: () => TranslationData,
    services: Services,
    renderCallback: () => void,
  ) {
    this.renderRoot = renderRoot;
    this.getHass = getHass;
    this.getConfig = getConfig;
    this.getTranslations = getTranslations;
    this.services = services;
    this.renderCallback = renderCallback;
  }

  getScannedBarcode(): string | null {
    return this.scannedBarcode;
  }

  async showScanPanel(): Promise<void> {
    const translations = this.getTranslations();

    if (!isLiveScanAvailable()) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      // position off-screen instead of display:none — iOS WKWebView may not fire
      // the change event on a hidden (display:none) file input
      input.style.position = 'fixed';
      input.style.top = '-9999px';
      input.style.left = '-9999px';
      input.style.width = '0';
      input.style.height = '0';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        document.body.removeChild(input);
        if (!file) return;
        const error = await decodeFromFile(file, (code) => {
          this.handleScanDetected(code);
        });
        if (error) {
          const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
          const viewportContainer = this.renderRoot.getElementById(
            `${ELEMENTS.SCAN_VIEWPORT}-container`,
          );
          const errorEl = this.renderRoot.getElementById('scan-panel-error');
          if (panel && errorEl) {
            panel.style.display = 'block';
            if (viewportContainer) viewportContainer.style.display = 'none';
            errorEl.textContent = TranslationManager.localize(
              translations,
              'scanner.no_barcode_found',
              undefined,
              'No barcode found in photo',
            );
            errorEl.style.display = 'block';
            setTimeout(() => this.hideScanPanel(), 3000);
          }
        }
      });
      input.click();
      return;
    }

    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    if (!panel) return;

    panel.style.display = 'block';
    const viewportContainer = this.renderRoot.getElementById(`${ELEMENTS.SCAN_VIEWPORT}-container`);
    const viewport = this.renderRoot.getElementById(ELEMENTS.SCAN_VIEWPORT);
    const actionBar = this.renderRoot.getElementById(ELEMENTS.SCAN_ACTION_BAR);
    const errorEl = this.renderRoot.getElementById('scan-panel-error');
    const loadingEl = this.renderRoot.getElementById('scan-panel-loading');

    if (viewportContainer) viewportContainer.style.display = 'block';
    if (actionBar) actionBar.style.display = 'none';
    if (loadingEl) loadingEl.style.display = 'flex';
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }

    if (viewport) {
      const error = await startScanner(viewport, (code: string) => {
        this.handleScanDetected(code);
      });
      if (loadingEl) loadingEl.style.display = 'none';
      if (error) {
        this.hideScanPanel();
        const msgKey =
          error === 'permission_denied'
            ? 'modal.camera_permission_denied'
            : 'modal.camera_not_available';
        const fallback =
          error === 'permission_denied' ? 'Camera access denied' : 'Camera not available';
        alert(TranslationManager.localize(translations, msgKey, undefined, fallback));
      }
    }
  }

  hideScanPanel(): void {
    stopScanner();
    this.scannedBarcode = null;
    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    if (panel) panel.style.display = 'none';
  }

  async handleScanDetected(barcode: string): Promise<void> {
    stopScanner();
    this.scannedBarcode = barcode;

    const panel = this.renderRoot.getElementById(ELEMENTS.SCAN_PANEL);
    if (panel) panel.style.display = 'block';

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

    if (viewportContainer) viewportContainer.style.display = 'none';
    if (label) label.textContent = barcode;
    if (actionBar) actionBar.style.display = 'flex';
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
    if (amountInput) amountInput.value = '1';
    if (actionSelect) actionSelect.value = 'increment';

    const config = this.getConfig();
    const hass = this.getHass();
    const translations = this.getTranslations();
    const inventoryId = InventoryResolver.getInventoryId(hass, config.entity);
    const result = await this.services.lookupByBarcode(barcode);
    const localItems = result.items.filter((item) => item.inventory_id === inventoryId);

    if (localItems.length > 0) {
      const item = localItems[0];
      if (itemNameEl) {
        itemNameEl.textContent = item.name;
        itemNameEl.style.display = '';
      }
      if (itemQuantityEl) {
        const qty = item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity ?? 0);
        itemQuantityEl.textContent = TranslationManager.localize(
          translations,
          'scanner.in_stock',
          { quantity: qty },
          `In stock: ${qty}`,
        );
        itemQuantityEl.style.display = '';
      }
      if (existingControls) existingControls.style.display = '';
      if (addBtn) addBtn.style.display = 'none';
      if (goBtn) goBtn.style.display = '';
    } else {
      if (itemNameEl) {
        itemNameEl.textContent = '';
        itemNameEl.style.display = 'none';
      }
      if (itemQuantityEl) {
        itemQuantityEl.textContent = '';
        itemQuantityEl.style.display = 'none';
      }
      if (existingControls) existingControls.style.display = 'none';
      if (addBtn) addBtn.style.display = '';
      if (goBtn) goBtn.style.display = 'none';
    }
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

    const config = this.getConfig();
    const hass = this.getHass();
    const inventoryId = InventoryResolver.getInventoryId(hass, config.entity);
    const result = await this.services.scanBarcode(
      inventoryId,
      this.scannedBarcode,
      action,
      amount,
    );

    if (result.success) {
      this.hideScanPanel();
      this.renderCallback();
    } else {
      const errorEl = this.renderRoot.getElementById('scan-panel-error');
      if (errorEl) {
        errorEl.textContent = TranslationManager.localize(
          this.getTranslations(),
          'scanner.barcode_not_found',
          undefined,
          'No item found for this barcode',
        );
        errorEl.style.display = 'block';
      }
    }
  }
}
