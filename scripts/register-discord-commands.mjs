#!/usr/bin/env node

const OPT = { STRING: 3, INTEGER: 4, BOOLEAN: 5, USER: 6 };
const modes = [
  { name: "Basic", value: "basic" },
  { name: "Standard", value: "standard" },
  { name: "Advanced", value: "advanced" },
];

const DISCORD_COMMANDS = [
  { name: "create-script", description: "Create a new LuaMore script", options: [
    { type: OPT.STRING, name: "name", description: "Script name", required: true },
    { type: OPT.STRING, name: "code", description: "Lua source code", required: true },
    { type: OPT.BOOLEAN, name: "ffa", description: "Allow access without a key", required: false },
    { type: OPT.BOOLEAN, name: "obfuscate", description: "Protect the source before hosting", required: false },
    { type: OPT.STRING, name: "mode", description: "Protection level", required: false, choices: modes },
  ]},
  { name: "panel", description: "Send an interactive panel to this channel", options: [{ type: OPT.STRING, name: "panel_id", description: "Panel ID", required: true }] },
  { name: "generatekey", description: "Generate a license key for a panel", options: [
    { type: OPT.STRING, name: "panel_id", description: "Panel ID", required: true },
    { type: OPT.INTEGER, name: "hours", description: "Hours valid (0 = permanent)", required: false, min_value: 0 },
    { type: OPT.STRING, name: "note", description: "Optional note", required: false },
    { type: OPT.USER, name: "user", description: "Discord user to assign", required: false },
  ]},
  { name: "whitelist", description: "Grant a Discord user access to a script", options: [
    { type: OPT.STRING, name: "script_id", description: "Script ID or public ID", required: true },
    { type: OPT.USER, name: "user", description: "User to whitelist", required: true },
    { type: OPT.INTEGER, name: "duration", description: "Hours valid (0 = permanent)", required: false, min_value: 0 },
  ]},
  { name: "blacklist", description: "Revoke a Discord user's access to a script", options: [
    { type: OPT.STRING, name: "script_id", description: "Script ID or public ID", required: true },
    { type: OPT.USER, name: "user", description: "User to blacklist", required: true },
  ]},
  { name: "deletekey", description: "Permanently delete a license key you own", options: [{ type: OPT.STRING, name: "key", description: "License key", required: true }] },
  { name: "resethwid", description: "Reset your HWID for a script", options: [{ type: OPT.STRING, name: "script_id", description: "Script ID or public ID", required: true }] },
  { name: "forceresethwid", description: "Force-reset a user's HWID (LuaMore owner only)", options: [
    { type: OPT.STRING, name: "script_id", description: "Script ID or public ID", required: true },
    { type: OPT.USER, name: "user", description: "Discord user", required: true },
  ]},
  { name: "banuser", description: "Ban a Discord ID from the website (owner only)", options: [
    { type: OPT.STRING, name: "discord_id", description: "Discord user ID", required: true },
    { type: OPT.STRING, name: "reason", description: "Reason", required: false },
  ]},
  { name: "unbanuser", description: "Restore website access for a Discord ID (owner only)", options: [{ type: OPT.STRING, name: "discord_id", description: "Discord user ID", required: true }] },
  { name: "banhwid", description: "Ban a hardware ID from your scripts", options: [
    { type: OPT.STRING, name: "hwid", description: "Hardware ID", required: true },
    { type: OPT.STRING, name: "reason", description: "Reason", required: false },
  ]},
  { name: "unbanhwid", description: "Remove a hardware ID ban", options: [{ type: OPT.STRING, name: "hwid", description: "Hardware ID", required: true }] },
  { name: "loader", description: "Get the loader for a script", options: [{ type: OPT.STRING, name: "script_id", description: "Script ID or public ID", required: true }] },
  { name: "keys", description: "List your 10 most recent license keys", options: [{ type: OPT.STRING, name: "panel_id", description: "Filter by panel ID", required: false }] },
  { name: "setup", description: "Show the LuaMore setup guide" },
  { name: "help", description: "List all LuaMore commands" },
];

async function main() {
  const token = (process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || "").trim();
  const clientId = (process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_APP_ID || "").trim();
  const guildId = (process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID || "").trim();
  if (!token || !clientId) {
    console.log("[LuaMore Discord Sync] Bot credentials unavailable; skipping registration.");
    return;
  }
  const res = await fetch(`https://discord.com/api/v10/applications/${clientId}/commands`, {
    method: "PUT",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(DISCORD_COMMANDS),
  });
  if (!res.ok) throw new Error(`Discord API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  console.log(`[LuaMore Discord Sync] Registered ${data.length} commands globally.`);
  if (guildId) {
    await fetch(`https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`, {
      method: "PUT",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });
  }
}

main().catch((error) => {
  console.error("[LuaMore Discord Sync] Registration failed:", error.message);
  process.exitCode = 1;
});
