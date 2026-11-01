import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuthStore } from '../../src/store/auth';

export default function CharacterScreen() {
  const user = useAuthStore((s) => s.user);
  const updateDisplayName = useAuthStore((s) => s.updateDisplayName);
  const logout = useAuthStore((s) => s.logout);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (name === null) return;
    setError(null);
    setSaving(true);
    try {
      await updateDisplayName(name.trim());
      setName(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Character</Text>
      <Text>Your character will appear here.</Text>

      <View style={styles.profile}>
        <Text style={styles.heading}>Profile</Text>
        {name !== null ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Display name"
              value={name}
              onChangeText={setName}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.row}>
              <Pressable accessibilityRole="button" onPress={save} disabled={saving}>
                <Text style={styles.action}>Save</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setName(null)}>
                <Text style={styles.action}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.name}>{user?.displayName}</Text>
            <Text>{user?.email}</Text>
            <View style={styles.row}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setName(user?.displayName ?? '')}
              >
                <Text style={styles.action}>Edit name</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void logout()}>
                <Text style={styles.action}>Log out</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  profile: { marginTop: 32, alignSelf: 'stretch', gap: 8, alignItems: 'center' },
  heading: { fontSize: 18, fontWeight: '600' },
  name: { fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    alignSelf: 'stretch',
  },
  row: { flexDirection: 'row', gap: 24, marginTop: 8 },
  action: { color: '#4f46e5', fontWeight: '600' },
  error: { color: '#c00' },
});
