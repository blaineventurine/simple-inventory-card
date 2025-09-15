import { MultiSelectConfig } from '@/types/multiSelectConfig';

export function initializeMultiSelect(
  config: MultiSelectConfig & { shadowRoot?: ShadowRoot },
): void {
  const root = config.shadowRoot || document;
  const trigger = root.getElementById(`${config.id}-trigger`) as HTMLElement;
  const dropdown = root.getElementById(`${config.id}-dropdown`) as HTMLElement;

  if (!trigger || !dropdown) return;

  let isOpen = false;
  let selected = [...config.selected];

  function updateTriggerText() {
    const label = trigger.querySelector('.multi-select-label');
    if (label) {
      label.textContent = selected.length > 0 ? `${selected.length} selected` : config.placeholder;
    }
  }

  function toggleDropdown() {
    isOpen = !isOpen;
    dropdown.style.display = isOpen ? 'block' : 'none';
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Handle checkbox changes
  dropdown.addEventListener('change', (e) => {
    e.stopPropagation(); // Add this to prevent bubbling
    const target = e.target as HTMLInputElement;
    if (target.type === 'checkbox') {
      if (target.checked) {
        if (!selected.includes(target.value)) {
          selected.push(target.value);
        }
      } else {
        selected = selected.filter((v) => v !== target.value);
      }
      updateTriggerText();
      config.onChange?.(selected);
      // Don't close the dropdown - let user select multiple
    }
  });

  // Handle clicks on the dropdown (prevent closing)
  dropdown.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent dropdown from closing when clicking inside
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
      dropdown.style.display = 'none';
      isOpen = false;
    }
  });
}
