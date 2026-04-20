import { defineConfig } from 'vite';

export default defineConfig({
  base: '/dice/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
  },
});
