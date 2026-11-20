import { TranslationData } from '@/types/translatableComponent';
import { iconButton } from '@/templates/primitives';
import { CSS_CLASSES, ELEMENTS } from '@/utils/constants';
import { Utilities } from '@/utils/utilities';
import { ImageLoader } from './imageLoader';
import type { AcquireHold } from './inventoryStore';
import { TranslationManager } from './translationManager';

/** What the viewer shows. */
export interface ViewerImage {
  /** The item's name, for the caption and the dialog's label; '' when the add sheet has none yet. */
  name: string;
  /** The full image on the integration (`itemImagePath(item, 'full')`), loaded through the cache. */
  fullPath?: string;
  /** Its thumbnail, shown until the full image has loaded when it is already loaded itself. */
  thumbPath?: string;
  /** A local image shown as is instead (the sheet's staged photo). */
  src?: string;
}

/** Marks the history entry the viewer pushes, so the back gesture closes it. */
const HISTORY_KEY = 'siImageViewer';

/** Whether the current history entry is the one the viewer pushed. */
function viewerEntryOnTop(): boolean {
  const state: unknown = history.state;
  return typeof state === 'object' && state !== null && HISTORY_KEY in state;
}

/**
 * Full-screen photo viewer above everything in the card, sheets included. Closes on ✕, Escape,
 * a tap beside the image and the browser/phone back gesture: opening pushes one history entry
 * (same URL), `popstate` closes, and closing another way pops that entry if it is still on top.
 * Whether it is open is kept here, not read from the DOM, so a render that removed the overlay
 * still leaves a clean close (listeners, history entry, the page hold taken while open).
 */
export class ImageViewer {
  /** Element that had focus when the viewer opened; it gets focus back on close. */
  private opener: HTMLElement | undefined;
  private shown = false;
  /** The card is detached: no keys reach the viewer. */
  private paused = false;
  /**
   * The `history.back()` of a close is on its way; until it lands, our entry is still on top.
   * A viewer reopened meanwhile pushes its entry once it has landed.
   */
  private popping = false;
  private keysBound = false;
  private popBound = false;
  /** Releases the page hold taken while the viewer is open. */
  private release: (() => void) | undefined;

  private readonly onKeydown = (event: KeyboardEvent): void => {
    // Keys aimed outside the card (e.g. an HA dialog opened over the viewer) are not ours.
    if (!event.composedPath().includes(this.root)) {
      return;
    }
    if (event.key === 'Escape' && !event.isComposing) {
      // Handled: the sheet underneath stays open.
      event.preventDefault();
      this.close();
    } else if (event.key === 'Tab') {
      // ✕ is the dialog's only control.
      event.preventDefault();
      this.closeButton()?.focus();
    }
  };

  private readonly onPopState = (): void => {
    if (this.popping) {
      // Our own close's pop landed.
      this.popping = false;
      if (this.shown) {
        this.pushEntry();
      }
      this.syncListeners();
      return;
    }
    if (this.shown && !viewerEntryOnTop()) {
      this.hide();
    }
  };

  constructor(
    private readonly root: ShadowRoot,
    private readonly loader: ImageLoader,
    /** Holds every render while the viewer is open; released on close, by any route. */
    private readonly hold?: AcquireHold,
  ) {}

  /**
   * Show `image`; the thumbnail (or local photo) at once, the full image once loaded. `opener`
   * gets focus back on close (none from a caller without one, e.g. a dashboard tile).
   */
  open(image: ViewerImage, opener: HTMLElement | undefined, translations: TranslationData): void {
    const overlay = this.overlay();
    const label = image.name
      ? TranslationManager.localize(
          translations,
          'items.image_alt',
          { name: image.name },
          `Photo of ${image.name}`,
        )
      : TranslationManager.localize(translations, 'image.viewer_unnamed', undefined, 'Photo');
    const closeLabel = TranslationManager.localize(translations, 'modal.close', undefined, 'Close');
    const { fullPath, thumbPath } = image;
    const fullLoaded = fullPath === undefined ? undefined : this.loader.cached(fullPath);
    const src =
      image.src ??
      fullLoaded ??
      (thumbPath === undefined ? undefined : this.loader.cached(thumbPath));
    const path = image.src === undefined ? fullPath : undefined;

    overlay.setAttribute('aria-label', label);
    overlay.innerHTML = `
      <img class="si-viewer__img" alt="${Utilities.sanitizeHtml(label)}"${path === undefined ? '' : ` data-image-path="${Utilities.sanitizeHtml(path)}"`}${src === undefined ? '' : ` src="${Utilities.sanitizeHtml(src)}"`}>
      ${image.name ? `<p class="si-viewer__caption">${Utilities.sanitizeHtml(image.name)}</p>` : ''}
      ${iconButton({ icon: 'mdi:close', label: closeLabel, className: 'si-viewer__close' })}
    `;
    if (path !== undefined && fullLoaded === undefined) {
      this.showWhenLoaded(path);
    }

    overlay.classList.add(CSS_CLASSES.SHOW);
    if (!this.shown) {
      this.shown = true;
      this.opener = opener;
      this.release = this.hold?.('page', 'photo viewer');
      if (!this.popping) {
        this.pushEntry();
      }
      this.syncListeners();
    }
    this.closeButton()?.focus();
  }

  /** Close (✕, Escape, scrim) and pop the viewer's history entry while it is still on top. */
  close(): void {
    if (!this.shown) {
      return;
    }
    // While an earlier close's pop is on its way, the entry on top is the one it pops.
    const popOwnEntry = !this.popping && viewerEntryOnTop();
    this.hide();
    if (popOwnEntry) {
      this.popping = true;
      this.syncListeners();
      history.back();
    }
  }

  /** Card detached: stop listening for keys; the viewer stays for a re-attach. */
  pause(): void {
    this.paused = true;
    this.syncListeners();
  }

  /** Card re-attached: listen again, or close when the back gesture happened meanwhile. */
  resume(): void {
    this.paused = false;
    if (this.shown && !this.popping && !viewerEntryOnTop()) {
      this.hide();
    } else {
      this.syncListeners();
    }
  }

  /**
   * Push the viewer's history entry. A marker left on the current entry (the page was reloaded
   * with the viewer open) is dropped first, or going back to it would keep the viewer open.
   */
  private pushEntry(): void {
    const state: unknown = history.state;
    if (viewerEntryOnTop() && typeof state === 'object' && state !== null) {
      const rest = Object.fromEntries(Object.entries(state).filter(([key]) => key !== HISTORY_KEY));
      history.replaceState(Object.keys(rest).length > 0 ? rest : null, '');
    }
    history.pushState({ [HISTORY_KEY]: true }, '');
  }

  /** The overlay, created on first use (and again after a full render replaced the card). */
  private overlay(): HTMLElement {
    const existing = this.root.getElementById(ELEMENTS.IMAGE_VIEWER);
    if (existing) {
      return existing;
    }
    const overlay = document.createElement('div');
    overlay.id = ELEMENTS.IMAGE_VIEWER;
    overlay.className = 'si-viewer';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    // Focusable, so a tap on the image keeps Escape and Tab inside the card.
    overlay.tabIndex = -1;
    overlay.addEventListener('click', (event) => {
      // The viewer is modal: nothing underneath acts on its clicks.
      event.stopPropagation();
      if (!(event.target instanceof HTMLImageElement)) {
        this.close();
      }
    });
    this.root.append(overlay);
    return overlay;
  }

  private closeButton(): HTMLButtonElement | null {
    return this.root.querySelector<HTMLButtonElement>(
      `#${ELEMENTS.IMAGE_VIEWER} .si-viewer__close`,
    );
  }

  /** Swap in the full image once loaded, unless the viewer shows another image by then. */
  private showWhenLoaded(path: string): void {
    const img = this.root.querySelector<HTMLImageElement>(`#${ELEMENTS.IMAGE_VIEWER} img`);
    this.loader
      .load(path)
      .then((url) => {
        if (img?.isConnected === true && img.dataset.imagePath === path) {
          img.src = url;
        }
      })
      .catch((error: unknown) => {
        console.warn('Simple Inventory: could not load item image', path, error);
      });
  }

  private hide(): void {
    this.shown = false;
    const overlay = this.root.getElementById(ELEMENTS.IMAGE_VIEWER);
    if (overlay) {
      overlay.classList.remove(CSS_CLASSES.SHOW);
      // Drops the blob `src`, and leaves no image for a later `hydrateImages` to load.
      overlay.replaceChildren();
    }
    this.syncListeners();
    const opener = this.opener;
    this.opener = undefined;
    if (opener?.isConnected === true) {
      opener.focus();
    }
    const release = this.release;
    this.release = undefined;
    release?.();
  }

  /** Keys while open and attached; `popstate` then and while a close's pop is on its way. */
  private syncListeners(): void {
    const keys = this.shown && !this.paused;
    const pop = keys || this.popping;
    if (keys !== this.keysBound) {
      this.keysBound = keys;
      // Capture: Escape reaches the viewer before the sheets' handlers, which skip it as handled.
      if (keys) {
        document.addEventListener('keydown', this.onKeydown, true);
      } else {
        document.removeEventListener('keydown', this.onKeydown, true);
      }
    }
    if (pop !== this.popBound) {
      this.popBound = pop;
      if (pop) {
        window.addEventListener('popstate', this.onPopState);
      } else {
        window.removeEventListener('popstate', this.onPopState);
      }
    }
  }
}
