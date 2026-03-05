import path from 'node:path';
import { existsSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const workspaceRoot = path.resolve(__dirname, '../..');
const linkedReposRoot = path.resolve(workspaceRoot, 'workspace-links');
const inventoryBackendTarget = process.env.INVENTORY_CHAT_BACKEND ?? 'http://127.0.0.1:8091';
const hasArcAgiPlayerRepo = existsSync(path.resolve(linkedReposRoot, 'go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts'));
const hasSQLiteRepo = existsSync(path.resolve(linkedReposRoot, 'go-go-app-sqlite/apps/sqlite/src/launcher/public.ts'));

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    preserveSymlinks: true,
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
