import { describe, it, expect } from 'vitest';
import {
  attrs,
  button,
  chip,
  formatQuantity,
  iconButton,
  iconCircle,
  photo,
  photoCircle,
  secondaryLine,
  stepper,
} from '../../src/templates/primitives';

function render(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function first(html: string): HTMLElement {
  const element = render(html).firstElementChild;
  if (!(element instanceof HTMLElement)) {
    throw new Error('nothing rendered');
  }
  return element;
}

const EVIL = '"><img src=x onerror=alert(1)>';

describe('attrs', () => {
  it('renders key="value" pairs in insertion order with a leading space each', () => {
    expect(attrs({ 'data-name': 'Milk', 'data-amount': 2, id: 'x' })).toBe(
      ' data-name="Milk" data-amount="2" id="x"',
    );
  });

  it('renders true as a bare attribute and omits false and undefined', () => {
    expect(attrs({ hidden: true, disabled: false, title: undefined })).toBe(' hidden');
  });

  it('escapes values', () => {
    expect(attrs({ 'data-name': EVIL })).toBe(
      ' data-name="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"',
    );
  });

  it('keeps zero and empty-string values', () => {
    expect(attrs({ 'data-amount': 0, title: '' })).toBe(' data-amount="0" title=""');
  });

  it('escapes keys', () => {
    expect(attrs({ [EVIL]: 'x' })).toBe(' &quot;&gt;&lt;img src=x onerror=alert(1)&gt;="x"');
  });

  it('renders nothing for no attributes', () => {
    expect(attrs({})).toBe('');
  });
});

describe('iconCircle', () => {
  it('renders a tinted circle with the icon and tone class', () => {
    const circle = first(iconCircle('mdi:apple', 'warning'));

    expect(circle.className).toBe('si-icon-circle si-tint si-tone-warning');
    expect(circle.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:apple');
  });

  it('adds the small modifier', () => {
    expect(first(iconCircle('mdi:apple', 'primary', true)).classList).toContain(
      'si-icon-circle--small',
    );
  });

  it('escapes the icon name', () => {
    const circle = render(iconCircle(EVIL, 'primary'));

    expect(circle.querySelector('img')).toBeNull();
    expect(circle.querySelector('ha-icon')?.getAttribute('icon')).toBe(EVIL);
  });
});

describe('photo', () => {
  it('renders an image for hydrateImages with the path, class and alt text', () => {
    const img = first(photo('/api/simple_inventory/image/a?v=1', undefined, 'x', 'Photo of A'));

    expect(img.tagName).toBe('IMG');
    expect(img.className).toBe('x');
    expect(img.getAttribute('alt')).toBe('Photo of A');
    expect(img.dataset.imagePath).toBe('/api/simple_inventory/image/a?v=1');
    expect(img.hasAttribute('src')).toBe(false);
  });

  it('sets src when the blob URL is known, and escapes everything', () => {
    const img = first(photo(EVIL, EVIL, 'x', EVIL));

    expect(img.getAttribute('src')).toBe(EVIL);
    expect(img.dataset.imagePath).toBe(EVIL);
    expect(img.getAttribute('alt')).toBe(EVIL);
  });
});

describe('photoCircle', () => {
  it('renders the tinted icon circle with the photo over the icon', () => {
    const circle = first(photoCircle('mdi:apple', 'warning', '/p?v=1', 'blob:x'));

    expect(circle.className).toBe('si-icon-circle si-photo si-tint si-tone-warning');
    expect(circle.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:apple');
    const img = circle.querySelector('img');
    expect(img?.className).toBe('si-photo__img');
    expect(img?.getAttribute('alt')).toBe('');
    expect(img?.getAttribute('src')).toBe('blob:x');
  });
});

describe('iconButton', () => {
  it('renders a typed button with aria-label, title, extra attributes and the icon', () => {
    expect(
      iconButton({
        icon: 'mdi:plus',
        label: 'Add',
        className: 'extra',
        attrs: { 'data-action': 'increment', 'data-name': 'Milk' },
      }),
    ).toBe(
      '<button type="button" class="si-icon-btn extra" aria-label="Add" title="Add" data-action="increment" data-name="Milk"><ha-icon icon="mdi:plus"></ha-icon></button>',
    );
  });

  it('takes a tooltip apart from the label, escaped', () => {
    const button = first(
      iconButton({ icon: 'mdi:view-grid-outline', label: 'Layout', title: '<b>' }),
    );

    expect(button.getAttribute('aria-label')).toBe('Layout');
    expect(button.getAttribute('title')).toBe('<b>');
    expect(button.querySelector('b')).toBeNull();
  });

  it('adds the row modifier and the disabled attribute', () => {
    const button = first(
      iconButton({ icon: 'mdi:minus', label: 'Less', row: true, disabled: true }),
    );

    expect(button.className).toBe('si-icon-btn si-icon-btn--row');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('escapes the label and attribute values', () => {
    const container = render(
      iconButton({ icon: 'mdi:plus', label: EVIL, attrs: { 'data-name': EVIL } }),
    );
    const button = container.querySelector('button');

    expect(container.querySelector('img')).toBeNull();
    expect(button?.getAttribute('aria-label')).toBe(EVIL);
    expect(button?.getAttribute('title')).toBe(EVIL);
    expect(button?.dataset.name).toBe(EVIL);
  });
});

describe('button', () => {
  it('renders each kind with its class and the label as text', () => {
    for (const kind of ['tonal', 'filled', 'text'] as const) {
      const element = first(button({ kind, label: 'Save' }));

      expect(element.tagName).toBe('BUTTON');
      expect(element.getAttribute('type')).toBe('button');
      expect(element.className).toBe(`si-${kind}-btn`);
      expect(element.textContent).toBe('Save');
    }
  });

  it('puts the icon before the label and passes class, attributes and disabled', () => {
    expect(
      button({
        kind: 'tonal',
        label: 'Restock',
        icon: 'mdi:plus',
        className: 'restock-open-btn',
        disabled: true,
        attrs: { 'data-action': 'open_restock' },
      }),
    ).toBe(
      '<button type="button" class="si-tonal-btn restock-open-btn" data-action="open_restock" disabled><ha-icon icon="mdi:plus"></ha-icon>Restock</button>',
    );
  });

  it('escapes the label', () => {
    const container = render(button({ kind: 'filled', label: EVIL }));

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe(EVIL);
  });

  it('renders no icon without one', () => {
    expect(first(button({ kind: 'tonal', label: 'Save' })).querySelector('ha-icon')).toBeNull();
  });

  it('escapes the class name', () => {
    const container = render(button({ kind: 'text', label: 'Save', className: EVIL }));

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('button')?.className).toBe(`si-text-btn ${EVIL}`);
  });
});

describe('chip', () => {
  it('is a span without an action or id', () => {
    const element = first(chip({ label: 'Pantry' }));

    expect(element.tagName).toBe('SPAN');
    expect(element.className).toBe('si-chip');
    expect(element.textContent).toBe('Pantry');
  });

  it('is a typed button with an action or an id', () => {
    const withAction = first(chip({ label: 'Sort', attrs: { 'data-action': 'sort' } }));
    const withId = first(chip({ label: 'Expired', attrs: { id: 'expired-badge' } }));

    for (const element of [withAction, withId]) {
      expect(element.tagName).toBe('BUTTON');
      expect(element.getAttribute('type')).toBe('button');
    }
    expect(withId.id).toBe('expired-badge');
  });

  it('adds tone, icon and class', () => {
    const element = first(chip({ label: '2', icon: 'mdi:alert', tone: 'error', className: 'x' }));

    expect(element.className).toBe('si-chip si-tone-error x');
    expect(element.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:alert');
  });

  it('renders no icon without one', () => {
    expect(first(chip({ label: 'Pantry' })).querySelector('ha-icon')).toBeNull();
  });

  it('renders a remove icon button with its own attributes', () => {
    const remove = first(
      chip({
        label: 'Pantry',
        remove: { label: 'Remove Pantry', attrs: { 'data-filter': 'location' } },
      }),
    ).querySelector('button');

    expect(remove?.classList).toContain('si-chip__remove');
    expect(remove?.getAttribute('aria-label')).toBe('Remove Pantry');
    expect(remove?.dataset.filter).toBe('location');
    expect(remove?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:close');
  });

  it('is a span with a remove button, even with an action or id, so buttons never nest', () => {
    const element = first(
      chip({
        label: 'Pantry',
        attrs: { 'data-action': 'filter', id: 'pantry-chip' },
        remove: { label: 'Remove Pantry', attrs: { 'data-filter': 'location' } },
      }),
    );

    expect(element.tagName).toBe('SPAN');
    expect(element.hasAttribute('type')).toBe(false);
    expect(element.id).toBe('pantry-chip');
    expect(element.querySelectorAll('button')).toHaveLength(1);
  });

  it('escapes the label', () => {
    const container = render(chip({ label: EVIL }));

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe(EVIL);
  });
});

describe('stepper', () => {
  const base = {
    unit: 'jar',
    decrementLabel: 'Less',
    incrementLabel: 'More',
    attrs: { 'data-name': 'Jam' },
  };

  it('renders −, the formatted quantity with unit, and +, both buttons keeping the control-btn hook', () => {
    const element = first(stepper({ ...base, quantity: 2.5 }));
    const [minus, plus] = [...element.querySelectorAll('button')];

    expect(element.className).toBe('si-stepper');
    expect(element.querySelector('.si-stepper__value')?.textContent).toBe('2.5 jar');
    expect([minus.dataset.action, minus.dataset.name, minus.getAttribute('aria-label')]).toEqual([
      'decrement',
      'Jam',
      'Less',
    ]);
    expect([plus.dataset.action, plus.dataset.name, plus.getAttribute('aria-label')]).toEqual([
      'increment',
      'Jam',
      'More',
    ]);
    for (const button of [minus, plus]) {
      expect(button.classList).toContain('control-btn');
      expect(button.classList).toContain('si-icon-btn--row');
    }
    expect(minus.hasAttribute('disabled')).toBe(false);
  });

  it('disables − at zero and below', () => {
    for (const quantity of [0, -1]) {
      const minus = first(stepper({ ...base, quantity })).querySelector(
        '[data-action="decrement"]',
      );
      expect(minus?.hasAttribute('disabled')).toBe(true);
    }
  });

  it('shows the bare quantity without a unit', () => {
    const value = first(stepper({ ...base, unit: '', quantity: 8 })).querySelector(
      '.si-stepper__value',
    );

    expect(value?.textContent).toBe('8');
  });

  it('puts the full, escaped quantity and unit in the value title', () => {
    const value = first(stepper({ ...base, unit: `g ${EVIL}`, quantity: 460 })).querySelector(
      '.si-stepper__value',
    );

    expect(value?.getAttribute('title')).toBe(`460 g ${EVIL}`);
    expect(value?.querySelector('img')).toBeNull();
  });

  it('escapes the unit and the passed attributes', () => {
    const container = render(
      stepper({ ...base, unit: EVIL, attrs: { 'data-name': EVIL }, quantity: 1 }),
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector<HTMLElement>('[data-action="increment"]')?.dataset.name).toBe(
      EVIL,
    );
  });
});

describe('secondaryLine', () => {
  it('is empty when there are no non-empty parts', () => {
    expect(secondaryLine([])).toBe('');
    expect(secondaryLine([{ text: '' }, { text: '   ' }])).toBe('');
  });

  it('joins non-empty parts with a dot separator', () => {
    const line = first(secondaryLine([{ text: 'Pantry' }, { text: '' }, { text: 'Spreads' }]));

    expect(line.className).toBe('si-secondary');
    expect(line.textContent).toBe('Pantry · Spreads');
    expect(line.querySelectorAll('.si-sep')).toHaveLength(1);
    expect(line.querySelector('.si-sep')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('gives toned parts their tone class and keeps their own class', () => {
    const line = first(
      secondaryLine([
        { text: 'Pantry' },
        { text: 'Expired 2 days ago', tone: 'error', className: 'expiry expired' },
      ]),
    );
    const [plain, toned] = [...line.querySelectorAll('.si-secondary__part')];

    expect(plain.className).toBe('si-secondary__part');
    expect(toned.className).toBe('si-secondary__part expiry expired si-tone-error');
  });

  it('escapes part text', () => {
    const container = render(secondaryLine([{ text: EVIL }]));

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe(EVIL);
  });
});

describe('formatQuantity', () => {
  it.each([
    [2.5, '2.5'],
    [8, '8'],
    [0.125, '0.125'],
    [4 / 3, '1.333333'],
    [1.3333333, '1.333333'],
    [0.0004, '0.0004'],
    [0.000001, '0.000001'],
    [0.0000004, '0'],
    [2.0, '2'],
    [0, '0'],
    [-1.5, '-1.5'],
    [0.1 + 0.2, '0.3'],
    [1.25, '1.25'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatQuantity(value)).toBe(expected);
  });
});
