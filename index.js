// The Discord client is owned by backend/src/server.ts.
// Keep this entry point inert so the legacy bot cannot be started accidentally.
throw new Error("The legacy root bot is disabled. Start the unified backend with: npm run dev:backend");
