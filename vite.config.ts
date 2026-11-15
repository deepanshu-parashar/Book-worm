import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'web',
  plugins: [react()],
  server: {
    host: true, // reachable from a phone on the same Wi-Fi
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: { outDir: '../dist', emptyOutDir: true },
  test: { root: '.', include: ['server/**/*.test.ts', 'web/src/**/*.test.ts'] },
});
