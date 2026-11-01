import { create } from 'zustand';

import { api, type Habit, type HabitInput } from '../api/client';
import { useAuthStore } from './auth';

type HabitsState = {
  habits: Habit[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (input: HabitInput) => Promise<Habit>;
  update: (id: string, patch: Partial<HabitInput>) => Promise<Habit>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
};

function requireToken(): string {
  const { token } = useAuthStore.getState();
  if (!token) throw new Error('You are not signed in');
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
      set({ habits });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Could not load habits' });
    } finally {
      set({ loading: false });
    }
  },

  add: async (input) => {
    const { habit } = await api.createHabit(requireToken(), input);
    set((s) => ({ habits: [...s.habits, habit] }));
    return habit;
  },

  update: async (id, patch) => {
    const { habit } = await api.updateHabit(requireToken(), id, patch);
    set((s) => ({ habits: s.habits.map((h) => (h.id === id ? habit : h)) }));
    return habit;
  },

  remove: async (id) => {
    await api.deleteHabit(requireToken(), id);
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
  },

  reset: () => set({ habits: [], loading: false, error: null }),
}));
