import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// One-time helper to register / update the LuaMore slash-command set with Discord.
// Call with:
//   POST /api/public/discord/register-commands
//   Header: x-owner-token: <OWNER_REGISTER_TOKEN>
// Requires DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, and OWNER_REGISTER_TOKEN env vars.
// If DISCORD_GUILD_ID is set, commands are registered to that guild (instant).
// Otherwise they're registered globally (can take up to 1 hour to appear).

const OPT = {
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
} as const;

const commands = [
  { name: "help", description: "How to use LuaMore" },
  {
    name: "login",
    description: "Link your Discord to a LuaMore account",
    options: [
      { type: OPT.STRING, name: "api_key", description: "Your LuaMore API key", required: true },
    ],
  },
  {
    name: "setup",
    description: "Set up the LuaMore panel in this channel",
    options: [
      {
        type: OPT.STRING,
        name: "script_id",
        description: "Script public ID (optional — otherwise pick from a menu)",
        required: false,
      },
    ],
  },
  {
    name: "whitelist",
    description: "Whitelist a user for this channel's script",
    options: [
      { type: OPT.USER, name: "user", description: "User to whitelist", required: true },
      {
        type: OPT.STRING,
        name: "duration",
        description: "20s, 35m, 2h, 1d, 7d, 30d — omit for forever",
        required: false,
      },
    ],
  },
  {
    name: "resethwid",
    description: "Reset a HWID (admins can reset for others, no cooldown)",
    options: [
      { type: OPT.USER, name: "user", description: "User to reset (admins only)", required: false },
    ],
  },
];

export const Route = createFileRoute("/api/public/discord/register-commands")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ownerToken = process.env.OWNER_REGISTER_TOKEN;
        if (!ownerToken)
          return new Response("OWNER_REGISTER_TOKEN not configured", { status: 500 });
        if (request.headers.get("x-owner-token") !== ownerToken)
          return new Response("forbidden", { status: 403 });

        const token = process.env.DISCORD_BOT_TOKEN;
        const clientId = process.env.DISCORD_CLIENT_ID;
        const guildId = process.env.DISCORD_GUILD_ID;
        if (!token || !clientId)
          return new Response("DISCORD_BOT_TOKEN / DISCORD_CLIENT_ID not configured", {
            status: 500,
          });

        const url = guildId
          ? `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`
          : `https://discord.com/api/v10/applications/${clientId}/commands`;
        const res = await fetch(url, {
          method: "PUT",
          headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(commands),
        });
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

// keep zod import used to avoid dead-code warnings if extended later
void z;
