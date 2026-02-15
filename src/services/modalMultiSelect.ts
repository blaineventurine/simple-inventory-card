export interface ModalMultiSelectInitConfig {
  id: string;
  options: string[];
  shadowRoot?: ShadowRoot;
}

export function initializeModalMultiSelect(config: ModalMultiSelectInitConfig): void {
  const root = config.shadowRoot || document;
  const hiddenInput = root.getElementById(config.id) as HTMLInputElement;
  const trigger = root.getElementById(`${config.id}-trigger`) as HTMLElement;
  const dropdown = root.getElementById(`${config.id}-dropdown`) as HTMLElement;
  const optionsContainer = root.getElementById(`${config.id}-options`) as HTMLElement;
  const newInput = root.getElementById(`${config.id}-new-input`) as HTMLInputElement;
  const addBtn = root.getElementById(`${config.id}-add-btn`) as HTMLElement;
  const chipsContainer = root.getElementById(`${config.id}-chips`) as HTMLElement;

  if (!hiddenInput || !trigger || !dropdown || !optionsContainer) return;

  let isOpen = false;
  const allOptions = new Set(config.options);

  // Merge any pre-selected values (from populateEditModal) into the options set
  const initialValue = hiddenInput.value.trim();
  if (initialValue) {
    initialValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((v) => allOptions.add(v));
  }

  // Parse initial value from hidden input
  function getSelected(): string[] {
    const val = hiddenInput.value.trim();
    if (!val) return [];
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function updateHiddenInput(selected: string[]): void {
    hiddenInput.value = selected.join(', ');
  }

  function renderChips(): void {
    if (!chipsContainer) return;
    const selected = getSelected();
    const label = trigger.querySelector('.modal-multi-select-label') as HTMLElement;

    if (selected.length === 0) {
      chipsContainer.innerHTML = '';
      if (label) label.style.display = '';
      return;
    }

    if (label) label.style.display = 'none';
    chipsContainer.innerHTML = '';
    for (const value of selected) {
      const chip = document.createElement('span');
      chip.className = 'modal-multi-select-chip';
      chip.dataset.value = value;
      chip.appendChild(document.createTextNode(value));

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'modal-multi-select-chip-remove';
      removeBtn.dataset.value = value;
      removeBtn.textContent = '\u00d7';

      chip.appendChild(removeBtn);
      chipsContainer.appendChild(chip);
    }
  }

  function rebuildOptions(): void {
    const selected = getSelected();
    const sorted = Array.from(allOptions).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
    optionsContainer.innerHTML = '';
    for (const option of sorted) {
      const label = document.createElement('label');
      label.className = 'modal-multi-select-option';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = option;
      input.checked = selected.includes(option);

      const span = document.createElement('span');
      span.textContent = option;

      label.appendChild(input);
      label.appendChild(span);
      optionsContainer.appendChild(label);
    }
  }

  // Initialize: sync checkboxes with hidden input value
  rebuildOptions();
  renderChips();

  // Handle chip removal
  if (chipsContainer) {
    chipsContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target.classList.contains('modal-multi-select-chip-remove')) {
        const value = target.dataset.value;
        if (value) {
          const selected = getSelected().filter((s) => s !== value);
          updateHiddenInput(selected);
          rebuildOptions();
          renderChips();
        }
      }
    });
  }

  // Toggle dropdown
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close all other modal multi-select dropdowns
    const allDropdowns = root.querySelectorAll('.modal-multi-select-dropdown');
    allDropdowns.forEach((d) => {
      if (d !== dropdown) {
        (d as HTMLElement).style.display = 'none';
      }
    });
    isOpen = !isOpen;
    dropdown.style.display = isOpen ? 'block' : 'none';
  });

  // Handle checkbox changes
  optionsContainer.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.type !== 'checkbox') return;

    const selected = getSelected();
    if (target.checked) {
      if (!selected.includes(target.value)) {
        selected.push(target.value);
      }
    } else {
      const idx = selected.indexOf(target.value);
      if (idx >= 0) selected.splice(idx, 1);
    }
    updateHiddenInput(selected);
    renderChips();
  });

  // Prevent dropdown close when clicking inside
  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Add new option
  function addNewOption(): void {
    if (!newInput) return;
    const val = newInput.value.trim();
    if (!val) return;

    allOptions.add(val);
    const selected = getSelected();
    if (!selected.includes(val)) {
      selected.push(val);
    }
    updateHiddenInput(selected);
    rebuildOptions();
    renderChips();
    newInput.value = '';
  }

  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addNewOption();
    });
  }

  if (newInput) {
    newInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        addNewOption();
      }
    });
  }

  // Close on outside click
  root.addEventListener('click', (e) => {
    if (!trigger.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
      dropdown.style.display = 'none';
      isOpen = false;
    }
  });
}
