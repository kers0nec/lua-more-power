import { createFileRoute } from "@tanstack/react-router";
import { autoRegisterDiscordCommands, DISCORD_COMMANDS } from "@/lib/discord-commands.server";

// Automatic Discord slash commands registration endpoint.
// Can be called via GET or POST:
//   GET /api/public/discord/register-commands
//   POST /api/public/discord/register-commands
// Automatically registers /help, /login, /setup, /whitelist, /resethwid.

export const Route = createFileRoute("/api/public/discord/register-commands")({
  server: {
    handlers: {
      GET: async () => {
        const result = await autoRegisterDiscordCommands({ force: true });
        return new Response(
          JSON.stringify({
            ...result,
            commands: DISCORD_COMMANDS.map((c) => c.name),
            timestamp: new Date().toISOString(),
          }),
          {
            status: result.ok ? 200 : 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
      POST: async () => {
        const result = await autoRegisterDiscordCommands({ force: true });
        return new Response(
          JSON.stringify({
            ...result,
            commands: DISCORD_COMMANDS.map((c) => c.name),
            timestamp: new Date().toISOString(),
          }),
          {
            status: result.ok ? 200 : 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
