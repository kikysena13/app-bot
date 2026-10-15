import mysql from "mysql2/promise";
import { env } from "../config/env.js";

export const pool = mysql.createPool({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  database: env.DATABASE_NAME,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  connectTimeout: 3000,
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true
});

export async function checkDatabase(): Promise<boolean> {
  try {
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Database check timed out")), 3000))
    ]);
    return true;
  } catch (error) {
    console.error("Database health check failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
