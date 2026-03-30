import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { bootstrapLauncherApp } from './app/bootstrapLauncherApp';

import '@go-go-golems/os-core/theme';
import '@go-go-golems/os-chat/theme';
import '@go-go-golems/os-widgets/theme';
import '@go-go-golems/os-kanban/theme';

function renderBootstrapError(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <main style={{ padding: 24, display: 'grid', gap: 12, fontFamily: 'monospace' }}>
        <h1>Launcher bootstrap failed</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{message}</pre>
      </main>
    </React.StrictMode>,
  );
}

bootstrapLauncherApp()
  .then(({ App, store }) => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </React.StrictMode>,
    );
  })
  .catch((error) => {
    console.error('Launcher bootstrap failed', error);
    renderBootstrapError(error);
  });
