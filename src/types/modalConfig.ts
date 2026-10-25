export interface ModalConfig {
  id: string;
  title: string;
  primaryButtonText: string;
  primaryButtonId?: string;
  /** `data-action` of the primary (Add / Save) button. */
  primaryAction?: string;
  /** `data-action` of the Cancel and ✕ buttons. */
  closeAction?: string;
  showHistory?: boolean;
  showDelete?: boolean;
  /** Edit modal only: render the batch editor section (integration has batches). */
  showBatchEditor?: boolean;
  /** Add modal only: room to offer a duplicate name's quantity as a batch (integration has batches). */
  showDuplicateBatchOffer?: boolean;
  /** Render the item icon field (integration has item_icons). */
  showIconField?: boolean;
  /** Render the item image field (integration has item_images). */
  showImageField?: boolean;
}
