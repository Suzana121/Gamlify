import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Frequency, HabitInput } from '../src/api/client';
import { useHabitsStore } from '../src/store/habits';

const SUGGESTIONS = ['sport', 'study', 'sleep', 'health'];
const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'custom'];

export default function HabitFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const existing = useHabitsStore((s) => s.habits.find((h) => h.id === id));
  const add = useHabitsStore((s) => s.add);
  const update = useHabitsStore((s) => s.update);
  const remove = useHabitsStore((s) => s.remove);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? 'daily');
  const [minutes, setMinutes] = useState(existing?.targetMinutes?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    if (!trimmedName) return setError('Name is required');
    if (!trimmedCategory) return setError('Category is required');
    if (minutes.trim() && !/^[1-9]\d*$/.test(minutes.trim())) {
      return setError('Target minutes must be a positive whole number');
    }
    const input: HabitInput = { name: trimmedName, category: trimmedCategory, frequency };
    if (minutes.trim()) input.targetMinutes = Number(minutes.trim());

    setError(null);
    setBusy(true);
    try {
      if (id) await update(id, input);
      else await add(input);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!id) return;
    Alert.alert('Delete habit', `Delete "${existing?.name ?? 'this habit'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove(id).then(
            () => router.back(),
            (e: unknown) => setError(e instanceof Error ? e.message : 'Could not delete'),
          );
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{id ? 'Edit habit' : 'Add habit'}</Text>
      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Category"
        autoCapitalize="none"
        value={category}
        onChangeText={setCategory}
      />
      <View style={styles.row}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            style={[styles.chip, category === s && styles.selected]}
            onPress={() => setCategory(s)}
          >
            <Text style={category === s ? styles.selectedText : undefined}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        {FREQUENCIES.map((f) => (
          <Pressable
            key={f}
            accessibilityRole="button"
            accessibilityState={{ selected: frequency === f }}
            style={[styles.chip, frequency === f && styles.selected]}
            onPress={() => setFrequency(f)}
          >
            <Text style={frequency === f ? styles.selectedText : undefined}>{f}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Target minutes (optional)"
        keyboardType="number-pad"
        value={minutes}
        onChangeText={setMinutes}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        style={[styles.button, busy && styles.disabled]}
        disabled={busy}
        onPress={() => void submit()}
      >
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>
      {id ? (
        <Pressable accessibilityRole="button" onPress={confirmDelete}>
          <Text style={styles.delete}>Delete habit</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selected: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  selectedText: { color: '#fff' },
  error: { color: '#c00' },
  button: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 14, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  delete: { color: '#c00', textAlign: 'center', fontWeight: '600', marginTop: 8 },
  cancel: { color: '#4f46e5', textAlign: 'center', marginTop: 8 },
});
