import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { authApi, guildApi, type Guild } from '@/services/api';

export default function DashboardScreen() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { guildApi.list().then(setGuilds).catch((e: Error) => setError(e.message)); }, []);
  return (
    <View style={styles.container}>
      <View style={styles.header}><View><Text style={styles.kicker}>COMMAND CENTER</Text><Text style={styles.title}>Your servers</Text></View><Pressable onPress={() => authApi.logout().then(() => router.replace('/'))}><Text style={styles.logout}>Log out</Text></Pressable></View>
      {error ? <Text style={styles.error}>{error}</Text> : guilds.length === 0 ? <ActivityIndicator color="#5865f2" /> : <FlatList data={guilds} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Pressable style={styles.card} onPress={() => router.push({ pathname: '/guild/[id]', params: { id: item.id } })}><View><Text style={styles.guildName}>{item.name}</Text><Text style={styles.guildId}>{item.id}</Text></View><Text style={item.bot ? styles.online : styles.offline}>{item.bot ? 'BOT ONLINE' : 'BOT OFFLINE'}</Text></Pressable>} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11121a', padding: 24, paddingTop: 52 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 },
  kicker: { color: '#8c91ff', letterSpacing: 2, fontSize: 11, fontWeight: '800' },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 8 },
  logout: { color: '#b9bbc7', fontWeight: '700' },
  list: { gap: 12 },
  card: { backgroundColor: '#1d1f2b', borderRadius: 14, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guildName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  guildId: { color: '#777b8e', marginTop: 5, fontSize: 12 },
  online: { color: '#4bd18b', fontSize: 11, fontWeight: '800' },
  offline: { color: '#e99b6b', fontSize: 11, fontWeight: '800' },
  error: { color: '#ff9c9c' },
});
