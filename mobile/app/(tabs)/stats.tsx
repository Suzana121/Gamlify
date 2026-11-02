import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { completionRate, daysInRange, getPeriodRange, type Period } from '../../src/lib/dates';
import { useCompletionsStore } from '../../src/store/completions';
import { useHabitsStore } from '../../src/store/habits';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export default function StatsScreen() {
  const [period, setPeriod] = useState<Period>('daily');
  const { habits, error: habitsError, load: loadHabits } = useHabitsStore();
  const { completions, error: completionsError, loadRange } = useCompletionsStore();

  const range = getPeriodRange(period, new Date());

  useEffect(() => {
    void loadHabits();
  }, [loadHabits]);

  useEffect(() => {
    void loadRange(range.from, range.to);
  }, [loadRange, range.from, range.to]);

  const inRange = completions.filter((c) => c.date >= range.from && c.date <= range.to);
  const counts = new Map<string, number>();
  for (const c of inRange) counts.set(c.habitId, (counts.get(c.habitId) ?? 0) + 1);
  const habitIds = new Set(habits.map((h) => h.id));
  const total = inRange.filter((c) => habitIds.has(c.habitId)).length;
  const rate = completionRate(total, habits.length, daysInRange(range));
  const error = habitsError ?? completionsError;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stats</Text>
      <View style={styles.tabs}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            accessibilityRole="button"
            accessibilityState={{ selected: period === p.key }}
            style={[styles.tab, period === p.key && styles.tabActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={period === p.key ? styles.tabTextActive : styles.tabText}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.meta}>
        {range.from === range.to ? range.from : `${range.from} to ${range.to}`}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.rate}>Completion rate: {Math.round(rate * 100)}%</Text>
      {habits.length === 0 ? <Text>No habits yet.</Text> : null}
      {habits.map((h) => (
        <View key={h.id} style={styles.item}>
          <Text style={styles.name}>{h.name}</Text>
          <Text accessibilityLabel={`${h.name} completions`} style={styles.count}>
            {counts.get(h.id) ?? 0}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tabActive: { backgroundColor: '#4f46e5' },
  tabText: { color: '#4f46e5', fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  meta: { color: '#666' },
  error: { color: '#c00' },
  rate: { fontSize: 18, fontWeight: '600', marginVertical: 8 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  name: { fontSize: 16 },
  count: { fontSize: 16, fontWeight: '600' },
});
