import { ELEMENTS } from '../utils/constants';

export function createSortOptions(sortMethod: string): string {
  return `
    <label for="${ELEMENTS.SORT_METHOD}">Sort by:</label> 
    <select id="${ELEMENTS.SORT_METHOD}">
      <option value="name" ${sortMethod === 'name' ? 'selected' : ''}>Name</option>
      <option value="category" ${sortMethod === 'category' ? 'selected' : ''}>Category</option>
      <option value="quantity" ${sortMethod === 'quantity' ? 'selected' : ''}>Quantity (High)</option>
      <option value="quantity-low" ${sortMethod === 'quantity-low' ? 'selected' : ''}>Quantity (Low)</option>
      <option value="expiry" ${sortMethod === 'expiry' ? 'selected' : ''}>Expiry Date</option>
      <option value="zero-last" ${sortMethod === 'zero-last' ? 'selected' : ''}>Zero Last</option>
    </select>
  `;
}
