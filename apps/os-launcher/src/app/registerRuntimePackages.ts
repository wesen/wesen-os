import { KANBAN_RUNTIME_PACKAGE, KANBAN_V1_RUNTIME_SURFACE_TYPE } from '@hypercard/kanban-runtime';
import { registerRuntimePackage, registerRuntimeSurfaceType } from '@hypercard/hypercard-runtime';
import { UI_CARD_V1_RUNTIME_SURFACE_TYPE, UI_RUNTIME_PACKAGE } from '@hypercard/ui-runtime';

let registered = false;

export function registerRuntimePackages() {
  if (registered) {
    return;
  }

  registerRuntimePackage(UI_RUNTIME_PACKAGE);
  registerRuntimeSurfaceType(UI_CARD_V1_RUNTIME_SURFACE_TYPE);
  registerRuntimePackage(KANBAN_RUNTIME_PACKAGE);
  registerRuntimeSurfaceType(KANBAN_V1_RUNTIME_SURFACE_TYPE);
  registered = true;
}
