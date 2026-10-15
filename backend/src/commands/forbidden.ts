import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction
} from "discord.js";
import { pool } from "../db/pool.js";

export const forbiddenWords = ["shit", "sex", "kntl"] as const;

const forbiddenCommandDefinition = (name: "forbidden" | "forbiden") => new SlashCommandBuilder()
  .setName(name)
  .setDescription("Show forbidden-word messages in this server")
  .addStringOption((option) => option
    .setName("urutan")
    .setDescription("Urutkan member berdasarkan tanggal bergabung")
    .setRequired(false)
    .addChoices(
      { name: "Member terbaru", value: "newest" },
      { name: "Member terlama", value: "oldest" }
    ))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator.toString());

export const forbiddenCommand = forbiddenCommandDefinition("forbidden");
export const forbidenCommand = forbiddenCommandDefinition("forbiden");

export const recordForbiddenWords = async (message: {
  guildId: string;
  channelId: string;
  id: string;
  author: { id: string; username: string; displayName?: string; displayAvatarURL: (options: { size: 128 }) => string };
  content: string;
}) => {
  const matches = message.content.match(/\S+/g)?.filter((word) => forbiddenWords.includes(word.toLowerCase().replace(/[.,!?;:()[\]{}"'`]+$/g, "").replace(/^[.,!?;:()[\]{}"'`]+/g, "") as typeof forbiddenWords[number])) ?? [];
  if (matches.length === 0) return;

  const rows = matches.map((word) => [
    message.guildId,
    message.author.id,
    message.author.displayName ?? message.author.username,
    message.author.username,
    message.author.displayAvatarURL({ size: 128 }),
    word.toLowerCase().replace(/[.,!?;:()[\]{}"'`]+$/g, "").replace(/^[.,!?;:()[\]{}"'`]+/g, ""),
    message.channelId,
    message.id
  ]);
  await pool.query(
    "INSERT INTO forbidden_messages (guild_id, discord_user_id, display_name, username, avatar_url, forbidden_word, channel_id, message_id) VALUES ?",
    [rows]
  );
};

export const executeForbiddenCommand = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used inside a server.", ephemeral: true });
    return;
  }
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "Only server administrators can use this command.", ephemeral: true });
    return;
  }

  await interaction.deferReply();
  const order = interaction.options.getString("urutan") ?? "newest";
  const joinOrder = order === "oldest" ? "ASC" : "DESC";
  const [rows] = await pool.query(
    `SELECT fm.display_name AS displayName, fm.username, fm.avatar_url AS avatarUrl,
      fm.forbidden_word AS forbiddenWord, fm.occurred_at AS occurredAt,
      gm.joined_at AS joinedAt
      FROM forbidden_messages fm
      LEFT JOIN guild_members gm
        ON gm.guild_id = fm.guild_id AND gm.discord_user_id = fm.discord_user_id
      WHERE fm.guild_id = ?
      ORDER BY gm.joined_at IS NULL ASC, gm.joined_at ${joinOrder}, fm.occurred_at DESC
      LIMIT 100`,
    [interaction.guild.id]
  );
  const messages = rows as Array<{
    displayName: string;
    username: string;
    avatarUrl: string;
    forbiddenWord: string;
    occurredAt: Date | string;
    joinedAt: Date | string | null;
  }>;

  if (messages.length === 0) {
    await interaction.editReply({ content: "Belum ada kata terlarang yang tercatat di server ini." });
    return;
  }

  const grouped = new Map<string, typeof messages>();
  for (const message of messages) {
    const key = message.username;
    const existing = grouped.get(key) ?? [];
    existing.push(message);
    grouped.set(key, existing);
  }

  const embeds = [
    new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Forbidden chat report")
      .setDescription(`Ditemukan **${messages.length}** pelanggaran kata di server ini.`)
      .setTimestamp()
  ];
  for (const [username, memberMessages] of grouped) {
    const first = memberMessages[0];
    if (!first) continue;
    const details = memberMessages
      .slice(0, 10)
      .map((message) => {
        const occurredAt = new Date(message.occurredAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
        return `• \`${message.forbiddenWord}\` — ${occurredAt}`;
      })
      .join("\n");
    const memberEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setAuthor({ name: first.displayName, iconURL: first.avatarUrl })
      .setTitle(`${memberMessages.length}x forbidden word`)
      .setDescription(details)
      .setFooter({
        text: `Username: ${username} • Join: ${first.joinedAt ? new Date(first.joinedAt).toLocaleDateString("id-ID") : "unknown"}`
      });
    embeds.push(memberEmbed);
    if (embeds.length >= 10) break;
  }

  embeds[0]?.setFooter({
    text: `Urutan member: ${order === "oldest" ? "terlama" : "terbaru"} • Maksimal 100 catatan terbaru`
  });
  await interaction.editReply({ embeds });
};