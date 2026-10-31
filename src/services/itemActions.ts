import { GetCardContext } from '@/types/cardContext';
import { RestockOptions } from '@/types/batchOptions';
import { ServiceResult } from '@/types/serviceResult';
import { Services } from './services';
import { Modals } from './modals';
import { HistoryHandler } from './historyHandler';
import { ImageViewer } from './imageViewer';
import { TranslationManager } from './translationManager';
import { InventoryResolver } from '../utils/inventoryResolver';
import { itemOptions } from '../utils/itemOptions';
import { itemImagePath } from '../utils/itemImage';

/** A `remove` the user declined at the confirmation. */
export interface CancelledResult {
  success: false;
  cancelled: true;
}

export interface ItemActionsDeps {
  getContext: GetCardContext;
  services: Services;
  /** Re-fetches the items and renders after the user's own change. */
  refresh: () => void;
  modals: Modals;
  historyHandler: HistoryHandler;
  imageViewer?: ImageViewer | undefined;
}

/**
 * What a user can do to one item, by name; no DOM reading, so a list row and a dashboard tile
 * share it. Each returns the service result. A failed +, −, take-one or remove needs no more:
 * HA's frontend toasts a failed service call itself. Restock and move return the failure for
 * the caller to show next to its form.
 */
export class ItemActions {
  constructor(private readonly deps: ItemActionsDeps) {}

  increment(name: string): Promise<ServiceResult> {
    return this.thenRefresh(this.deps.services.incrementItem(this.inventoryId(), name));
  }

  decrement(name: string): Promise<ServiceResult> {
    return this.thenRefresh(this.deps.services.decrementItem(this.inventoryId(), name));
  }

  takeFromBatch(name: string, batchId: string, amount: number): Promise<ServiceResult> {
    return this.thenRefresh(
      this.deps.services.decrementItem(this.inventoryId(), name, amount, { batchId }),
    );
  }

  /** Refreshes on success only, so a failed form keeps the user's values. */
  async restock(name: string, amount: number, fields: RestockOptions): Promise<ServiceResult> {
    const result = await this.deps.services.incrementItem(this.inventoryId(), name, amount, fields);
    if (result.success) {
      this.deps.refresh();
    }
    return result;
  }

  /** Refreshes on success only, so a failed form keeps the user's values. */
  async move(
    name: string,
    batchId: string,
    amount: number,
    toLocation: string,
  ): Promise<ServiceResult> {
    const result = await this.deps.services.transferItem(this.inventoryId(), name, {
      batchId,
      amount,
      toLocation,
    });
    if (result.success) {
      this.deps.refresh();
    }
    return result;
  }

  /** Asks first; a declined confirmation sends nothing. */
  async remove(name: string): Promise<ServiceResult | CancelledResult> {
    const message = TranslationManager.localize(
      this.deps.getContext().translations,
      'actions.confirm_remove',
      { name },
      `Remove ${name} from inventory?`,
    );
    if (!confirm(message)) {
      return { success: false, cancelled: true };
    }
    return this.thenRefresh(this.deps.services.removeItem(this.inventoryId(), name));
  }

  openEdit(name: string): void {
    const context = this.deps.getContext();
    const { locations, categories } = itemOptions(context.items);
    this.deps.modals.openEditModal(
      name,
      () => context,
      context.translations,
      locations,
      categories,
    );
  }

  showHistory(name: string): Promise<void> {
    return this.deps.historyHandler.showItemHistory(name);
  }

  /** The item's photo full screen: its thumbnail at once, then the full image. False: none. */
  viewImage(name: string, opener?: HTMLElement): boolean {
    const { items, translations } = this.deps.getContext();
    const item = items.find((candidate) => candidate.name === name);
    const fullPath = item ? itemImagePath(item, 'full') : null;
    const thumbPath = item ? itemImagePath(item, 'thumb') : null;
    if (!this.deps.imageViewer || fullPath === null || thumbPath === null) {
      return false;
    }
    this.deps.imageViewer.open({ name, fullPath, thumbPath }, opener, translations);
    return true;
  }

  private inventoryId(): string {
    const { hass, config } = this.deps.getContext();
    return InventoryResolver.getInventoryId(hass, config.entity);
  }

  /** Refreshes whatever the outcome, as the list always has; HA toasts a failed call itself. */
  private async thenRefresh(call: Promise<ServiceResult>): Promise<ServiceResult> {
    const result = await call;
    this.deps.refresh();
    return result;
  }
}
