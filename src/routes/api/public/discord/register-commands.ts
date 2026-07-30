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
  { name: "help", description: "List all LuaMore commands" },
  { name: "setup", description: "Set up the LuaMore panel" },
  {
    name: "validate",
    description: "Validate Lua syntax with Larph",
    options: [{ type: OPT.STRING, name: "code", description: "Luau code", required: true }],
  },
  {
    name: "login",
    description: "Link your Discord to a LuaMore account",
    options: [{ type: OPT.STRING, name: "api_key", description: "Your LuaMore API key", required: true }],
  },
  { name: "limits", description: "Check your script and panel limits" },
  {
    name: "create-script",
    description: "Create a new script",
    options: [
      { type: OPT.STRING, name: "name", description: "Script name", required: true },
      { type: OPT.STRING, name: "code", description: "Luau code", required: true },
      { type: OPT.BOOLEAN, name: "ffa", description: "FFA / public", required: false },
      { type: OPT.BOOLEAN, name: "obfuscate", description: "Obfuscate on create", required: false },
      { type: OPT.STRING, name: "mode", description: "light / standard / advanced", required: false,
        choices: [{ name: "light", value: "light" }, { name: "standard", value: "standard" }, { name: "advanced", value: "advanced" }] },
    ],
  },
  {
    name: "generatekey",
    description: "Generate a license key",
    options: [
      { type: OPT.STRING, name: "panel_id", description: "Panel UUID", required: true },
      { type: OPT.INTEGER, name: "hours", description: "Valid hours", required: true },
      { type: OPT.STRING, name: "note", description: "Note", required: false },
      { type: OPT.STRING, name: "user", description: "Discord user id", required: false },
    ],
  },
  {
    name: "deletekey", description: "Delete a license key",
    options: [{ type: OPT.STRING, name: "key", description: "Key value", required: true }],
  },
  {
    name: "keys", description: "List your recent keys",
    options: [{ type: OPT.STRING, name: "panel_id", description: "Filter by panel", required: false }],
  },
  {
    name: "whitelist", description: "Whitelist a user and auto-generate a key",
    options: [
      { type: OPT.STRING, name: "script_id", description: "Script public id", required: true },
      { type: OPT.STRING, name: "user", description: "Discord user id", required: true },
      { type: OPT.INTEGER, name: "duration", description: "Hours", required: false },
    ],
  },
  {
    name: "blacklist", description: "Blacklist a user from a script",
    options: [
      { type: OPT.STRING, name: "script_id", description: "Script public id", required: true },
      { type: OPT.STRING, name: "user", description: "Discord user id", required: true },
    ],
  },
  {
    name: "loader", description: "Get the loader for a script",
    options: [{ type: OPT.STRING, name: "script_id", description: "Script public id", required: true }],
  },
  {
    name: "resethwid", description: "Reset your linked HWID",
    options: [{ type: OPT.STRING, name: "script_id", description: "Script public id", required: false }],
  },
  {
    name: "forceresethwid", description: "Force reset HWID for a user",
    options: [
      { type: OPT.STRING, name: "script_id", description: "Script public id", required: true },
      { type: OPT.STRING, name: "user", description: "Discord user id", required: true },
    ],
  },
  {
    name: "banhwid", description: "Ban a hardware ID",
    options: [
      { type: OPT.STRING, name: "hwid", description: "HWID", required: true },
      { type: OPT.STRING, name: "reason", description: "Reason", required: false },
    ],
  },
  { name: "unbanhwid", description: "Unban a hardware ID", options: [{ type: OPT.STRING, name: "hwid", description: "HWID", required: true }] },
  {
    name: "banuser", description: "Blacklist a Discord user from website access",
    options: [
      { type: OPT.STRING, name: "discord_id", description: "Discord user id", required: true },
      { type: OPT.STRING, name: "reason", description: "Reason", required: false },
    ],
  },
  { name: "unbanuser", description: "Remove website blacklist", options: [{ type: OPT.STRING, name: "discord_id", description: "Discord user id", required: true }] },
  {
    name: "panel", description: "Send a panel to the current channel",
    options: [{ type: OPT.STRING, name: "panel_id", description: "Panel UUID", required: true }],
  },
];

export const Route = createFileRoute("/api/public/discord/register-commands")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ownerToken = process.env.OWNER_REGISTER_TOKEN;
        if (!ownerToken) return new Response("OWNER_REGISTER_TOKEN not configured", { status: 500 });
        if (request.headers.get("x-owner-token") !== ownerToken) return new Response("forbidden", { status: 403 });

        const token = process.env.DISCORD_BOT_TOKEN;
        const clientId = process.env.DISCORD_CLIENT_ID;
        const guildId = process.env.DISCORD_GUILD_ID;
        if (!token || !clientId) return new Response("DISCORD_BOT_TOKEN / DISCORD_CLIENT_ID not configured", { status: 500 });

        const url = guildId
          ? `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`
          : `https://discord.com/api/v10/applications/${clientId}/commands`;
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Authorization": `Bot ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(commands),
        });
        const body = await res.text();
        return new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } });
      },
    },
  },
});

// keep zod import used to avoid dead-code warnings if extended later
void z;
