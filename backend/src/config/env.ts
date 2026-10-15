import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const optionalSecret = z.string().trim().min(1).optional();

const schema = z.object({
  API_PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:8081"),
  DATABASE_HOST: z.string().default("localhost"),
  DATABASE_PORT: z.coerce.number().int().positive().default(3306),
  DATABASE_NAME: z.string().default("discord_command_center"),
  DATABASE_USER: z.string().default("root"),
  DATABASE_PASSWORD: z.string().default(""),
  SESSION_SECRET: z.string().min(16).default("local-development-session-secret"),
  DISCORD_CLIENT_ID: optionalSecret,
  DISCORD_CLIENT_SECRET: optionalSecret,
  DISCORD_REDIRECT_URI: z.string().url().default("http://localhost:3000/api/auth/discord/callback"),
  DISCORD_BOT_TOKEN: optionalSecret,
  EVENT_RETENTION_DAYS: z.coerce.number().int().positive().default(90)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

export const env = parsed.data;
