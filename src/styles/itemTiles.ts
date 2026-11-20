import { CSSResult, css } from 'lit-element';

/**
 * Tile layout: `.si-tiles` is the grid of one list (or of one category/location group, whose
 * header sits above the grid and so spans the full width). Tiles keep the `.item-row` hook, so
 * they get the row's hover and out-of-stock dimming.
 */
export const itemTileStyles: CSSResult = css`
  .si-tiles {
    display: grid;
    /* 160px tiles (2 on a phone, 4 in the panel), but never fewer than 2 columns, so narrow
       dashboard columns still get two tiles per row (each half minus half the gap). */
    grid-template-columns: repeat(
      auto-fill,
      minmax(min(160px, calc(50% - var(--si-space-1))), 1fr)
    );
    gap: var(--si-space-2);
    margin-bottom: var(--si-space-2);
  }

  .si-tile {
    gap: var(--si-space-1);
    min-width: 0;
    margin-bottom: 0;
    padding: var(--si-space-2);
    border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
    box-sizing: border-box;
  }

  .si-tile__open {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-1);
    border-radius: calc(var(--si-radius) - 4px);
    cursor: pointer;
  }

  .si-tile__open * {
    pointer-events: none;
  }

  .si-tile__open:active {
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  }

  .si-tile__open:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .si-tile__media {
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: calc(var(--si-radius) - 4px);
    background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
  }

  .si-tile__photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .si-tile__icon {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    --mdc-icon-size: 48px;
  }

  .si-tile__badge {
    position: absolute;
    top: 6px;
    right: 6px;
    max-width: calc(100% - 12px);
    padding: 2px 8px;
    overflow: hidden;
    border-radius: var(--si-radius-pill);
    background: var(--si-tone);
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* Text colours per tone, for at least 4.5:1 on the theme's default status colours: dark text on
     the light warning colour; white text on the error colour darkened by a fifth. */
  .si-tile__badge.si-tone-warning {
    color: rgba(0, 0, 0, 0.87);
  }

  .si-tile__badge.si-tone-error {
    background: color-mix(in srgb, var(--si-tone) 80%, #000);
    color: #fff;
  }

  .si-tile__name {
    display: -webkit-box;
    overflow: hidden;
    color: var(--primary-text-color);
    font-size: var(--si-font-name);
    font-weight: 500;
    line-height: 1.25;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .si-tile .si-stepper {
    align-self: stretch;
    justify-content: space-between;
    margin-top: auto;
  }
`;
