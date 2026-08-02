import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Foodly - Real-Time Food Discovery',
        short_name: 'Foodly',
        description: 'Discover real-time food deals and rescue meals near you.',
        theme_color: '#ee4d2d',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: process.env.VITE_BASE_URL || '/',
        icons: [
          { src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        navigateFallback: `${process.env.VITE_BASE_URL || '/'}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/deals'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'deals-cache',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'images.unsplash.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
})
