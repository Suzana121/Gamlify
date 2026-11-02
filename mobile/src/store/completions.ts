import { create } from 'zustand';

import { api, ApiError, type Completion } from '../api/client';
import { useAuthStore } from './auth';

type CompletionsState = {
  completions: Completion[];
  loading: boolean;
  error: string | null;
  /** Fetch an inclusive range and replace whatever is cached for it. */
  loadRange: (from: string, to: string) => Promise<void>;
  /** Optimistically flip a habit's completion for a date; rolls back and rethrows on error. */
  toggle: (habitId: string, date: string) => Promise<void>;
  reset: () => void;
};

function requireToken(): string {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Not signed in');
  return token;
}

export const useCompletionsStore = create<CompletionsState>((set, get) => ({
  completions: [],
  loading: false,
  error: null,

  loadRange: async (from, to) => {
    set({ loading: true, error: null });
    try {
      const { completions: fetched } = await api.listCompletions(requireToken(), from, to);
      set((s) => ({
        completions: [...s.completions.filter((c) => c.date < from || c.date > to), ...fetched],
        loading: false,
      }));
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Could not load completions',
      });
    }
  },

  toggle: async (habitId, date) => {
    const token = requireToken();
    const existing = get().completions.find((c) => c.habitId === habitId && c.date === date);

    if (existing) {
      set((s) => ({ completions: s.completions.filter((c) => c !== existing) }));
      try {
        await api.uncompleteHabit(token, habitId, date);
      } catch (e) {
        set((s) => ({ completions: [...s.completions, existing] }));
        throw e;
      }
      return;
    }

    const temp: Completion = { id: `tmp-${habitId}-${date}`, habitId, date, points: 0 };
    set((s) => ({ completions: [...s.completions, temp] }));
    try {
      const { completion } = await api.completeHabit(token, habitId, date);
      set((s) => ({ completions: s.completions.map((c) => (c === temp ? completion : c)) }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // already completed on the server: keep it checked and resync that day
        await get().loadRange(date, date);
        return;
      }
      set((s) => ({ completions: s.completions.filter((c) => c !== temp) }));
      throw e;
    }
  },

  reset: () => set({ completions: [], loading: false, error: null }),
}));

// Drop cached completions when the user logs out.
useAuthStore.subscribe((s) => {
  if (!s.token) useCompletionsStore.getState().reset();
});
