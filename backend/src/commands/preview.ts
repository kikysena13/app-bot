import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction
} from "discord.js";

export const previewCommand = new SlashCommandBuilder()
  .setName("preview")
  .setDescription("Lihat profil lengkap member di server ini")
  .addUserOption((option) => option
    .setName("member")
    .setDescription("Member yang profilnya ingin dilihat")
    .setRequired(true));

const formatTimestamp = (date: Date | null, style: "f" | "R" = "f") =>
  date ? `<t:${Math.floor(date.getTime() / 1000)}:${style}>` : "Tidak tersedia";

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;

export async function executePreviewCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "Command ini hanya dapat digunakan di dalam server.", ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser("member", true);
  await interaction.deferReply();

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    await interaction.editReply("Member tersebut tidak ditemukan di server ini.");
    return;
  }

  const user = await member.user.fetch(true);
  const avatarUrl = member.displayAvatarURL({ size: 1024, extension: "png" });
  const bannerUrl = user.bannerURL({ size: 1024, extension: "png" });
  const decorationUrl = user.avatarDecorationURL();
  const roles = member.roles.cache
    .filter((role) => role.id !== interaction.guildId)
    .sort((first, second) => second.position - first.position);
  const roleList = roles.size
    ? truncate(roles.map((role) => `<@&${role.id}>`).join(", "), 1000)
    : "Tidak memiliki role khusus.";
  const accountCreatedAt = user.createdAt;
  const joinedAt = member.joinedAt;
  const displayColor = member.displayColor || 0x5865f2;
  const accentColor = user.accentColor == null
    ? "Tidak diatur"
    : `#${user.accentColor.toString(16).padStart(6, "0")}`;

  const embed = new EmbedBuilder()
    .setColor(user.accentColor ?? displayColor)
    .setAuthor({
      name: `${member.displayName} (@${user.username})`,
      iconURL: avatarUrl
    })
    .setTitle("Profil Member")
    .setDescription(`Informasi lengkap **${member.displayName}** di **${interaction.guild.name}**.`)
    .setThumbnail(avatarUrl)
    .addFields(
      { name: "Username", value: `\`${user.username}\``, inline: true },
      { name: "Display name", value: truncate(member.displayName, 1024), inline: true },
      { name: "User ID", value: `\`${user.id}\``, inline: true },
      { name: "Bergabung di server", value: formatTimestamp(joinedAt), inline: true },
      { name: "Bergabung relatif", value: formatTimestamp(joinedAt, "R"), inline: true },
      { name: "Akun dibuat", value: formatTimestamp(accountCreatedAt), inline: true },
      { name: `Roles (${roles.size})`, value: roleList, inline: false },
      { name: "Warna role tertinggi", value: member.displayHexColor, inline: true },
      { name: "Accent color profil", value: accentColor, inline: true },
      { name: "Avatar decoration", value: decorationUrl ? "Terpasang" : "Tidak ada", inline: true }
    )
    .setFooter({ text: `Server: ${interaction.guild.name} • ID: ${interaction.guild.id}` })
    .setTimestamp();

  if (bannerUrl) embed.setImage(bannerUrl);
  if (decorationUrl) {
    embed.addFields({ name: "Dekorasi avatar", value: `[Lihat dekorasi](${decorationUrl})`, inline: true });
  }

  await interaction.editReply({ embeds: [embed] });
}