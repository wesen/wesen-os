import {
  createVmmetaSurfaceDocsMount,
  createVmmetaSurfaceTypeDocsMount,
  docsRegistry,
} from '@hypercard/apps-browser';
import { INVENTORY_VM_PACK_METADATA } from '@hypercard/inventory';
import { OS_LAUNCHER_VM_PACK_METADATA } from '../domain/vmmeta';

let registered = false;

export function registerAppsBrowserDocs() {
  if (registered) {
    return;
  }

  docsRegistry.register(createVmmetaSurfaceTypeDocsMount(OS_LAUNCHER_VM_PACK_METADATA));
  docsRegistry.register(createVmmetaSurfaceDocsMount('os-launcher', OS_LAUNCHER_VM_PACK_METADATA));
  docsRegistry.register(createVmmetaSurfaceTypeDocsMount(INVENTORY_VM_PACK_METADATA));
  docsRegistry.register(createVmmetaSurfaceDocsMount('inventory', INVENTORY_VM_PACK_METADATA));
  registered = true;
}
