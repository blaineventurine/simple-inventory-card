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

vi.mock('../../src/services/translationManager', () => ({
  TranslationManager: {
    localize: vi.fn((_translations: any, _key: string, _params: any, fallback: string) => {
      return fallback;
    }),
  },
}));

const mockTranslations: TranslationData = {};

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
    amount: -1,
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
      const html = createConsumptionView(rates, null, mockTranslations);

      expect(html).toContain('metric-card');
      const metricCardCount = (html.match(/class="metric-card"/g) || []).length;
      expect(metricCardCount).toBe(6);

      expect(html).toContain('0.5/day');
      expect(html).toContain('3.5/wk');
      expect(html).toContain('Daily');
      expect(html).toContain('Weekly');
      expect(html).toContain('Days Left');
      expect(html).toContain('Avg Restock');
      expect(html).toContain('Total Used');
      expect(html).toContain('Events');
      expect(html).toContain('15');
      expect(html).toContain('10');
    });

    it('renders empty state with insufficient data', () => {
      const rates = makeRates({ has_sufficient_data: false });
      const html = createConsumptionView(rates, null, mockTranslations);

      expect(html).toContain('consumption-empty');
      expect(html).toContain('Not enough data yet');
      expect(html).toContain('Need at least 2 consumption events');
      expect(html).not.toContain('metric-card');
    });

    it('applies depletion-critical class for days <= 7', () => {
      const rates = makeRates({ days_until_depletion: 5 });
      const html = createConsumptionView(rates, null, mockTranslations);

      expect(html).toContain('depletion-critical');
      expect(html).not.toContain('depletion-warning');
      expect(html).not.toContain('depletion-safe');
    });

    it('applies depletion-warning class for days 8-14', () => {
      const rates = makeRates({ days_until_depletion: 10 });
      const html = createConsumptionView(rates, null, mockTranslations);

      expect(html).toContain('depletion-warning');
      expect(html).not.toContain('depletion-critical');
      expect(html).not.toContain('depletion-safe');
    });

    it('applies depletion-safe class for days > 14', () => {
      const rates = makeRates({ days_until_depletion: 30 });
      const html = createConsumptionView(rates, null, mockTranslations);

      expect(html).toContain('depletion-safe');
      expect(html).not.toContain('depletion-critical');
      expect(html).not.toContain('depletion-warning');
    });

    it('renders dash for null depletion days', () => {
      const rates = makeRates({ days_until_depletion: null });
      const html = createConsumptionView(rates, null, mockTranslations);

      expect(html).not.toContain('depletion-critical');
      expect(html).not.toContain('depletion-warning');
      expect(html).not.toContain('depletion-safe');
    });

    it('renders window pills with correct active state', () => {
      const rates = makeRates();
      const html = createConsumptionView(rates, 30, mockTranslations);

      expect(html).toContain('window-pill active" data-window="30"');
      expect(html).not.toContain('window-pill active" data-window="all"');
    });

    it('marks All pill as active when activeWindow is null', () => {
      const rates = makeRates();
      const html = createConsumptionView(rates, null, mockTranslations);

      expect(html).toContain('window-pill active" data-window="all"');
      expect(html).not.toContain('window-pill active" data-window="30"');
    });
  });

  describe('createHistoryContent', () => {
    it('renders empty message for no events', () => {
      const html = createHistoryContent([]);
      expect(html).toContain('No history recorded yet');
    });

    it('renders events in timeline', () => {
      const events = [makeEvent(), makeEvent({ id: '2', event_type: 'increment', amount: 1 })];
      const html = createHistoryContent(events);

      expect(html).toContain('history-timeline');
      expect(html).toContain('history-event');
      expect(html).toContain('decrement');
      expect(html).toContain('increment');
    });
  });

  describe('createHistoryAndConsumptionView', () => {
    it('includes tab buttons and history content', () => {
      const events = [makeEvent()];
      const html = createHistoryAndConsumptionView(events, 'Milk', mockTranslations);

      expect(html).toContain('id="history-tab-history"');
      expect(html).toContain('id="history-tab-consumption"');
      expect(html).toContain('id="history-tab-content"');
      expect(html).toContain('History');
      expect(html).toContain('Consumption');
      expect(html).toContain('history-timeline');
      expect(html).toContain('History: Milk');
    });

    it('shows history tab as active by default', () => {
      const html = createHistoryAndConsumptionView([], 'Test Item', mockTranslations);

      expect(html).toContain('history-tab active" id="history-tab-history"');
      expect(html).not.toContain('history-tab active" id="history-tab-consumption"');
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
