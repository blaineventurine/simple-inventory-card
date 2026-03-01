import { ELEMENTS, CSS_CLASSES } from '../utils/constants';
import { HomeAssistant, InventoryConfig } from '@/types/homeAssistant';
import { Services } from './services';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from './translationManager';
import { Utilities } from '../utils/utilities';
import { InventoryResolver } from '../utils/inventoryResolver';
import {
  createHistoryAndConsumptionView,
  createHistoryContent,
  createConsumptionView,
  createConsumptionLoading,
} from '../templates/historyView';
import { ItemConsumptionRates } from '@/types/consumptionRates';

export class HistoryHandler {
  private renderRoot: ShadowRoot;
  private getHass: () => HomeAssistant;
  private getConfig: () => InventoryConfig;
  private getTranslations: () => TranslationData;
  private services: Services;

  constructor(
    renderRoot: ShadowRoot,
    getHass: () => HomeAssistant,
    getConfig: () => InventoryConfig,
    getTranslations: () => TranslationData,
    services: Services,
  ) {
    this.renderRoot = renderRoot;
    this.getHass = getHass;
    this.getConfig = getConfig;
    this.getTranslations = getTranslations;
    this.services = services;
  }

  async showItemHistory(itemName: string): Promise<void> {
    try {
      const hass = this.getHass();
      const config = this.getConfig();
      const translations = this.getTranslations();
      const inventoryId = InventoryResolver.getInventoryId(hass, config.entity);
      const events = await this.services.getHistory(inventoryId, {
        itemName,
        limit: 50,
      });
      const html = createHistoryAndConsumptionView(events, itemName, translations);
      this.showHistoryModal(html, events, itemName, inventoryId);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }

  private showHistoryModal(
    content: string,
    cachedEvents: import('../types/historyEvent').HistoryEvent[],
    itemName: string,
    inventoryId: string,
  ): void {
    let modal = this.renderRoot.getElementById(ELEMENTS.HISTORY_MODAL);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = ELEMENTS.HISTORY_MODAL;
      modal.className = 'modal';
      this.renderRoot.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="modal-content">
        ${content}
        <div class="modal-actions">
          <button class="cancel-btn" id="close-history-modal">Close</button>
        </div>
      </div>
    `;
    modal.classList.add(CSS_CLASSES.SHOW);

    const closeBtn = modal.querySelector('#close-history-modal');
    closeBtn?.addEventListener('click', () => {
      modal!.classList.remove(CSS_CLASSES.SHOW);
    });

    const cachedRates = new Map<string, ItemConsumptionRates>();
    let activeWindow: number | null = null;

    const historyTab = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_HISTORY}`);
    const consumptionTab = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_CONSUMPTION}`);
    const tabContent = modal.querySelector(`#${ELEMENTS.HISTORY_TAB_CONTENT}`);

    if (!historyTab || !consumptionTab || !tabContent) return;

    const setActiveTab = (tab: 'history' | 'consumption') => {
      historyTab.classList.toggle('active', tab === 'history');
      consumptionTab.classList.toggle('active', tab === 'consumption');
    };

    historyTab.addEventListener('click', () => {
      setActiveTab('history');
      tabContent.innerHTML = createHistoryContent(cachedEvents);
    });

    consumptionTab.addEventListener('click', () => {
      setActiveTab('consumption');
      this.loadConsumptionTab(
        tabContent as HTMLElement,
        inventoryId,
        itemName,
        activeWindow,
        cachedRates,
        (w) => {
          activeWindow = w;
        },
      );
    });
  }

  private async loadConsumptionTab(
    container: HTMLElement,
    inventoryId: string,
    itemName: string,
    activeWindow: number | null,
    cachedRates: Map<string, ItemConsumptionRates>,
    setActiveWindow: (w: number | null) => void,
  ): Promise<void> {
    const cacheKey = activeWindow !== null ? String(activeWindow) : 'all';

    if (cachedRates.has(cacheKey)) {
      this.renderConsumptionContent(
        container,
        cachedRates.get(cacheKey)!,
        activeWindow,
        inventoryId,
        itemName,
        cachedRates,
        setActiveWindow,
      );
      return;
    }

    const translations = this.getTranslations();
    container.innerHTML = createConsumptionLoading(translations);

    try {
      const rates = await this.services.getItemConsumptionRates(
        inventoryId,
        itemName,
        activeWindow,
      );
      cachedRates.set(cacheKey, rates);
      this.renderConsumptionContent(
        container,
        rates,
        activeWindow,
        inventoryId,
        itemName,
        cachedRates,
        setActiveWindow,
      );
    } catch (error) {
      console.error('Error fetching consumption rates:', error);
      const errorMsg = TranslationManager.localize(
        translations,
        'analytics.load_error',
        undefined,
        'Failed to load consumption data.',
      );
      container.innerHTML = `<p class="consumption-empty">${Utilities.sanitizeHtml(errorMsg)}</p>`;
    }
  }

  private renderConsumptionContent(
    container: HTMLElement,
    rates: ItemConsumptionRates,
    activeWindow: number | null,
    inventoryId: string,
    itemName: string,
    cachedRates: Map<string, ItemConsumptionRates>,
    setActiveWindow: (w: number | null) => void,
  ): void {
    const translations = this.getTranslations();
    container.innerHTML = createConsumptionView(rates, activeWindow, translations);

    container.querySelectorAll('.window-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const value = (pill as HTMLElement).dataset.window;
        const newWindow = value === 'all' ? null : Number(value);
        setActiveWindow(newWindow);
        this.loadConsumptionTab(
          container,
          inventoryId,
          itemName,
          newWindow,
          cachedRates,
          setActiveWindow,
        );
      });
    });
  }
}
