import path from 'node:path';
import { existsSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const workspaceRoot = path.resolve(__dirname, '../..');
const linkedReposRoot = path.resolve(workspaceRoot, 'workspace-links');
const inventoryBackendTarget = process.env.INVENTORY_CHAT_BACKEND ?? 'http://127.0.0.1:8091';
const hasArcAgiPlayerRepo = existsSync(path.resolve(linkedReposRoot, 'go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts'));
const hasSQLiteRepo = existsSync(path.resolve(linkedReposRoot, 'go-go-app-sqlite/apps/sqlite/src/launcher/public.ts'));
const workspacePackageExcludes = [
  '@hypercard/apps-browser',
  '@hypercard/book-tracker-debug',
  '@hypercard/chat-runtime',
  '@hypercard/crm',
  '@hypercard/desktop-os',
  '@hypercard/engine',
  '@hypercard/hypercard-runtime',
  '@hypercard/hypercard-tools',
  '@hypercard/inventory',
  '@hypercard/todo',
];

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: workspacePackageExcludes,
    include: [
      'debug',
      'extend',
      'extend/index.js',
      'highlight.js',
      'highlight.js/lib/core',
      'style-to-js',
      'style-to-js/cjs/index.js',
      'style-to-object',
    ],
    needsInterop: [
      'debug',
      'extend',
      'extend/index.js',
      'highlight.js',
      'highlight.js/lib/core',
      'style-to-js',
      'style-to-js/cjs/index.js',
      'style-to-object',
    ],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@hypercard/arc-agi-player/launcher': hasArcAgiPlayerRepo
        ? path.resolve(linkedReposRoot, 'go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts')
        : path.resolve(__dirname, 'src/app/shims/arcAgiPlayerLauncher.ts'),
      '@hypercard/sqlite/launcher': hasSQLiteRepo
        ? path.resolve(linkedReposRoot, 'go-go-app-sqlite/apps/sqlite/src/launcher/public.ts')
        : path.resolve(__dirname, 'src/app/shims/sqliteLauncher.ts'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: inventoryBackendTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
