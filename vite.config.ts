import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: true },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        garage: resolve(process.cwd(), 'garage.html'),
      },
    },
  },
});
