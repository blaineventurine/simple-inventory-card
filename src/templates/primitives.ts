import { Utilities } from '@/utils/utilities';

/** Status/intent colour of a building block; maps to a `.si-tone-*` class in tokens.ts. */
export type Tone = 'primary' | 'warning' | 'error' | 'disabled' | 'success';

/**
 * HTML attributes keyed by their full name (`data-name`, `aria-controls`, …).
 * `true` renders a bare attribute; `false` and `undefined` omit it.
 */
export type Attrs = Record<string, string | number | boolean | undefined>;

/** Joins the non-empty class names, escaped for a double-quoted attribute. */
function classes(...names: Array<string | false | undefined>): string {
  return Utilities.sanitizeHtml(
    names.filter((name): name is string => typeof name === 'string' && name !== '').join(' '),
  );
}

/** Serialises attributes as ` key="value"` pairs in insertion order, keys and values escaped. */
export function attrs(a: Attrs): string {
  return Object.entries(a)
    .map(([key, value]) => {
      if (value === undefined || value === false) {
        return '';
      }
      const name = Utilities.sanitizeHtml(key);
      return value === true ? ` ${name}` : ` ${name}="${Utilities.sanitizeHtml(String(value))}"`;
    })
    .join('');
}

function icon(name: string): string {
  return `<ha-icon icon="${Utilities.sanitizeHtml(name)}"></ha-icon>`;
}

/** Tinted round icon (40px, or 28px when `small`). */
export function iconCircle(iconName: string, tone: Tone, small = false): string {
  return `<span class="${classes('si-icon-circle', small && 'si-icon-circle--small', 'si-tint', `si-tone-${tone}`)}">${icon(iconName)}</span>`;
}

/**
 * Item image `<img>` for `hydrateImages`: `path` is the integration path (`itemImagePath`), `src`
 * the blob URL when the image is already loaded (no flash of the empty image on re-renders).
 */
export function photo(path: string, src: string | undefined, className: string, alt = ''): string {
  return `<img class="${classes(className)}" alt="${Utilities.sanitizeHtml(alt)}" data-image-path="${Utilities.sanitizeHtml(path)}"${src === undefined ? '' : ` src="${Utilities.sanitizeHtml(src)}"`}>`;
}

/** `iconCircle` with the item's photo over the icon; the icon shows until the photo has loaded. */
export function photoCircle(
  iconName: string,
  tone: Tone,
  path: string,
  src: string | undefined,
): string {
  return `<span class="${classes('si-icon-circle', 'si-photo', 'si-tint', `si-tone-${tone}`)}">${icon(iconName)}${photo(path, src, 'si-photo__img')}</span>`;
}

/**
 * Round transparent icon button; `label` becomes its aria-label and its tooltip (`title`, unless
 * given apart, e.g. a toggle whose constant label names the setting and whose tooltip the action).
 */
export function iconButton(o: {
  icon: string;
  label: string;
  title?: string | undefined;
  className?: string | undefined;
  row?: boolean | undefined;
  disabled?: boolean | undefined;
  attrs?: Attrs | undefined;
}): string {
  const label = Utilities.sanitizeHtml(o.label);
  const title = o.title === undefined ? label : Utilities.sanitizeHtml(o.title);
  return `<button type="button" class="${classes('si-icon-btn', o.row === true && 'si-icon-btn--row', o.className)}" aria-label="${label}" title="${title}"${attrs(o.attrs ?? {})}${o.disabled === true ? ' disabled' : ''}>${icon(o.icon)}</button>`;
}

/** Pill button: tonal (secondary action), filled (the one main action) or text. */
export function button(o: {
  kind: 'tonal' | 'filled' | 'text';
  label: string;
  icon?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  attrs?: Attrs | undefined;
}): string {
  return `<button type="button" class="${classes(`si-${o.kind}-btn`, o.className)}"${attrs(o.attrs ?? {})}${o.disabled === true ? ' disabled' : ''}>${o.icon ? icon(o.icon) : ''}${Utilities.sanitizeHtml(o.label)}</button>`;
}

/**
 * Pill chip; a `<button>` when it carries an action or id, a `<span>` otherwise.
 * `remove` adds an inner ✕ icon button with its own attributes; the chip is then always a
 * `<span>`, because a button must not contain another button.
 */
export function chip(o: {
  label: string;
  icon?: string | undefined;
  tone?: Tone | undefined;
  className?: string | undefined;
  attrs?: Attrs | undefined;
  remove?: { label: string; attrs: Attrs } | undefined;
}): string {
  const a = o.attrs ?? {};
  const tag =
    o.remove === undefined && (a['data-action'] !== undefined || a['id'] !== undefined)
      ? 'button'
      : 'span';
  const type = tag === 'button' ? ' type="button"' : '';
  const remove = o.remove
    ? iconButton({
        icon: 'mdi:close',
        label: o.remove.label,
        className: 'si-chip__remove',
        attrs: o.remove.attrs,
      })
    : '';
  return `<${tag}${type} class="${classes('si-chip', o.tone && `si-tone-${o.tone}`, o.className)}"${attrs(a)}>${o.icon ? icon(o.icon) : ''}<span class="si-chip__label">${Utilities.sanitizeHtml(o.label)}</span>${remove}</${tag}>`;
}

/** Quantity pill: − (disabled at 0), quantity + unit, +. Both buttons keep the `control-btn` hook. */
export function stepper(o: {
  quantity: number;
  unit?: string | undefined;
  decrementLabel: string;
  incrementLabel: string;
  attrs: Attrs;
}): string {
  const value = Utilities.sanitizeHtml(`${formatQuantity(o.quantity)} ${o.unit ?? ''}`.trim());
  return `<div class="si-stepper">${iconButton({
    icon: 'mdi:minus',
    label: o.decrementLabel,
    className: 'control-btn',
    row: true,
    disabled: o.quantity <= 0,
    attrs: { ...o.attrs, 'data-action': 'decrement' },
  })}<span class="si-stepper__value" title="${value}">${value}</span>${iconButton({
    icon: 'mdi:plus',
    label: o.incrementLabel,
    className: 'control-btn',
    row: true,
    attrs: { ...o.attrs, 'data-action': 'increment' },
  })}</div>`;
}

/** One part of a secondary line. */
export interface SecondaryPart {
  text: string;
  tone?: Tone | undefined;
  className?: string | undefined;
}

/** One dot-separated secondary line; '' when every part is empty. */
export function secondaryLine(parts: SecondaryPart[]): string {
  const rendered = parts
    .filter((part) => part.text.trim() !== '')
    .map(
      (part) =>
        `<span class="${classes('si-secondary__part', part.className, part.tone && `si-tone-${part.tone}`)}">${Utilities.sanitizeHtml(part.text)}</span>`,
    );
  if (rendered.length === 0) {
    return '';
  }
  return `<div class="si-secondary">${rendered.join('<span class="si-sep" aria-hidden="true"> · </span>')}</div>`;
}

/** Up to 6 decimals (the integration's precision), trailing zeros stripped: 2.5, 8, 0.0004. */
export function formatQuantity(n: number): string {
  return String(Number(n.toFixed(6)));
}
