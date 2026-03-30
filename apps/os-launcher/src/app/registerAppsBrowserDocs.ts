import {
  createVmmetaSurfaceDocsMount,
  createVmmetaSurfaceTypeDocsMount,
  docsRegistry,
} from '@go-go-golems/apps-browser';
import { KANBAN_RUNTIME_DOCS_METADATA } from '@go-go-golems/os-kanban';
import { UI_RUNTIME_DOCS_METADATA } from '@go-go-golems/os-ui-cards';
import { OS_LAUNCHER_VM_PACK_METADATA } from '../domain/vmmeta';
import { listRuntimeFederatedDocsMounts } from './localFederatedAppContracts';

let registered = false;
type VmmetaSurfaceDocsMetadata = Parameters<typeof createVmmetaSurfaceDocsMount>[1];

function isVmmetaSurfaceDocsMetadata(metadata: unknown): metadata is VmmetaSurfaceDocsMetadata {
  return typeof metadata === 'object' && metadata !== null && typeof (metadata as { packId?: unknown }).packId === 'string';
}

export function registerAppsBrowserDocs() {
  if (registered) {
    return;
  }

  docsRegistry.register(createVmmetaSurfaceTypeDocsMount(KANBAN_RUNTIME_DOCS_METADATA));
  docsRegistry.register(createVmmetaSurfaceTypeDocsMount(UI_RUNTIME_DOCS_METADATA));
  docsRegistry.register(createVmmetaSurfaceDocsMount('os-launcher', OS_LAUNCHER_VM_PACK_METADATA));
  for (const mount of listRuntimeFederatedDocsMounts()) {
    if (!isVmmetaSurfaceDocsMetadata(mount.metadata)) {
      throw new Error(`Remote "${mount.owner}" exported invalid docs metadata for apps-browser registration.`);
    }
    docsRegistry.register(createVmmetaSurfaceDocsMount(mount.owner, mount.metadata));
  }
  registered = true;
}
