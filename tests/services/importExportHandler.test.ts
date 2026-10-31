import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImportExportHandler } from '../../src/services/importExportHandler';
import { Services } from '../../src/services/services';
import { InventoryResolver } from '../../src/utils/inventoryResolver';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryConfig } from '../../src/types/inventory';
import { TranslationData } from '@/types/translatableComponent';
import {
  createMockHomeAssistant,
  createMockHassEntity,
  createMockCardContext,
} from '../testHelpers';
import { ELEMENTS, CSS_CLASSES } from '../../src/utils/constants';
import { hideSheet } from '../../src/services/modals/modalUIManager';

vi.mock('../../src/utils/inventoryResolver');

describe('ImportExportHandler', () => {
  let handler: ImportExportHandler;
  let mockHass: HomeAssistant;
  let mockConfig: InventoryConfig;
  let mockTranslations: TranslationData;
  let mockServices: Services;
  let mockRenderCallback: () => void;

  let renderRoot: ShadowRoot;

  beforeEach(() => {
    mockHass = createMockHomeAssistant({
      'sensor.test_inventory': createMockHassEntity('sensor.test_inventory', {
        attributes: { items: [] },
      }),
    });

    mockConfig = {
      type: 'inventory-card',
      entity: 'sensor.test_inventory',
    };

    mockTranslations = {
      actions: {
        import_result: 'Import complete: {added} added, {updated} updated, {skipped} skipped',
      },
    };

    mockServices = {
      exportInventory: vi.fn(),
      importInventory: vi.fn(),
    } as unknown as Services;

    mockRenderCallback = vi.fn();

    vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('test-inventory-id');

    globalThis.alert = vi.fn();

    renderRoot = document.createElement('div') as unknown as ShadowRoot;

    handler = new ImportExportHandler(
      renderRoot,
      () =>
        createMockCardContext({
          hass: mockHass,
          config: mockConfig,
          translations: mockTranslations,
        }),
      mockServices,
      mockRenderCallback,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    // Clean up any leftover file inputs created by handleImport
    document.querySelectorAll('input[type="file"]').forEach((el) => el.remove());
  });

  describe('handleExport', () => {
    it('resolves the inventory id, exports data as json, and triggers a download', async () => {
      const exportedData = { name: 'Widget', quantity: 5 };
      vi.mocked(mockServices.exportInventory).mockResolvedValue({ data: exportedData });

      const objectUrl = 'blob:mock-url';
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue(objectUrl as unknown as string);
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      let capturedAnchor: HTMLAnchorElement | undefined;
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        capturedAnchor = this;
      });

      await handler.handleExport();

      expect(InventoryResolver.getInventoryId).toHaveBeenCalledWith(mockHass, mockConfig.entity);
      expect(mockServices.exportInventory).toHaveBeenCalledWith('test-inventory-id', 'json');
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe('application/json');
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(capturedAnchor?.href).toBe(objectUrl);
      expect(capturedAnchor?.download).toBe('inventory_test-inventory-id.json');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(objectUrl);
    });

    it('logs an error and does not throw when exportInventory rejects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('export failed');
      vi.mocked(mockServices.exportInventory).mockRejectedValue(error);

      await expect(handler.handleExport()).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error exporting inventory:', error);
    });

    it('shows a hass-notification with the error when exportInventory rejects', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(mockServices.exportInventory).mockRejectedValue(new Error('export failed'));
      const listener = vi.fn();
      renderRoot.addEventListener('hass-notification', listener);

      await handler.handleExport();

      expect(listener).toHaveBeenCalledTimes(1);
      expect((listener.mock.calls[0][0] as CustomEvent).detail.message).toBe(
        'Export failed: export failed',
      );
    });
  });

  describe('handleImport', () => {
    const runHandleImport = async (): Promise<HTMLInputElement> => {
      let capturedInput: HTMLInputElement | undefined;
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'input') {
          capturedInput = el as HTMLInputElement;
        }
        return el;
      });

      await handler.handleImport();
      vi.mocked(document.createElement).mockRestore();

      return capturedInput as HTMLInputElement;
    };

    const selectFile = (input: HTMLInputElement, file: File): void => {
      Object.defineProperty(input, 'files', { value: [file], writable: false });
      input.dispatchEvent(new Event('change'));
    };

    const resultSheet = (): HTMLElement | null =>
      renderRoot.querySelector<HTMLElement>(`#${ELEMENTS.IMPORT_RESULT_MODAL}`);

    const waitForResultSheet = async (): Promise<HTMLElement> => {
      await vi.waitFor(() =>
        expect(resultSheet()?.classList.contains(CSS_CLASSES.SHOW)).toBe(true),
      );
      const sheetElement = resultSheet();
      if (!sheetElement) {
        throw new Error('import result sheet not shown');
      }
      return sheetElement;
    };

    const sheetText = (sheetElement: HTMLElement): string =>
      (sheetElement.querySelector('.si-sheet__body')?.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim();

    const closeResultSheet = (sheetElement: HTMLElement): void => {
      sheetElement.querySelector<HTMLElement>(`#${ELEMENTS.IMPORT_RESULT_CLOSE}`)?.click();
    };

    it('creates a hidden file input configured for json/csv and clicks it', async () => {
      const inputClickSpy = vi
        .spyOn(HTMLInputElement.prototype, 'click')
        .mockImplementation(() => {});

      const input = await runHandleImport();
      expect(input).toBeTruthy();
      expect(input.type).toBe('file');
      expect(input.accept).toBe('.json,.csv');
      expect(inputClickSpy).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no file was selected', async () => {
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      const input = await runHandleImport();

      input.dispatchEvent(new Event('change'));

      expect(mockServices.importInventory).not.toHaveBeenCalled();
      expect(resultSheet()).toBeNull();
      expect(mockRenderCallback).not.toHaveBeenCalled();
    });

    it('imports a .json file, shows the result sheet, and refreshes the list when it closes', async () => {
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      vi.mocked(mockServices.importInventory).mockResolvedValue({
        added: 2,
        updated: 1,
        skipped: 3,
        errors: [],
      });

      const input = await runHandleImport();

      const fileContent = JSON.stringify({ name: 'Widget', quantity: 5 });
      const file = new File([fileContent], 'inventory.json', { type: 'application/json' });
      selectFile(input, file);

      const sheetElement = await waitForResultSheet();

      expect(InventoryResolver.getInventoryId).toHaveBeenCalledWith(mockHass, mockConfig.entity);
      expect(mockServices.importInventory).toHaveBeenCalledWith(
        'test-inventory-id',
        { name: 'Widget', quantity: 5 },
        'json',
        'skip',
      );
      expect(sheetText(sheetElement)).toBe('Import complete: 2 added, 1 updated, 3 skipped');
      expect(globalThis.alert).not.toHaveBeenCalled();
      expect(mockRenderCallback).not.toHaveBeenCalled();

      closeResultSheet(sheetElement);

      expect(sheetElement.classList.contains(CSS_CLASSES.SHOW)).toBe(false);
      expect(mockRenderCallback).toHaveBeenCalledTimes(1);
    });

    it('imports a .csv file, calls importInventory with the raw string data', async () => {
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      vi.mocked(mockServices.importInventory).mockResolvedValue({
        added: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      });

      const input = await runHandleImport();

      const csvContent = 'name,quantity\nWidget,5';
      const file = new File([csvContent], 'inventory.csv', { type: 'text/csv' });
      selectFile(input, file);

      const sheetElement = await waitForResultSheet();

      expect(mockServices.importInventory).toHaveBeenCalledWith(
        'test-inventory-id',
        csvContent,
        'csv',
        'skip',
      );
      expect(sheetText(sheetElement)).toBe('Import complete: 0 added, 0 updated, 0 skipped');
    });

    it('reports error count and the first few error messages from the result', async () => {
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      const errors = Array.from({ length: 7 }, (_, i) => `Item ${i + 1} (Widget): bad quantity`);
      vi.mocked(mockServices.importInventory).mockResolvedValue({
        added: 1,
        updated: 0,
        skipped: 2,
        errors,
      });

      const input = await runHandleImport();
      selectFile(input, new File(['[]'], 'inventory.json', { type: 'application/json' }));

      const sheetElement = await waitForResultSheet();

      const body = sheetText(sheetElement);
      expect(body).toContain('Import complete: 1 added, 0 updated, 2 skipped');
      expect(body).toContain('7 errors:');
      expect(body).toContain('…and 2 more');
      const listed = Array.from(sheetElement.querySelectorAll('.import-result__errors li')).map(
        (item) => item.textContent,
      );
      expect(listed).toEqual(errors.slice(0, 5));
    });

    it('refreshes the list when the result sheet is dismissed another way (✕, backdrop, Esc)', async () => {
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      vi.mocked(mockServices.importInventory).mockResolvedValue({
        added: 1,
        updated: 0,
        skipped: 0,
        errors: [],
      });

      const input = await runHandleImport();
      selectFile(input, new File(['[]'], 'inventory.json', { type: 'application/json' }));
      const sheetElement = await waitForResultSheet();

      hideSheet(sheetElement); // the route ModalUIManager takes for ✕, backdrop and Esc

      expect(mockRenderCallback).toHaveBeenCalledTimes(1);
    });

    it('reuses one sheet and refreshes once per successful import', async () => {
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      vi.mocked(mockServices.importInventory).mockResolvedValue({
        added: 1,
        updated: 0,
        skipped: 0,
        errors: [],
      });

      for (const expectedRefreshes of [1, 2]) {
        const input = await runHandleImport();
        selectFile(input, new File(['[]'], 'inventory.json', { type: 'application/json' }));
        const sheetElement = await waitForResultSheet();
        closeResultSheet(sheetElement);
        expect(mockRenderCallback).toHaveBeenCalledTimes(expectedRefreshes);
      }
      expect(renderRoot.querySelectorAll(`#${ELEMENTS.IMPORT_RESULT_MODAL}`)).toHaveLength(1);
    });

    it('shows the failure in the sheet and refreshes the list when it closes after importInventory rejects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      const error = new Error('import failed');
      vi.mocked(mockServices.importInventory).mockRejectedValue(error);

      const input = await runHandleImport();

      const file = new File([JSON.stringify({ name: 'Widget' })], 'inventory.json', {
        type: 'application/json',
      });
      selectFile(input, file);

      const sheetElement = await waitForResultSheet();

      expect(sheetText(sheetElement)).toBe('Import failed: import failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error importing inventory:', error);
      expect(globalThis.alert).not.toHaveBeenCalled();

      expect(mockRenderCallback).not.toHaveBeenCalled();
      closeResultSheet(sheetElement);
      expect(mockRenderCallback).toHaveBeenCalledTimes(1);
    });

    it('shows the failure in the sheet and refreshes the list when it closes after an invalid json file', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      const input = await runHandleImport();

      const file = new File(['not valid json {'], 'inventory.json', {
        type: 'application/json',
      });
      selectFile(input, file);

      const sheetElement = await waitForResultSheet();

      expect(sheetText(sheetElement)).toMatch(/^Import failed: .+/);
      expect(sheetText(sheetElement)).not.toBe('Import failed. Please check the file format.');
      expect(mockServices.importInventory).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error importing inventory:', expect.any(Error));

      expect(mockRenderCallback).not.toHaveBeenCalled();
      closeResultSheet(sheetElement);
      expect(mockRenderCallback).toHaveBeenCalledTimes(1);
    });

    it('focuses the result sheet panel when it opens', async () => {
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      vi.mocked(mockServices.importInventory).mockResolvedValue({
        added: 0,
        updated: 0,
        skipped: 1,
        errors: [],
      });
      const host = renderRoot as unknown as HTMLElement;
      document.body.append(host);
      try {
        const input = await runHandleImport();
        selectFile(input, new File(['[]'], 'inventory.json', { type: 'application/json' }));
        const sheetElement = await waitForResultSheet();

        expect(document.activeElement).toBe(
          sheetElement.querySelector(`.${CSS_CLASSES.MODAL_CONTENT}`),
        );
      } finally {
        host.remove();
      }
    });
  });
});
