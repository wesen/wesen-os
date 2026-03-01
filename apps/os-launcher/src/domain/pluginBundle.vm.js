// @ts-check
/// <reference path="./pluginBundle.authoring.d.ts" />
defineStackBundle(({ ui }) => {
  return {
    id: 'os-launcher',
    title: 'go-go-os Launcher',
    cards: {
      home: {
        render() {
          return ui.panel([
            ui.text('go-go-os Launcher'),
            ui.text('Select an app icon to open a window.'),
            ui.text('This stack exists to satisfy DesktopShell card runtime requirements.'),
          ]);
        },
      },
    },
  };
});
