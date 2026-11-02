import { StyleSheet, Text, View } from 'react-native';

import type { Character } from '../api/client';
import { progressRatio } from '../lib/progress';
import { Avatar } from './Avatar';

export function CharacterCard({ character }: { character: Character }) {
  const { level, stage, xpIntoLevel, xpForNextLevel, currentStreak, longestStreak } = character;
  const ratio = progressRatio(xpIntoLevel, xpForNextLevel);
  const dayWord = (n: number) => (n === 1 ? 'day' : 'days');

  return (
    <View style={styles.card}>
      <Avatar stage={stage} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Level {level}</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="XP progress"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
      <Text style={styles.xp}>
        {xpIntoLevel} / {xpForNextLevel} XP
      </Text>
      <Text style={styles.streak}>
        Current streak {currentStreak} {dayWord(currentStreak)} · Best {longestStreak}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeText: { color: '#fff', fontWeight: '700' },
  track: {
    alignSelf: 'stretch',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#4f46e5' },
  xp: { color: '#666' },
  streak: { fontWeight: '600' },
});
