import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import dotenv from 'dotenv';
import { generateEducationalQuestions, testGeminiApiKey } from './src/server/geminiApi';

dotenv.config();

function apiServerPlugin(): Plugin {
  return {
    name: 'eduquest-api-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/health') {
          const hasKey = !!(
            process.env.GEMINI_API_KEY &&
            process.env.GEMINI_API_KEY.trim() !== '' &&
            process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
          );
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              status: 'ok',
              geminiConfigured: hasKey,
              timestamp: Date.now(),
            })
          );
          return;
        }

        const parseJsonBody = (request: any): Promise<any> => {
          return new Promise((resolve) => {
            if (request.body && typeof request.body === 'object') {
              return resolve(request.body);
            }
            let bodyData = '';
            request.on('data', (chunk: any) => {
              bodyData += chunk;
            });
            request.on('end', () => {
              try {
                resolve(bodyData ? JSON.parse(bodyData) : {});
              } catch {
                resolve({});
              }
            });
            request.on('error', () => resolve({}));
          });
        };

        if (url === '/api/test-gemini-key') {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }

          parseJsonBody(req).then(async (parsed) => {
            try {
              const result = await testGeminiApiKey(parsed.apiKey);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, message: err.message || 'Server error' }));
            }
          });
          return;
        }

        if (url === '/api/generate-questions') {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }

          parseJsonBody(req).then(async (parsed) => {
            try {
              const result = await generateEducationalQuestions(parsed);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message || 'Server error' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      apiServerPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'models/*.task', 'wasm/*'],
        manifest: {
          id: '/',
          name: 'EduQuest AR - Game Edukasi Interaktif',
          short_name: 'EduQuestAR',
          description: 'Game edukasi AR interaktif tanpa repot untuk SD, mendukung kontrol sentuh, gerak tubuh, dan offline penuh tanpa Node.js.',
          theme_color: '#030712',
          background_color: '#030712',
          display: 'standalone',
          display_override: ['standalone', 'fullscreen', 'window-controls-overlay'],
          orientation: 'landscape',
          categories: ['education', 'games'],
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm,task}'],
          maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@latest\/wasm\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'mediapipe-wasm-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 180,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'mediapipe-models-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 180,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
