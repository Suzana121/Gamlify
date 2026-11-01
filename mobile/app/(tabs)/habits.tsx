import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useHabitsStore } from '../../src/store/habits';

export default function HabitsScreen() {
  const router = useRouter();
  const habits = useHabitsStore((s) => s.habits);
  const loading = useHabitsStore((s) => s.loading);
  const error = useHabitsStore((s) => s.error);
  const load = useHabitsStore((s) => s.load);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Habits</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        testID="habits-list"
        style={styles.list}
        data={habits}
        keyExtractor={(h) => h.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        ListEmptyComponent={
          loading ? undefined : <Text style={styles.empty}>No habits yet. Add your first one!</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
            style={styles.row}
            onPress={() => router.push({ pathname: '/habit-form', params: { id: item.id } })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.category} · {item.frequency}
              {item.targetMinutes ? ` · ${item.targetMinutes} min` : ''}
            </Text>
          </Pressable>
        )}
      />
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => router.push('/habit-form')}
      >
        <Text style={styles.buttonText}>Add habit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '600' },
  list: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 32, color: '#666' },
  error: { color: '#c00' },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666', marginTop: 2 },
  button: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
