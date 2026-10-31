import { describe, it, expect, vi } from 'vitest';
import { createBatchPanel } from '../../src/templates/batchList';
import { InventoryBatch, InventoryConfig, InventoryItem } from '../../src/types/inventory';
import { batchFieldValue } from '../../src/utils/batchFields';
import { ACTIONS, BATCH_FIELDS, ELEMENTS } from '../../src/utils/constants';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

const EXPIRED: InventoryBatch = {
  id: 'b1',
  quantity: 0.5,
  expiry_date: '2000-01-01',
  location: 'Fridge',
  unit_price: 1.2,
  purchased_at: '1999-12-01',
};
const NO_EXPIRY: InventoryBatch = {
  id: 'b2',
  quantity: 3,
  expiry_date: '',
  location: '',
  unit_price: 0,
  purchased_at: '2026-10-20',
};

function milk(batches: InventoryBatch[] = [EXPIRED, NO_EXPIRY]): InventoryItem {
  return {
    auto_add_enabled: false,
    auto_add_id_to_description_enabled: false,
    category: '',
    description: '',
    expiry_alert_days: 3,
    expiry_date: '2000-01-01',
    location: 'Fridge',
    name: 'Milk',
    quantity: 3.5,
    todo_list: '',
    unit: 'L',
    batches,
  };
}

function render(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function panelOf(html: string): HTMLElement {
  const panel = render(html).querySelector('.batch-panel');
  if (!(panel instanceof HTMLElement)) {
    throw new Error('missing .batch-panel');
  }
  return panel;
}

describe('createBatchPanel', () => {
  it('is never hidden itself; the item details panel hides it', () => {
    expect(panelOf(createBatchPanel(milk(), {}, undefined)).hidden).toBe(false);
  });

  it('lists batches in backend order with quantity, location, expiry and unit price on one line', () => {
    const rows = panelOf(createBatchPanel(milk(), {}, undefined)).querySelectorAll('.batch-row');

    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.batch-quantity')?.textContent).toBe('0.5 L');
    expect(rows[0].querySelector('.batch-location')?.textContent).toBe('Fridge');
    expect(rows[0].querySelector('.batch-expiry')?.classList.contains('expired')).toBe(true);
    expect(rows[0].querySelector('.batch-price')?.textContent).toBe('$1.20 each');
    expect(rows[0].querySelectorAll('.si-secondary')).toHaveLength(1);
    expect(rows[1].querySelector('.batch-quantity')?.textContent).toBe('3 L');
    expect(rows[1].querySelector('.batch-location')).toBeNull();
    expect(rows[1].querySelector('.batch-expiry')).toBeNull();
    expect(rows[1].querySelector('.batch-price')).toBeNull();
  });

  it('tints only the expiry part of the batch line', () => {
    const soon: InventoryBatch = {
      ...NO_EXPIRY,
      id: 'b3',
      expiry_date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    };
    const rows = panelOf(
      createBatchPanel(
        milk([EXPIRED, soon, { ...NO_EXPIRY, expiry_date: '2099-01-01' }]),
        {},
        undefined,
      ),
    ).querySelectorAll('.batch-row');

    expect(rows[0].querySelector('.batch-expiry')?.classList.contains('si-tone-error')).toBe(true);
    expect(rows[1].querySelector('.batch-expiry')?.classList.contains('si-tone-warning')).toBe(
      true,
    );
    const safe = rows[2].querySelector('.batch-expiry');
    expect(safe?.textContent).toBe('2099-01-01');
    expect([...(safe?.classList ?? [])].some((c) => c.startsWith('si-tone-'))).toBe(false);
    expect(
      [...(rows[0].querySelector('.batch-quantity')?.classList ?? [])].some((c) =>
        c.startsWith('si-tone-'),
      ),
    ).toBe(false);
  });

  it('gives every batch a take-one icon button that takes at most one unit from that batch only', () => {
    const buttons = [
      ...panelOf(createBatchPanel(milk(), {}, undefined)).querySelectorAll<HTMLElement>(
        '.batch-decrement-btn',
      ),
    ];

    expect(
      buttons.map((b) => [b.dataset.action, b.dataset.name, b.dataset.batchId, b.dataset.amount]),
    ).toEqual([
      [ACTIONS.DECREMENT_BATCH, 'Milk', 'b1', '0.5'],
      [ACTIONS.DECREMENT_BATCH, 'Milk', 'b2', '1'],
    ]);
    expect(buttons[0].getAttribute('aria-label')).toBe('Use from batch: 0.5 L, Fridge, 2000-01-01');
    expect(buttons[0].classList.contains('si-icon-btn')).toBe(true);
    expect(buttons[0].querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:minus');
  });

  it('respects show_expiry, show_price and show_location', () => {
    const config: InventoryConfig = {
      type: 'custom:simple-inventory-card',
      entity: 'sensor.kitchen',
      show_expiry: false,
      show_price: false,
      show_location: false,
    };
    const row = panelOf(createBatchPanel(milk(), {}, config)).querySelector('.batch-row');

    expect(row?.querySelector('.batch-expiry')).toBeNull();
    expect(row?.querySelector('.batch-price')).toBeNull();
    expect(row?.querySelector('.batch-location')).toBeNull();
  });

  it('offers a hidden restock form with an amount and the batch inputs, even with no stock', () => {
    const panel = panelOf(createBatchPanel(milk([]), {}, undefined));

    expect(panel.querySelectorAll('.batch-row')).toHaveLength(0);
    const open = panel.querySelector('.restock-open-btn');
    expect(open?.getAttribute('data-action')).toBe(ACTIONS.OPEN_RESTOCK);
    expect(open?.classList.contains('si-tonal-btn')).toBe(true);
    // The open button sits below the list, before the (hidden) form.
    expect(open?.previousElementSibling?.classList.contains('batch-list')).toBe(true);
    const form = panel.querySelector('.restock-form');
    if (!(form instanceof HTMLElement)) {
      throw new Error('missing .restock-form');
    }
    expect(form.hidden).toBe(true);
    expect(batchFieldValue(form, BATCH_FIELDS.AMOUNT)).toBe('1');
    expect(form.querySelectorAll('[data-batch-field]')).toHaveLength(5);
    expect(
      form.querySelector(`[data-action="${ACTIONS.SUBMIT_RESTOCK}"]`)?.getAttribute('data-name'),
    ).toBe('Milk');
    expect(form.querySelector(`[data-action="${ACTIONS.CANCEL_RESTOCK}"]`)).not.toBeNull();
    expect(
      form
        .querySelector(`[data-action="${ACTIONS.SUBMIT_RESTOCK}"]`)
        ?.classList.contains('si-filled-btn'),
    ).toBe(true);
  });
});

describe('batch panel escaping', () => {
  it('escapes batch values', () => {
    const evil: InventoryBatch = { ...EXPIRED, location: '<img src=x>', expiry_date: '<b>x</b>' };
    const panel = panelOf(createBatchPanel(milk([evil]), {}, undefined));

    expect(panel.querySelector('img')).toBeNull();
    expect(panel.querySelector('.batch-row b')).toBeNull();
    expect(panel.querySelector('.batch-location')?.textContent).toBe('<img src=x>');
  });
});

describe('Move… on batch rows', () => {
  it('is absent without the transfers feature', () => {
    const panel = panelOf(createBatchPanel(milk(), {}, undefined));

    expect(panel.querySelector('.batch-move-btn')).toBeNull();
    expect(panel.querySelector('.move-form')).toBeNull();
  });

  it('gives each batch a Move icon button before its take-one button and a hidden form for that batch', () => {
    const panel = panelOf(createBatchPanel(milk(), {}, undefined, true));
    const rows = [...panel.querySelectorAll<HTMLElement>('.batch-row')];
    expect(rows).toHaveLength(2);
    const [first, second] = rows;

    const open = first.querySelector<HTMLElement>('.batch-move-btn');
    expect([open?.dataset.action, open?.dataset.name, open?.dataset.batchId]).toEqual([
      ACTIONS.OPEN_MOVE,
      'Milk',
      'b1',
    ]);
    expect(open?.textContent).toBe('');
    expect(open?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:swap-horizontal');
    expect(open?.getAttribute('aria-label')).toBe('Move from batch: 0.5 L, Fridge, 2000-01-01');
    expect(open?.nextElementSibling?.classList.contains('batch-decrement-btn')).toBe(true);

    const form = first.querySelector('.move-form');
    if (!(form instanceof HTMLElement)) {
      throw new Error('missing .move-form');
    }
    expect(form.hidden).toBe(true);
    expect(batchFieldValue(form, BATCH_FIELDS.AMOUNT)).toBe('0.5');
    expect(batchFieldValue(form, BATCH_FIELDS.LOCATION)).toBe('');
    expect(
      form.querySelector(`[data-batch-field="${BATCH_FIELDS.LOCATION}"]`)?.getAttribute('list'),
    ).toBe(ELEMENTS.BATCH_LOCATION_OPTIONS);
    const submit = form.querySelector<HTMLElement>(`[data-action="${ACTIONS.SUBMIT_MOVE}"]`);
    expect([submit?.dataset.name, submit?.dataset.batchId, submit?.textContent]).toEqual([
      'Milk',
      'b1',
      'Move',
    ]);
    expect(
      form.querySelector(`[data-action="${ACTIONS.CANCEL_MOVE}"]`)?.getAttribute('data-batch-id'),
    ).toBe('b1');

    expect(
      second.querySelector<HTMLInputElement>(
        `.move-form [data-batch-field="${BATCH_FIELDS.AMOUNT}"]`,
      )?.value,
    ).toBe('3');
  });

  it('escapes the item name and batch id in the Move… controls', () => {
    const item = { ...milk([{ ...EXPIRED, id: 'b"1' }]), name: 'Oat "milk"' };
    const row = panelOf(createBatchPanel(item, {}, undefined, true)).querySelector('.batch-row');

    expect(row?.querySelector<HTMLElement>('.batch-move-btn')?.dataset.batchId).toBe('b"1');
    expect(row?.querySelector<HTMLElement>('.move-submit-btn')?.dataset.name).toBe('Oat "milk"');
  });
});
