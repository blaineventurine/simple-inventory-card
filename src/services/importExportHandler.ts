import { HomeAssistant, InventoryConfig } from '@/types/homeAssistant';
import { Services } from './services';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';
import { InventoryResolver } from '../utils/inventoryResolver';

export class ImportExportHandler {
  private getHass: () => HomeAssistant;
  private getConfig: () => InventoryConfig;
  private getTranslations: () => TranslationData;
  private services: Services;
  private renderCallback: () => void;

  constructor(
    getHass: () => HomeAssistant,
    getConfig: () => InventoryConfig,
    getTranslations: () => TranslationData,
    services: Services,
    renderCallback: () => void,
  ) {
    this.getHass = getHass;
    this.getConfig = getConfig;
    this.getTranslations = getTranslations;
    this.services = services;
    this.renderCallback = renderCallback;
  }

  async handleExport(): Promise<void> {
    try {
      const hass = this.getHass();
      const config = this.getConfig();
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
    }
  }

  async handleImport(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const hass = this.getHass();
        const config = this.getConfig();
        const translations = this.getTranslations();
        const inventoryId = InventoryResolver.getInventoryId(hass, config.entity);
        const isCSV = file.name.endsWith('.csv');
        const format = isCSV ? 'csv' : 'json';
        const data = isCSV ? text : JSON.parse(text);
        const result = await this.services.importInventory(inventoryId, data, format, 'skip');

        const message = TranslationManager.localize(
          translations,
          'actions.import_result',
          { added: result.added, updated: result.updated, skipped: result.skipped },
          `Import complete: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped`,
        );
        alert(message);
        this.renderCallback();
      } catch (error) {
        console.error('Error importing inventory:', error);
        alert('Import failed. Please check the file format.');
      }
    });
    input.click();
  }
}
