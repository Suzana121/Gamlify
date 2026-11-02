import { create } from 'zustand';

import { api, type Character } from '../api/client';
import { useAuthStore } from './auth';

type CharacterState = {
  character: Character | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  reset: () => void;
};

export const useCharacterStore = create<CharacterState>((set) => ({
  character: null,
  loading: false,
  error: null,

  load: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    set({ loading: true, error: null });
    try {
      const { character } = await api.getCharacter(token);
      // ignore a response that arrives after logout
      if (useAuthStore.getState().token !== token) return;
      set({ character, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Could not load character' });
    }
  },

  reset: () => set({ character: null, loading: false, error: null }),
}));

// Drop the cached character when the user logs out.
useAuthStore.subscribe((s) => {
  if (!s.token) useCharacterStore.getState().reset();
});
