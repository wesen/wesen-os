import {
  createVmmetaCardDocsMount,
  createVmmetaPackDocsMount,
  docsRegistry,
} from '@hypercard/apps-browser';
import { OS_LAUNCHER_VM_PACK_METADATA } from '../domain/vmmeta';

let registered = false;

export function registerAppsBrowserDocs() {
  if (registered) {
    return;
  }

  docsRegistry.register(createVmmetaPackDocsMount(OS_LAUNCHER_VM_PACK_METADATA));
  docsRegistry.register(createVmmetaCardDocsMount('os-launcher', OS_LAUNCHER_VM_PACK_METADATA));
  registered = true;
}
