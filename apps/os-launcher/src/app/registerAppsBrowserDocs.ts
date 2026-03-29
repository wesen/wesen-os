import {
  createVmmetaSurfaceDocsMount,
  createVmmetaSurfaceTypeDocsMount,
  docsRegistry,
} from '@go-go-golems/apps-browser';
import { inventoryHostContract } from '@go-go-golems/inventory/host';
import { KANBAN_RUNTIME_DOCS_METADATA } from '@go-go-golems/os-kanban';
import { UI_RUNTIME_DOCS_METADATA } from '@go-go-golems/os-ui-cards';
import { OS_LAUNCHER_VM_PACK_METADATA } from '../domain/vmmeta';

let registered = false;

export function registerAppsBrowserDocs() {
  if (registered) {
    return;
  }

  docsRegistry.register(createVmmetaSurfaceTypeDocsMount(KANBAN_RUNTIME_DOCS_METADATA));
  docsRegistry.register(createVmmetaSurfaceTypeDocsMount(UI_RUNTIME_DOCS_METADATA));
  docsRegistry.register(createVmmetaSurfaceDocsMount('os-launcher', OS_LAUNCHER_VM_PACK_METADATA));
  docsRegistry.register(createVmmetaSurfaceDocsMount('inventory', inventoryHostContract.docsMetadata));
  registered = true;
}
