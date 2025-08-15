import { TranslationData } from '@/types/translatableComponent';
import { ELEMENTS } from '../utils/constants';
import { TranslationManager } from '@/services/translationManager';

export function createSortOptions(sortMethod: string, translations: TranslationData): string {
  return `
    <label for="${ELEMENTS.SORT_METHOD}">${TranslationManager.localize(
      translations,
      'sort.sort_by',
      undefined,
      'Sort by:',
    )}</label> 
    <select id="${ELEMENTS.SORT_METHOD}">
      <option value="name" ${sortMethod === 'name' ? 'selected' : ''}>
        ${TranslationManager.localize(translations, 'sort.name', undefined, 'Name')}
      </option>

      <option value="category" ${sortMethod === 'category' ? 'selected' : ''}>
        ${TranslationManager.localize(translations, 'sort.category', undefined, 'Category')}
      </option>

      <option value="quantity" ${sortMethod === 'quantity' ? 'selected' : ''}>
        ${TranslationManager.localize(
          translations,
          'sort.quantity_high',
          undefined,
          'Quantity (High)',
        )}
      </option>

      <option value="quantity-low" ${sortMethod === 'quantity-low' ? 'selected' : ''}>
        ${TranslationManager.localize(
          translations,
          'sort.quantity_low',
          undefined,
          'Quantity (Low)',
        )}
      </option>

      <option value="expiry" ${sortMethod === 'expiry' ? 'selected' : ''}>
        ${TranslationManager.localize(translations, 'sort.expiry_date', undefined, 'Expiry Date')}
      </option>

      <option value="zero-last" ${sortMethod === 'zero-last' ? 'selected' : ''}>
        ${TranslationManager.localize(translations, 'sort.zero_last', undefined, 'Zero Last')}
      </option>

    </select>
  `;
}
