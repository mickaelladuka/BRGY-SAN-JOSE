import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['San_Jose_LOGO.webp', 'robots.txt'],
      manifest: {
        id: '/',
        name: 'Barangay San Jose Annex Area 6 BMIS',
        short_name: 'Annex6 BMIS',
        description: 'Barangay San Jose Annex Area 6 management system for residents and barangay administrators.',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['government', 'utilities'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only. The shell is public static code; no user data is ever precached.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Authenticated/private API traffic must never be cached by the service worker.
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.port === '5085', handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{js,jsx}'],
  },
})
