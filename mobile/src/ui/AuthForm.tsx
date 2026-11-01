import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  title: string;
  submitLabel: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  altText: string;
  altHref: Href;
};

export function AuthForm({ title, submitLabel, onSubmit, altText, altHref }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await onSubmit(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        style={[styles.button, busy && styles.disabled]}
        disabled={busy}
        onPress={submit}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{submitLabel}</Text>
        )}
      </Pressable>
      <Link href={altHref} style={styles.link}>
        {altText}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  error: { color: '#c00' },
  button: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 14, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { color: '#4f46e5', textAlign: 'center', marginTop: 8 },
});
