import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://c0dedna.com',
  trailingSlash: 'ignore',
  compressHTML: true,
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Force every script into an external file: the CSP header (script-src
      // 'self') rejects inline module scripts in production.
      assetsInlineLimit: 0,
    },
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:3000',
      },
    },
  },
});
