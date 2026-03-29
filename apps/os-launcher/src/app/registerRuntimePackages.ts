import { KANBAN_RUNTIME_PACKAGE, KANBAN_V1_RUNTIME_SURFACE_TYPE } from '@go-go-golems/os-kanban';
import { registerRuntimePackage, registerRuntimeSurfaceType } from '@go-go-golems/os-scripting';
import { UI_CARD_V1_RUNTIME_SURFACE_TYPE, UI_RUNTIME_PACKAGE } from '@go-go-golems/os-ui-cards';

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
