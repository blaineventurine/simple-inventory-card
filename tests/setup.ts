import { vi } from 'vitest';
import './globals.d.ts';

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
