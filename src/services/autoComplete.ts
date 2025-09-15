import { AutoCompleteConfig } from '@/types/autoComplete';

export function initializeAutoComplete(
  config: AutoCompleteConfig & { shadowRoot?: ShadowRoot },
): void {
  const root = config.shadowRoot || document;
  const input = root.getElementById(config.id) as HTMLInputElement;
  const dropdown = root.getElementById(`${config.id}-dropdown`) as HTMLElement;

  if (!input || !dropdown) return;

  let filteredOptions = [...config.options];
  let selectedIndex = -1;
  let isMouseInDropdown = false;

  function showDropdown() {
    if (filteredOptions.length > 0) {
      dropdown.style.display = 'block';
    }
  }

  function hideDropdown() {
    dropdown.style.display = 'none';
    selectedIndex = -1;
  }

  function filterOptions(query: string) {
    const lowerQuery = query.toLowerCase();
    filteredOptions = config.options.filter((option) => option.toLowerCase().includes(lowerQuery));

    selectedIndex = -1;

    const optionsHTML = filteredOptions
      .map(
        (option, index) =>
          `<div class="autocomplete-option ${index === selectedIndex ? 'selected' : ''}" data-value="${option}">${option}</div>`,
      )
      .join('');

    dropdown.innerHTML = optionsHTML;

    dropdown.querySelectorAll('.autocomplete-option').forEach((option) => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const value = option.getAttribute('data-value') || '';
        input.value = value;
        hideDropdown();
        config.onSelect?.(value);
      });
    });
  }

  dropdown.addEventListener('mouseenter', () => {
    isMouseInDropdown = true;
  });

  dropdown.addEventListener('mouseleave', () => {
    isMouseInDropdown = false;
  });

  filterOptions('');

  // Show dropdown on actual typing
  input.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    filterOptions(value);
    showDropdown();
  });

  // Click to toggle (not focus)
  input.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.style.display === 'block') {
      hideDropdown();
    } else {
      filterOptions(input.value);
      showDropdown();
    }
  });

  // Only hide on blur if mouse isn't in dropdown
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!isMouseInDropdown) {
        hideDropdown();
      }
    }, 100);
  });

  input.addEventListener('keydown', (e) => {
    const isOpen = dropdown.style.display === 'block';

    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      filterOptions(input.value);
      showDropdown();
      return;
    }

    if (!isOpen || filteredOptions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredOptions.length - 1);
        updateSelection();
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection();
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          input.value = filteredOptions[selectedIndex];
          config.onSelect?.(input.value);
        }
        hideDropdown();
        break;
      case 'Escape':
        hideDropdown();
        break;
    }
  });

  function updateSelection() {
    const options = dropdown.querySelectorAll('.autocomplete-option');
    options.forEach((option, index) => {
      option.classList.toggle('selected', index === selectedIndex);
    });
  }

  hideDropdown();
}
