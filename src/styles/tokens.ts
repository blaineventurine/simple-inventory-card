import { CSSResult, css } from 'lit-element';

/**
 * Design tokens and the shared building-block classes (`si-*`) used by every surface.
 * Colours come only from Home Assistant theme variables; tints only via `--si-tone`.
 * Loaded first in `styles.ts` so surface styles can build on (never fight) these.
 */
export const tokenStyles: CSSResult = css`
  /* Visibility is toggled through the hidden attribute (and .show for sheets); this beats any
     plain class display rule. Only a more specific !important rule (the auto-add :checked
     sibling rule in forms.ts) still outranks it. */
  [hidden] {
    display: none !important;
  }

  :host {
    --si-radius: var(--ha-card-border-radius, 12px);
    --si-radius-pill: 999px;
    --si-space-1: 4px;
    --si-space-2: 8px;
    --si-space-3: 12px;
    --si-space-4: 16px;
    --si-font-name: 14px;
    --si-font-secondary: 12px;
    --si-font-title: 18px;
    --si-tap: 40px;
    --si-tap-row: 36px;
    --si-shadow-raised: 0 4px 16px rgba(0, 0, 0, 0.24);
    --si-motion: 200ms;
  }

  @media (pointer: coarse) {
    :host {
      --si-tap: 44px;
      --si-tap-row: 40px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :host {
      --si-motion: 0ms;
    }
  }

  .si-tone-primary {
    --si-tone: var(--primary-color);
  }

  .si-tone-warning {
    --si-tone: var(--warning-color, #ffa600);
  }

  .si-tone-error {
    --si-tone: var(--error-color, #db4437);
  }

  .si-tone-disabled {
    --si-tone: var(--disabled-text-color, #9e9e9e);
  }

  .si-tone-success {
    --si-tone: var(--success-color, #43a047);
  }

  .si-tint {
    color: var(--si-tone);
    background: color-mix(in srgb, var(--si-tone) 20%, transparent);
  }

  .si-icon-circle {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    --mdc-icon-size: 24px;
  }

  .si-icon-circle--small {
    width: 28px;
    height: 28px;
    --mdc-icon-size: 16px;
  }

  /* An item photo covering its icon circle; the icon shows until the photo has loaded. */
  .si-photo {
    position: relative;
    overflow: hidden;
  }

  .si-photo__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .si-photo__img:not([src]) {
    display: none;
  }

  .si-icon-btn,
  .si-tonal-btn,
  .si-filled-btn,
  .si-text-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--si-space-1);
    box-sizing: border-box;
    margin: 0;
    border: none;
    font: inherit;
    font-size: var(--si-font-name);
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color var(--si-motion) ease;
  }

  .si-icon-btn {
    flex-shrink: 0;
    width: var(--si-tap);
    height: var(--si-tap);
    padding: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--primary-text-color);
    --mdc-icon-size: 20px;
  }

  .si-icon-btn--row {
    width: var(--si-tap-row);
    height: var(--si-tap-row);
  }

  /* Hover only where a pointer can hover: on touch screens it would stick after a tap. */
  @media (hover: hover) {
    .si-icon-btn:hover,
    .si-stepper .si-icon-btn:hover {
      background: color-mix(in srgb, currentColor 8%, transparent);
    }
  }

  /* A tinted icon button (e.g. the round add button) keeps its tint on hover. */
  .si-icon-btn.si-tint {
    color: var(--si-tone);
    background: color-mix(in srgb, var(--si-tone) 20%, transparent);
  }

  .si-icon-btn:active {
    background: color-mix(in srgb, currentColor 12%, transparent);
  }

  .si-icon-btn.si-tint:active {
    background: color-mix(in srgb, var(--si-tone) 28%, transparent);
  }

  .si-icon-btn[disabled] {
    opacity: 0.38;
    cursor: not-allowed;
    background: transparent;
  }

  .si-tonal-btn,
  .si-filled-btn,
  .si-text-btn {
    min-height: var(--si-tap);
    padding: 0 var(--si-space-4);
    border-radius: var(--si-radius-pill);
    --mdc-icon-size: 18px;
  }

  .si-tonal-btn {
    --si-tone: var(--primary-color);
    color: var(--si-tone);
    background: color-mix(in srgb, var(--si-tone) 20%, transparent);
  }

  .si-filled-btn {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }

  .si-text-btn {
    background: transparent;
    color: var(--primary-color);
  }

  .si-tonal-btn[disabled],
  .si-filled-btn[disabled],
  .si-text-btn[disabled] {
    opacity: 0.38;
    cursor: not-allowed;
  }

  .si-chip {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--si-space-1);
    box-sizing: border-box;
    min-height: 32px;
    margin: 0;
    padding: 0 var(--si-space-3);
    border: none;
    border-radius: var(--si-radius-pill);
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
    color: var(--primary-text-color);
    font: inherit;
    font-size: calc(var(--si-font-secondary) + 1px);
    font-weight: 500;
    white-space: nowrap;
    transition: background-color var(--si-motion) ease;
    --mdc-icon-size: 16px;
  }

  .si-chip[class*='si-tone-'] {
    color: var(--si-tone);
    background: color-mix(in srgb, var(--si-tone) 20%, transparent);
  }

  button.si-chip {
    cursor: pointer;
  }

  .si-chip__remove.si-icon-btn {
    width: 20px;
    height: 20px;
    margin-right: calc(-1 * var(--si-space-1));
    color: inherit;
    --mdc-icon-size: 14px;
  }

  /* Inner parts pass the pointer through so the control itself is the click target
     (dispatch takes closest('[data-action]') anyway; this keeps :active and hit areas whole). */
  .si-icon-btn *,
  .si-tonal-btn *,
  .si-filled-btn *,
  .si-text-btn *,
  .si-chip > ha-icon,
  .si-chip__label {
    pointer-events: none;
  }

  .si-icon-btn:focus-visible,
  .si-tonal-btn:focus-visible,
  .si-filled-btn:focus-visible,
  .si-text-btn:focus-visible,
  .si-chip:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .si-stepper {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    border-radius: var(--si-radius-pill);
    --si-tone: var(--primary-color);
    color: var(--si-tone);
    background: color-mix(in srgb, var(--si-tone) 20%, transparent);
  }

  /* Stepper buttons take the stepper's tone. */
  .si-stepper .si-icon-btn {
    background: transparent;
    color: inherit;
  }

  .si-stepper .si-icon-btn:active {
    background: color-mix(in srgb, currentColor 12%, transparent);
  }

  .si-stepper .si-icon-btn[disabled] {
    opacity: 0.38;
    background: transparent;
  }

  /* Fixed-ish width so steppers line up; long units ellipsize (full text in the title). */
  .si-stepper__value {
    box-sizing: border-box;
    min-width: 3.5em;
    max-width: 7em;
    padding: 0 var(--si-space-1);
    overflow: hidden;
    font-size: var(--si-font-name);
    font-weight: 600;
    text-align: center;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--primary-text-color);
  }

  .si-secondary {
    overflow: hidden;
    color: var(--secondary-text-color);
    font-size: var(--si-font-secondary);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .si-secondary__part[class*='si-tone-'] {
    color: var(--si-tone);
    font-weight: 500;
  }

  /* A button whose action is running (withBusy). Overrides every [disabled] dimming, as the
     inline style it replaces did. */
  .si-busy {
    opacity: 0.6 !important;
    pointer-events: none;
  }
`;
