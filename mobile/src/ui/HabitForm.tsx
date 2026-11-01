import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Frequency, Habit, HabitInput } from '../api/client';

type Props = {
  initial?: Habit;
  onSubmit: (input: HabitInput) => Promise<void>;
  onCancel: () => void;
};

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export function HabitForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'daily');
  const [minutes, setMinutes] = useState(
    initial?.targetMinutes != null ? String(initial.targetMinutes) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmedMinutes = minutes.trim();
    const targetMinutes = trimmedMinutes === '' ? null : Number(trimmedMinutes);
    if (!name.trim() || !category.trim()) {
      setError('Name and category are required');
      return;
    }
    if (targetMinutes !== null && !(Number.isInteger(targetMinutes) && targetMinutes > 0)) {
      setError('Target minutes must be a positive whole number');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), category: category.trim(), frequency, targetMinutes });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{initial ? 'Edit habit' : 'New habit'}</Text>
      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
      />
      <View style={styles.row}>
        {FREQUENCIES.map((f) => (
          <Pressable
            key={f.value}
            accessibilityRole="button"
            accessibilityState={{ selected: frequency === f.value }}
            style={[styles.chip, frequency === f.value && styles.chipSelected]}
            onPress={() => setFrequency(f.value)}
          >
            <Text style={frequency === f.value ? styles.chipSelectedText : undefined}>
              {f.label}
            </Text>
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
        onPress={submit}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onCancel}>
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  chipSelectedText: { color: '#fff' },
  error: { color: '#c00' },
  button: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 14, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  cancel: { color: '#4f46e5', textAlign: 'center', marginTop: 4 },
});
