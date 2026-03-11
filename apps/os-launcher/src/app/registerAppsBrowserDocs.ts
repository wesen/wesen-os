import {
  createVmmetaSurfaceDocsMount,
  createVmmetaSurfaceTypeDocsMount,
  docsRegistry,
} from '@hypercard/apps-browser';
import { KANBAN_RUNTIME_DOCS_METADATA } from '@hypercard/kanban-runtime';
import { INVENTORY_VM_PACK_METADATA } from '@hypercard/inventory';
import { OS_LAUNCHER_VM_PACK_METADATA } from '../domain/vmmeta';

let registered = false;

export function registerAppsBrowserDocs() {
  if (registered) {
    return;
  }

  docsRegistry.register(createVmmetaSurfaceTypeDocsMount(KANBAN_RUNTIME_DOCS_METADATA));
  docsRegistry.register(createVmmetaSurfaceDocsMount('os-launcher', OS_LAUNCHER_VM_PACK_METADATA));
  docsRegistry.register(createVmmetaSurfaceTypeDocsMount(INVENTORY_VM_PACK_METADATA));
  docsRegistry.register(createVmmetaSurfaceDocsMount('inventory', INVENTORY_VM_PACK_METADATA));
  registered = true;
}
