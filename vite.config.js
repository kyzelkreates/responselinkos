import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ============================================================
// ResponseLink OS™ — Vite Config
// Run 1 — Identity, Shell, Navigation, Safe Refactor Foundation
//
// ResponseLink OS™
// AI-Assisted Community Welfare & Mobile Response Platform
// Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
//
// PWA manifest names updated to ResponseLink OS™ branding.
// All build config, chunk strategy, and workbox rules preserved.
// ============================================================

export default defineConfig({
  base: '/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      additionalManifestEntries: [],

      // ── Web App Manifest — ResponseLink OS™ ──────────────
      manifest: {
        name:             'ResponseLink OS™',
        short_name:       'ResponseLink',
        description:      'ResponseLink OS™ AI-Assisted Community Welfare & Mobile Response Platform. Powered by 4P3X Intelligent AI™. Created by Kyzel Kreates™.',
        theme_color:      '#0a0000',
        background_color: '#0a0000',
        display:          'standalone',
        orientation:      'any',
        scope:            '/',
        start_url:        '/',
        categories:       ['business', 'productivity'],
        icons: [
          {
            src:     'icons/icon-192x192.png',
            sizes:   '192x192',
            type:    'image/png',
            purpose: 'maskable any',
          },
          {
            src:     'icons/icon-512x512.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'maskable any',
          },
        ],
        shortcuts: [
          {
            name:        'Responder App',
            short_name:  'Responder',
            url:         '/#/driver-app',
            description: 'Open the ResponseLink OS™ Responder PWA',
            icons: [{ src: 'icons/icon-192x192.png', sizes: '192x192' }],
          },
          {
            name:        'Command Dashboard',
            short_name:  'Dashboard',
            url:         '/#/dashboard',
            description: 'Open the ResponseLink OS™ Command Dashboard',
            icons: [{ src: 'icons/icon-192x192.png', sizes: '192x192' }],
          },
        ],
      },

      // ── Workbox config (preserved — no changes) ───────────
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/rest/'),
            handler:    'NetworkFirst',
            options: {
              cacheName:       'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/realtime/'),
            handler:    'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.hostname.includes('openstreetmap.org') || url.hostname.includes('osrm.org'),
            handler:    'CacheFirst',
            options: {
              cacheName:  'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.includes('qrserver.com'),
            handler:    'CacheFirst',
            options: {
              cacheName:  'qr-codes',
              expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler:    'CacheFirst',
            options: {
              cacheName:  'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },

      devOptions: {
        enabled: true,
        type:    'module',
      },
    }),
  ],

  resolve: {
    extensions: ['.jsx', '.js', '.ts', '.tsx'],
  },

  server: {
    port: 3000,
    host: true,
  },

  build: {
    outDir:    'dist',
    sourcemap: false,
    minify:    'esbuild',
    target:    'es2020',
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui':       ['lucide-react', 'clsx'],
          'vendor-state':    ['zustand'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts':   ['recharts'],
          'vendor-leaflet':  ['leaflet', 'react-leaflet'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },

  optimizeDeps: {
    include: ['leaflet', 'react-leaflet', 'recharts', 'zustand', '@supabase/supabase-js'],
  },
})
