import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png', 'header-bg.png', 'icon-192.png', 'icon-512.png', 'offline.html'],
        manifest: {
          name: 'NeuroBooth 360',
          short_name: 'NeuroBooth',
          description: 'Application de photobooth 360° avec effets slow motion',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: '/logo.png',
              sizes: 'any',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          shortcuts: [
            {
              name: 'Nouvelle capture',
              short_name: 'Capturer',
              description: 'Démarrer une nouvelle capture 360°',
              url: '/',
              icons: [{src: '/logo.png', sizes: '192x192'}]
            },
            {
              name: 'Galerie',
              short_name: 'Galerie',
              description: 'Voir les captures sauvegardées',
              url: '/gallery',
              icons: [{src: '/logo.png', sizes: '192x192'}]
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 1 semaine
                },
                networkTimeoutSeconds: 10
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours
                }
              }
            },
            {
              urlPattern: /\.(?:mp4|webm)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'videos-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 jours
                },
                rangeRequests: true
              }
            },
            {
              urlPattern: /\/song\/.*\.mp3$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'songs-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ],
          cleanupOutdatedCaches: true,
          // Keep SPA navigations on the app shell. Using offline.html here makes
          // every navigation resolve to the offline screen while the service
          // worker is active, even when the network is available.
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/storage\//],
          skipWaiting: true,
          clientsClaim: true
        },
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      // @ffmpeg/ffmpeg uses internal Web Workers that Vite's dep optimizer can't bundle
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Required for FFmpeg WASM (SharedArrayBuffer needs cross-origin isolation)
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        // 'credentialless' allows cross-origin images/media (e.g. Supabase logo bucket)
        // while still enabling SharedArrayBuffer needed for FFmpeg WASM
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@ffmpeg')) return 'ffmpeg';
            if (id.includes('node_modules/jszip')) return 'jszip';
            if (id.includes('node_modules/@supabase')) return 'supabase';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion';
            if (id.includes('node_modules/react') || id.includes('node_modules/react-router-dom')) return 'react-vendor';
          },
        },
      },
    },
    // SPA fallback — serve index.html for all routes (e.g. /share/:id)
    appType: 'spa' as const,
  };
});
