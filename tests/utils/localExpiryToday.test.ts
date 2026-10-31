import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DateUtils } from '../../src/utils/dateUtils';
import { Filters } from '../../src/services/filters';
import { createInventoryHeader } from '../../src/templates/inventoryHeader';
import { createItemRowTemplate } from '../../src/templates/itemRow';
import { FILTER_VALUES } from '../../src/utils/constants';
import { InventoryItem } from '../../src/types/inventory';
import { FilterState } from '../../src/types/filterState';

// 18:00 local on 2026-10-23 in Los Angeles (UTC-7) is already 2026-10-24 in UTC.
describe('expiry "today" uses the local calendar date', () => {
  const originalTz = process.env.TZ;
  const item = {
    name: 'Milk',
    quantity: 1,
    expiry_date: '2026-10-23',
    expiry_alert_days: 3,
  } as InventoryItem;

  const filterState = (expiry: string[]): FilterState => ({
    category: [],
    expiry,
    location: [],
    quantity: [],
    searchText: '',
    showAdvanced: false,
  });

  beforeEach(() => {
    process.env.TZ = 'America/Los_Angeles';
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 23, 18, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it('DateUtils treats the item as expiring today, not expired', () => {
    expect(DateUtils.daysUntilExpiry('2026-10-23')).toBe(0);
    expect(DateUtils.isExpired('2026-10-23')).toBe(false);
    expect(DateUtils.isExpiringSoon('2026-10-23', 3)).toBe(true);
    expect(DateUtils.isExpired('2026-10-22')).toBe(true);
  });

  it('header counts it as expiring, not expired', () => {
    const html = createInventoryHeader('Fridge', [item], {});
    expect(html).toContain('expiring-badge');
    expect(html).not.toContain('expired-badge');
  });

  it('filters put it in SOON, not EXPIRED or FUTURE', () => {
    const filters = new Filters({} as ShadowRoot);
    const { EXPIRED, SOON, FUTURE } = FILTER_VALUES.EXPIRY;
    expect(filters.filterItems([item], filterState([EXPIRED]))).toHaveLength(0);
    expect(filters.filterItems([item], filterState([SOON]))).toHaveLength(1);
    expect(filters.filterItems([item], filterState([FUTURE]))).toHaveLength(0);
  });

  it('row shows expires today', () => {
    const html = createItemRowTemplate(item, [], {});
    expect(html).toContain('expires-today');
  });
});
