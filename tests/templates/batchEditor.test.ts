import { describe, it, expect, vi } from 'vitest';
import { createBatchEditorRows, createNewBatchRow } from '../../src/templates/batchEditor';
import { InventoryBatch } from '../../src/types/inventory';
import { batchFieldValue } from '../../src/utils/batchFields';
import { BATCH_FIELDS } from '../../src/utils/constants';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

const FRIDGE: InventoryBatch = {
  id: 'b1',
  quantity: 2,
  expiry_date: '2026-11-01',
  location: 'Fridge',
  unit_price: 1.5,
  purchased_at: '2026-10-01',
};
const GARAGE: InventoryBatch = {
  id: 'b2',
  quantity: 1,
  expiry_date: '',
  location: 'Garage',
  unit_price: 0,
  purchased_at: '2026-10-20',
};

describe('createBatchEditorRows', () => {
  it('renders one row per batch with its current values and a remove toggle', () => {
    const container = document.createElement('div');
    container.innerHTML = createBatchEditorRows([FRIDGE, GARAGE], {});
    const rows = container.querySelectorAll('.batch-editor-row');

    expect([...rows].map((row) => row.getAttribute('data-batch-id'))).toEqual(['b1', 'b2']);
    expect(batchFieldValue(rows[0], BATCH_FIELDS.QUANTITY)).toBe('2');
    expect(batchFieldValue(rows[0], BATCH_FIELDS.EXPIRY_DATE)).toBe('2026-11-01');
    expect(batchFieldValue(rows[0], BATCH_FIELDS.LOCATION)).toBe('Fridge');
    expect(batchFieldValue(rows[0], BATCH_FIELDS.UNIT_PRICE)).toBe('1.5');
    expect(batchFieldValue(rows[0], BATCH_FIELDS.PURCHASED_AT)).toBe('2026-10-01');
    expect(batchFieldValue(rows[1], BATCH_FIELDS.UNIT_PRICE)).toBe('');
    const remove = rows[0].querySelector('.batch-remove-btn');
    expect(remove?.getAttribute('data-batch-remove')).toBe('b1');
    expect(remove?.hasAttribute('aria-pressed')).toBe(false);
    expect(remove?.getAttribute('type')).toBe('button');
  });

  it('explains how to add stock when there are no batches', () => {
    expect(createBatchEditorRows([], {})).toContain(
      'No stock. Use Restock… on the item row to add a batch.',
    );
  });

  it('ends with an add-batch button, also when there are no batches', () => {
    for (const batches of [[FRIDGE, GARAGE], []]) {
      const container = document.createElement('div');
      container.innerHTML = createBatchEditorRows(batches, {});
      const add = container.lastElementChild;

      expect(add?.classList.contains('batch-add-btn')).toBe(true);
      expect(add?.hasAttribute('data-batch-add')).toBe(true);
      expect(add?.getAttribute('type')).toBe('button');
      expect(add?.textContent?.trim()).toBe('+ Add batch');
    }
  });
});

describe('createNewBatchRow', () => {
  it('renders blank batch inputs with a required quantity and a discard button', () => {
    const container = document.createElement('div');
    container.innerHTML = createNewBatchRow('new-1', {});
    const row = container.querySelector<HTMLElement>('.batch-editor-row');

    expect(row?.dataset.newBatch).toBe('new-1');
    expect(row?.classList.contains('batch-editor-row-new')).toBe(true);
    for (const field of Object.values(BATCH_FIELDS).filter((name) => name !== 'amount')) {
      expect(row?.querySelector(`[data-batch-field="${field}"]`), field).not.toBeNull();
      expect(batchFieldValue(container, field)).toBe('');
    }
    expect(
      row?.querySelector(`[data-batch-field="${BATCH_FIELDS.QUANTITY}"]`)?.hasAttribute('required'),
    ).toBe(true);
    expect(
      row?.querySelector(`[data-batch-field="${BATCH_FIELDS.LOCATION}"]`)?.getAttribute('list'),
    ).toBe('batch-location-options');
    const discard = row?.querySelector('.batch-discard-btn');
    expect(discard?.getAttribute('data-batch-discard')).toBe('new-1');
    expect(discard?.getAttribute('type')).toBe('button');
    expect(discard?.getAttribute('aria-label')).toBe('Discard new batch');
    const note = row?.querySelector<HTMLElement>('.batch-merge-note');
    expect(note?.hidden).toBe(true);
    expect(note?.getAttribute('role')).toBe('status');
  });
});
