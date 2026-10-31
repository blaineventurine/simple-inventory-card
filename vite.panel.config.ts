import { defineConfig } from 'vite';
import { resolve } from 'path';

// Second library build: the sidebar panel, one self-contained file that also carries the card.
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/panel/main.ts'),
      name: 'SimpleInventoryPanel',
      fileName: 'simple-inventory-panel',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'simple-inventory-panel.js',
        codeSplitting: false,
      },
    },
    minify: 'terser',
    sourcemap: false,
    copyPublicDir: false,
  },
  publicDir: false,
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
