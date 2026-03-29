import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './App';
import { store } from './app/store';

import '@go-go-golems/os-core/theme';
import '@go-go-golems/os-chat/theme';
import '@go-go-golems/os-widgets/theme';
import '@go-go-golems/os-kanban/theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
