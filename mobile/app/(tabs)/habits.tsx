import { StyleSheet, Text, View } from 'react-native';

export default function HabitsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Habits</Text>
      <Text>Your habits will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
});
