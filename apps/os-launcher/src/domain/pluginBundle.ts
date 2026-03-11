import runtimePrelude from './vm/00-runtimePrelude.vm.js?raw';
import homeSurface from './vm/10-home.vm.js?raw';
import kanbanBugTriage from './vm/cards/kanbanBugTriage.vm.js?raw';
import kanbanIncidentCommand from './vm/cards/kanbanIncidentCommand.vm.js?raw';
import kanbanPersonalPlanner from './vm/cards/kanbanPersonalPlanner.vm.js?raw';
import kanbanReleaseTrain from './vm/cards/kanbanReleaseTrain.vm.js?raw';
import kanbanSprintBoard from './vm/cards/kanbanSprintBoard.vm.js?raw';

// Bundle-local helpers stay here; shared DSL APIs now come from runtime packages.
const OS_LAUNCHER_BUNDLE_PRELUDE = [
  runtimePrelude,
];

const OS_LAUNCHER_BUNDLE_DOCS = [
  homeSurface,
];

const OS_LAUNCHER_BUNDLE_SURFACES = [
  kanbanSprintBoard,
  kanbanBugTriage,
  kanbanPersonalPlanner,
  kanbanIncidentCommand,
  kanbanReleaseTrain,
];

export const OS_LAUNCHER_PLUGIN_BUNDLE = [
  ...OS_LAUNCHER_BUNDLE_PRELUDE,
  ...OS_LAUNCHER_BUNDLE_DOCS,
  ...OS_LAUNCHER_BUNDLE_SURFACES,
].join('\n\n');
