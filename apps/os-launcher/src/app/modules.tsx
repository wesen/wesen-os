import { bookTrackerLauncherModule } from '@hypercard/book-tracker-debug/launcher';
import { crmLauncherModule } from '@hypercard/crm/launcher';
import type { LaunchableAppModule } from '@hypercard/desktop-os';
import { arcPlayerLauncherModule } from '@hypercard/arc-agi-player/launcher';
import { appsBrowserLauncherModule } from '@hypercard/apps-browser/launcher';
import { hypercardToolsLauncherModule } from '@hypercard/hypercard-tools/launcher';
import { inventoryLauncherModule } from '@hypercard/inventory/launcher';
import { richWidgetsLauncherModule } from '@hypercard/rich-widgets/launcher';
import { sqliteLauncherModule } from '@hypercard/sqlite/launcher';
import { todoLauncherModule } from '@hypercard/todo/launcher';
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
