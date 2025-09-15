import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInventoryHeader } from '../../src/templates/inventoryHeader';
import { InventoryItem } from '../../src/types/homeAssistant';
import { TranslationData } from '@/types/translatableComponent';
import { Utilities } from '../../src/utils/utilities';

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn((_translations: any, _key: string, params: any, fallback: string) => {
      // For parameterized translations, replace the placeholder
      if (params && params.count !== undefined) {
        return fallback.replace('{count}', params.count.toString());
      }
      return fallback;
    }),
  },
}));

vi.mock('../../src/utils/utilities', () => ({
  Utilities: {
    sanitizeHtml: vi.fn((str: string) => `sanitized(${str})`),
    isExpired: vi.fn(),
    isExpiringSoon: vi.fn(),
  },
}));

describe('createInventoryHeader', () => {
  let mockItems: InventoryItem[];
  let mockTranslations: TranslationData;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Utilities.sanitizeHtml).mockImplementation((str: string) => `sanitized(${str})`);
    vi.mocked(Utilities.isExpired).mockReturnValue(false);
    vi.mocked(Utilities.isExpiringSoon).mockReturnValue(false);

    mockItems = [
      {
        auto_add_enabled: false,
        auto_add_to_list_quantity: 2,
        category: 'Fruit',
        expiry_alert_days: 7,
        expiry_date: '2024-12-31',
        location: 'Fridge',
        name: 'Fresh Apple',
        quantity: 5,
        todo_list: 'grocery',
        unit: 'pieces',
      },
      {
        auto_add_enabled: false,
        auto_add_to_list_quantity: 1,
        category: 'Dairy',
        expiry_alert_days: 5,
        expiry_date: '2024-01-01',
        location: 'Fridge',
        name: 'Expired Milk',
        quantity: 1,
        todo_list: 'shopping',
        unit: 'carton',
      },
      {
        auto_add_enabled: false,
        auto_add_to_list_quantity: 1,
        category: 'Canned',
        expiry_date: '',
        location: 'Pantry',
        name: 'No Expiry Item',
        quantity: 3,
        todo_list: 'grocery',
        unit: 'cans',
      },
    ];

    mockTranslations = {
      header: {
        items_expired: '{count} items expired',
        item_expired: '{count} items expired',
        items_expiring_soon: '{count} items expiring soon',
        item_expiring_soon: '{count} item expiring soon',
      },
    };
  });

  describe('basic functionality', () => {
    it('should create header with inventory name', () => {
      const result = createInventoryHeader('Kitchen Pantry', mockItems, mockTranslations);

      expect(result).toContain('class="card-header"');
      expect(result).toContain('class="inventory-title"');
      expect(result).toContain('sanitized(Kitchen Pantry)');
      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Kitchen Pantry');
    });

    it('should include header content wrapper', () => {
      const result = createInventoryHeader('Test', mockItems, mockTranslations);

      expect(result).toContain('class="header-content"');
      expect(result).toContain('<h2 class="inventory-title">');
    });

    it('should sanitize inventory name', () => {
      const result = createInventoryHeader(
        'Test & "Special" <script>',
        mockItems,
        mockTranslations,
      );

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Test & "Special" <script>');
      expect(result).toContain('sanitized(Test & "Special" <script>)');
    });
  });

  describe('description handling', () => {
    it('should include description when provided', () => {
      const result = createInventoryHeader(
        'Test',
        mockItems,
        mockTranslations,
        'Kitchen inventory items',
      );

      expect(result).toContain('class="inventory-description"');
      expect(result).toContain('sanitized(Kitchen inventory items)');
      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('Kitchen inventory items');
    });

    it('should not include description when not provided', () => {
      const result = createInventoryHeader('Test', mockItems, mockTranslations);

      expect(result).not.toContain('class="inventory-description"');
      expect(result).not.toContain('<p class="inventory-description">');
    });

    it('should not include description when undefined', () => {
      const result = createInventoryHeader('Test', mockItems, mockTranslations, undefined);

      expect(result).not.toContain('class="inventory-description"');
    });

    it('should not include description when empty string', () => {
      const result = createInventoryHeader('Test', mockItems, mockTranslations, '');

      expect(result).not.toContain('class="inventory-description"');
    });

    it('should not include description when only whitespace', () => {
      const result = createInventoryHeader('Test', mockItems, mockTranslations, '   \n\t  ');

      expect(result).not.toContain('class="inventory-description"');
    });

    it('should include description when has content after trim', () => {
      const result = createInventoryHeader(
        'Test',
        mockItems,
        mockTranslations,
        '  Valid description  ',
      );

      expect(result).toContain('class="inventory-description"');
      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith('  Valid description  ');
    });
  });

  describe('expiry indicators', () => {
    it('should not show expiry indicators when no expired or expiring items', () => {
      vi.mocked(Utilities.isExpired).mockReturnValue(false);
      vi.mocked(Utilities.isExpiringSoon).mockReturnValue(false);

      const result = createInventoryHeader('Test', mockItems, mockTranslations);

      expect(result).not.toContain('class="expiry-indicators"');
      expect(result).not.toContain('class="expired-badge"');
      expect(result).not.toContain('class="expiring-badge"');
    });

    it('should show expired badge when items are expired', () => {
      // Mock so that expired milk is expired
      vi.mocked(Utilities.isExpired).mockImplementation(
        (date: string | undefined) => date === '2024-01-01',
      );
      vi.mocked(Utilities.isExpiringSoon).mockReturnValue(false);

      const result = createInventoryHeader('Test', mockItems, mockTranslations);

      expect(result).toContain('class="expiry-indicators"');
      expect(result).toContain('class="expired-badge"');
      expect(result).toContain('1 items expired');
      expect(result).toContain('mdi:calendar-remove');
      expect(result).toMatch(/<span class="expired-badge"[^>]*>[\s\S]*?1[\s\S]*?<\/span>/);
    });

    it('should show expiring badge when items are expiring soon', () => {
      vi.mocked(Utilities.isExpired).mockReturnValue(false);
      // Mock so that fresh apple is expiring soon
      vi.mocked(Utilities.isExpiringSoon).mockImplementation(
        (date: string) => date === '2024-12-31',
      );

      const result = createInventoryHeader('Test', mockItems, mockTranslations);

      expect(result).toContain('class="expiry-indicators"');
      expect(result).toContain('class="expiring-badge"');
      expect(result).toContain('1 items expiring soon');
      expect(result).toContain('mdi:calendar-alert');
      expect(result).toMatch(/<span class="expiring-badge"[^>]*>[\s\S]*?1[\s\S]*?<\/span>/);
    });

    it('should show both badges when both expired and expiring items exist', () => {
      // Expired milk is expired, fresh apple is expiring
      vi.mocked(Utilities.isExpired).mockImplementation(
        (date: string | undefined) => date === '2024-01-01',
      );
      vi.mocked(Utilities.isExpiringSoon).mockImplementation(
        (date: string) => date === '2024-12-31',
      );

      const result = createInventoryHeader('Test', mockItems, mockTranslations);

      expect(result).toContain('class="expiry-indicators"');
      expect(result).toContain('class="expired-badge"');
      expect(result).toContain('class="expiring-badge"');
      expect(result).toContain('1 items expired');
      expect(result).toContain('1 items expiring soon');
    });

    it('should handle multiple expired items', () => {
      const multipleExpiredItems = [
        ...mockItems,
        {
          auto_add_enabled: false,
          auto_add_to_list_quantity: 1,
          category: 'Bakery',
          expiry_alert_days: 3,
          expiry_date: '2024-01-02',
          location: 'Fridge',
          name: 'Expired Bread',
          quantity: 2,
          todo_list: 'grocery',
          unit: 'loaf',
        },
      ];

      // Both expired items
      vi.mocked(Utilities.isExpired).mockImplementation(
        (date: string | undefined) => date === '2024-01-01' || date === '2024-01-02',
      );

      const result = createInventoryHeader('Test', multipleExpiredItems, mockTranslations);

      expect(result).toContain('2 items expired');
      expect(result).toMatch(/<span class="expired-badge"[^>]*>[\s\S]*?2[\s\S]*?<\/span>/);
    });
  });

  describe('expiry calculation logic', () => {
    it('should exclude items with no expiry date from expiry counts', () => {
      const itemsWithoutExpiry = [
        {
          auto_add_enabled: false,
          auto_add_to_list_quantity: 1,
          category: 'Test',
          expiry_date: '',
          location: 'Pantry',
          name: 'No Expiry 1',
          quantity: 5,
          todo_list: 'grocery',
          unit: 'pieces',
        },
        {
          auto_add_enabled: false,
          auto_add_to_list_quantity: 1,
          category: 'Test',
          expiry_date: '',
          location: 'Pantry',
          name: 'No Expiry 2',
          quantity: 3,
          todo_list: 'grocery',
          unit: 'pieces',
        },
      ];

      vi.mocked(Utilities.isExpired).mockReturnValue(true);
      vi.mocked(Utilities.isExpiringSoon).mockReturnValue(true);

      const result = createInventoryHeader('Test', itemsWithoutExpiry, mockTranslations);

      expect(result).not.toContain('class="expiry-indicators"');
      expect(Utilities.isExpired).not.toHaveBeenCalled();
      expect(Utilities.isExpiringSoon).not.toHaveBeenCalled();
    });

    it('should exclude items with zero quantity from expiry counts', () => {
      const zeroQuantityItems = [
        {
          auto_add_enabled: false,
          auto_add_to_list_quantity: 1,
          category: 'Test',
          expiry_alert_days: 7,
          expiry_date: '2024-01-01',
          location: 'Pantry',
          name: 'Zero Quantity',
          quantity: 0,
          todo_list: 'grocery',
          unit: 'pieces',
        },
      ];

      vi.mocked(Utilities.isExpired).mockReturnValue(true);
      vi.mocked(Utilities.isExpiringSoon).mockReturnValue(true);

      const result = createInventoryHeader('Test', zeroQuantityItems, mockTranslations);

      expect(result).not.toContain('class="expiry-indicators"');
    });

    it('should exclude items with negative quantity from expiry counts', () => {
      const negativeQuantityItems = [
        {
          auto_add_enabled: false,
          auto_add_to_list_quantity: 1,
          category: 'Test',
          expiry_alert_days: 7,
          expiry_date: '2024-01-01',
          location: 'Pantry',
          name: 'Negative Quantity',
          quantity: -1,
          todo_list: 'grocery',
          unit: 'pieces',
        },
      ];

      vi.mocked(Utilities.isExpired).mockReturnValue(true);

      const result = createInventoryHeader('Test', negativeQuantityItems, mockTranslations);

      expect(result).not.toContain('class="expiry-indicators"');
    });

    it('should use custom expiry alert days for expiring calculation', () => {
      const customAlertItem = [
        {
          auto_add_enabled: false,
          auto_add_to_list_quantity: 1,
          category: 'Test',
          expiry_alert_days: 14, // Custom threshold
          expiry_date: '2024-12-31',
          location: 'Pantry',
          name: 'Custom Alert',
          quantity: 1,
          todo_list: 'grocery',
          unit: 'pieces',
        },
      ];

      vi.mocked(Utilities.isExpiringSoon).mockReturnValue(true);

      createInventoryHeader('Test', customAlertItem, mockTranslations);

      expect(Utilities.isExpiringSoon).toHaveBeenCalledWith('2024-12-31', 14);
    });

    it('should use default 0 days when expiry_alert_days is undefined', () => {
      const defaultAlertItem = [
        {
          auto_add_enabled: false,
          auto_add_to_list_quantity: 0,
          category: 'Test',
          // expiry_alert_days is undefined
          expiry_date: '2024-12-31',
          location: 'Pantry',
          name: 'Default Alert',
          quantity: 1,
          todo_list: 'grocery',
          unit: 'pieces',
        },
      ];

      vi.mocked(Utilities.isExpiringSoon).mockReturnValue(true);

      createInventoryHeader('Test', defaultAlertItem, mockTranslations);

      expect(Utilities.isExpiringSoon).toHaveBeenCalledWith('2024-12-31', 1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty items array', () => {
      const result = createInventoryHeader('Empty Inventory', [], mockTranslations);

      expect(result).toContain('sanitized(Empty Inventory)');
      expect(result).not.toContain('class="expiry-indicators"');
    });

    it('should handle items with undefined quantity', () => {
      const itemsWithUndefinedQuantity = [
        {
          auto_add_enabled: false,
          auto_add_to_list_quantity: 1,
          category: 'Test',
          expiry_alert_days: 7,
          expiry_date: '2024-01-01',
          location: 'Pantry',
          name: 'Undefined Quantity',
          quantity: undefined as any,
          todo_list: 'grocery',
          unit: 'pieces',
        },
      ];

      vi.mocked(Utilities.isExpired).mockReturnValue(true);

      const result = createInventoryHeader('Test', itemsWithUndefinedQuantity, mockTranslations);

      expect(result).not.toContain('class="expiry-indicators"');
    });

    it('should handle special characters in description', () => {
      createInventoryHeader(
        'Test',
        mockItems,
        mockTranslations,
        'Description with <script>alert("xss")</script> & "quotes"',
      );

      expect(Utilities.sanitizeHtml).toHaveBeenCalledWith(
        'Description with <script>alert("xss")</script> & "quotes"',
      );
    });

    it('should handle very large expiry counts', () => {
      const manyItems = Array.from({ length: 999 }, (_, i) => ({
        auto_add_enabled: false,
        auto_add_to_list_quantity: 1,
        category: 'Test',
        expiry_alert_days: 7,
        expiry_date: '2024-01-01',
        location: 'Pantry',
        name: `Item ${i}`,
        quantity: 1,
        todo_list: 'grocery',
        unit: 'pieces',
      }));

      vi.mocked(Utilities.isExpired).mockReturnValue(true);

      const result = createInventoryHeader('Test', manyItems, mockTranslations);

      expect(result).toContain('999 items expired');
      expect(result).toMatch(/<span class="expired-badge"[^>]*>[\s\S]*?999[\s\S]*?<\/span>/);
    });
  });

  describe('HTML structure', () => {
    it('should have proper HTML structure', () => {
      const result = createInventoryHeader('Test', mockItems, mockTranslations, 'Test description');

      expect(result).toMatch(/<div class="card-header">[\s\S]*<\/div>/);
      expect(result).toContain('<div class="header-content">');
      expect(result).toContain('<h2 class="inventory-title">');
      expect(result).toContain('<p class="inventory-description">');
    });

    it('should have proper icon structure in badges', () => {
      vi.mocked(Utilities.isExpired).mockImplementation(
        (date: string | undefined) => date === '2024-01-01',
      );
      vi.mocked(Utilities.isExpiringSoon).mockReturnValue(false);

      const result = createInventoryHeader('Test', mockItems, mockTranslations);

      expect(result).toContain('<ha-icon icon="mdi:calendar-remove"></ha-icon>');
      expect(result).toContain('title="1 items expired"');
    });
  });

  describe('mutant killing tests', () => {
    it('should not include description content when description is empty', () => {
      const result = createInventoryHeader('Test', mockItems, mockTranslations, '');

      // Kill mutant: verify empty string is actually empty, not replaced with other content
      expect(result).not.toContain('<p class="inventory-description">');
      expect(result).not.toContain('Stryker was here!');
    });

    it('should not include description content when description is whitespace only', () => {
      const result = createInventoryHeader('Test', mockItems, mockTranslations, '   \t\n   ');

      // Kill mutant: verify the conditional actually works
      expect(result).not.toContain('<p class="inventory-description">');
      expect(result).not.toContain('Stryker was here!');
    });

    it('should not show expiry indicators when both counts are exactly 0', () => {
      vi.mocked(Utilities.isExpired).mockReturnValue(false);
      vi.mocked(Utilities.isExpiringSoon).mockReturnValue(false);

      const result = createInventoryHeader('Test', mockItems, mockTranslations);

      // Kill mutants: verify > 0 conditions work correctly for 0 values
      expect(result).not.toContain('class="expiry-indicators"');
      expect(result).not.toContain('class="expired-badge"');
      expect(result).not.toContain('class="expiring-badge"');
      expect(result).not.toContain('Stryker was here!');
    });

    it('should not show expired badge when expired count is 0 but expiring count > 0', () => {
      vi.mocked(Utilities.isExpired).mockReturnValue(false);
      vi.mocked(Utilities.isExpiringSoon).mockImplementation(
        (date: string) => date === '2024-12-31',
      );

      const result = createInventoryHeader('Test', mockItems, mockTranslations);

      // Kill mutants: verify expired badge is not shown when count is 0
      expect(result).toContain('class="expiry-indicators"'); // Should show indicators
      expect(result).toContain('class="expiring-badge"'); // Should show expiring badge
      expect(result).not.toContain('class="expired-badge"'); // Should NOT show expired badge
      expect(result).not.toContain('mdi:calendar-remove'); // Should not show expired icon
      expect(result).not.toContain('expired'); // Should not show expired text except in class names
    });

    it('should not show expiring badge when expiring count is 0 but expired count > 0', () => {
      vi.mocked(Utilities.isExpired).mockImplementation(
        (date: string | undefined) => date === '2024-01-01',
      );
      vi.mocked(Utilities.isExpiringSoon).mockReturnValue(false);

      const result = createInventoryHeader('Test', mockItems, mockTranslations);

      // Kill mutants: verify expiring badge is not shown when count is 0
      expect(result).toContain('class="expiry-indicators"'); // Should show indicators
      expect(result).toContain('class="expired-badge"'); // Should show expired badge
      expect(result).not.toContain('class="expiring-badge"'); // Should NOT show expiring badge
      expect(result).not.toContain('mdi:calendar-alert'); // Should not show expiring icon
      expect(result).not.toContain('expiring soon'); // Should not show expiring text
    });
  });

  it('should verify conditional boundaries: expired count > 0 vs >= 0', () => {
    // Test with items that have 0 quantity (should not count as expired even if date is expired)
    const zeroQuantityItems = [
      {
        auto_add_enabled: false,
        auto_add_to_list_quantity: 1,
        category: 'Test',
        expiry_alert_days: 7,
        expiry_date: '2024-01-01',
        location: 'Pantry',
        name: 'Zero Quantity Expired',
        quantity: 0,
        todo_list: 'grocery',
        unit: 'pieces',
      },
    ];

    vi.mocked(Utilities.isExpired).mockReturnValue(true); // Would be expired if quantity > 0
    vi.mocked(Utilities.isExpiringSoon).mockReturnValue(false);

    const result = createInventoryHeader('Test', zeroQuantityItems, mockTranslations);

    // Kill mutants: verify that 0 count doesn't trigger > 0 condition
    expect(result).not.toContain('class="expiry-indicators"');
    expect(result).not.toContain('class="expired-badge"');
  });

  it('should verify conditional boundaries: expiring count > 0 vs >= 0', () => {
    // Test with items that have 0 quantity (should not count as expiring even if date is expiring)
    const zeroQuantityItems = [
      {
        auto_add_enabled: false,
        auto_add_to_list_quantity: 1,
        category: 'Test',
        expiry_alert_days: 7,
        expiry_date: '2024-12-31',
        location: 'Pantry',
        name: 'Zero Quantity Expiring',
        quantity: 0,
        todo_list: 'grocery',
        unit: 'pieces',
      },
    ];

    vi.mocked(Utilities.isExpired).mockReturnValue(false);
    vi.mocked(Utilities.isExpiringSoon).mockReturnValue(true); // Would be expiring if quantity > 0

    const result = createInventoryHeader('Test', zeroQuantityItems, mockTranslations);

    // Kill mutants: verify that 0 count doesn't trigger > 0 condition
    expect(result).not.toContain('class="expiry-indicators"');
    expect(result).not.toContain('class="expiring-badge"');
  });

  it('should not include any expiry indicator content when no items qualify', () => {
    const noExpiryItems = [
      {
        auto_add_enabled: false,
        auto_add_to_list_quantity: 1,
        category: 'Test',
        expiry_date: '', // No expiry date
        location: 'Pantry',
        name: 'No Expiry',
        quantity: 5,
        todo_list: 'grocery',
        unit: 'pieces',
      },
    ];

    const result = createInventoryHeader('Test', noExpiryItems, mockTranslations);

    // Kill mutants: verify empty strings are actually empty
    expect(result).not.toContain('class="expiry-indicators"');
    expect(result).not.toContain('expired-badge');
    expect(result).not.toContain('expiring-badge');
    expect(result).not.toContain('mdi:calendar-remove');
    expect(result).not.toContain('mdi:calendar-alert');
    expect(result).not.toContain('items expired');
    expect(result).not.toContain('items expiring soon');
    expect(result).not.toContain('Stryker was here!');
  });

  it('should handle empty items array without any expiry content', () => {
    const result = createInventoryHeader('Empty Inventory', [], mockTranslations);

    // Kill mutants: verify no expiry content appears with empty array
    expect(result).not.toContain('class="expiry-indicators"');
    expect(result).not.toContain('expired');
    expect(result).not.toContain('expiring');
    expect(result).not.toContain('Stryker was here!');
  });

  it('should verify the exact structure when no expiry indicators should show', () => {
    vi.mocked(Utilities.isExpired).mockReturnValue(false);
    vi.mocked(Utilities.isExpiringSoon).mockReturnValue(false);

    const result = createInventoryHeader('Test', mockItems, mockTranslations);

    // Kill mutants: verify the overall conditional structure
    expect(result).toContain('class="card-header"');
    expect(result).toContain('class="header-content"');
    expect(result).toContain('class="inventory-title"');

    // Verify the expiry indicators section is completely absent
    const headerEndIndex = result.lastIndexOf('</div>');
    const beforeHeaderEnd = result.substring(0, headerEndIndex);
    expect(beforeHeaderEnd).not.toContain('expiry-indicators');
    expect(beforeHeaderEnd).not.toContain('Stryker was here!');
  });
});
