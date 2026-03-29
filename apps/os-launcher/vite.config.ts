import path from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const workspaceRoot = path.resolve(__dirname, '../..');
const linkedReposRoot = path.resolve(workspaceRoot, 'workspace-links');
const inventoryBackendTarget = process.env.INVENTORY_CHAT_BACKEND ?? 'http://127.0.0.1:8091';
const hasArcAgiPlayerRepo = existsSync(path.resolve(linkedReposRoot, 'go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts'));
const hasSQLiteRepo = existsSync(path.resolve(linkedReposRoot, 'go-go-app-sqlite/apps/sqlite/src/launcher/public.ts'));
const frontendResolutionMode = resolveFrontendResolutionMode();
const workspacePackageExcludes = [
  '@go-go-golems/apps-browser',
  '@go-go-golems/book-tracker-debug',
  '@go-go-golems/os-chat',
  '@go-go-golems/crm',
  '@go-go-golems/os-shell',
  '@go-go-golems/os-core',
  '@go-go-golems/os-scripting',
  '@go-go-golems/hypercard-tools',
  '@go-go-golems/inventory',
  '@go-go-golems/todo',
];

type PackageExports = string | Record<string, string>;
type AliasEntry = { find: RegExp; replacement: string };
type FrontendResolutionMode = 'workspace' | 'published';

const publishedPlatformPackageNames = [
  '@go-go-golems/os-chat',
  '@go-go-golems/os-confirm',
  '@go-go-golems/os-core',
  '@go-go-golems/os-kanban',
  '@go-go-golems/os-repl',
  '@go-go-golems/os-scripting',
  '@go-go-golems/os-shell',
  '@go-go-golems/os-ui-cards',
  '@go-go-golems/os-widgets',
];

const publishedPlatformPackages = new Set(publishedPlatformPackageNames);

function resolveFrontendResolutionMode(): FrontendResolutionMode {
  const configuredMode = process.env.GO_GO_OS_FRONTEND_RESOLUTION;
  if (configuredMode === 'workspace' || configuredMode === 'published') {
    return configuredMode;
  }

  const workspaceFrontendRoot = path.resolve(linkedReposRoot, 'go-go-os-frontend');
  return existsSync(workspaceFrontendRoot) ? 'workspace' : 'published';
}

function createPublishedPackageAliases(): AliasEntry[] {
  const aliases: AliasEntry[] = [];

  for (const packageName of publishedPlatformPackageNames) {
    const packageDir = path.resolve(__dirname, 'node_modules', ...packageName.split('/'));
    const packageJsonPath = path.join(packageDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      exports?: PackageExports;
    };
    const packageExports = packageJson.exports;

    if (typeof packageExports === 'string') {
      aliases.push({
        find: new RegExp(`^${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
        replacement: path.resolve(packageDir, packageExports),
      });
      continue;
    }
    if (!packageExports || typeof packageExports !== 'object') {
      continue;
    }

    for (const [exportKey, exportTarget] of Object.entries(packageExports)) {
      if (typeof exportTarget !== 'string') {
        continue;
      }
      const aliasKey = exportKey === '.' ? packageName : `${packageName}/${exportKey.replace(/^\.\//, '')}`;
      aliases.push({
        find: new RegExp(`^${aliasKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
        replacement: path.resolve(packageDir, exportTarget),
      });
    }
  }

  aliases.sort((a, b) => String(b.find).length - String(a.find).length);
  return aliases;
}

function collectWorkspacePackageJsonPaths(): string[] {
  const packageJsonPaths: string[] = [];

  const registerPackageDirs = (baseDir: string) => {
    if (!existsSync(baseDir)) {
      return;
    }
    for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const packageJsonPath = path.join(baseDir, entry.name, 'package.json');
      if (existsSync(packageJsonPath)) {
        packageJsonPaths.push(packageJsonPath);
      }
    }
  };

  registerPackageDirs(path.resolve(workspaceRoot, 'apps'));

  if (existsSync(linkedReposRoot)) {
    for (const repoEntry of readdirSync(linkedReposRoot, { withFileTypes: true })) {
      if (!repoEntry.isDirectory()) {
        continue;
      }
      registerPackageDirs(path.join(linkedReposRoot, repoEntry.name, 'apps'));
      registerPackageDirs(path.join(linkedReposRoot, repoEntry.name, 'packages'));
    }
  }

  return packageJsonPaths;
}

function collectWorkspacePackageAliases(): AliasEntry[] {
  const aliases: AliasEntry[] = [];

  for (const packageJsonPath of collectWorkspacePackageJsonPaths()) {
    const packageDir = path.dirname(packageJsonPath);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      name?: string;
      exports?: PackageExports;
    };

    const packageName = String(packageJson.name ?? '').trim();
    if (!packageName.startsWith('@go-go-golems/')) {
      continue;
    }
    if (frontendResolutionMode === 'published' && publishedPlatformPackages.has(packageName)) {
      continue;
    }

    const packageExports = packageJson.exports;
    if (typeof packageExports === 'string') {
      aliases.push({
        find: new RegExp(`^${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
        replacement: path.resolve(packageDir, packageExports),
      });
      continue;
    }
    if (!packageExports || typeof packageExports !== 'object') {
      continue;
    }

    for (const [exportKey, exportTarget] of Object.entries(packageExports)) {
      if (typeof exportTarget !== 'string') {
        continue;
      }
      const aliasKey = exportKey === '.' ? packageName : `${packageName}/${exportKey.replace(/^\.\//, '')}`;
      aliases.push({
        find: new RegExp(`^${aliasKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
        replacement: path.resolve(packageDir, exportTarget),
      });
    }
  }

  aliases.sort((a, b) => String(b.find).length - String(a.find).length);
  return aliases;
}

const workspacePackageAliases = collectWorkspacePackageAliases();
const publishedPackageAliases = frontendResolutionMode === 'published' ? createPublishedPackageAliases() : [];

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
    alias: [
      ...publishedPackageAliases,
      ...workspacePackageAliases,
      {
        find: /^@hypercard\/arc-agi-player\/launcher$/,
        replacement: hasArcAgiPlayerRepo
          ? path.resolve(linkedReposRoot, 'go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts')
          : path.resolve(__dirname, 'src/app/shims/arcAgiPlayerLauncher.ts'),
      },
      {
        find: /^@hypercard\/sqlite\/launcher$/,
        replacement: hasSQLiteRepo
          ? path.resolve(linkedReposRoot, 'go-go-app-sqlite/apps/sqlite/src/launcher/public.ts')
          : path.resolve(__dirname, 'src/app/shims/sqliteLauncher.ts'),
      },
    ],
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
