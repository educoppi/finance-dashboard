import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages serves the site under /finance-dashboard/
  base: '/finance-dashboard/',
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 800 },
});
