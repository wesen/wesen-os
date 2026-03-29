import { bookTrackerLauncherModule } from '@go-go-golems/book-tracker-debug/launcher';
import { crmLauncherModule } from '@go-go-golems/crm/launcher';
import type { LaunchableAppModule } from '@go-go-golems/os-shell';
import { arcPlayerLauncherModule } from '@go-go-golems/arc-agi-player/launcher';
import { appsBrowserLauncherModule } from '@go-go-golems/apps-browser/launcher';
import { hypercardToolsLauncherModule } from '@go-go-golems/hypercard-tools/launcher';
import { inventoryLauncherModule } from '@go-go-golems/inventory/launcher';
import { richWidgetsLauncherModule } from '@go-go-golems/os-widgets/launcher';
import { sqliteLauncherModule } from '@go-go-golems/sqlite/launcher';
import { todoLauncherModule } from '@go-go-golems/todo/launcher';
import { assistantLauncherModule } from './assistantModule';
import { hypercardReplLauncherModule } from './hypercardReplModule';
import { jsReplLauncherModule } from './jsReplModule';
import { kanbanVmLauncherModule } from './kanbanVmModule';
import { registerAppsBrowserDocs } from './registerAppsBrowserDocs';
import { runtimeDebugLauncherModule } from './runtimeDebugModule';
import { taskManagerLauncherModule } from './taskManagerModule';

registerAppsBrowserDocs();

function isLaunchableAppModule(module: LaunchableAppModule | null): module is LaunchableAppModule {
  return module !== null;
}

export const launcherModules: LaunchableAppModule[] = [
  assistantLauncherModule,
  hypercardReplLauncherModule,
  jsReplLauncherModule,
  inventoryLauncherModule,
  sqliteLauncherModule,
  todoLauncherModule,
  crmLauncherModule,
  bookTrackerLauncherModule,
  arcPlayerLauncherModule,
  appsBrowserLauncherModule,
  hypercardToolsLauncherModule,
  kanbanVmLauncherModule,
  runtimeDebugLauncherModule,
  taskManagerLauncherModule,
  richWidgetsLauncherModule,
].filter(isLaunchableAppModule);
