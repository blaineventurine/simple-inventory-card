import { CSSResult, css } from 'lit-element';

/** The item page (the card's detail view; see `templates/itemDetail`). */
export const itemDetailStyles: CSSResult = css`
  /* The columns follow the card's own width, not the window's. */
  .si-detail {
    container-type: inline-size;
  }

  .si-detail__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--si-space-2);
    margin-bottom: var(--si-space-3);
  }

  .si-detail__name {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    font-size: 22px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  .si-detail__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--si-space-4);
  }

  @container (min-width: 900px) {
    .si-detail__grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }
  }

  .si-detail__column {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-4);
    min-width: 0;
  }

  .si-detail__media {
    display: flex;
    justify-content: center;
  }

  .si-detail__photo-btn {
    width: 100%;
    padding: 0;
    border: none;
    border-radius: var(--si-radius);
    background: none;
    cursor: zoom-in;
  }

  .si-detail__photo-btn * {
    pointer-events: none;
  }

  .si-detail__photo-btn:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .si-detail__photo {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: var(--si-radius);
  }

  .si-detail__photo:not([src]) {
    visibility: hidden;
  }

  .si-detail__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: var(--si-radius);
    --mdc-icon-size: 96px;
  }

  .si-detail__facts {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-3);
    margin: 0;
  }

  .si-detail__fact {
    display: grid;
    grid-template-columns: minmax(96px, 30%) minmax(0, 1fr);
    align-items: center;
    gap: var(--si-space-2);
  }

  .si-detail__fact dt {
    color: var(--secondary-text-color);
    font-size: var(--si-font-secondary);
  }

  .si-detail__fact dd {
    display: flex;
    flex-wrap: wrap;
    gap: var(--si-space-1);
    margin: 0;
    overflow-wrap: anywhere;
  }

  .si-detail__fact dd[class*='si-tone-'] {
    color: var(--si-tone);
  }

  .si-detail__fact .si-stepper {
    justify-self: start;
  }

  .si-detail__section h3 {
    margin: 0 0 var(--si-space-2);
    font-size: 16px;
    font-weight: 500;
  }

  .si-detail__gone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--si-space-3);
    padding: 32px var(--si-space-4);
    color: var(--secondary-text-color);
    text-align: center;
  }

  .si-detail__gone p {
    margin: 0;
    font-size: var(--si-font-name);
  }
`;
