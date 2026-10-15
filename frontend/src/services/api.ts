import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://10.0.2.2:3000');

type ApiResponse<T> = { data?: T; error?: { code: string; message: string } };

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({})) as ApiResponse<T>;
  if (!response.ok) throw new Error(body.error?.message ?? `Request failed (${response.status})`);
  return (body.data ?? body) as T;
}

export const authApi = {
  me: () => api<{ authenticated: boolean; user: { username: string } | null }>('/api/auth/me'),
  loginUrl: `${API_URL}/api/auth/discord`,
  logout: () => api<void>('/api/auth/logout', { method: 'POST' }),
};

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
  bot?: boolean;
  botStatus?: 'online' | 'offline' | 'unknown';
};
export type GuildMember = {
  id: string;
  username: string;
  displayName: string;
  joinedAt: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  avatarDecoration: string | null;
  accentColor: string | null;
  roles: string[];
  isPresent: boolean;
};
export const guildApi = {
  list: () => api<Guild[]>('/api/guilds'),
  detail: (id: string) => api<{ guild: Guild; stats: { totalMembers: number } }>(`/api/guilds/${id}`),
  members: (id: string) => api<GuildMember[]>(`/api/guilds/${id}/members?limit=100`),
  activity: (id: string) => api<{ type: string; count: number }[]>(`/api/guilds/${id}/activity`),
};
