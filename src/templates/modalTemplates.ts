import { ELEMENTS, ACTIONS, CSS_CLASSES } from '../utils/constants';
import { TodoList } from '@/types/todoList';
import { ModalConfig } from '@/types/modalConfig';
import { TranslationData } from '@/types/translatableComponent';
import { TranslationManager } from '@/services/translationManager';
import { Utilities } from '@/utils/utilities';
import { Attrs, button } from './primitives';
import { sheet } from './sheet';
import { autoAddCheckbox } from './modalPartials/autoAddCheckbox';
import { expiryAlertDays } from './modalPartials/expiryAlertDays';
import { itemCategory } from './modalPartials/itemCategory';
import { itemExpiryDate } from './modalPartials/itemExpiryDate';
import { itemName } from './modalPartials/itemName';
import { itemIcon } from './modalPartials/itemIcon';
import { itemImage } from './modalPartials/itemImage';
import { itemQuantity } from './modalPartials/itemQuantity';
import { itemLocation } from './modalPartials/itemLocation';
import { itemUnit } from './modalPartials/itemUnit';
import { autoAddControls } from './modalPartials/autoAddControls';
import { itemAlias } from './modalPartials/itemAlias';
import { itemBarcode } from './modalPartials/itemBarcode';
import { itemDescription } from './modalPartials/itemDescription';
import { autoAddIdCheckbox } from './modalPartials/autoAddIdCheckbox';
import { itemPrice } from './modalPartials/itemPrice';
import { productPicker } from './modalPartials/productPicker';

/** A labelled group of fields; `name` keeps the heading id unique within the sheet. */
function formSection(
  prefix: string,
  name: string,
  label: string,
  fieldsHtml: string[],
  className = '',
): string {
  const headingId = `${prefix}-section-${name}`;
  return `
    <section class="si-form-section${className ? ` ${className}` : ''}" aria-labelledby="${headingId}">
      <h4 class="si-form-section__label" id="${headingId}">${Utilities.sanitizeHtml(label)}</h4>
      ${fieldsHtml.join('')}
    </section>
  `;
}

export function createUnifiedModal(
  todoLists: TodoList[],
  config: ModalConfig,
  translations: TranslationData,
  categories: string[] = [],
  locations: string[] = [],
): string {
  const prefix = config.id === ELEMENTS.ADD_MODAL ? 'add' : 'edit';
  const label = (key: string, fallback: string): string =>
    TranslationManager.localize(translations, key, undefined, fallback);
  const closeAttrs: Attrs = { 'data-action': config.closeAction };

  const sections = [
    formSection(prefix, 'details', label('modal.section_details', 'Details'), [
      itemName(prefix, translations),
      config.showIconField ? itemIcon(prefix, translations) : '',
      config.showImageField ? itemImage(prefix, translations) : '',
      itemDescription(prefix, translations),
    ]),
    formSection(prefix, 'barcodes', label('modal.section_barcodes', 'Barcodes & names'), [
      itemBarcode(prefix, translations),
      itemAlias(prefix, translations),
      productPicker(prefix, translations),
      autoAddIdCheckbox(prefix, translations),
    ]),
    formSection(prefix, 'stock', label('modal.section_stock', 'Stock'), [
      `<div class="form-row si-field-row">${itemQuantity(prefix, translations)}${itemUnit(prefix, translations)}</div>`,
      itemPrice(prefix, translations),
    ]),
    formSection(prefix, 'where', label('modal.section_where', 'Where & what'), [
      itemCategory(prefix, translations, categories),
      itemLocation(prefix, translations, locations),
    ]),
    formSection(prefix, 'expiry', label('modal.section_expiry', 'Expiry'), [
      `<div class="form-row si-field-row">${itemExpiryDate(prefix, translations)}${expiryAlertDays(prefix, translations)}</div>`,
    ]),
    config.showBatchEditor
      ? formSection(
          prefix,
          'batches',
          label('batches.editor_title', 'Batches'),
          [`<div id="${ELEMENTS.EDIT_BATCH_EDITOR}" class="batch-editor"></div>`],
          'batch-editor-section',
        )
      : '',
    // The auto-add switch must stay a direct sibling of .auto-add-controls (CSS :checked ~).
    formSection(
      prefix,
      'shopping',
      label('modal.section_shopping', 'Shopping list'),
      [autoAddCheckbox(prefix, translations), autoAddControls(prefix, todoLists, translations)],
      'auto-add-section',
    ),
  ];

  const bodyHtml = `
    <div id="${prefix}-validation-message" class="validation-message si-tint si-tone-error" role="alert">
      <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
      <span class="validation-text"></span>
    </div>
    ${
      config.showDuplicateBatchOffer
        ? `<div id="${ELEMENTS.ADD_DUPLICATE_BATCH}" class="duplicate-batch-offer si-tint si-tone-primary" role="status" hidden></div>`
        : ''
    }
    ${sections.join('')}
  `;

  const actionsHtml = [
    button({
      kind: 'tonal',
      label: label('modal.cancel', 'Cancel'),
      className: CSS_CLASSES.CANCEL_BTN,
      attrs: closeAttrs,
    }),
    button({
      kind: 'filled',
      label: config.primaryButtonText,
      className: CSS_CLASSES.SAVE_BTN,
      attrs: { id: config.primaryButtonId, 'data-action': config.primaryAction },
    }),
  ].join('');

  const menuItems = [
    config.showHistory
      ? button({
          kind: 'text',
          icon: 'mdi:history',
          label: label('modal.view_history', 'View history'),
          className: `${CSS_CLASSES.HISTORY_LINK} si-sheet__menu-item`,
          attrs: { id: ELEMENTS.EDIT_HISTORY_BTN, 'data-action': ACTIONS.EDIT_HISTORY },
        })
      : '',
    config.showDelete
      ? button({
          kind: 'text',
          icon: 'mdi:delete-outline',
          label: label('modal.delete_item', 'Delete item'),
          className: `${CSS_CLASSES.DELETE_BTN} si-sheet__menu-item si-tone-error`,
          attrs: { id: ELEMENTS.EDIT_DELETE_BTN, 'data-action': ACTIONS.EDIT_DELETE },
        })
      : '',
  ].join('');

  return sheet({
    id: config.id,
    title: config.title,
    closeLabel: label('modal.close', 'Close'),
    bodyHtml,
    actionsHtml,
    closeAttrs,
    ...(menuItems
      ? { menu: { label: label('modal.more_actions', 'More actions'), itemsHtml: menuItems } }
      : {}),
  });
}

export function createAddModal(
  todoLists: TodoList[],
  translations: TranslationData,
  categories: string[],
  locations: string[],
  batchesEnabled = false,
  itemIconsEnabled = false,
  itemImagesEnabled = false,
): string {
  return createUnifiedModal(
    todoLists,
    {
      id: ELEMENTS.ADD_MODAL,
      title: TranslationManager.localize(translations, 'modal.add_item', undefined, 'Add Item'),
      primaryButtonText: TranslationManager.localize(
        translations,
        'modal.add_item',
        undefined,
        'Add Item',
      ),
      primaryButtonId: ELEMENTS.ADD_ITEM_BTN,
      primaryAction: ACTIONS.ADD_ITEM,
      closeAction: ACTIONS.CLOSE_ADD_MODAL,
      showDuplicateBatchOffer: batchesEnabled,
      showIconField: itemIconsEnabled,
      showImageField: itemImagesEnabled,
    },
    translations,
    categories,
    locations,
  );
}

export function createEditModal(
  todoLists: TodoList[],
  translations: TranslationData,
  categories: string[],
  locations: string[],
  batchesEnabled = false,
  itemIconsEnabled = false,
  itemImagesEnabled = false,
): string {
  return createUnifiedModal(
    todoLists,
    {
      id: ELEMENTS.EDIT_MODAL,
      title: TranslationManager.localize(translations, 'modal.edit_item', undefined, 'Edit Item'),
      primaryButtonText: TranslationManager.localize(
        translations,
        'modal.save_changes',
        undefined,
        'Save Changes',
      ),
      primaryAction: ACTIONS.SAVE_EDIT,
      closeAction: ACTIONS.CLOSE_EDIT_MODAL,
      showHistory: true,
      showDelete: true,
      showBatchEditor: batchesEnabled,
      showIconField: itemIconsEnabled,
      showImageField: itemImagesEnabled,
    },
    translations,
    categories,
    locations,
  );
}
