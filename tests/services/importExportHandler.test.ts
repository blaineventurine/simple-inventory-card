import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImportExportHandler } from '../../src/services/importExportHandler';
import { Services } from '../../src/services/services';
import { InventoryResolver } from '../../src/utils/inventoryResolver';
import { HomeAssistant, InventoryConfig } from '../../src/types/homeAssistant';
import { TranslationData } from '@/types/translatableComponent';
import { createMockHomeAssistant, createMockHassEntity } from '../testHelpers';

vi.mock('../../src/utils/inventoryResolver');

describe('ImportExportHandler', () => {
  let handler: ImportExportHandler;
  let mockHass: HomeAssistant;
  let mockConfig: InventoryConfig;
  let mockTranslations: TranslationData;
  let mockServices: Services;
  let mockRenderCallback: () => void;

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

    handler = new ImportExportHandler(
      () => mockHass,
      () => mockConfig,
      () => mockTranslations,
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
      expect(globalThis.alert).not.toHaveBeenCalled();
      expect(mockRenderCallback).not.toHaveBeenCalled();
    });

    it('imports a .json file, calls importInventory with parsed data, alerts, and renders', async () => {
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

      await vi.waitFor(() => expect(mockRenderCallback).toHaveBeenCalledTimes(1));

      expect(InventoryResolver.getInventoryId).toHaveBeenCalledWith(mockHass, mockConfig.entity);
      expect(mockServices.importInventory).toHaveBeenCalledWith(
        'test-inventory-id',
        { name: 'Widget', quantity: 5 },
        'json',
        'skip',
      );
      expect(globalThis.alert).toHaveBeenCalledWith(
        'Import complete: 2 added, 1 updated, 3 skipped',
      );
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

      await vi.waitFor(() => expect(mockRenderCallback).toHaveBeenCalledTimes(1));

      expect(mockServices.importInventory).toHaveBeenCalledWith(
        'test-inventory-id',
        csvContent,
        'csv',
        'skip',
      );
      expect(globalThis.alert).toHaveBeenCalledWith(
        'Import complete: 0 added, 0 updated, 0 skipped',
      );
    });

    it('shows a fallback alert and does not render when importInventory rejects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      const error = new Error('import failed');
      vi.mocked(mockServices.importInventory).mockRejectedValue(error);

      const input = await runHandleImport();

      const file = new File([JSON.stringify({ name: 'Widget' })], 'inventory.json', {
        type: 'application/json',
      });
      selectFile(input, file);

      await vi.waitFor(() =>
        expect(globalThis.alert).toHaveBeenCalledWith(
          'Import failed. Please check the file format.',
        ),
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error importing inventory:', error);
      expect(mockRenderCallback).not.toHaveBeenCalled();
    });

    it('shows a fallback alert and does not render when the json file is invalid', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      const input = await runHandleImport();

      const file = new File(['not valid json {'], 'inventory.json', {
        type: 'application/json',
      });
      selectFile(input, file);

      await vi.waitFor(() =>
        expect(globalThis.alert).toHaveBeenCalledWith(
          'Import failed. Please check the file format.',
        ),
      );

      expect(mockServices.importInventory).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error importing inventory:', expect.any(Error));
      expect(mockRenderCallback).not.toHaveBeenCalled();
    });
  });
});
