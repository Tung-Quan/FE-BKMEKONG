/// <reference types="vitest" />
/// <reference types="vite/client" />
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routeFileIgnorePrefix: '-',
    }),
    react(),
    viteTsconfigPaths(),
  ],
  server: {
    port: 80,
    allowedHosts: [],
  },
  preview: {
    port: 80,
    allowedHosts: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@public': path.resolve(__dirname, 'public'),
      '@stores': path.resolve(__dirname, 'src/stores'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
  optimizeDeps: { exclude: ['fsevents'] },
});
