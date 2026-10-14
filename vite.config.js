import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Vercel serves files from public/ through its CDN. Disable Vite's default
  // publicDir copy because public/ is also the build output directory.
  publicDir: false,
  build: { outDir: 'public', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
