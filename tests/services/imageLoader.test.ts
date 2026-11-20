import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { ImageLoader, hydrateImages } from '../../src/services/imageLoader';

const THUMB_V1 = '/api/simple_inventory/image/abc?thumb=1&v=1';
const THUMB_V2 = '/api/simple_inventory/image/abc?thumb=1&v=2';
const FULL_V1 = '/api/simple_inventory/image/abc?v=1';

describe('ImageLoader', () => {
  let createObjectURL: Mock<(blob: Blob) => string>;
  let revokeObjectURL: Mock<(url: string) => void>;
  let fetchBlob: Mock<(path: string) => Promise<Blob>>;
  let loader: ImageLoader;

  beforeEach(() => {
    let next = 0;
    // jsdom has no object URLs.
    createObjectURL = vi.fn<(blob: Blob) => string>(() => `blob:test/${++next}`);
    revokeObjectURL = vi.fn<(url: string) => void>();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });
    fetchBlob = vi.fn<(path: string) => Promise<Blob>>(() =>
      Promise.resolve(new Blob(['x'], { type: 'image/webp' })),
    );
    loader = new ImageLoader(fetchBlob);
  });

  afterEach(() => {
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.restoreAllMocks();
  });

  it('loads a path once and then serves it from the cache', async () => {
    expect(loader.cached(THUMB_V1)).toBeUndefined();

    const url = await loader.load(THUMB_V1);

    expect(url).toBe('blob:test/1');
    expect(loader.cached(THUMB_V1)).toBe('blob:test/1');
    expect(await loader.load(THUMB_V1)).toBe('blob:test/1');
    expect(fetchBlob).toHaveBeenCalledTimes(1);
  });

  it('shares one fetch between concurrent loads of a path', async () => {
    const [a, b] = await Promise.all([loader.load(THUMB_V1), loader.load(THUMB_V1)]);

    expect(a).toBe(b);
    expect(fetchBlob).toHaveBeenCalledTimes(1);
  });

  it('revokes the old blob when the same image loads with a new stamp', async () => {
    await loader.load(THUMB_V1);

    const url = await loader.load(THUMB_V2);

    expect(url).toBe('blob:test/2');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/1');
    expect(loader.cached(THUMB_V1)).toBeUndefined();
    expect(loader.cached(THUMB_V2)).toBe('blob:test/2');
  });

  it('keeps the thumbnail and the full image side by side', async () => {
    await loader.load(THUMB_V1);
    await loader.load(FULL_V1);

    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(loader.cached(THUMB_V1)).toBe('blob:test/1');
    expect(loader.cached(FULL_V1)).toBe('blob:test/2');
  });

  it('retries a path whose load failed', async () => {
    fetchBlob.mockRejectedValueOnce(new Error('HTTP 404'));

    await expect(loader.load(THUMB_V1)).rejects.toThrow('HTTP 404');
    expect(await loader.load(THUMB_V1)).toBe('blob:test/1');
    expect(fetchBlob).toHaveBeenCalledTimes(2);
  });

  it('lets a newer stamp win over an older one still in flight', async () => {
    let finishOld: (blob: Blob) => void = () => {};
    fetchBlob.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          finishOld = resolve;
        }),
    );
    const old = loader.load(THUMB_V1);
    const newer = await loader.load(THUMB_V2);

    finishOld(new Blob(['old']));

    expect(await old).toBe(newer);
    expect(loader.cached(THUMB_V2)).toBe(newer);
    expect(loader.cached(THUMB_V1)).toBeUndefined();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it('revokes and forgets every blob on releaseAll; the next load fetches again', async () => {
    const thumb = await loader.load(THUMB_V1);
    const full = await loader.load(FULL_V1);

    loader.releaseAll();

    expect(revokeObjectURL).toHaveBeenCalledWith(thumb);
    expect(revokeObjectURL).toHaveBeenCalledWith(full);
    expect(loader.cached(THUMB_V1)).toBeUndefined();
    expect(await loader.load(THUMB_V1)).toBe('blob:test/3');
    expect(fetchBlob).toHaveBeenCalledTimes(3);
  });
});

describe('hydrateImages', () => {
  let root: HTMLElement;
  let fetchBlob: Mock<(path: string) => Promise<Blob>>;
  let loader: ImageLoader;

  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn<(blob: Blob) => string>(() => 'blob:test/1'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn<(url: string) => void>(),
    });
    fetchBlob = vi.fn<(path: string) => Promise<Blob>>(() => Promise.resolve(new Blob(['x'])));
    loader = new ImageLoader(fetchBlob);
    root = document.createElement('div');
  });

  afterEach(() => {
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.restoreAllMocks();
  });

  it('sets the blob URL on images that have none yet', async () => {
    root.innerHTML = `<img alt="" data-image-path="${THUMB_V1}">`;

    hydrateImages(root, loader);
    await loader.load(THUMB_V1);

    expect(root.querySelector('img')?.getAttribute('src')).toBe('blob:test/1');
  });

  it('leaves images that already have a src and images in hidden panels alone', () => {
    root.innerHTML = `<img alt="" data-image-path="${THUMB_V1}" src="blob:cached">
      <div hidden><img alt="" data-image-path="${FULL_V1}"></div>`;

    hydrateImages(root, loader);

    expect(fetchBlob).not.toHaveBeenCalled();
  });

  it('keeps the image empty when the load fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchBlob.mockRejectedValueOnce(new Error('HTTP 404'));
    root.innerHTML = `<img alt="" data-image-path="${THUMB_V1}">`;

    hydrateImages(root, loader);
    await expect(loader.load(THUMB_V1)).rejects.toThrow('HTTP 404');
    await Promise.resolve();

    expect(root.querySelector('img')?.hasAttribute('src')).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it('reloads an image whose blob was released, keeping the old src until the new one is ready', async () => {
    let next = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn<(blob: Blob) => string>(() => `blob:test/${++next}`),
    });
    const first = await loader.load(THUMB_V1);
    root.innerHTML = `<img alt="" data-image-path="${THUMB_V1}" src="${first}">
      <img alt="" data-image-path="${FULL_V1}" src="blob:not-from-the-loader">`;
    loader.releaseAll();
    let finish: (blob: Blob) => void = () => {};
    fetchBlob.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          finish = resolve;
        }),
    );

    hydrateImages(root, loader);
    const [thumb, full] = Array.from(root.querySelectorAll('img'));
    // No empty or broken image while the new blob loads.
    expect(thumb?.getAttribute('src')).toBe(first);

    finish(new Blob(['x']));
    await loader.load(THUMB_V1);

    expect(thumb?.getAttribute('src')).toBe('blob:test/2');
    expect(full?.getAttribute('src')).toBe('blob:not-from-the-loader');
    expect(fetchBlob).toHaveBeenCalledTimes(2);
  });
});
