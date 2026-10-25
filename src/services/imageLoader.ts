/** The image's slot: its path without the `v` stamp, i.e. one per item and size. */
function slotOf(path: string): string {
  return path.replace(/[?&]v=[^&]*$/, '');
}

/**
 * Item images as blob URLs. HA's `<img src>` requests carry no auth header, so images are
 * fetched with the user's token and handed to `<img>` as `blob:` URLs. One blob is kept per
 * item and size: loading a new stamp revokes the old one, and a stamp superseded while its
 * fetch was in flight is dropped. Failed loads are retried next time. `releaseAll` frees every
 * blob of a card HA put away; `hydrateImages` then reloads the images that still show one.
 */
export class ImageLoader {
  private readonly loaded = new Map<string, { path: string; url: string }>();
  private readonly inflight = new Map<string, Promise<string>>();
  /** The most recently requested path per slot; older stamps resolving later are dropped. */
  private readonly latest = new Map<string, string>();
  /** Blob URLs revoked by `releaseAll`: images showing one are reloaded by `hydrateImages`. */
  private readonly released = new Set<string>();

  constructor(private readonly fetchBlob: (path: string) => Promise<Blob>) {}

  /** The blob URL of `path` when it is already loaded, so templates can set `src` at once. */
  cached(path: string): string | undefined {
    const entry = this.loaded.get(slotOf(path));
    return entry?.path === path ? entry.url : undefined;
  }

  /** The blob URL of `path`; concurrent calls for one path share a single fetch. */
  load(path: string): Promise<string> {
    const hit = this.cached(path);
    if (hit !== undefined) {
      return Promise.resolve(hit);
    }
    const pending = this.inflight.get(path);
    if (pending) {
      return pending;
    }
    const slot = slotOf(path);
    this.latest.set(slot, path);
    const request = this.fetchBlob(path)
      .then((blob) => {
        const newest = this.latest.get(slot);
        if (newest !== undefined && newest !== path) {
          // Superseded while in flight: hand out the newer image instead of replacing it.
          return this.load(newest);
        }
        const url = URL.createObjectURL(blob);
        const previous = this.loaded.get(slot);
        if (previous) {
          URL.revokeObjectURL(previous.url);
        }
        this.loaded.set(slot, { path, url });
        return url;
      })
      .finally(() => {
        this.inflight.delete(path);
      });
    this.inflight.set(path, request);
    return request;
  }

  /** Revoke every blob URL handed out; later loads fetch again (from the HTTP cache). */
  releaseAll(): void {
    for (const { url } of this.loaded.values()) {
      URL.revokeObjectURL(url);
      this.released.add(url);
    }
    this.loaded.clear();
  }

  /** Whether `url` is a blob URL that `releaseAll` revoked. */
  isReleased(url: string): boolean {
    return this.released.has(url);
  }
}

/**
 * Fills every `<img data-image-path>` under `root` that has no `src` yet (or a blob URL the
 * loader released) and is not inside a `[hidden]` element (closed details panels load when
 * opened). A released `src` stays until the new one is set, so the image never shows broken.
 * Images that fail to load keep showing what is underneath (the row's icon).
 */
export function hydrateImages(root: ParentNode, loader: ImageLoader): void {
  root.querySelectorAll<HTMLImageElement>('img[data-image-path]').forEach((img) => {
    const path = img.dataset.imagePath;
    const src = img.getAttribute('src');
    if (!path || (src !== null && !loader.isReleased(src)) || img.closest('[hidden]')) {
      return;
    }
    loader
      .load(path)
      .then((url) => {
        // The element may have been pointed at another image meanwhile.
        if (img.dataset.imagePath === path) {
          img.src = url;
        }
      })
      .catch((error: unknown) => {
        console.warn('Simple Inventory: could not load item image', path, error);
      });
  });
}
