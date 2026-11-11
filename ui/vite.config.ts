import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  base: './',
  build: {
    assetsDir: '.',
    emptyOutDir: true,
    outDir: fileURLToPath(new URL('../dist/ui', import.meta.url)),
  },
  plugins: [vue()],
  root: fileURLToPath(new URL('.', import.meta.url)),
});
