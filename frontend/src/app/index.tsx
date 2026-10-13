import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { authApi } from '@/services/api';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    authApi.me().then((result) => {
      if (result.authenticated) router.replace('/dashboard');
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);
  if (loading) return <View style={styles.center}><ActivityIndicator color="#5865f2" /></View>;
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>DISCORD COMMAND CENTER</Text>
      <Text style={styles.title}>A calmer control room for your community.</Text>
      <Text style={styles.subtitle}>Sign in with Discord to manage only the servers where you have administrator access.</Text>
      <Pressable style={styles.button} onPress={() => { void Linking.openURL(authApi.loginUrl); }}>
        <Text style={styles.buttonText}>Continue with Discord</Text>
      </Pressable>
      <Text style={styles.note}>Your bot token and server credentials never leave the backend.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11121a' },
  container: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#11121a' },
  eyebrow: { color: '#8c91ff', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  title: { color: '#fff', fontSize: 38, fontWeight: '800', lineHeight: 44, maxWidth: 620 },
  subtitle: { color: '#b9bbc7', fontSize: 17, lineHeight: 26, marginTop: 18, maxWidth: 560 },
  button: { backgroundColor: '#5865f2', borderRadius: 10, padding: 16, marginTop: 30, alignItems: 'center', maxWidth: 280 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  note: { color: '#777b8e', fontSize: 13, marginTop: 18 },
});
