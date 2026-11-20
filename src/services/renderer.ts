import { Utilities } from '../utils/utilities';
import { InventoryResolver } from '../utils/inventoryResolver';
import { itemOptions } from '../utils/itemOptions';
import { styles } from '../styles/styles';
import { HassEntity } from '@/types/homeAssistant';
import { InventoryConfig, InventoryItem } from '@/types/inventory';
import { FilterState } from '@/types/filterState';
import { TodoList } from '@/types/todoList';
import { generateCardHTML } from '../templates/inventoryCard';
import { TranslationData } from '@/types/translatableComponent';
import { RowOptions } from '@/types/rowOptions';

export class Renderer {
  constructor(private readonly shadowRoot: ShadowRoot) {}

  /**
   * `items` are the rows to list (filtered and sorted); `allItems` is the whole inventory, which
   * the header counts and the category/location options are taken from.
   */
  renderCard(
    state: HassEntity,
    entityId: string,
    items: InventoryItem[],
    allItems: InventoryItem[],
    filters: FilterState,
    sortMethod: string,
    todoLists: TodoList[],
    translations: TranslationData,
    config?: InventoryConfig,
    rowOptions?: RowOptions,
    itemIconsEnabled = false,
  ): void {
    const inventoryName = InventoryResolver.getInventoryName(state, entityId);
    const description = InventoryResolver.getInventoryDescription(state);
    const { categories, locations } = itemOptions(allItems);

    this.shadowRoot.innerHTML = generateCardHTML(
      inventoryName,
      items,
      filters,
      sortMethod,
      categories,
      locations,
      todoLists,
      allItems,
      description,
      translations,
      config,
      rowOptions,
      itemIconsEnabled,
    );
  }

  /** Callers pass an already localized message (the label stays English, as before). */
  renderError(message: string): void {
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card>
        <div class="card-content">
          <div class="error-message" style="color: var(--error-color); padding: 16px; text-align: center;">
            <p><strong>Error:</strong> ${Utilities.sanitizeHtml(message)}</p>
          </div>
        </div>
      </ha-card>
    `;
  }
}
