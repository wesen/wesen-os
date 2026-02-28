import { createLauncherStore } from '@hypercard/desktop-os';
import { chatProfilesReducer, chatSessionReducer, chatWindowReducer, timelineReducer } from '@hypercard/engine';
import { booksReducer } from '@hypercard/book-tracker-debug/src/features/books/booksSlice';
import { activitiesReducer } from '@hypercard/crm/src/features/activities/activitiesSlice';
import { companiesReducer } from '@hypercard/crm/src/features/companies/companiesSlice';
import { contactsReducer } from '@hypercard/crm/src/features/contacts/contactsSlice';
import { dealsReducer } from '@hypercard/crm/src/features/deals/dealsSlice';
import { inventoryReducer, salesReducer } from '@hypercard/inventory/reducers';
import { tasksReducer } from '@hypercard/todo/src/features/tasks/tasksSlice';
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
