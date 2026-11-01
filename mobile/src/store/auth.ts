import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { api, ApiError, type User } from '../api/client';
import { useHabitsStore } from './habits';

export const TOKEN_KEY = 'gamlify.token';

type AuthState = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => {
  const signIn = async (token: string, user: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, user });
  };

  return {
    token: null,
    user: null,
    hydrated: false,

    hydrate: async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          try {
            const { user } = await api.me(token);
            set({ token, user });
          } catch (e) {
            if (e instanceof ApiError && e.status === 401) {
              await SecureStore.deleteItemAsync(TOKEN_KEY);
            } else {
              // offline: keep the token, the user loads later
              set({ token });
            }
          }
        }
      } finally {
        set({ hydrated: true });
      }
    },

    login: async (email, password) => {
      const { token, user } = await api.login(email, password);
      await signIn(token, user);
    },

    register: async (email, password) => {
      const { token, user } = await api.register(email, password);
      await signIn(token, user);
    },

    updateDisplayName: async (displayName) => {
      const { token } = get();
      if (!token) return;
      const { user } = await api.updateMe(token, displayName);
      set({ user });
    },

    logout: async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      useHabitsStore.getState().reset();
      set({ token: null, user: null });
    },
  };
});
