import { describe, it, expect, vi } from 'vitest';
import {
  createConsumptionView,
  createHistoryContent,
  createHistoryAndConsumptionView,
  createConsumptionLoading,
} from '../../src/templates/historyView';
import { ItemConsumptionRates } from '../../src/types/consumptionRates';
import { HistoryEvent } from '../../src/types/historyEvent';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

const mockTranslations: TranslationData = {};

const mockOptions = { language: 'en', requestedLimit: 500 };

const chartEvents = [
  makeEvent({ timestamp: '2026-08-01T10:00:00Z', quantity_before: 5, quantity_after: 4 }),
  makeEvent({ timestamp: '2026-08-05T10:00:00Z', quantity_before: 4, quantity_after: 2 }),
];

function makeRates(overrides: Partial<ItemConsumptionRates> = {}): ItemConsumptionRates {
  return {
    item_name: 'Milk',
    current_quantity: 2,
    unit: 'L',
    decrement_count: 10,
    total_consumed: 15,
    window_days: null,
    daily_rate: 0.5,
    weekly_rate: 3.5,
    days_until_depletion: 4,
    avg_restock_days: 7,
    has_sufficient_data: true,
    daily_spend_rate: null,
    weekly_spend_rate: null,
    total_spend: null,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<HistoryEvent> = {}): HistoryEvent {
  return {
    id: '1',
    item_id: 'item-1',
    inventory_id: 'inv-1',
    event_type: 'decrement',
    amount: 1,
    quantity_before: 3,
    quantity_after: 2,
    source: 'manual',
    location_from: '',
    location_to: '',
    timestamp: '2026-01-15T10:00:00Z',
    metadata: '',
    ...overrides,
  };
}

describe('historyView', () => {
  describe('createConsumptionView', () => {
    it('renders all 6 metric cards with sufficient data', () => {
      const rates = makeRates();
      const html = createConsumptionView(rates, chartEvents, null, mockTranslations, mockOptions);

      expect(html).toContain('metric-card');
      const metricCardCount = (html.match(/class="metric-card[ "]/g) || []).length;
      expect(metricCardCount).toBe(6);

      expect(html).toContain('0.5 L/day');
      expect(html).toContain('3.5 L/wk');
      expect(html).toContain('Daily');
      expect(html).toContain('Weekly');
      expect(html).toContain('Days Left');
      expect(html).toContain('Avg Restock');
      expect(html).toContain('Total Used');
      expect(html).toContain('Events');
      expect(html).toContain('15');
      expect(html).toContain('10');
    });

    it('renders progress empty state with insufficient data', () => {
      const rates = makeRates({ has_sufficient_data: false, decrement_count: 1 });
      const html = createConsumptionView(rates, chartEvents, null, mockTranslations, mockOptions);

      expect(html).toContain('consumption-empty');
      expect(html).toContain('Not enough data yet');
      expect(html).toContain('1 of 2 consumption events recorded');
      expect(html).not.toContain('metric-card');
      // stock chart still renders when events exist
      expect(html).toContain('chart-line');
      // window pills still render
      expect(html).toContain('window-pill');
    });

    it('renders no stock chart in the insufficient state when there are no events', () => {
      const rates = makeRates({ has_sufficient_data: false, decrement_count: 0 });
      const html = createConsumptionView(rates, [], null, mockTranslations, mockOptions);
      expect(html).not.toContain('class="chart-line"');
      expect(html).toContain('0 of 2 consumption events recorded');
    });

    it('renders both charts with sufficient data', () => {
      const html = createConsumptionView(
        makeRates(),
        chartEvents,
        null,
        mockTranslations,
        mockOptions,
      );
      expect(html).toContain('consumption-charts');
      expect(html).toContain('chart-line'); // stock chart
      expect(html).toContain('chart-bar'); // consumption bars
    });

    it('replaces the bar chart with a note when the window has no decrements', () => {
      const incrementOnly = [
        makeEvent({ event_type: 'increment', timestamp: '2026-08-05T10:00:00Z' }),
      ];
      const html = createConsumptionView(
        makeRates(),
        incrementOnly,
        null,
        mockTranslations,
        mockOptions,
      );
      expect(html).not.toContain('chart-bar');
      expect(html).toContain('chart-note');
      expect(html).toContain('No consumption in this window.');
    });

    it('shows a truncation hint when the fetch limit was hit inside the window', () => {
      const manyEvents = [makeEvent(), makeEvent(), makeEvent()];
      const html = createConsumptionView(makeRates(), manyEvents, null, mockTranslations, {
        ...mockOptions,
        requestedLimit: 3,
      });
      expect(html).toContain('chart-hint');
      expect(html).toContain('Showing recent history only');
    });

    it('appends the unit to rates and totals when present', () => {
      const html = createConsumptionView(
        makeRates({ unit: 'L' }),
        chartEvents,
        null,
        mockTranslations,
        mockOptions,
      );
      expect(html).toContain('0.5 L/day');
      expect(html).toContain('3.5 L/wk');
      expect(html).toContain('15 L');
    });

    it('formats the daily/weekly rate for the configured language, comma-decimal included', () => {
      const html = createConsumptionView(
        makeRates({ daily_rate: 1.5, weekly_rate: 10.5, unit: 'L' }),
        chartEvents,
        null,
        mockTranslations,
        { ...mockOptions, language: 'fr' },
      );
      expect(html).toContain('1,5 L/day');
      expect(html).toContain('10,5 L/wk');
    });

    it('omits the unit when empty (legacy rendering)', () => {
      const html = createConsumptionView(
        makeRates({ unit: '' }),
        chartEvents,
        null,
        mockTranslations,
        mockOptions,
      );
      expect(html).toContain('0.5/day');
      expect(html).toContain('3.5/wk');
    });

    it('escapes HTML in the unit', () => {
      const html = createConsumptionView(
        makeRates({ unit: '<img>' }),
        chartEvents,
        null,
        mockTranslations,
        mockOptions,
      );
      expect(html).not.toContain('<img>');
      expect(html).toContain('&lt;img&gt;');
    });

    it('formats spend with Intl when a currency is configured', () => {
      const rates = makeRates({ daily_spend_rate: 1.5, weekly_spend_rate: 10.5, total_spend: 42 });
      const html = createConsumptionView(rates, chartEvents, null, mockTranslations, {
        ...mockOptions,
        currency: 'EUR',
      });
      expect(html).toContain(
        new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' }).format(42),
      );
    });

    it('falls back to a plain number when the currency code is invalid', () => {
      const rates = makeRates({ daily_spend_rate: 1.5, weekly_spend_rate: 10.5, total_spend: 42 });
      const html = createConsumptionView(rates, chartEvents, null, mockTranslations, {
        ...mockOptions,
        currency: 'NOT_A_CODE',
      });
      expect(html).toContain(
        new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
          42,
        ),
      );
    });

    it('adds a projected run-out date tooltip to Days Left', () => {
      const html = createConsumptionView(
        makeRates({ days_until_depletion: 4 }),
        chartEvents,
        null,
        mockTranslations,
        mockOptions,
      );
      expect(html).toMatch(/title="Runs out ~/);
    });

    it('omits the tooltip when depletion is null', () => {
      const html = createConsumptionView(
        makeRates({ days_until_depletion: null }),
        chartEvents,
        null,
        mockTranslations,
        mockOptions,
      );
      expect(html).not.toContain('Runs out');
    });

    it('applies depletion-critical class for days <= 7', () => {
      const rates = makeRates({ days_until_depletion: 5 });
      const html = createConsumptionView(rates, chartEvents, null, mockTranslations, mockOptions);

      expect(html).toContain('depletion-critical');
      expect(html).not.toContain('depletion-warning');
      expect(html).not.toContain('depletion-safe');
    });

    it('applies depletion-warning class for days 8-14', () => {
      const rates = makeRates({ days_until_depletion: 10 });
      const html = createConsumptionView(rates, chartEvents, null, mockTranslations, mockOptions);

      expect(html).toContain('depletion-warning');
      expect(html).not.toContain('depletion-critical');
      expect(html).not.toContain('depletion-safe');
    });

    it('applies depletion-safe class for days > 14', () => {
      const rates = makeRates({ days_until_depletion: 30 });
      const html = createConsumptionView(rates, chartEvents, null, mockTranslations, mockOptions);

      expect(html).toContain('depletion-safe');
      expect(html).not.toContain('depletion-critical');
      expect(html).not.toContain('depletion-warning');
    });

    it('renders dash for null depletion days', () => {
      const rates = makeRates({ days_until_depletion: null });
      const html = createConsumptionView(rates, chartEvents, null, mockTranslations, mockOptions);

      expect(html).not.toContain('depletion-critical');
      expect(html).not.toContain('depletion-warning');
      expect(html).not.toContain('depletion-safe');
    });

    it('renders window pills with correct active state', () => {
      const rates = makeRates();
      const html = createConsumptionView(rates, chartEvents, 30, mockTranslations, mockOptions);

      expect(html).toContain('window-pill active" data-window="30"');
      expect(html).not.toContain('window-pill active" data-window="all"');
    });

    it('marks All pill as active when activeWindow is null', () => {
      const rates = makeRates();
      const html = createConsumptionView(rates, chartEvents, null, mockTranslations, mockOptions);

      expect(html).toContain('window-pill active" data-window="all"');
      expect(html).not.toContain('window-pill active" data-window="30"');
    });

    it('renders window pills as pressed/unpressed chip buttons', () => {
      const container = document.createElement('div');
      container.innerHTML = createConsumptionView(
        makeRates(),
        chartEvents,
        30,
        mockTranslations,
        mockOptions,
      );

      const active = container.querySelector('[data-window="30"]');
      const inactive = container.querySelector('[data-window="all"]');
      expect(active?.tagName).toBe('BUTTON');
      expect(active?.getAttribute('type')).toBe('button');
      expect(active?.getAttribute('aria-pressed')).toBe('true');
      expect(active?.classList.contains('si-chip')).toBe(true);
      expect(active?.classList.contains('si-tone-primary')).toBe(true);
      expect(inactive?.getAttribute('aria-pressed')).toBe('false');
      expect(inactive?.classList.contains('si-chip')).toBe(true);
      expect(inactive?.classList.contains('si-tone-primary')).toBe(false);
    });

    it.each([
      [5, 'si-tone-error'],
      [10, 'si-tone-warning'],
      [30, 'si-tone-success'],
      [null, 'si-tone-primary'],
    ])('tints the Days Left tile for %s days with %s', (days, toneClass) => {
      const container = document.createElement('div');
      container.innerHTML = createConsumptionView(
        makeRates({ days_until_depletion: days }),
        chartEvents,
        null,
        mockTranslations,
        mockOptions,
      );

      const tiles = Array.from(container.querySelectorAll('.metric-card'));
      const daysLeft = tiles.find((tile) => tile.textContent?.includes('Days Left'));
      expect(daysLeft?.classList.contains('si-tint')).toBe(true);
      expect(daysLeft?.classList.contains(toneClass)).toBe(true);
      const daily = tiles.find((tile) => tile.textContent?.includes('Daily'));
      expect(daily?.classList.contains('si-tone-primary')).toBe(true);
    });

    it('shows an icon instead of an emoji in the insufficient-data state', () => {
      const html = createConsumptionView(
        makeRates({ has_sufficient_data: false, decrement_count: 1 }),
        chartEvents,
        null,
        mockTranslations,
        mockOptions,
      );
      expect(html).not.toContain('📊');
      expect(html).toContain('icon="mdi:chart-line"');
    });
  });

  describe('total consumed formatting', () => {
    it('rounds floating-point total consumed to one decimal', () => {
      const html = createConsumptionView(
        makeRates({ total_consumed: 0.1 + 0.2 }),
        chartEvents,
        null,
        mockTranslations,
        mockOptions,
      );
      expect(html).toContain('>0.3 L<');
      expect(html).not.toContain('0.30000000000000004');
    });
  });

  describe('createHistoryContent', () => {
    it('renders naive backend timestamps as UTC converted to local time', () => {
      const originalTz = process.env.TZ;
      process.env.TZ = 'America/Los_Angeles';
      try {
        const html = createHistoryContent(
          [makeEvent({ timestamp: '2026-08-12T10:00:00.123456' })],
          'en',
        );
        expect(html).toContain(new Date(Date.parse('2026-08-12T10:00:00Z')).toLocaleString('en'));
        expect(html).toContain('3:00:00');
      } finally {
        if (originalTz === undefined) {
          delete process.env.TZ;
        } else {
          process.env.TZ = originalTz;
        }
      }
    });

    it('renders empty message for no events', () => {
      const html = createHistoryContent([], 'en');
      expect(html).toContain('No history recorded yet');
    });

    it('renders events in timeline', () => {
      const events = [
        makeEvent(),
        makeEvent({
          id: '2',
          event_type: 'increment',
          amount: 1,
          quantity_before: 2,
          quantity_after: 3,
        }),
      ];
      const html = createHistoryContent(events, 'en');

      expect(html).toContain('history-timeline');
      expect(html).toContain('history-event');
      expect(html).toContain('decrement');
      expect(html).toContain('increment');
    });

    it('shows negative sign when quantity_before > quantity_after (decrement)', () => {
      const event = makeEvent({ amount: 2, quantity_before: 5, quantity_after: 3 });
      const html = createHistoryContent([event], 'en');
      expect(html).toContain('(-2)');
    });

    it('shows positive sign when quantity_before < quantity_after (increment)', () => {
      const event = makeEvent({
        event_type: 'increment',
        amount: 2,
        quantity_before: 3,
        quantity_after: 5,
      });
      const html = createHistoryContent([event], 'en');
      expect(html).toContain('(+2)');
    });

    it('shows no sign when quantity_before equals quantity_after (transfer/update)', () => {
      const event = makeEvent({
        event_type: 'transfer',
        amount: 2,
        quantity_before: 5,
        quantity_after: 5,
      });
      const html = createHistoryContent([event], 'en');
      expect(html).toContain('(2)');
      expect(html).not.toContain('(-2)');
      expect(html).not.toContain('(+2)');
    });

    it.each([
      ['add', 'mdi:plus', 'si-tone-success'],
      ['increment', 'mdi:arrow-up', 'si-tone-success'],
      ['decrement', 'mdi:arrow-down', 'si-tone-primary'],
      ['transfer', 'mdi:swap-horizontal', 'si-tone-primary'],
      ['update', 'mdi:pencil-outline', 'si-tone-primary'],
      ['import', 'mdi:import', 'si-tone-primary'],
      ['remove', 'mdi:delete-outline', 'si-tone-error'],
      ['something_new', 'mdi:history', 'si-tone-disabled'],
    ])('renders a %s event with %s in a small %s circle', (eventType, icon, toneClass) => {
      const container = document.createElement('div');
      container.innerHTML = createHistoryContent([makeEvent({ event_type: eventType })], 'en');

      const circle = container.querySelector('.history-event .si-icon-circle');
      expect(circle?.classList.contains('si-icon-circle--small')).toBe(true);
      expect(circle?.classList.contains(toneClass)).toBe(true);
      expect(circle?.querySelector('ha-icon')?.getAttribute('icon')).toBe(icon);
    });

    it('renders no emoji icons', () => {
      const types = ['add', 'remove', 'increment', 'decrement', 'transfer', 'update', 'x'];
      const html = createHistoryContent(
        types.map((type) => makeEvent({ event_type: type })),
        'en',
      );
      for (const emoji of ['➕', '❌', '⬆️', '⬇️', '↔️', '✏️', '📝']) {
        expect(html).not.toContain(emoji);
      }
    });

    it('escapes the event type and transfer locations', () => {
      const html = createHistoryContent(
        [
          makeEvent({ event_type: '<b>odd</b>' }),
          makeEvent({
            event_type: 'transfer',
            location_from: '<i>Pantry</i>',
            location_to: 'Fridge',
            quantity_before: 5,
            quantity_after: 5,
          }),
        ],
        'en',
      );
      expect(html).not.toContain('<b>');
      expect(html).not.toContain('<i>');
      expect(html).toContain('&lt;b&gt;odd&lt;/b&gt;');
      expect(html).toContain('transfer (&lt;i&gt;Pantry&lt;/i&gt; → Fridge)');
    });

    it('formats quantities without floating-point noise', () => {
      const html = createHistoryContent(
        [makeEvent({ quantity_before: 0.1 + 0.2, quantity_after: 0.1, amount: 0.2 })],
        'en',
      );
      expect(html).toContain('0.3 → 0.1 (-0.2)');
      expect(html).not.toContain('0.30000000000000004');
    });

    it('shows an icon with the empty message', () => {
      const container = document.createElement('div');
      container.innerHTML = createHistoryContent([], 'en');
      expect(
        container.querySelector('.history-empty .si-icon-circle ha-icon')?.getAttribute('icon'),
      ).toBe('mdi:history');
    });

    it('formats the timestamp for the configured language', () => {
      const html = createHistoryContent([makeEvent({ timestamp: '2026-08-12T10:00:00Z' })], 'fr');
      expect(html).toContain(new Date(Date.parse('2026-08-12T10:00:00Z')).toLocaleString('fr'));
    });
  });

  describe('createHistoryAndConsumptionView', () => {
    it('includes tab buttons and history content', () => {
      const events = [makeEvent()];
      const html = createHistoryAndConsumptionView(events, mockTranslations, 'en');

      expect(html).toContain('id="history-tab-history"');
      expect(html).toContain('id="history-tab-consumption"');
      expect(html).toContain('id="history-tab-content"');
      expect(html).toContain('History');
      expect(html).toContain('Consumption');
      expect(html).toContain('history-timeline');
    });

    it('shows history tab as active by default', () => {
      const html = createHistoryAndConsumptionView([], mockTranslations, 'en');

      expect(html).toContain('history-tab active" id="history-tab-history"');
      expect(html).not.toContain('history-tab active" id="history-tab-consumption"');
    });

    it('renders the tabs as a two-segment tablist with the history segment selected', () => {
      const container = document.createElement('div');
      container.innerHTML = createHistoryAndConsumptionView([], mockTranslations, 'en');

      const tablist = container.querySelector('[role="tablist"]');
      const historyTab = container.querySelector('#history-tab-history');
      const consumptionTab = container.querySelector('#history-tab-consumption');
      expect(tablist?.querySelectorAll('[role="tab"]')).toHaveLength(2);
      expect(historyTab?.getAttribute('aria-selected')).toBe('true');
      expect(historyTab?.classList.contains('si-tint')).toBe(true);
      expect(consumptionTab?.getAttribute('aria-selected')).toBe('false');
      expect(consumptionTab?.classList.contains('si-tint')).toBe(false);
      expect(container.querySelector('h3')).toBeNull();
    });
  });

  describe('createConsumptionLoading', () => {
    it('renders loading text', () => {
      const html = createConsumptionLoading(mockTranslations);
      expect(html).toContain('Loading...');
      expect(html).toContain('consumption-loading');
    });
  });
});
