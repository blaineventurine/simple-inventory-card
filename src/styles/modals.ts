import { CSSResult, css } from 'lit-element';

export const modalStyles: CSSResult = css`
  /* Every .modal is a sheet (templates/sheet.ts): the overlay holding the panel. */
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: var(--mdc-dialog-scrim-color, rgba(0, 0, 0, 0.32));
  }

  .modal.show {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal.si-sheet.show {
    animation: si-sheet-fade var(--si-motion, 200ms) ease-out;
  }

  .si-sheet .si-sheet__panel {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: calc(100% - 32px);
    max-width: 560px;
    max-height: 85vh;
    max-height: 85dvh;
    overflow: hidden;
    border-radius: var(--si-radius);
    background: var(--card-background-color);
    box-shadow: var(--ha-dialog-box-shadow, 0 8px 28px rgba(0, 0, 0, 0.28));
    animation: si-sheet-pop var(--si-motion, 200ms) ease-out;
  }

  /* Focused by script on open (tabindex=-1); the ring belongs to the controls inside. */
  .si-sheet .si-sheet__panel:focus {
    outline: none;
  }

  .si-sheet__header {
    display: flex;
    align-items: center;
    gap: var(--si-space-2);
    padding: var(--si-space-3) var(--si-space-2) var(--si-space-2) var(--si-space-4);
  }

  .si-sheet__title {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: var(--si-font-title);
    font-weight: 600;
    color: var(--primary-text-color);
    overflow-wrap: anywhere;
  }

  .si-sheet__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--si-space-1) var(--si-space-4) var(--si-space-4);
  }

  .si-sheet__actions {
    display: flex;
    align-items: center;
    gap: var(--si-space-2);
    padding: var(--si-space-3) var(--si-space-4);
    border-top: 1px solid var(--divider-color);
  }

  .si-sheet__spacer {
    flex: 1;
  }

  .si-sheet__menu {
    position: relative;
  }

  .si-sheet__menu > summary {
    list-style: none;
  }

  .si-sheet__menu > summary::-webkit-details-marker {
    display: none;
  }

  .si-sheet__menu-list {
    position: absolute;
    bottom: calc(100% + var(--si-space-1));
    left: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    padding: var(--si-space-1) 0;
    border: 1px solid var(--divider-color);
    border-radius: var(--si-radius);
    background: var(--card-background-color);
    box-shadow: var(--si-shadow-raised);
  }

  .si-sheet__menu-item {
    display: flex;
    justify-content: flex-start;
    gap: var(--si-space-3);
    width: 100%;
    min-height: 44px;
    padding: 0 var(--si-space-4);
    border-radius: 0;
    color: var(--primary-text-color);
  }

  .si-sheet__menu-item.si-tone-error {
    color: var(--si-tone);
  }

  .duplicate-batch-offer {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--si-space-2);
    margin-bottom: var(--si-space-3);
    padding: var(--si-space-3);
    border-radius: var(--si-radius);
  }

  .batch-editor {
    display: flex;
    flex-direction: column;
    gap: var(--si-space-2);
  }

  .batch-editor-row {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--si-space-2);
    padding: var(--si-space-3);
    border-radius: var(--si-radius);
    background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
  }

  .batch-editor-row.batch-removed .batch-editor-fields {
    opacity: 0.5;
    text-decoration: line-through;
  }

  .batch-editor-row-new {
    padding-right: calc(var(--si-tap-row) + var(--si-space-3));
    box-shadow: inset 2px 0 0 var(--primary-color);
  }

  .batch-discard-btn {
    position: absolute;
    top: var(--si-space-1);
    right: var(--si-space-1);
  }

  .batch-remove-btn {
    align-self: flex-start;
    color: var(--error-color, #db4437);
  }

  .batch-add-btn {
    align-self: flex-start;
  }

  .batch-editor-empty,
  .batch-merge-note,
  .duplicate-batch-note {
    margin: 0;
    font-size: var(--si-font-secondary);
    color: var(--secondary-text-color);
  }

  /*
   * Full-screen photo viewer (services/imageViewer.ts), above the sheets. It always fades in;
   * the image's zoom-in follows --si-motion, which is 0 with reduced motion.
   */
  .si-viewer {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 1001;
    box-sizing: border-box;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--si-space-2);
    padding: calc(env(safe-area-inset-top, 0px) + var(--si-tap) + var(--si-space-3))
      calc(env(safe-area-inset-right, 0px) + var(--si-space-4))
      calc(env(safe-area-inset-bottom, 0px) + var(--si-space-4))
      calc(env(safe-area-inset-left, 0px) + var(--si-space-4));
    background: rgba(0, 0, 0, 0.92);
    color: #fff;
    touch-action: none;
  }

  .si-viewer.show {
    display: flex;
    animation: si-sheet-fade 200ms ease-out;
  }

  /* Focused by a tap on the image (tabindex=-1); the ring belongs to ✕. */
  .si-viewer:focus {
    outline: none;
  }

  .si-viewer__img {
    flex: 0 1 auto;
    min-height: 0;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    animation: si-sheet-pop var(--si-motion, 200ms) ease-out;
  }

  .si-viewer__img:not([src]) {
    visibility: hidden;
  }

  .si-viewer__caption {
    flex: none;
    margin: 0;
    font-size: var(--si-font-name);
    text-align: center;
    overflow-wrap: anywhere;
  }

  .si-viewer .si-viewer__close {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + var(--si-space-2));
    right: calc(env(safe-area-inset-right, 0px) + var(--si-space-2));
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
  }

  @media (max-width: 600px) {
    .modal.si-sheet.show {
      align-items: flex-end;
    }

    .si-sheet .si-sheet__panel {
      width: 100%;
      max-width: none;
      max-height: 92vh;
      max-height: 92dvh;
      border-radius: var(--si-radius) var(--si-radius) 0 0;
      animation-name: si-sheet-up;
    }

    .si-sheet__actions {
      padding-bottom: calc(var(--si-space-3) + env(safe-area-inset-bottom, 0px));
    }

    .si-sheet__body:last-child {
      padding-bottom: calc(var(--si-space-4) + env(safe-area-inset-bottom, 0px));
    }
  }

  @keyframes si-sheet-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes si-sheet-pop {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes si-sheet-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: none;
    }
  }
`;
