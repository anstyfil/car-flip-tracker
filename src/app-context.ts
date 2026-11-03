import { createContext, useContext } from 'react';
import type { EntryKind, State } from './domain';
export type View = 'overview' | 'cars' | 'people' | 'history' | 'cash';
export type Dialog = { type: 'expense'; carId?: string; entryId?: string; draftId?: string; amount?: string; accountId?: string; text?: string } | { type: 'car'; id: string } | { type: 'allocation'; id: string } | { type: 'sale'; id: string } | { type: 'buyer'; id: string } | { type: 'person'; id: string } | { type: 'purchase' } | { type: 'person-add' } | { type: 'money'; kind: EntryKind; personId?: string; accountId?: string; carId?: string } | { type: 'reconcile'; id: string } | { type: 'entry'; id: string } | { type: 'owner-return'; expenseId: string } | { type: 'help' } | { type: 'reset' } | { type: 'bot' } | { type: 'drafts' };
export type AppContextValue = { state: State; commit: (transform: (state: State) => State, message: string) => boolean; open: (dialog: Dialog) => void; close: () => void; navigate: (view: View, filter?: string) => void };
export const AppContext = createContext<AppContextValue>(null!);
export const useApp = () => useContext(AppContext);
