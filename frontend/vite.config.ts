import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Vite server proxies API and WebSocket traffic to FastAPI, so
// the browser only ever talks to one origin (same as production).
const backend = `127.0.0.1:${process.env.BACKEND_PORT ?? '8000'}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': `http://${backend}`,
      '/ws': { target: `ws://${backend}`, ws: true },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 800,
  },
});
