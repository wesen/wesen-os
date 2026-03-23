// @ts-check
defineRuntimeBundle(({ ui }) => {
  return {
    id: 'os-launcher',
    title: 'go-go-os Launcher',
    packageIds: ["ui", "kanban"],
    initialSessionState: FILTER_DEFAULTS,
    initialSurfaceState: Object.fromEntries(KANBAN_BOARDS.map((board) => [board.id, initialBoardState(board)])),
    surfaces: {
      home: {
        packId: 'ui.card.v1',
        render() {
          return ui.panel([
            ui.text('go-go-os Launcher'),
            ui.text('Select an app icon to open a window.'),
            ui.text('This stack also hosts the Kanban VM demo cards used by the wesen-os shortcut.'),
            ui.button('🏁 Open Sprint Board', { onClick: { handler: 'go', args: { surfaceId: 'kanbanSprintBoard' } } }),
            ui.button('🐞 Open Bug Triage', { onClick: { handler: 'go', args: { surfaceId: 'kanbanBugTriage' } } }),
            ui.button('🗓️ Open Personal Planner', { onClick: { handler: 'go', args: { surfaceId: 'kanbanPersonalPlanner' } } }),
          ]);
        },
        handlers: {
          go(context, args) {
            const surfaceId = toText(asRecord(args).surfaceId, 'home');
            context.dispatch({ type: 'nav.go', payload: { surfaceId } });
          },
        },
      },
    },
  };
});
