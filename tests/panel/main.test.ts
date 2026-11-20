import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ELEMENTS = [
  'simple-inventory-card',
  'simple-inventory-config-editor',
  'simple-inventory-panel',
];

describe('bundle entries', () => {
  let registry: Map<string, CustomElementConstructor>;

  beforeEach(() => {
    vi.resetModules();
    registry = new Map();
    vi.stubGlobal('customElements', {
      get: (name: string) => registry.get(name),
      define: vi.fn((name: string, ctor: CustomElementConstructor) => {
        if (registry.has(name)) throw new Error(`${name} already defined`);
        registry.set(name, ctor);
      }),
      whenDefined: vi.fn(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('card bundle first, then panel bundle', async () => {
    await import('../../src/main');
    vi.resetModules(); // the second bundle is its own module graph, as in the browser
    await import('../../src/panel/main');
    expect([...registry.keys()].sort()).toEqual(ELEMENTS);
  });

  it('panel bundle first, then card bundle', async () => {
    await import('../../src/panel/main');
    vi.resetModules();
    await import('../../src/main');
    expect([...registry.keys()].sort()).toEqual(ELEMENTS);
  });
});
