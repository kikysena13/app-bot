import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { guildApi, type Guild, type GuildMember } from '@/services/api';

export default function GuildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<{ guild: Guild; stats: { totalMembers: number } }>();
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [memberOrder, setMemberOrder] = useState<'newest' | 'oldest'>('newest');
  const [activity, setActivity] = useState<{ type: string; count: number }[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { if (!id) return; Promise.all([guildApi.detail(id), guildApi.members(id), guildApi.activity(id)]).then(([detail, guildMembers, events]) => { setData(detail); setMembers(guildMembers); setActivity(events); }).catch((e: Error) => setError(e.message)); }, [id]);
  const goToDashboard = () => router.replace('/dashboard');
  const sortedMembers = [...members].sort((first, second) => {
    if (!first.joinedAt) return 1;
    if (!second.joinedAt) return -1;
    const difference = new Date(first.joinedAt).getTime() - new Date(second.joinedAt).getTime();
    return memberOrder === 'newest' ? -difference : difference;
  });
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable onPress={goToDashboard}><Text style={styles.link}>All servers</Text></Pressable></View>;
  if (!data) return <View style={styles.center}><ActivityIndicator color="#5865f2" /></View>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}><Pressable onPress={goToDashboard}><Text style={styles.link}>← All servers</Text></Pressable><Text style={styles.kicker}>SERVER OVERVIEW</Text><Text style={styles.title}>{data.guild.name}</Text><View style={styles.grid}><View style={styles.metric}><Text style={styles.value}>{data.stats.totalMembers}</Text><Text style={styles.label}>Total members</Text></View><View style={styles.metric}><Text style={styles.value}>{data.guild.botStatus === 'online' ? 'Online' : data.guild.botStatus === 'offline' ? 'Offline' : 'Unknown'}</Text><Text style={styles.label}>Bot status</Text></View></View><View style={styles.membersHeading}><Text style={styles.section}>Members</Text><View style={styles.sortControls}><Pressable onPress={() => setMemberOrder('newest')} style={[styles.sortButton, memberOrder === 'newest' && styles.sortButtonActive]}><Text style={styles.sortText}>Newest</Text></Pressable><Pressable onPress={() => setMemberOrder('oldest')} style={[styles.sortButton, memberOrder === 'oldest' && styles.sortButtonActive]}><Text style={styles.sortText}>Oldest</Text></Pressable></View></View>{members.length === 0 ? <Text style={styles.empty}>No member data available yet.</Text> : sortedMembers.map((member) => <View style={[styles.memberCard, { borderColor: member.accentColor ?? '#292c3b' }]} key={member.id}>{member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarFallbackText}>{member.displayName.slice(0, 1).toUpperCase()}</Text></View>}<View style={styles.memberDetails}><Text style={styles.memberName}>{member.displayName}</Text><Text style={styles.memberUsername}>@{member.username}</Text><Text style={styles.memberId}>{member.roles.length ? member.roles.join(' · ') : 'No roles'}</Text></View><Text style={styles.joinedAt}>{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Join date unavailable'}</Text></View>)}<Text style={styles.section}>Activity, last 30 days</Text>{activity.map((item) => <View style={styles.row} key={item.type}><Text style={styles.label}>{item.type.replace('_', ' ')}</Text><Text style={styles.valueSmall}>{item.count}</Text></View>)}</ScrollView>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11121a', padding: 24 },
  container: { flex: 1, backgroundColor: '#11121a', paddingHorizontal: 24 },
  content: { paddingTop: 52, paddingBottom: 40 },
  link: { color: '#8c91ff', fontWeight: '700', marginBottom: 38 },
  kicker: { color: '#8c91ff', letterSpacing: 2, fontSize: 11, fontWeight: '800' },
  title: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 8 },
  grid: { flexDirection: 'row', gap: 12, marginTop: 28 },
  metric: { backgroundColor: '#1d1f2b', borderRadius: 14, padding: 18, flex: 1 },
  value: { color: '#fff', fontSize: 25, fontWeight: '800' },
  valueSmall: { color: '#fff', fontSize: 18, fontWeight: '700' },
  label: { color: '#9296a9', marginTop: 6, textTransform: 'capitalize' },
  memberName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  memberUsername: { color: '#b9bbc7', fontSize: 12, marginTop: 3 },
  memberId: { color: '#777b8e', fontSize: 11, marginTop: 4 },
  memberCard: { backgroundColor: '#1d1f2b', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  memberDetails: { flex: 1, minWidth: 0, marginLeft: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#5865f2', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  joinedAt: { color: '#b9bbc7', fontSize: 12, marginLeft: 12, textAlign: 'right' },
  empty: { color: '#9296a9', backgroundColor: '#1d1f2b', padding: 16, borderRadius: 12 },
  section: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 36, marginBottom: 12 },
  membersHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 36, marginBottom: 12 },
  sortControls: { flexDirection: 'row', gap: 6 },
  sortButton: { backgroundColor: '#1d1f2b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  sortButtonActive: { backgroundColor: '#5865f2' },
  sortText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  row: { backgroundColor: '#1d1f2b', padding: 16, borderBottomWidth: 1, borderBottomColor: '#292c3b', flexDirection: 'row', justifyContent: 'space-between' },
  error: { color: '#ff9c9c', textAlign: 'center', marginBottom: 20 },
});
