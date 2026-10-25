import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { ImageLoader } from '../../src/services/imageLoader';
import { ImageViewer } from '../../src/services/imageViewer';
import { AcquireHold } from '../../src/services/inventoryStore';
import { CSS_CLASSES, ELEMENTS } from '../../src/utils/constants';
import { must } from '../testHelpers';

const FULL = '/api/simple_inventory/image/abc?v=1';
const THUMB = '/api/simple_inventory/image/abc?thumb=1&v=1';

/** Resolves on the next `popstate`, i.e. once a history traversal finished. */
function nextPopState(): Promise<void> {
  return new Promise((resolve) => {
    window.addEventListener('popstate', () => resolve(), { once: true });
  });
}

describe('ImageViewer', () => {
  let host: HTMLElement;
  let root: ShadowRoot;
  let opener: HTMLButtonElement;
  let fetchBlob: Mock<(path: string) => Promise<Blob>>;
  let loader: ImageLoader;
  /** The release of the viewer's hold; `hold` hands it out. */
  let release: Mock<() => void>;
  let hold: Mock<AcquireHold>;
  let viewer: ImageViewer;
  /** The traversal of the latest `history.back()`, resolved once its `popstate` fired. */
  let pendingPop: Promise<void> | undefined;

  function overlay(): HTMLElement {
    return must(root.getElementById(ELEMENTS.IMAGE_VIEWER), 'no viewer');
  }

  function image(): HTMLImageElement {
    return must(overlay().querySelector('img'), 'no viewer image');
  }

  function closeButton(): HTMLButtonElement {
    return must(overlay().querySelector('button'), 'no close button');
  }

  function isOpen(): boolean {
    return (
      root.getElementById(ELEMENTS.IMAGE_VIEWER)?.classList.contains(CSS_CLASSES.SHOW) === true
    );
  }

  function press(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    (root.activeElement ?? closeButton()).dispatchEvent(event);
    return event;
  }

  beforeEach(() => {
    let next = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn<(blob: Blob) => string>(() => `blob:test/${++next}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn<(url: string) => void>(),
    });
    fetchBlob = vi.fn<(path: string) => Promise<Blob>>(() => Promise.resolve(new Blob(['x'])));
    loader = new ImageLoader(fetchBlob);
    host = document.createElement('div');
    document.body.append(host);
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<button type="button" id="opener">Open</button>';
    opener = must(root.querySelector('button'));
    opener.focus();
    release = vi.fn<() => void>();
    hold = vi.fn<AcquireHold>(() => release);
    viewer = new ImageViewer(root, loader, hold);
    history.replaceState(null, '');
    pendingPop = undefined;
    const back = history.back.bind(history);
    vi.spyOn(history, 'back').mockImplementation(() => {
      pendingPop = nextPopState();
      back();
    });
  });

  afterEach(async () => {
    // A viewer left open keeps its listeners; a close's `history.back()` lands after the test:
    // close it and wait for the pop, or either would act in the next test.
    viewer.close();
    await pendingPop;
    host.remove();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.restoreAllMocks();
  });

  it('shows the loaded thumbnail at once, then the full image, as a labelled modal dialog', async () => {
    await loader.load(THUMB);
    let finishFull: (blob: Blob) => void = () => {};
    fetchBlob.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          finishFull = resolve;
        }),
    );

    viewer.open({ name: 'Milk', fullPath: FULL, thumbPath: THUMB }, opener, {});

    expect(isOpen()).toBe(true);
    expect(overlay().getAttribute('role')).toBe('dialog');
    expect(overlay().getAttribute('aria-modal')).toBe('true');
    expect(overlay().getAttribute('aria-label')).toBe('Photo of Milk');
    expect(overlay().textContent).toContain('Milk');
    expect(image().getAttribute('src')).toBe('blob:test/1');
    expect(root.activeElement).toBe(closeButton());
    expect(closeButton().getAttribute('aria-label')).toBe('Close');

    finishFull(new Blob(['full']));
    await loader.load(FULL);

    expect(image().getAttribute('src')).toBe('blob:test/2');
  });

  it('uses the translations for its labels', () => {
    viewer.open({ name: 'Leche', fullPath: FULL }, opener, {
      items: { image_alt: 'Foto de {name}' },
      modal: { close: 'Cerrar' },
    });

    expect(overlay().getAttribute('aria-label')).toBe('Foto de Leche');
    expect(closeButton().getAttribute('aria-label')).toBe('Cerrar');
  });

  it('shows a staged photo as is, without loading anything', () => {
    viewer.open({ name: '', src: 'blob:staged' }, opener, {});

    expect(image().getAttribute('src')).toBe('blob:staged');
    expect(fetchBlob).not.toHaveBeenCalled();
    expect(overlay().getAttribute('aria-label')).toBe('Photo');
  });

  it('keeps showing the current photo when an earlier full image finishes loading', async () => {
    let finishFull: (blob: Blob) => void = () => {};
    fetchBlob.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          finishFull = resolve;
        }),
    );
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    viewer.close();
    viewer.open({ name: '', src: 'blob:staged' }, opener, {});

    finishFull(new Blob(['full']));
    await loader.load(FULL);

    expect(image().getAttribute('src')).toBe('blob:staged');
  });

  it('closes with ✕, returns focus to the opener and releases its hold', () => {
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    expect(hold).toHaveBeenCalledWith('page', 'photo viewer');
    expect(release).not.toHaveBeenCalled();

    closeButton().click();

    expect(isOpen()).toBe(false);
    expect(root.activeElement).toBe(opener);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('empties the overlay on close: no blob kept, nothing for a later hydrate to reload', () => {
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});

    closeButton().click();

    expect(overlay().childElementCount).toBe(0);
  });

  it('leaves keys aimed outside the card alone (e.g. an HA dialog over the viewer)', () => {
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.body.dispatchEvent(escape);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.body.dispatchEvent(tab);

    expect(isOpen()).toBe(true);
    expect(escape.defaultPrevented).toBe(false);
    expect(tab.defaultPrevented).toBe(false);
  });

  it('closes cleanly after a render removed its overlay, and reopens with one history entry', async () => {
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    // Pushing drops forward entries; after one back and one push the length is the same again.
    const length = history.length;
    overlay().remove();

    const popped = nextPopState();
    viewer.close();
    await popped;

    expect(release).toHaveBeenCalledTimes(1);
    expect(history.state).toBeNull();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    root.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);

    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    expect(isOpen()).toBe(true);
    expect(history.length).toBe(length);
  });

  it('reopened while a removed overlay still counts as open: shows again, pushes nothing', () => {
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    const length = history.length;
    overlay().remove();

    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});

    expect(isOpen()).toBe(true);
    expect(history.length).toBe(length);
  });

  it('drops a viewer marker left on the current entry (page reloaded while open)', async () => {
    history.replaceState({ siImageViewer: true, scroll: 3 }, '');
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});

    const popped = nextPopState();
    history.back();
    await popped;

    expect(isOpen()).toBe(false);
    expect(history.state).toEqual({ scroll: 3 });
  });

  it('reopened before its own back landed, pushes its entry once that pop lands', async () => {
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    const length = history.length;
    const popped = nextPopState();
    closeButton().click();
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    await popped;

    expect(isOpen()).toBe(true);
    expect(history.length).toBe(length);
    expect(history.state).toEqual({ siImageViewer: true });

    const closed = nextPopState();
    history.back();
    await closed;
    expect(isOpen()).toBe(false);
  });

  it('closed again before its own back landed, goes back only once', async () => {
    const back = vi.spyOn(history, 'back');
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    const popped = nextPopState();
    closeButton().click();
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    closeButton().click();
    await popped;

    expect(back).toHaveBeenCalledTimes(1);
    expect(isOpen()).toBe(false);
    expect(history.state).toBeNull();
  });

  it('closes only itself on Escape: sheets listening for Escape see it handled', () => {
    const sheetSawHandled = vi.fn<(handled: boolean) => void>();
    const sheetListener = (event: KeyboardEvent): void => {
      sheetSawHandled(event.defaultPrevented);
    };
    document.addEventListener('keydown', sheetListener);
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});

    press('Escape');
    document.removeEventListener('keydown', sheetListener);

    expect(isOpen()).toBe(false);
    expect(sheetSawHandled).toHaveBeenCalledWith(true);
  });

  it('closes on a tap on the scrim, not on the image', () => {
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});

    image().click();
    expect(isOpen()).toBe(true);

    overlay().click();
    expect(isOpen()).toBe(false);
  });

  it('keeps Tab on the close button', () => {
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});

    const tab = press('Tab');

    expect(tab.defaultPrevented).toBe(true);
    expect(root.activeElement).toBe(closeButton());
  });

  it('pushes one history entry without changing the URL; back closes it', async () => {
    const href = location.href;
    history.pushState({ previous: true }, '');
    const length = history.length;

    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    expect(history.length).toBe(length + 1);
    expect(history.state).toEqual({ siImageViewer: true });
    expect(location.href).toBe(href);

    const popped = nextPopState();
    history.back();
    await popped;

    expect(isOpen()).toBe(false);
    expect(release).toHaveBeenCalledTimes(1);
    expect(root.activeElement).toBe(opener);
    expect(location.href).toBe(href);
  });

  it('pops its own history entry when closed another way', async () => {
    const back = vi.spyOn(history, 'back');
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});

    const popped = nextPopState();
    closeButton().click();
    await popped;

    expect(back).toHaveBeenCalledTimes(1);
    expect(history.state).toBeNull();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('leaves the history alone when another entry was pushed over its own', () => {
    const back = vi.spyOn(history, 'back');
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    history.pushState({ other: true }, '');

    closeButton().click();

    expect(back).not.toHaveBeenCalled();
    expect(isOpen()).toBe(false);
  });

  it('stops listening while paused and stays open for a quick re-attach', () => {
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});

    viewer.pause();
    press('Escape');
    expect(isOpen()).toBe(true);

    viewer.resume();
    press('Escape');
    expect(isOpen()).toBe(false);
  });

  it('closes on resume when the back gesture happened while paused', async () => {
    viewer.open({ name: 'Milk', fullPath: FULL }, opener, {});
    viewer.pause();

    const popped = nextPopState();
    history.back();
    await popped;
    expect(isOpen()).toBe(true);

    viewer.resume();
    expect(isOpen()).toBe(false);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('does nothing on pause, resume or close while closed', () => {
    const back = vi.spyOn(history, 'back');

    viewer.pause();
    viewer.resume();
    viewer.close();

    expect(back).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });
});
