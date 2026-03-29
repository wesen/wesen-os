# Inventory Host Surface Audit

## Host imports
apps/os-launcher/src/app/registerAppsBrowserDocs.ts:8:import { INVENTORY_VM_PACK_METADATA } from '@go-go-golems/inventory';
apps/os-launcher/src/app/runtimeDebugModule.test.tsx:8:vi.mock('@go-go-golems/inventory/launcher', () => ({
apps/os-launcher/src/app/store.ts:5:import { inventoryReducer, salesReducer } from '@go-go-golems/inventory/reducers';
apps/os-launcher/src/app/modules.tsx:7:import { inventoryLauncherModule } from '@go-go-golems/inventory/launcher';
apps/os-launcher/src/app/hypercardReplModule.tsx:25:import { INVENTORY_VM_PACK_METADATA } from '@go-go-golems/inventory';
apps/os-launcher/src/app/hypercardReplModule.tsx:26:import { inventoryStack } from '@go-go-golems/inventory/launcher';
apps/os-launcher/src/app/registerAppsBrowserDocs.test.ts:3:import { INVENTORY_VM_PACK_METADATA } from '@go-go-golems/inventory';
apps/os-launcher/src/app/taskManagerModule.tsx:13:import { inventoryStack } from '@go-go-golems/inventory/launcher';
apps/os-launcher/src/app/runtimeDebugModule.tsx:9:import { inventoryStack } from '@go-go-golems/inventory/launcher';
apps/os-launcher/src/__tests__/launcherHost.test.tsx:170:    expect(moduleSource).toContain("@go-go-golems/inventory/launcher");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:171:    expect(storeSource).toContain("@go-go-golems/inventory/reducers");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:172:    expect(moduleSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/__tests__/launcherHost.test.tsx:173:    expect(storeSource).not.toContain('@go-go-golems/inventory/src/');

## Inventory public exports
{
  "name": "@go-go-golems/inventory",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./launcher": "./src/launcher/public.ts",
    "./reducers": "./src/reducers.ts"
  },
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "vmmeta:generate": "go run ../../../go-go-os-backend/cmd/go-go-os-backend vmmeta generate --pack-id ui.card.v1 --cards-dir src/domain/vm/cards --docs-dir src/domain/vm/docs --output-json src/domain/generated/inventory.vmmeta.json --output-ts src/domain/generated/inventoryVmmeta.generated.ts",
    "predev": "npm run vmmeta:generate",
    "dev": "vite",
    "prebuild": "npm run vmmeta:generate",
    "build": "npm run typecheck && vite build",
    "pretypecheck": "npm run vmmeta:generate",
    "typecheck": "node ../../../../node_modules/typescript/bin/tsc -b",
    "typecheck:published": "tsc --noEmit -p tsconfig.published.json",
    "pretest": "npm run vmmeta:generate",
    "test": "vitest run",
    "preview": "vite preview",
    "storybook": "storybook dev -p 6006 --config-dir ../../.storybook",
    "build-storybook": "storybook build --config-dir ../../.storybook"
  },
  "dependencies": {
    "@codemirror/lang-javascript": "^6.2.4",
    "@codemirror/lang-yaml": "^6.1.2",
    "@codemirror/language": "^6.12.1",
    "@codemirror/state": "^6.5.4",
    "@codemirror/theme-one-dark": "^6.1.3",
    "@codemirror/view": "^6.39.14",
    "@go-go-golems/os-confirm": "workspace:*",
    "@reduxjs/toolkit": "^2.5.0",
    "@go-go-golems/os-chat": "workspace:*",
    "@go-go-golems/os-core": "workspace:*",
    "@go-go-golems/os-kanban": "workspace:*",
    "@go-go-golems/os-shell": "workspace:*",
    "@go-go-golems/os-scripting": "workspace:*",
    "@go-go-golems/os-ui-cards": "workspace:*",
    "codemirror": "^6.0.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-redux": "^9.2.0"
  },
  "devDependencies": {
    "@chromatic-com/storybook": "^5.0.1",
    "@storybook/addon-a11y": "^10.2.8",
    "@storybook/addon-docs": "^10.2.8",
    "@storybook/addon-onboarding": "^10.2.8",
    "@storybook/addon-vitest": "^10.2.8",
    "@storybook/react-vite": "^10.2.8",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@vitest/browser-playwright": "^4.0.18",
    "@vitest/coverage-v8": "^4.0.18",
    "playwright": "^1.58.2",
    "storybook": "^10.2.8",
    "typescript": "~5.7.0",
    "vite": "^6.1.0",
    "vitest": "^4.0.18"
  }
}

## Inventory launcher public surface
export { inventoryLauncherModule } from './module';
export { STACK as inventoryStack } from '../domain/stack';
export { INVENTORY_VM_PACK_METADATA, INVENTORY_VM_CARD_META } from '../domain/vmmeta';
