import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useAuthStore } from '../src/store/auth';

export default function RootLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore((s) => s.token !== null);
  const hydrate = useAuthStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const inAuthGroup = (segments[0] as string | undefined) === '(auth)';

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed && !inAuthGroup) router.replace('/login');
    else if (isAuthed && inAuthGroup) router.replace('/');
  }, [hydrated, isAuthed, inAuthGroup, router]);

  if (!hydrated) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
