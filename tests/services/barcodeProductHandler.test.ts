import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { BarcodeProductHandler } from '../../src/services/barcodeProductHandler';
import { Services } from '../../src/services/services';
import { productPicker } from '../../src/templates/modalPartials/productPicker';
import { BarcodeProductLookupResult } from '../../src/types/barcodeResult';
import { createMockHomeAssistant } from '../testHelpers';

describe('BarcodeProductHandler product photo', () => {
  let host: HTMLElement;
  let root: ShadowRoot;
  let services: Services;
  let onProductPhoto: Mock<(barcode: string, imageUrl: string) => void>;
  let handler: BarcodeProductHandler;

  function lookupReturns(result: BarcodeProductLookupResult): void {
    vi.spyOn(services, 'lookupBarcodeProduct').mockResolvedValue(result);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.append(host);
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<input id="add-name" />${productPicker('add', {})}`;
    const hass = createMockHomeAssistant();
    services = new Services(() => hass);
    onProductPhoto = vi.fn<(barcode: string, imageUrl: string) => void>();
    handler = new BarcodeProductHandler(root, () => ({}), services, onProductPhoto);
  });

  afterEach(() => {
    host.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("passes the found product's photo with the looked-up barcode", async () => {
    lookupReturns({
      barcode: '4006',
      results: [
        {
          provider: 'openfoodfacts',
          found: true,
          product: { name: 'Milk', image_url: 'https://images.example/milk.jpg' },
        },
      ],
    });

    handler.handleBarcodeProductLookup('4006');
    await vi.runAllTimersAsync();

    expect(onProductPhoto).toHaveBeenCalledWith('4006', 'https://images.example/milk.jpg');
  });

  it('offers the photo the backend saves, whichever product is picked', async () => {
    lookupReturns({
      barcode: '4006',
      results: [
        { provider: 'openfoodfacts', found: false },
        { provider: 'openbeautyfacts', found: true, product: { name: 'Milk', image_url: ' ' } },
        {
          provider: 'openpetfoodfacts',
          found: true,
          product: { name: 'Milk 1L', image_url: 'https://images.example/first.jpg' },
        },
        {
          provider: 'upcitemdb',
          found: true,
          product: { name: 'Milk 1 l', image_url: 'https://images.example/second.jpg' },
        },
      ],
    });

    handler.handleBarcodeProductLookup('4006');
    await vi.runAllTimersAsync();
    root.querySelector<HTMLElement>('[data-product-index="2"]')?.click();

    expect(onProductPhoto).toHaveBeenCalledTimes(1);
    expect(onProductPhoto).toHaveBeenCalledWith('4006', 'https://images.example/first.jpg');
  });

  it('offers nothing when no found result has a photo', async () => {
    lookupReturns({
      barcode: '4006',
      results: [{ provider: 'openfoodfacts', found: true, product: { name: 'Milk' } }],
    });

    handler.handleBarcodeProductLookup('4006');
    await vi.runAllTimersAsync();

    expect(onProductPhoto).not.toHaveBeenCalled();
  });

  it("ignores the product's own photo when no lookup photo is given", () => {
    handler.selectProduct('add', { name: 'Milk', image_url: 'https://images.example/milk.jpg' });

    expect(onProductPhoto).not.toHaveBeenCalled();
  });
});
