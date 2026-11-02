import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { toDateString } from '../../src/lib/dates';
import { useCharacterStore } from '../../src/store/character';
import { useCompletionsStore } from '../../src/store/completions';
import { useHabitsStore } from '../../src/store/habits';

export default function TodayScreen() {
  const { habits, loading: habitsLoading, error: habitsError, load: loadHabits } = useHabitsStore();
  const { completions, error: completionsError, loadRange, toggle } = useCompletionsStore();
  const [actionError, setActionError] = useState<string | null>(null);
  const today = toDateString(new Date());

  useEffect(() => {
    void loadHabits();
    void loadRange(today, today);
  }, [loadHabits, loadRange, today]);

  const doneIds = new Set(completions.filter((c) => c.date === today).map((c) => c.habitId));
  const doneCount = habits.filter((h) => doneIds.has(h.id)).length;

  const onToggle = async (habitId: string) => {
    setActionError(null);
    try {
      await toggle(habitId, today);
      void useCharacterStore.getState().load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update habit');
    }
  };

  const shownError = actionError ?? habitsError ?? completionsError;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.summary}>
        {doneCount} of {habits.length} done today
      </Text>
      {shownError ? <Text style={styles.error}>{shownError}</Text> : null}
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        refreshing={habitsLoading}
        onRefresh={() => {
          void loadHabits();
          void loadRange(today, today);
        }}
        ListEmptyComponent={
          habitsLoading ? undefined : <Text>No habits yet. Add some in the Habits tab.</Text>
        }
        renderItem={({ item }) => {
          const done = doneIds.has(item.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={item.name}
              accessibilityState={{ checked: done }}
              style={styles.item}
              onPress={() => onToggle(item.id)}
            >
              <View style={[styles.box, done && styles.boxDone]}>
                {done ? <Text style={styles.tick}>✓</Text> : null}
              </View>
              <View style={styles.itemText}>
                <Text style={[styles.name, done && styles.nameDone]}>{item.name}</Text>
                <Text style={styles.meta}>{item.category}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: '600' },
  summary: { fontSize: 16, color: '#4f46e5', fontWeight: '600' },
  error: { color: '#c00' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: { backgroundColor: '#4f46e5' },
  tick: { color: '#fff', fontWeight: '700' },
  itemText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  nameDone: { textDecorationLine: 'line-through', color: '#666' },
  meta: { color: '#666' },
});
