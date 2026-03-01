import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const workspaceRoot = path.resolve(__dirname, '../../..');
const inventoryBackendTarget = process.env.INVENTORY_CHAT_BACKEND ?? 'http://127.0.0.1:8091';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(workspaceRoot, 'go-go-os/packages/engine/node_modules/react'),
      'react/jsx-runtime': path.resolve(
        workspaceRoot,
        'go-go-os/packages/engine/node_modules/react/jsx-runtime.js',
      ),
      'react/jsx-dev-runtime': path.resolve(
        workspaceRoot,
        'go-go-os/packages/engine/node_modules/react/jsx-dev-runtime.js',
      ),
      'react-dom': path.resolve(workspaceRoot, 'go-go-os/packages/engine/node_modules/react-dom'),
      'react-redux': path.resolve(workspaceRoot, 'go-go-os/packages/engine/node_modules/react-redux'),
      '@reduxjs/toolkit': path.resolve(workspaceRoot, 'go-go-os/packages/engine/node_modules/@reduxjs/toolkit'),
      '@hypercard/engine': path.resolve(workspaceRoot, 'go-go-os/packages/engine/src'),
      '@hypercard/chat-runtime': path.resolve(workspaceRoot, 'go-go-os/packages/chat-runtime/src'),
      '@hypercard/hypercard-runtime': path.resolve(workspaceRoot, 'go-go-os/packages/hypercard-runtime/src'),
      '@hypercard/desktop-os': path.resolve(workspaceRoot, 'go-go-os/packages/desktop-os/src'),
      '@hypercard/confirm-runtime': path.resolve(workspaceRoot, 'go-go-os/packages/confirm-runtime/src'),
      '@hypercard/todo': path.resolve(workspaceRoot, 'go-go-os/apps/todo'),
      '@hypercard/crm': path.resolve(workspaceRoot, 'go-go-os/apps/crm'),
      '@hypercard/book-tracker-debug': path.resolve(workspaceRoot, 'go-go-os/apps/book-tracker-debug'),
      '@hypercard/apps-browser/launcher': path.resolve(
        workspaceRoot,
        'go-go-os/apps/apps-browser/src/launcher/public.ts',
      ),
      '@hypercard/apps-browser': path.resolve(workspaceRoot, 'go-go-os/apps/apps-browser/src'),
      '@hypercard/hypercard-tools/launcher': path.resolve(
        workspaceRoot,
        'go-go-os/apps/hypercard-tools/src/launcher/public.ts',
      ),
      '@hypercard/hypercard-tools': path.resolve(workspaceRoot, 'go-go-os/apps/hypercard-tools/src'),
      '@hypercard/arc-agi-player/launcher': path.resolve(
        workspaceRoot,
        'go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts',
      ),
      '@hypercard/arc-agi-player': path.resolve(workspaceRoot, 'go-go-app-arc-agi-3/apps/arc-agi-player/src'),
      '@hypercard/inventory/launcher': path.resolve(
        workspaceRoot,
        'go-go-app-inventory/apps/inventory/src/launcher/public.ts',
      ),
      '@hypercard/inventory/reducers': path.resolve(
        workspaceRoot,
        'go-go-app-inventory/apps/inventory/src/reducers.ts',
      ),
      '@hypercard/inventory': path.resolve(workspaceRoot, 'go-go-app-inventory/apps/inventory/src'),
    },
  },
  server: {
    proxy: {
      '/api/apps/inventory/chat': {
        target: inventoryBackendTarget,
        changeOrigin: true,
      },
      '/api/apps/inventory/ws': {
        target: inventoryBackendTarget,
        ws: true,
        changeOrigin: true,
      },
      '/api/apps/inventory/api': {
        target: inventoryBackendTarget,
        changeOrigin: true,
      },
      '/api/apps/inventory/confirm': {
        target: inventoryBackendTarget,
        changeOrigin: true,
      },
      '/api/apps/inventory/confirm/ws': {
        target: inventoryBackendTarget,
        ws: true,
        changeOrigin: true,
      },
      '/api/os/apps': {
        target: inventoryBackendTarget,
        changeOrigin: true,
      },
      '/api/apps': {
        target: inventoryBackendTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
