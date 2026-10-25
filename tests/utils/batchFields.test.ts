import { describe, it, expect, vi } from 'vitest';
import { batchFields, batchLocationOptions } from '../../src/templates/modalPartials/batchFields';
import {
  batchFieldValue,
  firstLocation,
  isIsoDate,
  readRestockFields,
} from '../../src/utils/batchFields';
import { BATCH_FIELDS, ELEMENTS } from '../../src/utils/constants';

vi.mock('../../src/services/translationManager', () => import('../mocks/translationManager'));

function render(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function setField(container: HTMLElement, field: string, value: string): void {
  const input = container.querySelector(`[data-batch-field="${field}"]`);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`missing ${field} input`);
  }
  input.value = value;
}

describe('batchFields', () => {
  it('renders expiry, location, unit price and purchase date inputs', () => {
    const container = render(batchFields({}));

    expect(
      container.querySelector(`input[type="date"][data-batch-field="${BATCH_FIELDS.EXPIRY_DATE}"]`),
    ).not.toBeNull();
    expect(
      container
        .querySelector(`[data-batch-field="${BATCH_FIELDS.LOCATION}"]`)
        ?.getAttribute('list'),
    ).toBe(ELEMENTS.BATCH_LOCATION_OPTIONS);
    expect(
      container.querySelector(
        `input[type="number"][data-batch-field="${BATCH_FIELDS.UNIT_PRICE}"]`,
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        `input[type="date"][data-batch-field="${BATCH_FIELDS.PURCHASED_AT}"]`,
      ),
    ).not.toBeNull();
    expect(container.querySelectorAll('label.batch-field')).toHaveLength(4);
  });

  it('hints at the default location only for new stock', () => {
    const blank = render(batchFields({}));
    const existing = render(batchFields({}, { location: '' }));

    const hint = (container: HTMLElement): string | null | undefined =>
      container
        .querySelector(`[data-batch-field="${BATCH_FIELDS.LOCATION}"]`)
        ?.getAttribute('placeholder');
    expect(hint(blank)).toBe('Default: first usual location');
    expect(hint(existing)).toBeNull();
  });

  it('pre-fills the values of an existing batch', () => {
    const container = render(
      batchFields(
        {},
        {
          expiry_date: '2026-11-01',
          location: 'Fridge',
          unit_price: 2.5,
          purchased_at: '2026-10-01',
        },
      ),
    );

    expect(batchFieldValue(container, BATCH_FIELDS.EXPIRY_DATE)).toBe('2026-11-01');
    expect(batchFieldValue(container, BATCH_FIELDS.LOCATION)).toBe('Fridge');
    expect(batchFieldValue(container, BATCH_FIELDS.UNIT_PRICE)).toBe('2.5');
    expect(batchFieldValue(container, BATCH_FIELDS.PURCHASED_AT)).toBe('2026-10-01');
  });

  it('shows an unknown (0) unit price as blank', () => {
    const container = render(batchFields({}, { unit_price: 0 }));

    expect(batchFieldValue(container, BATCH_FIELDS.UNIT_PRICE)).toBe('');
  });

  it('escapes location values', () => {
    const container = render(batchFields({}, { location: '"><script>x</script>' }));

    expect(container.querySelector('script')).toBeNull();
    expect(batchFieldValue(container, BATCH_FIELDS.LOCATION)).toBe('"><script>x</script>');
  });
});

describe('batchLocationOptions', () => {
  it('lists every known location in the shared datalist', () => {
    const container = render(batchLocationOptions(['Fridge', 'Garage']));

    const values = [
      ...container.querySelectorAll(`datalist#${ELEMENTS.BATCH_LOCATION_OPTIONS} option`),
    ].map((option) => option.getAttribute('value'));
    expect(values).toEqual(['Fridge', 'Garage']);
  });

  it('escapes location option values', () => {
    const container = render(batchLocationOptions(['"><script>x</script>']));

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('option')?.getAttribute('value')).toBe('"><script>x</script>');
  });
});

describe('readRestockFields', () => {
  it('returns only the fields the user filled in, trimmed', () => {
    const container = render(batchFields({}));
    setField(container, BATCH_FIELDS.EXPIRY_DATE, '2026-11-01');
    setField(container, BATCH_FIELDS.LOCATION, '  Garage ');

    expect(readRestockFields(container)).toEqual({ expiryDate: '2026-11-01', location: 'Garage' });
  });

  it('reads a positive unit price and the purchase date', () => {
    const container = render(batchFields({}));
    setField(container, BATCH_FIELDS.UNIT_PRICE, '1.5');
    setField(container, BATCH_FIELDS.PURCHASED_AT, '2026-10-20');

    expect(readRestockFields(container)).toEqual({ price: 1.5, purchasedAt: '2026-10-20' });
  });

  it('treats a zero unit price as unknown', () => {
    const container = render(batchFields({}));
    setField(container, BATCH_FIELDS.UNIT_PRICE, '0');

    expect(readRestockFields(container)).toEqual({});
  });

  it('is empty when the container has no batch inputs', () => {
    expect(readRestockFields(document.createElement('div'))).toEqual({});
    expect(batchFieldValue(document.createElement('div'), BATCH_FIELDS.LOCATION)).toBe('');
  });
});

describe('isIsoDate', () => {
  it.each(['2026-10-25', '2028-02-29'])('accepts the calendar date %s', (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each(['', '2026-02-30', '2027-02-29', '2026-13-01', '25/10/2026', '2026-1-5', 'today'])(
    'rejects %j',
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    },
  );
});

describe('firstLocation', () => {
  it.each([
    ['Pantry, Fridge', 'Pantry'],
    [' , Garage ,Pantry', 'Garage'],
    ['', ''],
    [' , ', ''],
  ])('reads %j as %j', (value, expected) => {
    expect(firstLocation(value)).toBe(expected);
  });
});
