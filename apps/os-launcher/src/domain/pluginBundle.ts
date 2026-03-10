import runtimePrelude from './vm/00-runtimePrelude.vm.js?raw';
import homeCard from './vm/10-home.vm.js?raw';
import kanbanPackDocs from './vm/docs/kanban-pack.docs.vm.js?raw';
import kanbanBugTriage from './vm/cards/kanbanBugTriage.vm.js?raw';
import kanbanIncidentCommand from './vm/cards/kanbanIncidentCommand.vm.js?raw';
import kanbanPersonalPlanner from './vm/cards/kanbanPersonalPlanner.vm.js?raw';
import kanbanReleaseTrain from './vm/cards/kanbanReleaseTrain.vm.js?raw';
import kanbanSprintBoard from './vm/cards/kanbanSprintBoard.vm.js?raw';

export const OS_LAUNCHER_PLUGIN_BUNDLE = [
  runtimePrelude,
  homeCard,
  kanbanPackDocs,
  kanbanSprintBoard,
  kanbanBugTriage,
  kanbanPersonalPlanner,
  kanbanIncidentCommand,
  kanbanReleaseTrain,
].join('\n\n');
