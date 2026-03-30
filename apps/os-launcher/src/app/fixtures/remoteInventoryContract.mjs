const noopReducer = (state = null) => state;

export const inventoryRemoteContract = {
  remoteId: 'inventory',
  launcherModule: {
    manifest: {
      id: 'inventory',
      name: 'Inventory',
      icon: '📦',
      launch: { mode: 'window' },
    },
    buildLaunchWindow: () => ({
      id: 'window:inventory:main',
      title: 'Inventory',
      bounds: { x: 40, y: 40, w: 640, h: 480 },
      content: { kind: 'app', appKey: 'inventory:main' },
    }),
    renderWindow: () => null,
  },
  sharedReducers: {
    inventory: noopReducer,
  },
  docsMetadata: {
    packId: 'ui.card.v1',
    cards: [],
  },
  runtimeBundles: [
    {
      id: 'inventory',
      name: 'Inventory',
      icon: '📦',
      homeSurface: 'home',
      plugin: {
        packageIds: [],
        bundleCode: '',
      },
      surfaces: {
        home: {
          id: 'home',
          type: 'surface',
          title: 'Home',
          icon: '📦',
          ui: {},
        },
      },
    },
  ],
};

export default inventoryRemoteContract;
