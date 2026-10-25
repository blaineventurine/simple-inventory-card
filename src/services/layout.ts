import { InventoryConfig, Layout } from '@/types/inventory';
import { TranslationData } from '@/types/translatableComponent';
import { STORAGE_KEYS } from '@/utils/constants';
import { TranslationManager } from './translationManager';

/**
 * The inventory's item layout: the choice saved with the toolbar toggle (per inventory and
 * browser, so the panel and a dashboard card share it), else the card's `layout` option, else
 * the list. A saved value that is not a layout is ignored.
 */
export function getLayout(entityId: string, config: InventoryConfig): Layout {
  const saved = localStorage.getItem(STORAGE_KEYS.LAYOUT(entityId));
  if (saved === 'list' || saved === 'tiles') {
    return saved;
  }
  return config.layout === 'tiles' ? 'tiles' : 'list';
}

export function saveLayout(entityId: string, layout: Layout): void {
  localStorage.setItem(STORAGE_KEYS.LAYOUT(entityId), layout);
}

/**
 * The layout toggle while `layout` is shown: a constant label ("Tile layout"; `aria-pressed`
 * carries the state), and an icon and tooltip that name the layout a click switches to.
 */
export function layoutToggleView(
  layout: Layout,
  translations: TranslationData,
): { icon: string; label: string; title: string } {
  const label = TranslationManager.localize(
    translations,
    'layout.tiles_label',
    undefined,
    'Tile layout',
  );
  return layout === 'tiles'
    ? {
        icon: 'mdi:view-list-outline',
        label,
        title: TranslationManager.localize(
          translations,
          'layout.show_list',
          undefined,
          'Show as list',
        ),
      }
    : {
        icon: 'mdi:view-grid-outline',
        label,
        title: TranslationManager.localize(
          translations,
          'layout.show_tiles',
          undefined,
          'Show as tiles',
        ),
      };
}
