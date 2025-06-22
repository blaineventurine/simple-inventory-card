/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'SimpleInventoryCard',
      fileName: 'simple-inventory-card',
      formats: ['es'],
    },
    rollupOptions: {
      // External dependencies that shouldn't be bundled
      // external: ['lit'],
      output: {
        // Global variables to use in UMD build for externalized deps
        globals: {
          lit: 'Lit',
        },
        entryFileNames: 'simple-inventory-card.js',
      },
    },
    minify: 'terser',
    sourcemap: false,
  },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts}'],
      reporter: ['text', 'html', 'json', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        'vite.config.ts',
        'tests/',
        '.stryker-tmp/**/*',
        'src/styles/',
        'src/types/',
      ],
      all: true,
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
