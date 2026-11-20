import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULT_ITEM_ICON, STATUS_TONE, itemIcon, itemStatus } from '../../src/utils/itemStatus';
import { InventoryItem } from '../../src/types/inventory';

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    auto_add_to_list_quantity: 0,
    category: '',
    description: '',
    expiry_date: '',
    location: '',
    name: 'Jam',
    quantity: 5,
    todo_list: '',
    unit: '',
    ...overrides,
  };
}

describe('itemStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Local noon on 2026-10-25 keeps the calendar date stable in every time zone.
    vi.setSystemTime(new Date(2026, 9, 25, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is normal for stock without expiry or auto-add pressure', () => {
    expect(itemStatus(item())).toBe('normal');
    expect(itemStatus(item({ expiry_date: '2026-12-31', expiry_alert_days: 7 }))).toBe('normal');
  });

  it('is out at zero or below, before anything else', () => {
    expect(itemStatus(item({ quantity: 0 }))).toBe('out');
    expect(itemStatus(item({ quantity: -1 }))).toBe('out');
    expect(
      itemStatus(
        item({
          quantity: 0,
          expiry_date: '2026-10-01',
          auto_add_enabled: true,
          auto_add_to_list_quantity: 2,
        }),
      ),
    ).toBe('out');
  });

  it('is expired when the expiry date is past, before warning', () => {
    expect(itemStatus(item({ expiry_date: '2026-10-24' }))).toBe('expired');
    expect(
      itemStatus(
        item({ expiry_date: '2026-10-24', auto_add_enabled: true, auto_add_to_list_quantity: 9 }),
      ),
    ).toBe('expired');
  });

  it('warns when expiring within the alert days, today included', () => {
    expect(itemStatus(item({ expiry_date: '2026-10-25', expiry_alert_days: 0 }))).toBe('warning');
    expect(itemStatus(item({ expiry_date: '2026-10-28', expiry_alert_days: 3 }))).toBe('warning');
    expect(itemStatus(item({ expiry_date: '2026-10-29', expiry_alert_days: 3 }))).toBe('normal');
  });

  it('uses the default alert window of 1 day when the item has none', () => {
    expect(itemStatus(item({ expiry_date: '2026-10-26' }))).toBe('warning');
    expect(itemStatus(item({ expiry_date: '2026-10-27' }))).toBe('normal');
  });

  it('warns at or below the auto-add threshold only when auto-add is on', () => {
    expect(
      itemStatus(item({ quantity: 2, auto_add_enabled: true, auto_add_to_list_quantity: 2 })),
    ).toBe('warning');
    expect(
      itemStatus(item({ quantity: 3, auto_add_enabled: true, auto_add_to_list_quantity: 2 })),
    ).toBe('normal');
    expect(
      itemStatus(item({ quantity: 2, auto_add_enabled: false, auto_add_to_list_quantity: 2 })),
    ).toBe('normal');
  });

  it('treats a missing auto-add threshold as 0', () => {
    const noThreshold = item({ quantity: 1, auto_add_enabled: true });
    delete noThreshold.auto_add_to_list_quantity;

    expect(itemStatus(noThreshold)).toBe('normal');
  });

  it('ignores an unparseable expiry date', () => {
    expect(itemStatus(item({ expiry_date: 'not a date' }))).toBe('normal');
  });
});

describe('STATUS_TONE', () => {
  it('maps every status to its tone', () => {
    expect(STATUS_TONE).toEqual({
      out: 'disabled',
      expired: 'error',
      warning: 'warning',
      normal: 'primary',
    });
  });
});

describe('itemIcon', () => {
  it("uses the item's icon", () => {
    expect(itemIcon(item({ icon: 'mdi:apple' }))).toBe('mdi:apple');
    expect(itemIcon(item({ icon: '  mdi:apple ' }))).toBe('mdi:apple');
  });

  it('falls back to the default icon when the icon is missing or blank', () => {
    expect(DEFAULT_ITEM_ICON).toBe('mdi:package-variant');
    expect(itemIcon(item())).toBe(DEFAULT_ITEM_ICON);
    expect(itemIcon(item({ icon: '' }))).toBe(DEFAULT_ITEM_ICON);
    expect(itemIcon(item({ icon: '   ' }))).toBe(DEFAULT_ITEM_ICON);
  });

  it('treats a non-string icon from the backend as unset', () => {
    for (const icon of [42, null, true, { name: 'mdi:apple' }]) {
      const fromBackend: InventoryItem = { ...item(), ...JSON.parse(JSON.stringify({ icon })) };
      expect(itemIcon(fromBackend)).toBe(DEFAULT_ITEM_ICON);
    }
  });
});
