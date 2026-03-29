import { createLauncherStore } from '@go-go-golems/os-shell';
import { booksReducer } from '@go-go-golems/book-tracker-debug/reducers';
import { chatProfilesReducer, chatSessionReducer, chatWindowReducer, timelineReducer } from '@go-go-golems/os-chat';
import { activitiesReducer, companiesReducer, contactsReducer, dealsReducer } from '@go-go-golems/crm/reducers';
import { inventoryHostContract } from '@go-go-golems/inventory/host';
import { tasksReducer } from '@go-go-golems/todo/reducers';
import { launcherModules } from './modules';

export const { store, createStore: createLauncherAppStore } = createLauncherStore(launcherModules, {
  sharedReducers: {
    ...inventoryHostContract.sharedReducers,
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
