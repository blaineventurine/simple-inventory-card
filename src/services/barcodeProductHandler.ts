import { ELEMENTS } from '../utils/constants';
import { FoundBarcodeProduct } from '@/types/barcodeResult';
import { Services } from './services';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';
import { Utilities } from '../utils/utilities';

/** The lookup's product photo: the one the integration saves for `barcode`. */
interface ProductPhoto {
  barcode: string;
  imageUrl: string;
}

export class BarcodeProductHandler {
  private renderRoot: ShadowRoot;
  private getTranslations: () => TranslationData;
  private services: Services;

  constructor(
    renderRoot: ShadowRoot,
    getTranslations: () => TranslationData,
    services: Services,
    /** Told when the add sheet takes a product that has a photo (`item_images`). */
    private readonly onProductPhoto?: (barcode: string, imageUrl: string) => void,
  ) {
    this.renderRoot = renderRoot;
    this.getTranslations = getTranslations;
    this.services = services;
  }

  handleBarcodeProductLookup(barcode: string): void {
    this.services
      .lookupBarcodeProduct(barcode)
      .then((result) => {
        const foundResults = result.results.filter(
          (r): r is FoundBarcodeProduct => r.found && r.product !== undefined,
        );
        const [first] = foundResults;
        if (first === undefined) return;
        // The integration saves the first found result's photo, in lookup order: offer that one.
        const imageUrl = foundResults.find((r) => r.product.image_url?.trim())?.product.image_url;
        const photo = imageUrl ? { barcode, imageUrl } : undefined;

        if (foundResults.length === 1) {
          this.selectProduct('add', first.product, photo);
          return;
        }

        this.showProductPicker('add', foundResults, photo);
      })
      .catch(() => {
        // Silent failure — user can fill fields manually
      });
  }

  showProductPicker(prefix: string, results: FoundBarcodeProduct[], photo?: ProductPhoto): void {
    const translations = this.getTranslations();
    const picker = this.renderRoot.getElementById(`${prefix}-${ELEMENTS.PRODUCT_PICKER}`);
    const list = this.renderRoot.getElementById(`${prefix}-${ELEMENTS.PRODUCT_PICKER_LIST}`);
    if (!picker || !list) return;

    list.innerHTML = results
      .map((r, i) => {
        const product = r.product;
        const providerLabel = TranslationManager.localize(
          translations,
          `modal.provider_${r.provider}`,
          undefined,
          r.provider,
        );
        const details: string[] = [];
        if (product.brand) details.push(product.brand);
        if (product.category) details.push(product.category);

        return `
        <div class="product-picker-item" data-product-index="${i}">
          <span class="product-picker-provider">${Utilities.sanitizeHtml(providerLabel)}</span>
          <span class="product-picker-name">${Utilities.sanitizeHtml(product.name)}</span>
          ${details.length > 0 ? `<span class="product-picker-detail">${Utilities.sanitizeHtml(details.join(' — '))}</span>` : ''}
        </div>
      `;
      })
      .join('');

    picker.hidden = false;

    list.querySelectorAll('.product-picker-item').forEach((item) => {
      item.addEventListener('click', () => {
        const index = parseInt((item as HTMLElement).dataset.productIndex || '0', 10);
        const selected = results[index];
        if (selected?.product) {
          this.selectProduct(prefix, selected.product, photo);
          this.hideProductPicker(prefix);
        }
      });
    });
  }

  hideProductPicker(prefix: string): void {
    const picker = this.renderRoot.getElementById(`${prefix}-${ELEMENTS.PRODUCT_PICKER}`);
    if (picker) picker.hidden = true;
  }

  /** Fill the sheet's empty fields from `product`; the lookup's `photo` goes to the offer. */
  selectProduct(prefix: string, product: Record<string, string>, photo?: ProductPhoto): void {
    this.autoFillIfEmpty(`${prefix}-name`, product.name);
    const descParts: string[] = [];
    if (product.brand) descParts.push(product.brand);
    if (product.description) descParts.push(product.description);
    if (descParts.length > 0) {
      this.autoFillIfEmpty(`${prefix}-description`, descParts.join(' - '));
    }
    if (product.category) {
      this.autoFillIfEmpty(`${prefix}-category`, product.category);
    }
    if (product.unit) {
      this.autoFillIfEmpty(`${prefix}-unit`, product.unit);
    }
    if (photo) {
      this.onProductPhoto?.(photo.barcode, photo.imageUrl);
    }
    this.hideProductPicker(prefix);
  }

  private autoFillIfEmpty(elementId: string, value: string | undefined): void {
    if (!value) return;
    const el = this.renderRoot.getElementById(elementId) as HTMLInputElement | null;
    if (el && !el.value.trim()) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
