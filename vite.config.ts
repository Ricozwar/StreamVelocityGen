import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { logoStorePlugin } from './vite-plugin-logos';

export default defineConfig({
  base: './',
  server: {
    port: 3003,
    host: 'localhost',
    watch: {
      ignored: ['**/public/_tmp/**', '**/public/logos/manifest.json'],
    },
  },
  plugins: [react(), logoStorePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
