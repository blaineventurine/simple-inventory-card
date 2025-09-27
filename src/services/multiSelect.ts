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
    // Close all other dropdowns first
    const allDropdowns = root.querySelectorAll('.multi-select-dropdown');
    allDropdowns.forEach((d) => {
      if (d !== dropdown) {
        (d as HTMLElement).style.display = 'none';
      }
    });

    // Toggle current dropdown
    isOpen = !isOpen;
    dropdown.style.display = isOpen ? 'block' : 'none';
  }

  // Single trigger click handler
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Handle checkbox changes
  dropdown.addEventListener('change', (e) => {
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
    }
  });

  // Prevent dropdown from closing when clicking inside
  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Close dropdown when clicking outside (use root for consistency)
  root.addEventListener('click', (e) => {
    if (!trigger.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
      dropdown.style.display = 'none';
      isOpen = false;
    }
  });
}
