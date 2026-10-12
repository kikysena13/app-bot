# Discord Command Center

> A mobile-first command center for keeping a Discord community organized, responsive, and under control.

Discord Command Center combines a React Native dashboard, a secure Express API, and a Discord bot foundation in one workspace. The goal is simple: give server owners and moderators one calm, fast place to monitor their community and build moderation workflows.

## What lives here

| Area | Stack | Purpose |
| --- | --- | --- |
| Mobile dashboard | Expo · React Native · Expo Router | The cross-platform control panel for Android, iOS, and web. |
| API | Express · TypeScript · Zod | The backend boundary for dashboard data and future Discord actions. |
| Bot | Discord.js | The Discord gateway client and event automation foundation. |
| Data layer | MySQL driver (`mysql2`) | Ready for future settings, audit logs, and moderation data. |

## Current capabilities

- Mobile Expo application with file-based routing.
- Express API protected with Helmet, CORS, and JSON request parsing.
- `GET /api/health` health endpoint for deployment and connectivity checks.
- Discord bot bootstrap that validates `BOT_TOKEN` before connecting.
- Root development command that starts the API and Expo together.

## Project map

```text
appsv/
├── backend/             # Express API — port 3000
│   └── src/server.ts
├── frontend/            # Expo / React Native dashboard — port 8081
│   └── src/app/
├── index.js             # Discord bot entry point
├── .env.example         # Local environment variable template
└── package.json         # Workspace development commands
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A Discord bot token, if you plan to run the bot
- Expo Go on a physical device, or an Android/iOS simulator, for mobile testing

## Quick start

Install dependencies once from each package directory:

```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
```

Create your local environment file from the example, then set your Discord token:

```powershell
Copy-Item .env.example .env
```

```env
BOT_TOKEN=replace_with_your_discord_bot_token
API_PORT=3000
```

Start the dashboard and API together:

```powershell
npm run dev
```

This opens the API at `http://localhost:3000` and starts the Expo development server, normally at `http://localhost:8081`. Scan the QR code in the terminal using Expo Go, or choose the web, Android, or iOS target shown by Expo.

To run the Discord bot separately:

```powershell
node index.js
```

## Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start API and Expo together from the workspace root. |
| `npm run dev:backend` | Start the Express API in watch mode. |
| `npm run dev:frontend` | Start the Expo development server. |
| `npm --prefix frontend run android` | Open the app on Android. |
| `npm --prefix frontend run web` | Open the app in a web browser. |
| `npm --prefix frontend run lint` | Run Expo lint checks. |
| `npm --prefix backend run start` | Start the API without file watching. |

## API check

Once the API is running, verify it with:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "message": "Discord Management API is running"
}
```

## Security notes

- Never commit `.env` or expose `BOT_TOKEN` in the mobile app.
- Keep Discord actions behind the backend API; the Expo client must not hold bot credentials.
- The backend and its current dependencies pass `npm audit` with zero reported vulnerabilities.
- Before deploying, restrict CORS to the production dashboard origin and use a managed secret store for credentials.

## Next milestones

1. Connect the dashboard to `/api/health` and authenticated API endpoints.
2. Add MySQL schema and migrations for guild settings and audit records.
3. Implement Discord moderation, member, and announcement workflows.
4. Add role-based access, session persistence, and activity logs.

---

Built for communities that deserve a better control room.
