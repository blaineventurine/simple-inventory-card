import { describe, it, expect } from 'vitest';
import { HomeSection } from '../../src/panel/home/homeMode';
import { homeView } from '../../src/panel/home/homeTemplates';
import { valueFormatter } from '../../src/utils/currency';
import { Overview } from '../../src/panel/home/overviewClient';
import { InventoryBatch } from '../../src/types/inventory';
import en from '../../src/translations/en.json';
import es from '../../src/translations/es.json';
import fr from '../../src/translations/fr.json';
import italian from '../../src/translations/it.json';
import sl from '../../src/translations/sl.json';
import { TranslationData } from '../../src/types/translatableComponent';
import { entry, expired, expiring, low, overview, summary } from './overviewFixtures';

const kitchen = { id: 'kitchen_id', name: 'Kitchen', icon: 'mdi:fridge' };
const pantry = { id: 'pantry_id', name: 'Pantry' };

function batches(count: number): InventoryBatch[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `b${index}`,
    quantity: 1,
    expiry_date: '',
    location: '',
    unit_price: 0,
    purchased_at: '',
  }));
}

function render(
  data: Overview,
  expanded: HomeSection[] = [],
  translations: TranslationData = en,
): HTMLElement {
  const element = document.createElement('div');
  element.innerHTML = homeView(
    translations,
    { status: 'ok', overview: data },
    { expanded: new Set(expanded), formatValue: valueFormatter('en', 'EUR') },
  );
  return element;
}

const text = (element: Element | null | undefined): string =>
  (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

function reasons(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll('.search-result'), (row) =>
    text(row.querySelector('.si-secondary')),
  );
}

describe('home templates', () => {
  describe('summaries', () => {
    it('shows each inventory with its items, value and attention badge', () => {
      const view = render(
        overview({
          inventories: [
            summary(kitchen, {
              total_items: 3,
              total_value: 12.5,
              attention: { expired: 1, expiring_soon: 0, out_of_stock: 1, low_stock: 0 },
            }),
            summary(pantry, {
              total_items: 1,
              attention: { expired: 0, expiring_soon: 1, out_of_stock: 0, low_stock: 2 },
            }),
          ],
        }),
      );

      const [first, second] = Array.from(view.querySelectorAll<HTMLElement>('.home-summary'));
      expect(first.dataset.inventory).toBe('kitchen_id');
      expect(text(first.querySelector('.home-summary__name'))).toBe('Kitchen');
      expect(first.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:fridge');
      expect(text(first.querySelector('.home-summary__items'))).toBe('3 items');
      expect(text(first.querySelector('.home-summary__value'))).toBe('€12.50');
      const firstBadge = first.querySelector('.home-summary__badge');
      expect(text(firstBadge)).toBe('2 need attention');
      expect(firstBadge?.classList.contains('si-tone-error')).toBe(true);

      expect(text(second.querySelector('.home-summary__items'))).toBe('1 item');
      expect(second.querySelector('.home-summary__value')).toBeNull();
      const secondBadge = second.querySelector('.home-summary__badge');
      expect(text(secondBadge)).toBe('3 need attention');
      expect(secondBadge?.classList.contains('si-tone-warning')).toBe(true);
    });

    it('shows no badge when nothing needs attention', () => {
      const view = render(overview({ inventories: [summary(kitchen, { total_items: 2 })] }));

      expect(view.querySelector('.home-summary__badge')).toBeNull();
    });

    it('formats a value plainly without a currency', () => {
      expect(valueFormatter('en', undefined)(1234.5)).toBe('1,234.50');
      expect(valueFormatter('en', 'not a currency')(3)).toBe('3.00');
    });
  });

  describe('sections', () => {
    it('lists the sections in order, with counts, and hides empty ones', () => {
      const view = render(
        overview({
          low_stock: [entry('Rice', kitchen, low(2, 1))],
          expired: [entry('Milk', kitchen, expired(2))],
          out_of_stock: [entry('Flour', pantry, {}, { quantity: 0 })],
        }),
      );

      const sections = Array.from(view.querySelectorAll<HTMLElement>('.home-section'));
      expect(sections.map((section) => section.dataset.section)).toEqual([
        'expired',
        'out_of_stock',
        'low_stock',
      ]);
      expect(sections.map((section) => text(section.querySelector('h2')))).toEqual([
        'Expired 1',
        'Out of stock 1',
        'Low stock 1',
      ]);
      expect(view.querySelector('.home-empty')).toBeNull();
    });

    it('shows the first 5 rows and a Show all button, or every row once expanded', () => {
      const many = Array.from({ length: 7 }, (_, index) =>
        entry(`Item ${index + 1}`, kitchen, low(2, 1)),
      );
      const collapsed = render(overview({ low_stock: many }));

      expect(collapsed.querySelectorAll('.search-result')).toHaveLength(5);
      const showAll = collapsed.querySelector<HTMLElement>('.home-show-all');
      expect(text(showAll)).toBe('Show all (7)');
      expect(showAll?.dataset.section).toBe('low_stock');

      const expanded = render(overview({ low_stock: many }), ['low_stock']);
      expect(expanded.querySelectorAll('.search-result')).toHaveLength(7);
      expect(expanded.querySelector('.home-show-all')).toBeNull();
    });

    it('shows the all-clear state when nothing needs attention', () => {
      const view = render(overview({ inventories: [summary(kitchen, { total_items: 4 })] }));

      expect(view.querySelector('.home-section')).toBeNull();
      expect(text(view.querySelector('.home-empty'))).toBe('Everything is stocked and fresh');
      expect(view.querySelector('.home-empty ha-icon')?.getAttribute('icon')).toBe(
        'mdi:check-circle-outline',
      );
      expect(view.querySelectorAll('.home-summary')).toHaveLength(1);
    });
  });

  describe('rows', () => {
    it('reads the expiry reasons: today, 1 day, n days, and the batch share', () => {
      const view = render(
        overview({
          expired: [
            entry('Milk', kitchen, expired(0), { locations: ['Fridge'] }),
            entry('Yogurt', kitchen, expired(1)),
            entry('Cheese', pantry, expired(5, 2), { batches: batches(3) }),
            entry('Ham', pantry, expired(3, 2), { batches: batches(2) }),
          ],
          expiring_soon: [
            entry('Bread', kitchen, expiring(0)),
            entry('Eggs', kitchen, expiring(1)),
            entry('Butter', pantry, expiring(4, 1), { batches: batches(2) }),
          ],
        }),
      );

      expect(reasons(view)).toEqual([
        'Kitchen · Expired today · Fridge',
        'Kitchen · Expired 1 day ago',
        'Pantry · Expired 5 days ago · 2 of 3 batches',
        'Pantry · Expired 3 days ago',
        'Kitchen · Expires today',
        'Kitchen · Expires tomorrow',
        'Pantry · Expires in 4 days · 1 of 2 batches',
      ]);
    });

    it('reads the stock reasons, with numbers formatted like the stepper', () => {
      const view = render(
        overview({
          out_of_stock: [entry('Flour', pantry, {}, { quantity: 0 })],
          low_stock: [entry('Rice', kitchen, low(2, 2.5), { quantity: 1.5 })],
        }),
      );

      expect(reasons(view)).toEqual(['Pantry · Out of stock', 'Kitchen · Low: 1.5 left, need 2.5']);
    });

    it('tints each row by its section', () => {
      const view = render(
        overview({
          expired: [entry('Milk', kitchen, expired(1))],
          expiring_soon: [entry('Eggs', kitchen, expiring(2))],
          out_of_stock: [entry('Flour', pantry, {}, { quantity: 0 })],
          low_stock: [entry('Rice', kitchen, low(2, 1))],
        }),
      );

      const tones = Array.from(view.querySelectorAll('.search-result .si-icon-circle'), (circle) =>
        Array.from(circle.classList).find((name) => name.startsWith('si-tone-')),
      );
      expect(tones).toEqual([
        'si-tone-error',
        'si-tone-warning',
        'si-tone-disabled',
        'si-tone-warning',
      ]);
    });

    it('opens and steps each row in its own inventory', () => {
      const view = render(overview({ low_stock: [entry('Rice', pantry, low(2, 1))] }));

      const open = view.querySelector<HTMLElement>('[data-action="search-open"]');
      expect(open?.dataset.inventory).toBe('pantry_id');
      expect(open?.dataset.name).toBe('Rice');
      expect(view.querySelector('.search-result [data-action="increment"]')).not.toBeNull();
    });
  });

  describe('reason texts in other languages', () => {
    const batchRows = overview({
      expired: [
        entry('Milk', kitchen, expired(5, 1), { batches: batches(2) }),
        entry('Ham', kitchen, expired(5, 2), { batches: batches(3) }),
      ],
    });
    const lowRows = overview({
      low_stock: [
        entry('Rice', kitchen, low(2, 1), { quantity: 1 }),
        entry('Oats', kitchen, low(2, 1.5), { quantity: 2 }),
      ],
    });
    const batchShares = (view: HTMLElement): string[] =>
      Array.from(view.querySelectorAll('.home-batches'), (part) => text(part));
    const lowReasons = (view: HTMLElement): string[] =>
      Array.from(view.querySelectorAll('.home-reason'), (part) => text(part));

    it('agrees "batches" with the count in French and Italian', () => {
      expect(batchShares(render(batchRows, [], fr))).toEqual(['1 lot sur 2', '2 lots sur 3']);
      expect(batchShares(render(batchRows, [], italian))).toEqual(['1 lotto su 2', '2 lotti su 3']);
    });

    it('agrees the low-stock verbs with the quantities in Spanish and Italian', () => {
      expect(lowReasons(render(lowRows, [], es))).toEqual([
        'Quedan pocos: 1, se necesita 1',
        'Quedan pocos: 2, se necesitan 1.5',
      ]);
      expect(lowReasons(render(lowRows, [], italian))).toEqual([
        'Scorta bassa: 1 rimasto, serve 1',
        'Scorta bassa: 2 rimasti, servono 1.5',
      ]);
    });

    it('reads Slovenian day counts without number agreement', () => {
      const view = render(
        overview({
          expired: [entry('Milk', kitchen, expired(2))],
          expiring_soon: [entry('Eggs', kitchen, expiring(3))],
        }),
        [],
        sl,
      );

      expect(lowReasons(view)).toEqual(['Dni po izteku: 2', 'Dni do izteka: 3']);
    });
  });

  describe('states', () => {
    it('shows loading, and an error with Retry', () => {
      const options = {
        expanded: new Set<HomeSection>(),
        formatValue: valueFormatter('en', 'EUR'),
      };
      const loading = document.createElement('div');
      loading.innerHTML = homeView(en, { status: 'loading' }, options);
      expect(text(loading)).toBe('Loading the overview…');

      const failed = document.createElement('div');
      failed.innerHTML = homeView(en, { status: 'error', message: 'Boom' }, options);
      expect(text(failed.querySelector('.message'))).toBe(
        'Could not load the overview: Boom Retry',
      );
      expect(failed.querySelector('.home-retry-btn')).not.toBeNull();
    });
  });
});
