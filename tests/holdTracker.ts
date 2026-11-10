import { vi } from 'vitest';
import { AcquireHold, InventoryStore, UiHold } from '../src/services/inventoryStore';

/**
 * A real store's hold acquirer and its active holds, for the holders' tests. Apart from
 * `testHelpers`, which tests that mock the constants import: the store pulls them in.
 */
export function holdTracker(): { hold: AcquireHold; holds: () => UiHold[] } {
  const store = new InventoryStore({ showError: vi.fn(), compatibilityChecked: vi.fn() });
  return { hold: (kind, reason) => store.hold(kind, reason), holds: () => store.holds() };
}
