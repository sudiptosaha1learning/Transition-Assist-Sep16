import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No Docker involved anywhere in this build — `npm run build` produces a
// static dist/ folder you can serve from any static host (Cloud Storage +
// Cloud CDN, Firebase Hosting, Cloud Run static bucket, nginx, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
