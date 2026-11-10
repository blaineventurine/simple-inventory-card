import { vi } from 'vitest';
import './globals.d.ts';

// Mock @ericblade/quagga2 globally (requires native camera APIs unavailable in jsdom)
vi.mock('@ericblade/quagga2', () => ({
  default: {
    init: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onDetected: vi.fn(),
    offDetected: vi.fn(),
    decodeSingle: vi.fn(),
  },
}));

// Mock Home Assistant globals
const customElementsMock: Pick<CustomElementRegistry, 'define' | 'get' | 'whenDefined'> = {
  define: vi.fn(),
  get: vi.fn(),
  whenDefined: vi.fn(),
};
// jsdom's `customElements` is a getter-only window property, and Vitest 5 forwards global
// assignments to the window, so the mock is defined rather than assigned. Not `vi.stubGlobal`:
// tests that call `vi.unstubAllGlobals()` would restore the real registry mid-file.
Object.defineProperty(globalThis, 'customElements', {
  value: customElementsMock,
  configurable: true,
  writable: true,
});

window.customCards = [];

// Mock console to reduce noise in tests
global.console = {
  ...console,
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
