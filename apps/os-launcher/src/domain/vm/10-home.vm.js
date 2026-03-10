// @ts-check
defineStackBundle(({ ui }) => {
  return {
    id: 'os-launcher',
    title: 'go-go-os Launcher',
    initialSessionState: FILTER_DEFAULTS,
    initialCardState: Object.fromEntries(KANBAN_BOARDS.map((board) => [board.id, initialBoardState(board)])),
    cards: {
      home: {
        render() {
          return ui.panel([
            ui.text('go-go-os Launcher'),
            ui.text('Select an app icon to open a window.'),
            ui.text('This stack also hosts the Kanban VM demo cards used by the wesen-os shortcut.'),
            ui.button('🏁 Open Sprint Board', { onClick: { handler: 'go', args: { cardId: 'kanbanSprintBoard' } } }),
            ui.button('🐞 Open Bug Triage', { onClick: { handler: 'go', args: { cardId: 'kanbanBugTriage' } } }),
            ui.button('🗓️ Open Personal Planner', { onClick: { handler: 'go', args: { cardId: 'kanbanPersonalPlanner' } } }),
          ]);
        },
        handlers: {
          go(context, args) {
            const cardId = toText(asRecord(args).cardId, 'home');
            context.dispatch({ type: 'nav.go', payload: { cardId } });
          },
        },
      },
    },
  };
});
