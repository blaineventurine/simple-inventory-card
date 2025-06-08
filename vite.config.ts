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
      external: ['lit'],
      output: {
        // Global variables to use in UMD build for externalized deps
        globals: {
          lit: 'Lit',
        },
        entryFileNames: 'simple-inventory-card.js',
      },
    },
    // Ensure we're producing a clean, optimized build
    minify: 'terser',
    sourcemap: false,
  },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
