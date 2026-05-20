/**
 * Vite: dev server + production **build** (`vite build` → `dist/`).
 * Production mặc định: Nest serve `dist/` (Dockerfile gốc repo) — không chạy Vite trên host.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
