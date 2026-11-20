import { GetCardContext } from '@/types/cardContext';
import { Services, extractErrorMessage } from './services';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';
import { InventoryResolver } from '../utils/inventoryResolver';
import { showHassNotification } from '../utils/notify';
import { CSS_CLASSES, ELEMENTS } from '../utils/constants';
import { ImportOutcome, createImportResultSheet } from '../templates/importResult';
import { SHEET_CLOSED_EVENT, hideSheet, mountSheet, showSheet } from './modals/modalUIManager';

export class ImportExportHandler {
  private renderRoot: ShadowRoot;
  private getContext: GetCardContext;
  private services: Services;
  private renderCallback: () => void;

  constructor(
    renderRoot: ShadowRoot,
    getContext: GetCardContext,
    services: Services,
    renderCallback: () => void,
  ) {
    this.renderRoot = renderRoot;
    this.getContext = getContext;
    this.services = services;
    this.renderCallback = renderCallback;
  }

  async handleExport(): Promise<void> {
    try {
      const { hass, config } = this.getContext();
      const inventoryId = InventoryResolver.getInventoryId(hass, config.entity);
      const result = await this.services.exportInventory(inventoryId, 'json');
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_${inventoryId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting inventory:', error);
      const message = extractErrorMessage(error);
      showHassNotification(
        this.renderRoot,
        TranslationManager.localize(
          this.getContext().translations,
          'errors.export_failed',
          { error: message },
          `Export failed: ${message}`,
        ),
      );
    }
  }

  async handleImport(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }

      const translations = this.getContext().translations;
      let outcome: ImportOutcome;
      try {
        const text = await file.text();
        const { hass, config } = this.getContext();
        const inventoryId = InventoryResolver.getInventoryId(hass, config.entity);
        const isCSV = file.name.endsWith('.csv');
        const format = isCSV ? 'csv' : 'json';
        const data = isCSV ? text : JSON.parse(text);
        outcome = {
          result: await this.services.importInventory(inventoryId, data, format, 'skip'),
        };
      } catch (error) {
        console.error('Error importing inventory:', error);
        const message = extractErrorMessage(error);
        outcome = {
          error: TranslationManager.localize(
            translations,
            'actions.import_failed',
            { error: message },
            `Import failed: ${message}`,
          ),
        };
      }
      this.showImportResult(outcome, translations);
    });
    input.click();
  }

  /**
   * Result sheet. While it is open it holds every render (a `page` sheet hold), so the
   * list refreshes once the sheet closes, by any route and for every outcome (a failed import may
   * still have changed items, and deferred updates must land either way).
   */
  private showImportResult(outcome: ImportOutcome, translations: TranslationData): void {
    const modal = mountSheet(this.renderRoot, createImportResultSheet(outcome, translations));
    modal.querySelector(`#${ELEMENTS.IMPORT_RESULT_CLOSE}`)?.addEventListener('click', () => {
      hideSheet(modal);
    });
    modal.addEventListener(
      SHEET_CLOSED_EVENT,
      () => {
        this.renderCallback();
      },
      { once: true },
    );
    showSheet(this.renderRoot, modal);
    modal.querySelector<HTMLElement>(`.${CSS_CLASSES.MODAL_CONTENT}`)?.focus();
  }
}
