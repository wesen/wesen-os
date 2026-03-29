import path from 'node:path';
import { existsSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const workspaceRoot = path.resolve(__dirname, '../..');
const linkedReposRoot = path.resolve(workspaceRoot, 'workspace-links');
const hasArcAgiPlayerRepo = existsSync(path.resolve(linkedReposRoot, 'go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts'));
const hasSQLiteRepo = existsSync(path.resolve(linkedReposRoot, 'go-go-app-sqlite/apps/sqlite/src/launcher/public.ts'));

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    preserveSymlinks: true,
    alias: {
      '@go-go-golems/arc-agi-player/launcher': hasArcAgiPlayerRepo
        ? path.resolve(linkedReposRoot, 'go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts')
        : path.resolve(__dirname, 'src/app/shims/arcAgiPlayerLauncher.ts'),
      '@go-go-golems/sqlite/launcher': hasSQLiteRepo
        ? path.resolve(linkedReposRoot, 'go-go-app-sqlite/apps/sqlite/src/launcher/public.ts')
        : path.resolve(__dirname, 'src/app/shims/sqliteLauncher.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['dist/**', 'node_modules/**'],
    setupFiles: ['src/__tests__/setup.ts'],
    environmentOptions: {
      jsdom: {
        url: 'http://127.0.0.1/',
      },
    },
  },
});
