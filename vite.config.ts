// vite.config.js
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_NAME } from './config/constants';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: {
      key: undefined,
      cert: undefined,
    },
  },

  plugins: [
    basicSsl(),
    react(),
    VitePWA({
      base: '/', // 프로젝트 배포 경로
      registerType: 'autoUpdate', // 서비스워커 자동 업데이트 설정
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: '폐기물 분리배출 AI 코칭 서비스 이코에코',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/ic_logo_180.png',
            sizes: '180x180',
            type: 'image/png',
          },
          {
            src: '/icons/ic_logo_192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/ic_logo_512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/ic_logo_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
