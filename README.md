# Discord Command Center

Discord Command Center is a mobile-first Expo dashboard backed by one Express/TypeScript process that owns the Discord.js client, OAuth session, authorization checks, analytics, and MySQL access.
test

## Architecture

- [`backend/`](./backend/) — Express API, Discord OAuth2, Discord.js lifecycle, guild authorization, MySQL pool, and migration.
- [`frontend/`](./frontend/) — Expo SDK 57 and Expo Router mobile/web dashboard.
- [`backend/src/db/migrations/001_initial.sql`](./backend/src/db/migrations/001_initial.sql) — rerunnable MySQL schema for users, sessions, guilds, members, activity, settings, and audit logs.
- `index.js` is legacy and is not started by any current script. Start the bot only through the backend so two Discord clients cannot run together.

The frontend never receives a bot token, OAuth client secret, database credential, or session secret. Guild IDs are not treated as proof of access: protected routes fetch the guild through Discord.js, fetch the logged-in member, and require `Administrator` or `Manage Guild`.

## Setup

1. Use Node.js 20+ and MySQL 8+.
2. Install dependencies:

   ```powershell
   npm install
   npm --prefix backend install
   npm --prefix frontend install
   ```

3. Copy `.env.example` to `.env` and provide the backend values. Do not commit `.env`.
4. Create the database named by `DATABASE_NAME`, then run `backend/src/db/migrations/001_initial.sql`.
5. In the Discord Developer Portal:
   - Add `DISCORD_REDIRECT_URI` as an OAuth2 redirect URL.
   - Enable the `Guild Members`, `Guild Messages`, and `Guild Voice States` intents only when the corresponding tracking feature is enabled.
   - Invite the bot with the minimum permissions needed for member synchronization and activity events.
6. Start both services:

   ```powershell
   npm run dev
   ```

   The API is at `http://localhost:3000`; Expo normally uses `http://localhost:8081`.

For a physical device, set `EXPO_PUBLIC_API_URL` to a backend URL reachable from that device. This is a public API base URL, not a secret.

## Environment

See [`.env.example`](./.env.example). `EVENT_RETENTION_DAYS` defaults to 90 and is also the default for newly-created guild settings. Secrets must remain backend-only.

## API

Implemented routes:

- `GET /api/health`
- `GET /api/auth/discord`
- `GET /api/auth/discord/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/guilds`
- `POST /api/guilds/resolve`
- `GET /api/guilds/:guildId`
- `GET /api/guilds/:guildId/members`
- `GET /api/guilds/:guildId/activity`
- `GET /api/guilds/:guildId/leaderboard`
- `GET /api/guilds/:guildId/settings`
- `PATCH /api/guilds/:guildId/settings`

Errors use `{ "error": { "code": "...", "message": "..." } }`. The health endpoint reports API, database, and bot state without exposing credentials.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm audit --omit=dev
npm --prefix backend audit --omit=dev
npm --prefix frontend audit --omit=dev
```

Native OAuth with PKCE/deep links still requires a platform-specific callback bridge and app registration; the current web flow uses an HttpOnly session cookie with OAuth `state`.
