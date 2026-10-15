import type { Guild } from "discord.js";

declare module "express-session" {
  interface SessionData {
    user?: { discordUserId: string; username: string; avatar: string | null };
    oauthState?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      guild?: Guild;
    }
  }
}
