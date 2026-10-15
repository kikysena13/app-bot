import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "./config/env.js";
import { checkDatabase, pool } from "./db/pool.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { requireAuth, requireGuildAdmin } from "./middleware/auth.js";
import { executeForbiddenCommand, forbidenCommand, forbiddenCommand, recordForbiddenWords } from "./commands/forbidden.js";

const app = express();
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});
let botStatus: "online" | "offline" | "unknown" = env.DISCORD_BOT_TOKEN ? "offline" : "unknown";
const voiceSessions = new Map<string, number>();

type DiscordMemberData = {
  guildId: string;
  userId: string;
  username: string;
  displayName: string;
  joinedAt: Date | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  avatarDecoration: string | null;
  accentColor: string | null;
  roles: string[];
};

const getDiscordMemberData = (member: {
  guild: { id: string };
  id: string;
  displayName: string;
  joinedAt: Date | null;
  displayAvatarURL: (options: { extension: "png"; size: 128 }) => string;
  roles: { cache: { filter: (callback: (role: { id: string }) => boolean) => { map: (callback: (role: { name: string }) => string) => string[] } } };
  user: {
    username: string;
    bannerURL: (options: { size: 512 }) => string | null | undefined;
    avatarDecorationData?: { asset?: string | null } | null;
    accentColor: number | null | undefined;
  };
}): DiscordMemberData => ({
  guildId: member.guild.id,
  userId: member.id,
  username: member.user.username,
  displayName: member.displayName,
  joinedAt: member.joinedAt,
  avatarUrl: member.displayAvatarURL({ extension: "png", size: 128 }),
  bannerUrl: member.user.bannerURL({ size: 512 }) ?? null,
  avatarDecoration: member.user.avatarDecorationData?.asset ?? null,
  accentColor: member.user.accentColor == null ? null : `#${member.user.accentColor.toString(16).padStart(6, "0")}`,
  roles: member.roles.cache.filter((role) => role.id !== member.guild.id).map((role) => role.name)
});

const persistDiscordMember = async (member: DiscordMemberData) => {
  await pool.query(
    "INSERT INTO guild_members (guild_id, discord_user_id, username, display_name, joined_at, avatar_url, banner_url, avatar_decoration, accent_color, roles_json, is_present) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE username = VALUES(username), display_name = VALUES(display_name), joined_at = VALUES(joined_at), avatar_url = VALUES(avatar_url), banner_url = VALUES(banner_url), avatar_decoration = VALUES(avatar_decoration), accent_color = VALUES(accent_color), roles_json = VALUES(roles_json), left_at = NULL, is_present = TRUE",
    [member.guildId, member.userId, member.username, member.displayName, member.joinedAt, member.avatarUrl, member.bannerUrl, member.avatarDecoration, member.accentColor, JSON.stringify(member.roles)]
  );
};

discord.once(Events.ClientReady, (readyClient) => {
  botStatus = "online";
  console.log(`Discord bot connected as ${readyClient.user.tag}`);
  readyClient.user.setPresence({
    status: "online",
    activities: [
      {
        name: "yokoso >~< ♡",
        type: ActivityType.Watching
      }
    ]
  });
  for (const guild of readyClient.guilds.cache.values()) {
    guild.commands.create(forbiddenCommand.toJSON()).catch((error) => {
      console.error(`Failed to register commands for guild ${guild.id}:`, error instanceof Error ? error.message : error);
    });
    guild.commands.create(forbidenCommand.toJSON()).catch((error) => {
      console.error(`Failed to register command for guild ${guild.id}:`, error instanceof Error ? error.message : error);
    });
  }
});
discord.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || ![forbiddenCommand.name, forbidenCommand.name].includes(interaction.commandName)) return;
  try {
    await executeForbiddenCommand(interaction);
  } catch (error) {
    console.error("Forbidden command failed:", error instanceof Error ? error.message : error);
    const reply = { content: "Gagal mengambil laporan forbidden chat.", ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
    else await interaction.reply(reply);
  }
});
discord.on("error", (error) => {
  botStatus = "offline";
  console.error("Discord client error:", error.message);
});
discord.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  try {
    await recordForbiddenWords({
      guildId: message.guild.id,
      channelId: message.channelId,
      id: message.id,
      author: message.author,
      content: message.content
    });
  } catch (error) {
    console.error("Forbidden message persistence failed:", error instanceof Error ? error.message : error);
  }
  const day = new Date().toISOString().slice(0, 10);
  const key = `message:${message.id}`;
  try {
    await pool.query("INSERT IGNORE INTO activity_events (guild_id, discord_user_id, event_type, occurred_at, idempotency_key) VALUES (?, ?, 'message', NOW(), ?)", [message.guild.id, message.author.id, key]);
    await pool.query("INSERT INTO daily_activity_stats (guild_id, discord_user_id, activity_date, message_count) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE message_count = message_count + 1", [message.guild.id, message.author.id, day]);
  } catch (error) { console.error("Message activity persistence failed:", error instanceof Error ? error.message : error); }
});
discord.on("guildMemberAdd", async (member) => {
  try {
    await persistDiscordMember(getDiscordMemberData(member));
    await pool.query("INSERT IGNORE INTO activity_events (guild_id, discord_user_id, event_type, occurred_at, idempotency_key) VALUES (?, ?, 'member_join', NOW(), ?)", [member.guild.id, member.id, `member_join:${member.guild.id}:${member.id}:${member.joinedTimestamp}`]);
  } catch (error) { console.error("Member join persistence failed:", error instanceof Error ? error.message : error); }
});
discord.on("guildMemberRemove", async (member) => {
  try {
    await pool.query("UPDATE guild_members SET left_at = NOW(), is_present = FALSE WHERE guild_id = ? AND discord_user_id = ?", [member.guild.id, member.id]);
    await pool.query("INSERT IGNORE INTO activity_events (guild_id, discord_user_id, event_type, occurred_at, idempotency_key) VALUES (?, ?, 'member_leave', NOW(), ?)", [member.guild.id, member.id, `member_leave:${member.guild.id}:${member.id}:${Date.now()}`]);
  } catch (error) { console.error("Member leave persistence failed:", error instanceof Error ? error.message : error); }
});
discord.on("voiceStateUpdate", async (before, after) => {
  const key = `${after.guild.id}:${after.id}`;
  if (!before.channelId && after.channelId) { voiceSessions.set(key, Date.now()); return; }
  if (before.channelId && !after.channelId) {
    const started = voiceSessions.get(key);
    voiceSessions.delete(key);
    if (!started) return;
    const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
    try {
      await pool.query("INSERT IGNORE INTO activity_events (guild_id, discord_user_id, event_type, channel_id, occurred_at, idempotency_key) VALUES (?, ?, 'voice_leave', ?, NOW(), ?)", [after.guild.id, after.id, before.channelId, `voice_leave:${key}:${started}`]);
      await pool.query("INSERT INTO daily_activity_stats (guild_id, discord_user_id, activity_date, voice_seconds) VALUES (?, ?, CURDATE(), ?) ON DUPLICATE KEY UPDATE voice_seconds = voice_seconds + VALUES(voice_seconds)", [after.guild.id, after.id, seconds]);
    } catch (error) { console.error("Voice activity persistence failed:", error instanceof Error ? error.message : error); }
  }
});

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 8 * 60 * 60 * 1000 }
}));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }));

app.get("/api/health", async (_request, response) => {
  response.json({ status: "ok", api: "online", database: await checkDatabase(), bot: botStatus, timestamp: new Date().toISOString() });
});

app.get("/api/auth/discord", (request, response) => {
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
    response.status(503).json({ error: { code: "OAUTH_NOT_CONFIGURED", message: "Discord OAuth is not configured" } });
    return;
  }
  const state = crypto.randomBytes(24).toString("hex");
  request.session.oauthState = state;
  const query = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds",
    state
  });
  response.redirect(`https://discord.com/oauth2/authorize?${query.toString()}`);
});

app.get("/api/auth/discord/callback", async (request, response, next) => {
  try {
    const code = typeof request.query.code === "string" ? request.query.code : "";
    const state = typeof request.query.state === "string" ? request.query.state : "";
    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !code || !state || state !== request.session.oauthState) {
      response.status(400).json({ error: { code: "INVALID_OAUTH_CALLBACK", message: "OAuth callback could not be verified" } });
      return;
    }
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: env.DISCORD_REDIRECT_URI
      })
    });
    const token = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) throw new Error("Discord OAuth token exchange failed");
    const userResponse = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const user = await userResponse.json() as { id: string; username: string; avatar?: string | null };
    if (!userResponse.ok || !user.id) throw new Error("Discord user lookup failed");
    request.session.user = { discordUserId: user.id, username: user.username, avatar: user.avatar ?? null };
    delete request.session.oauthState;
    response.redirect(env.FRONTEND_ORIGIN);
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", (request, response) => {
  response.json({ authenticated: Boolean(request.session.user), user: request.session.user ?? null });
});

app.post("/api/auth/logout", (request, response, next) => {
  request.session.destroy((error) => {
    if (error) { next(error); return; }
    response.status(204).end();
  });
});

app.use("/api/guilds", requireAuth);
app.get("/api/guilds", async (request, response, next) => {
  try {
    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN ?? ""}` } });
    const guilds = guildsResponse.ok ? await guildsResponse.json() : [];
    const manageable = Array.isArray(guilds) ? guilds.filter((guild: { owner?: boolean; permissions?: string }) => guild.owner || (Number(guild.permissions) & 0x20) === 0x20) : [];
    response.json({ data: manageable.map((guild: { id: string; name: string; icon?: string | null }) => ({ id: guild.id, name: guild.name, icon: guild.icon ?? null, bot: discord.guilds.cache.has(guild.id) })) });
  } catch (error) { next(error); }
});

app.post("/api/guilds/resolve", (request, response) => {
  const guildId = typeof request.body?.guildId === "string" ? request.body.guildId : "";
  if (!/^\d{17,20}$/.test(guildId)) {
    response.status(400).json({ error: { code: "INVALID_GUILD_ID", message: "Guild ID is invalid" } });
    return;
  }
  response.redirect(`/api/guilds/${guildId}`);
});

app.use("/api/guilds/:guildId", requireGuildAdmin(discord));
app.get("/api/guilds/:guildId", async (request, response, next) => {
  try {
    const guild = request.guild!;
    const [members] = await pool.query("SELECT COUNT(*) AS total FROM guild_members WHERE guild_id = ? AND is_present = TRUE", [guild.id]);
    response.json({ guild: { id: guild.id, name: guild.name, icon: guild.iconURL(), botStatus }, stats: { totalMembers: (members as Array<{ total: number }>)[0]?.total ?? guild.memberCount } });
  } catch (error) { next(error); }
});
app.get("/api/guilds/:guildId/members", async (request, response, next) => {
  try {
    const guild = request.guild!;
    const discordMembers = await guild.members.fetch();
    const syncedMembers = [...discordMembers.values()].map(getDiscordMemberData);
    await Promise.all(syncedMembers.map(persistDiscordMember));
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
    const offset = (page - 1) * limit;
    const search = typeof request.query.search === "string" ? request.query.search.toLocaleLowerCase() : "";
    const filteredMembers = syncedMembers.filter((member) => !search || member.displayName.toLocaleLowerCase().includes(search) || member.username.toLocaleLowerCase().includes(search));
    const rows = filteredMembers.slice(offset, offset + limit).map((member) => ({
      id: member.userId,
      username: member.username,
      displayName: member.displayName,
      joinedAt: member.joinedAt,
      avatarUrl: member.avatarUrl,
      bannerUrl: member.bannerUrl,
      avatarDecoration: member.avatarDecoration,
      accentColor: member.accentColor,
      roles: member.roles,
      isPresent: true
    }));
    response.json({ data: rows, page, limit });
  } catch (error) { next(error); }
});
app.get("/api/guilds/:guildId/activity", async (request, response, next) => {
  try {
    const [rows] = await pool.query("SELECT event_type AS type, COUNT(*) AS count FROM activity_events WHERE guild_id = ? AND occurred_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY event_type", [request.params.guildId]);
    response.json({ data: rows });
  } catch (error) { next(error); }
});
app.get("/api/guilds/:guildId/leaderboard", async (request, response, next) => {
  try {
    const [rows] = await pool.query("SELECT discord_user_id AS id, SUM(message_count) AS messages, SUM(voice_seconds) AS voiceSeconds FROM daily_activity_stats WHERE guild_id = ? GROUP BY discord_user_id ORDER BY messages DESC LIMIT 100", [request.params.guildId]);
    response.json({ data: rows });
  } catch (error) { next(error); }
});
app.get("/api/guilds/:guildId/settings", async (request, response, next) => {
  try {
    const [rows] = await pool.query("SELECT track_messages AS trackMessages, track_voice AS trackVoice, retention_days AS retentionDays FROM guild_settings WHERE guild_id = ?", [request.params.guildId]);
    response.json({ data: (rows as unknown[])[0] ?? { trackMessages: true, trackVoice: true, retentionDays: env.EVENT_RETENTION_DAYS } });
  } catch (error) { next(error); }
});
app.patch("/api/guilds/:guildId/settings", async (request, response, next) => {
  try {
    const { trackMessages, trackVoice, retentionDays } = request.body ?? {};
    if (typeof trackMessages !== "boolean" || typeof trackVoice !== "boolean" || !Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
      response.status(400).json({ error: { code: "INVALID_SETTINGS", message: "Settings values are invalid" } });
      return;
    }
    await pool.query("INSERT INTO guild_settings (guild_id, track_messages, track_voice, retention_days) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE track_messages = VALUES(track_messages), track_voice = VALUES(track_voice), retention_days = VALUES(retention_days)", [request.params.guildId, trackMessages, trackVoice, retentionDays]);
    await pool.query("INSERT INTO audit_logs (actor_user_id, guild_id, action, metadata) VALUES (?, ?, ?, ?)", [request.session.user!.discordUserId, request.params.guildId, "settings.updated", JSON.stringify({ trackMessages, trackVoice, retentionDays })]);
    response.json({ data: { trackMessages, trackVoice, retentionDays } });
  } catch (error) { next(error); }
});

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.API_PORT, () => console.log(`Backend running at http://localhost:${env.API_PORT}`));
if (env.DISCORD_BOT_TOKEN) discord.login(env.DISCORD_BOT_TOKEN).catch((error) => { botStatus = "offline"; console.error("Discord login failed:", error.message); });

const shutdown = async () => {
  server.close();
  discord.destroy();
  await pool.end();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

export { app };
