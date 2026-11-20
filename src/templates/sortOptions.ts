import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS, SORT_METHODS } from '../utils/constants';
import { TranslationManager } from '@/services/translationManager';

const SORT_OPTIONS: ReadonlyArray<{ value: string; key: string; fallback: string }> = [
  { value: SORT_METHODS.NAME, key: 'sort.name', fallback: 'Name' },
  { value: SORT_METHODS.CATEGORY, key: 'sort.category', fallback: 'Category' },
  { value: SORT_METHODS.LOCATION, key: 'sort.location', fallback: 'Location' },
  { value: SORT_METHODS.QUANTITY, key: 'sort.quantity_high', fallback: 'Quantity (High)' },
  { value: SORT_METHODS.QUANTITY_LOW, key: 'sort.quantity_low', fallback: 'Quantity (Low)' },
  { value: SORT_METHODS.EXPIRY, key: 'sort.expiry_date', fallback: 'Expiry Date' },
  { value: SORT_METHODS.ZERO_LAST, key: 'sort.zero_last', fallback: 'Zero Last' },
];

/** Sort chip ("Sort: Name ▾"); the transparent native select on top of it opens the picker. */
export function createSortOptions(sortMethod: string, translations: TranslationData): string {
  const options = SORT_OPTIONS.map((option) => ({
    value: option.value,
    label: TranslationManager.localize(translations, option.key, undefined, option.fallback),
  }));
  const current = options.find((option) => option.value === sortMethod) ?? options[0];
  const chipLabel = TranslationManager.localize(
    translations,
    'sort.chip_label',
    { method: current.label },
    `Sort: ${current.label}`,
  );

  return `
    <div class="si-chip si-tone-primary si-sort-chip">
      <ha-icon icon="mdi:sort" aria-hidden="true"></ha-icon>
      <label for="${ELEMENTS.SORT_METHOD}"><span class="si-sort-chip__label" aria-hidden="true">${chipLabel}</span><span class="si-sort-chip__a11y">${TranslationManager.localize(
        translations,
        'sort.sort_by',
        undefined,
        'Sort by:',
      )}</span></label>
      <ha-icon icon="mdi:menu-down" aria-hidden="true"></ha-icon>
      <select id="${ELEMENTS.SORT_METHOD}">
        ${options
          .map(
            (option) =>
              `<option value="${option.value}" ${option.value === sortMethod ? 'selected' : ''}>${option.label}</option>`,
          )
          .join('')}
      </select>
    </div>
  `;
}
