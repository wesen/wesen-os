# Real Inventory Federation Smoke

## Build inventory federation artifact

> @go-go-golems/inventory@0.1.0 build:federation
> npm run vmmeta:generate && vite build --config vite.federation.config.ts


> @go-go-golems/inventory@0.1.0 vmmeta:generate
> go run ../../../go-go-os-backend/cmd/go-go-os-backend vmmeta generate --pack-id ui.card.v1 --cards-dir src/domain/vm/cards --docs-dir src/domain/vm/docs --output-json src/domain/generated/inventory.vmmeta.json --output-ts src/domain/generated/inventoryVmmeta.generated.ts

vite v6.4.1 building for production...
transforming...
✓ 532 modules transformed.
rendering chunks...
computing gzip size...
dist-federation/mf-manifest.json                0.19 kB │ gzip:   0.15 kB
dist-federation/inventory-host-contract.js  2,671.56 kB │ gzip: 951.54 kB │ map: 4,699.42 kB
✓ built in 5.00s

## Manifest file
/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/dist-federation/mf-manifest.json

## Loader smoke

> @go-go-golems/os-launcher@0.1.0 pretest
> npm run vmmeta:generate


> @go-go-golems/os-launcher@0.1.0 vmmeta:generate
> go run ../../workspace-links/go-go-os-backend/cmd/go-go-os-backend vmmeta generate --pack-id kanban.v1 --cards-dir src/domain/vm/cards --docs-dir src/domain/vm/docs --output-json src/domain/generated/kanban.vmmeta.json --output-ts src/domain/generated/kanbanVmmeta.generated.ts


> @go-go-golems/os-launcher@0.1.0 test
> vitest run --run src/app/loadFederatedAppContracts.real.test.ts


 RUN  v4.0.18 /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher

stdout | src/app/loadFederatedAppContracts.real.test.ts
[QuickJSRuntimeService] Created service instance {
  instanceId: 'runtime-service-1',
  options: {
    memoryLimitBytes: 33554432,
    stackLimitBytes: 1048576,
    loadTimeoutMs: 1000,
    renderTimeoutMs: 100,
    eventTimeoutMs: 100
  }
}

stdout | src/app/loadFederatedAppContracts.real.test.ts
[QuickJSRuntimeService] Created service instance {
  instanceId: 'runtime-service-1',
  options: {
    memoryLimitBytes: 33554432,
    stackLimitBytes: 1048576,
    loadTimeoutMs: 1000,
    renderTimeoutMs: 100,
    eventTimeoutMs: 100
  }
}

stdout | src/app/loadFederatedAppContracts.real.test.ts > loadFederatedAppContracts real smoke > loads the built inventory federation artifact from a real manifest file
[QuickJSRuntimeService] Created service instance {
  instanceId: 'runtime-service-1',
  options: {
    memoryLimitBytes: 33554432,
    stackLimitBytes: 1048576,
    loadTimeoutMs: 1000,
    renderTimeoutMs: 100,
    eventTimeoutMs: 100
  }
}

 ✓ src/app/loadFederatedAppContracts.real.test.ts (1 test) 2266ms
     ✓ loads the built inventory federation artifact from a real manifest file  2225ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  16:05:16
   Duration  12.50s (transform 9.69s, setup 60ms, import 9.98s, tests 2.27s, environment 0ms)

