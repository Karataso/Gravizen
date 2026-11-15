import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Vitalis — Salud en misión',
        short_name: 'Vitalis',
        description: 'Monitoreo de salud, alertas y autonomía para misiones espaciales profundas.',
        theme_color: '#051018',
        background_color: '#051018',
        display: 'standalone',
        orientation: 'any',
        id: '/',
        scope: '/',
        start_url: '/?source=pwa',
        lang: 'es',
        dir: 'ltr',
        categories: ['medical', 'health', 'productivity'],
        screenshots: [],
        shortcuts: [
          {
            name: 'Check-in diario',
            short_name: 'Check-in',
            description: 'Registrar sueño, ánimo, estrés y síntomas',
            url: '/?view=checkin',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Enlace con Tierra',
            short_name: 'Tierra',
            description: 'Bitácora de reportes en tránsito y latencia',
            url: '/?view=earth',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          }
        ],
        icons: [
          { src: '/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
          { src: '/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: '/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: '/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: '/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        launch_handler: {
          client_mode: 'focus-existing'
        },
        handle_links: 'preferred',
        protocol_handlers: [
          {
            protocol: 'web+vitalis',
            url: '/?action=%s'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html'
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    })
  ],
  server: { port: 5173, host: true },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('idb') || id.includes('lucide-react')) return 'vendor-pwa';
            if (id.includes('@tailwindcss')) return 'vendor-utils';
            return 'vendor';
          }
        }
      }
    }
  }
});