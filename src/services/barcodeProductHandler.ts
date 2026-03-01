import { ELEMENTS } from '../utils/constants';
import { Services } from './services';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';
import { Utilities } from '../utils/utilities';

export class BarcodeProductHandler {
  private renderRoot: ShadowRoot;
  private getTranslations: () => TranslationData;
  private services: Services;

  constructor(renderRoot: ShadowRoot, getTranslations: () => TranslationData, services: Services) {
    this.renderRoot = renderRoot;
    this.getTranslations = getTranslations;
    this.services = services;
  }

  handleBarcodeProductLookup(barcode: string): void {
    this.services
      .lookupBarcodeProduct(barcode)
      .then((result) => {
        const foundResults = result.results.filter((r) => r.found && r.product);
        if (foundResults.length === 0) return;

        if (foundResults.length === 1) {
          this.selectProduct('add', foundResults[0].product!);
          return;
        }

        this.showProductPicker('add', foundResults);
      })
      .catch(() => {
        // Silent failure — user can fill fields manually
      });
  }

  showProductPicker(
    prefix: string,
    results: Array<{ provider: string; found: boolean; product?: Record<string, string> }>,
  ): void {
    const translations = this.getTranslations();
    const picker = this.renderRoot.getElementById(`${prefix}-${ELEMENTS.PRODUCT_PICKER}`);
    const list = this.renderRoot.getElementById(`${prefix}-${ELEMENTS.PRODUCT_PICKER_LIST}`);
    if (!picker || !list) return;

    list.innerHTML = results
      .map((r, i) => {
        const product = r.product!;
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

    picker.style.display = 'block';

    list.querySelectorAll('.product-picker-item').forEach((item) => {
      item.addEventListener('click', () => {
        const index = parseInt((item as HTMLElement).dataset.productIndex || '0', 10);
        const selected = results[index];
        if (selected?.product) {
          this.selectProduct(prefix, selected.product);
          this.hideProductPicker(prefix);
        }
      });
    });
  }

  hideProductPicker(prefix: string): void {
    const picker = this.renderRoot.getElementById(`${prefix}-${ELEMENTS.PRODUCT_PICKER}`);
    if (picker) picker.style.display = 'none';
  }

  selectProduct(prefix: string, product: Record<string, string>): void {
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
