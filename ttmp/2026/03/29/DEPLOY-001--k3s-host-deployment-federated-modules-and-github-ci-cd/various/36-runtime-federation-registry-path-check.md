# Runtime Federation Registry Path Check

## Go endpoint tests
ok  	github.com/go-go-golems/wesen-os/cmd/wesen-os-launcher	(cached)

## Launcher typecheck

> @go-go-golems/os-launcher@0.1.0 pretypecheck
> npm run vmmeta:generate


> @go-go-golems/os-launcher@0.1.0 vmmeta:generate
> go run ../../workspace-links/go-go-os-backend/cmd/go-go-os-backend vmmeta generate --pack-id kanban.v1 --cards-dir src/domain/vm/cards --docs-dir src/domain/vm/docs --output-json src/domain/generated/kanban.vmmeta.json --output-ts src/domain/generated/kanbanVmmeta.generated.ts


> @go-go-golems/os-launcher@0.1.0 typecheck
> node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.json


## Launcher federation tests

> @go-go-golems/os-launcher@0.1.0 pretest
> npm run vmmeta:generate


> @go-go-golems/os-launcher@0.1.0 vmmeta:generate
> go run ../../workspace-links/go-go-os-backend/cmd/go-go-os-backend vmmeta generate --pack-id kanban.v1 --cards-dir src/domain/vm/cards --docs-dir src/domain/vm/docs --output-json src/domain/generated/kanban.vmmeta.json --output-ts src/domain/generated/kanbanVmmeta.generated.ts


> @go-go-golems/os-launcher@0.1.0 test
> vitest run --run federationRegistry bootstrapLauncherApp loadFederatedAppContracts


 RUN  v4.0.18 /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher

 ✓ src/app/federationRegistry.test.ts (3 tests) 53ms
stdout | src/app/bootstrapLauncherApp.test.ts
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

stdout | src/app/loadFederatedAppContracts.test.ts
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

stdout | src/app/bootstrapLauncherApp.test.ts > bootstrapLauncherApp > bootstraps the launcher with a manifest-backed inventory remote
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

stdout | src/app/bootstrapLauncherApp.test.ts > bootstrapLauncherApp > bootstraps the launcher with a manifest-backed inventory remote
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

stdout | src/app/loadFederatedAppContracts.test.ts
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

 ↓ src/app/loadFederatedAppContracts.real.test.ts (1 test | 1 skipped)
 ✓ src/app/bootstrapLauncherApp.test.ts (1 test) 7283ms
     ✓ bootstraps the launcher with a manifest-backed inventory remote  7250ms
 ✓ src/app/loadFederatedAppContracts.test.ts (3 tests) 65ms

 Test Files  3 passed | 1 skipped (4)
      Tests  7 passed | 1 skipped (8)
   Start at  17:34:00
   Duration  11.08s (transform 23.48s, setup 244ms, import 24.49s, tests 7.40s, environment 5ms)

