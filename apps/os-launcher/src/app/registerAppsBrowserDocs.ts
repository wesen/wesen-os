import {
  createVmmetaCardDocsMount,
  createVmmetaPackDocsMount,
  docsRegistry,
} from '@hypercard/apps-browser';
import { INVENTORY_VM_PACK_METADATA } from '@hypercard/inventory';
import { OS_LAUNCHER_VM_PACK_METADATA } from '../domain/vmmeta';

let registered = false;

export function registerAppsBrowserDocs() {
  if (registered) {
    return;
  }

  docsRegistry.register(createVmmetaPackDocsMount(OS_LAUNCHER_VM_PACK_METADATA));
  docsRegistry.register(createVmmetaCardDocsMount('os-launcher', OS_LAUNCHER_VM_PACK_METADATA));
  docsRegistry.register(createVmmetaPackDocsMount(INVENTORY_VM_PACK_METADATA));
  docsRegistry.register(createVmmetaCardDocsMount('inventory', INVENTORY_VM_PACK_METADATA));
  registered = true;
}
