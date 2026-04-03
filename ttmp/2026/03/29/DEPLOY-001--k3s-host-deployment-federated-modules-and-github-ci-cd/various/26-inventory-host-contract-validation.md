# Validate Inventory Host Contract

## Host imports after collapse
apps/os-launcher/src/__tests__/launcherHost.test.tsx:171:    expect(moduleSource).toContain("@go-go-golems/inventory/host");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:172:    expect(storeSource).toContain("@go-go-golems/inventory/host");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:173:    expect(docsSource).toContain("@go-go-golems/inventory/host");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:174:    expect(moduleSource).not.toContain("@go-go-golems/inventory/launcher");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:175:    expect(storeSource).not.toContain("@go-go-golems/inventory/reducers");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:176:    expect(moduleSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/__tests__/launcherHost.test.tsx:177:    expect(storeSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/__tests__/launcherHost.test.tsx:178:    expect(docsSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/app/registerAppsBrowserDocs.ts:6:import { inventoryHostContract } from '@go-go-golems/inventory/host';
apps/os-launcher/src/app/runtimeDebugModule.test.tsx:8:vi.mock('@go-go-golems/inventory/host', () => ({
apps/os-launcher/src/app/store.ts:5:import { inventoryHostContract } from '@go-go-golems/inventory/host';
apps/os-launcher/src/app/modules.tsx:7:import { inventoryHostContract } from '@go-go-golems/inventory/host';
apps/os-launcher/src/app/hypercardReplModule.tsx:25:import { inventoryHostContract } from '@go-go-golems/inventory/host';
apps/os-launcher/src/app/registerAppsBrowserDocs.test.ts:3:import { INVENTORY_VM_PACK_METADATA } from '@go-go-golems/inventory';
apps/os-launcher/src/app/taskManagerModule.tsx:13:import { inventoryHostContract } from '@go-go-golems/inventory/host';
apps/os-launcher/src/app/runtimeDebugModule.tsx:9:import { inventoryHostContract } from '@go-go-golems/inventory/host';
apps/os-launcher/src/__tests__/launcherHost.test.tsx:171:    expect(moduleSource).toContain("@go-go-golems/inventory/host");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:172:    expect(storeSource).toContain("@go-go-golems/inventory/host");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:173:    expect(docsSource).toContain("@go-go-golems/inventory/host");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:174:    expect(moduleSource).not.toContain("@go-go-golems/inventory/launcher");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:175:    expect(storeSource).not.toContain("@go-go-golems/inventory/reducers");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:176:    expect(moduleSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/__tests__/launcherHost.test.tsx:177:    expect(storeSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/__tests__/launcherHost.test.tsx:178:    expect(docsSource).not.toContain('@go-go-golems/inventory/src/');

## Launcher typecheck

> @go-go-golems/os-launcher@0.1.0 pretypecheck
> npm run vmmeta:generate


> @go-go-golems/os-launcher@0.1.0 vmmeta:generate
> go run ../../workspace-links/go-go-os-backend/cmd/go-go-os-backend vmmeta generate --pack-id kanban.v1 --cards-dir src/domain/vm/cards --docs-dir src/domain/vm/docs --output-json src/domain/generated/kanban.vmmeta.json --output-ts src/domain/generated/kanbanVmmeta.generated.ts


> @go-go-golems/os-launcher@0.1.0 typecheck
> node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.json


## Inventory typecheck

> @go-go-golems/inventory@0.1.0 pretypecheck
> npm run vmmeta:generate


> @go-go-golems/inventory@0.1.0 vmmeta:generate
> go run ../../../go-go-os-backend/cmd/go-go-os-backend vmmeta generate --pack-id ui.card.v1 --cards-dir src/domain/vm/cards --docs-dir src/domain/vm/docs --output-json src/domain/generated/inventory.vmmeta.json --output-ts src/domain/generated/inventoryVmmeta.generated.ts


> @go-go-golems/inventory@0.1.0 typecheck
> node ../../../../node_modules/typescript/bin/tsc -b


## Focused launcher tests

> @go-go-golems/os-launcher@0.1.0 pretest
> npm run vmmeta:generate


> @go-go-golems/os-launcher@0.1.0 vmmeta:generate
> go run ../../workspace-links/go-go-os-backend/cmd/go-go-os-backend vmmeta generate --pack-id kanban.v1 --cards-dir src/domain/vm/cards --docs-dir src/domain/vm/docs --output-json src/domain/generated/kanban.vmmeta.json --output-ts src/domain/generated/kanbanVmmeta.generated.ts


> @go-go-golems/os-launcher@0.1.0 test
> vitest run --run runtimeDebugModule registerAppsBrowserDocs launcherHost


 RUN  v4.0.18 /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher

stdout | src/app/runtimeDebugModule.test.tsx
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

stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/app/runtimeDebugModule.test.tsx
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

stdout | src/app/runtimeDebugModule.test.tsx > runtimeDebugLauncherModule > builds the shared Stacks & Cards launcher window
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

stdout | src/app/runtimeDebugModule.test.tsx > runtimeDebugLauncherModule > registers inventory and os-launcher stacks on import and renders the shared window
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

 ✓ src/app/runtimeDebugModule.test.tsx (2 tests) 207ms
stdout | src/app/registerAppsBrowserDocs.test.ts
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

stdout | src/app/registerAppsBrowserDocs.integration.test.ts
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

stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/app/registerAppsBrowserDocs.test.ts
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

stdout | src/app/registerAppsBrowserDocs.integration.test.ts
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

stdout | src/__tests__/launcherHost.test.tsx
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

 ✓ src/app/registerAppsBrowserDocs.integration.test.ts (1 test) 23ms
stdout | src/app/registerAppsBrowserDocs.test.ts > registerAppsBrowserDocs > registers package-owned kanban surface-type docs and app-owned surface docs
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

stdout | src/app/registerAppsBrowserDocs.test.ts > registerAppsBrowserDocs > registers package-owned kanban surface-type docs and app-owned surface docs
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

 ✓ src/app/registerAppsBrowserDocs.test.ts (1 test) 276ms
stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/__tests__/launcherHost.test.tsx
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

stdout | src/__tests__/launcherHost.test.tsx
[QuickJSRuntimeService] Created service instance {
  instanceId: 'runtime-service-2',
  options: {
    memoryLimitBytes: 33554432,
    stackLimitBytes: 1048576,
    loadTimeoutMs: 1000,
    renderTimeoutMs: 100,
    eventTimeoutMs: 100
  }
}

 ✓ src/__tests__/launcherHost.test.tsx (17 tests) 46ms

 Test Files  4 passed (4)
      Tests  21 passed (21)
   Start at  19:17:28
   Duration  21.77s (transform 34.79s, setup 155ms, import 48.34s, tests 552ms, environment 1ms)

