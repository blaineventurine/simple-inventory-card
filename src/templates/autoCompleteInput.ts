import { AutoCompleteConfig } from '@/types/autoComplete';

export function createAutoCompleteInput(config: AutoCompleteConfig): string {
  return `
    <div class="autocomplete-container">
      <input 
        type="text" 
        id="${config.id}" 
        value="${config.value || ''}"
        placeholder="${config.placeholder || ''}"
        autocomplete="off"
      />
      <div class="autocomplete-dropdown" id="${config.id}-dropdown"></div>
    </div>
  `;
}
