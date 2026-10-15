import type { RequestHandler } from "express";

export const requireAuth: RequestHandler = (request, response, next) => {
  if (!request.session.user) {
    response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Login is required" } });
    return;
  }
  next();
};

export const requireGuildAdmin = (client: { guilds: { fetch: (id: string) => Promise<any> } }): RequestHandler => async (request, response, next) => {
  const guildId = request.params.guildId;
  if (typeof guildId !== "string") {
    response.status(400).json({ error: { code: "INVALID_GUILD_ID", message: "Guild ID is required" } });
    return;
  }
  if (!/^\d{17,20}$/.test(guildId)) {
    response.status(400).json({ error: { code: "INVALID_GUILD_ID", message: "Guild ID is invalid" } });
    return;
  }
  try {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(request.session.user!.discordUserId);
    const permissions = member.permissions;
    if (!permissions.has("Administrator") && !permissions.has("ManageGuild")) {
      response.status(403).json({ error: { code: "FORBIDDEN", message: "Guild administrator permission is required" } });
      return;
    }
    request.guild = guild;
    next();
  } catch {
    response.status(403).json({ error: { code: "GUILD_ACCESS_DENIED", message: "The bot or user cannot access this guild" } });
  }
};
