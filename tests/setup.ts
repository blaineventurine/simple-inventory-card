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
  },
}));

// Mock Home Assistant globals
global.customElements = {
  define: vi.fn(),
  get: vi.fn(),
  whenDefined: vi.fn(),
} as any;

global.window = global.window || {};
global.window.customCards = [];

// Mock console to reduce noise in tests
global.console = {
  ...console,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
