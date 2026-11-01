import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store has no web implementation, so fall back to localStorage there.
const isWeb = Platform.OS === 'web';

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

export const getItemAsync = async (key: string): Promise<string | null> =>
  isWeb ? localStorage.getItem(key) : SecureStore.getItemAsync(key);

export const deleteItemAsync = async (key: string): Promise<void> => {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};
