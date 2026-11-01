import { create } from 'zustand';

import { api, type Habit, type HabitInput } from '../api/client';
import { useAuthStore } from './auth';

type HabitsState = {
  habits: Habit[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (input: HabitInput) => Promise<void>;
  update: (id: string, input: HabitInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
};

function requireToken(): string {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Not signed in');
  return token;
}

export const useHabitsStore = create<HabitsState>((set) => ({
  habits: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const { habits } = await api.listHabits(requireToken());
      set({ habits, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Could not load habits' });
    }
  },

  // create/update/remove throw so the calling form can show the error
  create: async (input) => {
    const { habit } = await api.createHabit(requireToken(), input);
    set((s) => ({ habits: [...s.habits, habit] }));
  },

  update: async (id, input) => {
    const { habit } = await api.updateHabit(requireToken(), id, input);
    set((s) => ({ habits: s.habits.map((h) => (h.id === id ? habit : h)) }));
  },

  remove: async (id) => {
    await api.deleteHabit(requireToken(), id);
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
  },

  reset: () => set({ habits: [], loading: false, error: null }),
}));

// Drop cached habits when the user logs out.
useAuthStore.subscribe((s) => {
  if (!s.token) useHabitsStore.getState().reset();
});
