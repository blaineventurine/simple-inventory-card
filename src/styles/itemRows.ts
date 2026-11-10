import { CSSResult, css } from 'lit-element';

export const itemRowStyles: CSSResult = css`
  .item-row {
    display: flex;
    flex-direction: column;
    margin-bottom: var(--si-space-1);
    border-radius: var(--si-radius);
    transition: background-color var(--si-motion) ease;
  }

  @media (hover: hover) {
    .item-row:hover {
      background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
    }
  }

  .item-row.zero-quantity {
    opacity: 0.6;
  }

  .si-row__main {
    display: flex;
    align-items: center;
    gap: var(--si-space-1);
    min-height: 56px;
    padding: var(--si-space-2);
    box-sizing: border-box;
  }

  /* show_icon: false, or a photo in the circle — the status colour the icon circle carried
     becomes a short bar at the row's left edge, for expired and expiring/low rows only. */
  .si-row--no-icon .si-row__main,
  .si-row--photo .si-row__main {
    position: relative;
  }

  .si-row--no-icon .si-row__main {
    padding-left: var(--si-space-3);
  }

  .si-row--no-icon[data-status='expired'] .si-row__main::before,
  .si-row--no-icon[data-status='warning'] .si-row__main::before,
  .si-row--photo[data-status='expired'] .si-row__main::before,
  .si-row--photo[data-status='warning'] .si-row__main::before {
    position: absolute;
    top: var(--si-space-2);
    bottom: var(--si-space-2);
    left: 0;
    width: 3px;
    border-radius: 3px;
    background: var(--si-status-bar);
    content: '';
  }

  .si-row--no-icon[data-status='expired'],
  .si-row--photo[data-status='expired'] {
    --si-status-bar: var(--error-color, #db4437);
  }

  .si-row--no-icon[data-status='warning'],
  .si-row--photo[data-status='warning'] {
    --si-status-bar: var(--warning-color, #ffa600);
  }

  .si-row__open {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: var(--si-space-3);
    min-width: 0;
    border-radius: var(--si-radius);
    cursor: pointer;
  }

  /* The whole icon + text area is one open_edit target: route inner clicks to it. */
  .si-row__open * {
    pointer-events: none;
  }

  .si-row__open:active {
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  }

  .si-row__open:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .si-row__text {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  /* Names wrap to two lines before truncating: the stepper keeps its width, so on
     phones and narrow columns a single line left only a few characters. */
  .si-row__name {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    color: var(--primary-text-color);
    font-size: var(--si-font-name);
    font-weight: 500;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .si-row__chevron {
    color: var(--secondary-text-color);
  }

  .si-row__chevron ha-icon {
    transition: transform var(--si-motion) ease;
  }

  .si-row__chevron[aria-expanded='true'] ha-icon {
    transform: rotate(180deg);
  }

  .si-details {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-2);
    padding: 0 var(--si-space-2) var(--si-space-2)
      calc(var(--si-space-2) + 40px + var(--si-space-3));
  }

  /* The details image opens the photo viewer. */
  .si-details__image-btn {
    align-self: flex-start;
    width: 100%;
    max-width: 160px;
    padding: 0;
    border: none;
    border-radius: var(--si-radius);
    background: none;
    cursor: zoom-in;
  }

  .si-details__image-btn * {
    pointer-events: none;
  }

  .si-details__image-btn:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .si-details__image {
    display: block;
    width: 100%;
    max-width: 160px;
    height: auto;
    border-radius: var(--si-radius);
  }

  .si-details__image:not([src]) {
    display: none;
  }

  .si-details__description {
    margin: 0;
    color: var(--secondary-text-color);
    font-size: var(--si-font-secondary);
  }

  .si-details__auto-add {
    display: flex;
    align-items: center;
    gap: var(--si-space-1);
    color: var(--secondary-text-color);
    font-size: var(--si-font-secondary);
    --mdc-icon-size: 16px;
  }
`;
