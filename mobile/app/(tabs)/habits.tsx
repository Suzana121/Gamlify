import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Habit } from '../../src/api/client';
import { useHabitsStore } from '../../src/store/habits';
import { HabitForm } from '../../src/ui/HabitForm';

// null = list view, 'new' = add form, Habit = edit form
type Editing = null | 'new' | Habit;

export default function HabitsScreen() {
  const { habits, loading, error, load, create, update, remove } = useHabitsStore();
  const [editing, setEditing] = useState<Editing>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  if (editing) {
    return (
      <HabitForm
        initial={editing === 'new' ? undefined : editing}
        onCancel={() => setEditing(null)}
        onSubmit={async (input) => {
          if (editing === 'new') await create(input);
          else await update(editing.id, input);
          setEditing(null);
        }}
      />
    );
  }

  const onDelete = async (id: string) => {
    setActionError(null);
    try {
      await remove(id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete habit');
    }
  };

  const shownError = actionError ?? error;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Habits</Text>
      {shownError ? <Text style={styles.error}>{shownError}</Text> : null}
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={loading ? undefined : <Text>No habits yet. Add your first one!</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.category} · {item.frequency}
                {item.targetMinutes != null ? ` · ${item.targetMinutes} min` : ''}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
              onPress={() => setEditing(item)}
            >
              <Text style={styles.action}>Edit</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
              onPress={() => onDelete(item.id)}
            >
              <Text style={styles.danger}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
      <Pressable accessibilityRole="button" style={styles.add} onPress={() => setEditing('new')}>
        <Text style={styles.addText}>Add habit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: '600' },
  error: { color: '#c00' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  itemText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666' },
  action: { color: '#4f46e5' },
  danger: { color: '#c00' },
  add: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 14, alignItems: 'center' },
  addText: { color: '#fff', fontWeight: '600' },
});
