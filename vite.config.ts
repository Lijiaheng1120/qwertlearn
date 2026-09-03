import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'qwertlearn-icon.svg',
        'qwertlearn-icon-192.png',
        'qwertlearn-icon-512.png',
        'qwertlearn-icon-maskable-512.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'QwertLearn 英语打字冒险岛',
        short_name: 'QwertLearn',
        description: '面向儿童的英语键位、单词抄写、词义回忆和听写游戏集合',
        theme_color: '#238653',
        background_color: '#f5fbdf',
        display: 'standalone',
        start_url: '/',
        lang: 'zh-CN',
        icons: [
          {
            src: '/qwertlearn-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/qwertlearn-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/qwertlearn-icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/qwertlearn-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(moduleId) {
          if (moduleId.includes('/node_modules/phaser/')) return 'phaser'
          if (moduleId.includes('/node_modules/react/') || moduleId.includes('/node_modules/react-dom/')) return 'react'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'clover'],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 90,
      },
    },
  },
})
