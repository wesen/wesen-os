import { createLauncherStore } from '@hypercard/desktop-os';
import { booksReducer } from '@hypercard/book-tracker-debug/reducers';
import { chatProfilesReducer, chatSessionReducer, chatWindowReducer, timelineReducer } from '@hypercard/chat-runtime';
import { activitiesReducer, companiesReducer, contactsReducer, dealsReducer } from '@hypercard/crm/reducers';
import { inventoryReducer, salesReducer } from '@hypercard/inventory/reducers';
import { tasksReducer } from '@hypercard/todo/reducers';
import { launcherModules } from './modules';

export const { store, createStore: createLauncherAppStore } = createLauncherStore(launcherModules, {
  sharedReducers: {
    inventory: inventoryReducer,
    sales: salesReducer,
    timeline: timelineReducer,
    chatSession: chatSessionReducer,
    chatWindow: chatWindowReducer,
    chatProfiles: chatProfilesReducer,
    tasks: tasksReducer,
    contacts: contactsReducer,
    companies: companiesReducer,
    deals: dealsReducer,
    activities: activitiesReducer,
    books: booksReducer,
  },
  enableReduxDiagnostics: import.meta.env.DEV,
  diagnosticsWindowMs: 5000,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
