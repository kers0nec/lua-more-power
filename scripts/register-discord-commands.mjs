#!/usr/bin/env node

/**
 * Standalone Discord Slash Commands Registration Script for LuaMore.
 * Automatically runs during CI/CD, GitHub Actions, or Wasmer deployment.
 */

const OPT = {
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
};

const DISCORD_COMMANDS = [
  {
    name: "help",
    description: "How to use LuaMore and control panels",
  },
  {
    name: "login",
    description: "Link your Discord to your LuaMore account",
    options: [
      {
        type: OPT.STRING,
        name: "api_key",
        description: "Your LuaMore API key from the dashboard",
        required: true,
      },
    ],
  },
  {
    name: "setup",
    description: "Set up the LuaMore panel in this channel",
    options: [
      {
        type: OPT.STRING,
        name: "script_id",
        description: "Script public ID (optional — otherwise pick from menu)",
        required: false,
      },
    ],
  },
  {
    name: "whitelist",
    description: "Whitelist a user for this channel's script",
    options: [
      {
        type: OPT.USER,
        name: "user",
        description: "User to whitelist",
        required: true,
      },
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
      {
        type: OPT.USER,
        name: "user",
        description: "User to reset (admins only, omit for self)",
        required: false,
      },
    ],
  },
];

async function main() {
  const token = (process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || "").trim();
  const clientId = (
    process.env.DISCORD_CLIENT_ID ||
    process.env.DISCORD_APPLICATION_ID ||
    process.env.DISCORD_APP_ID ||
    ""
  ).trim();
  const guildId = (process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID || "").trim();

  if (!token || !clientId) {
    console.log(
      "[LuaMore Discord Sync] Notice: DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID not found in environment. Skipping build-time registration (will auto-sync at runtime when configured).",
    );
    process.exit(0);
  }

  console.log(`[LuaMore Discord Sync] Registering ${DISCORD_COMMANDS.length} slash commands...`);

  const url = guildId
    ? `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${clientId}/commands`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(DISCORD_COMMANDS),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[LuaMore Discord Sync] Discord API error (${res.status}):`, errorText);
      // Do not fail the build if Discord API has rate limits
      process.exit(0);
    }

    const data = await res.json();
    console.log(
      `[LuaMore Discord Sync] ✅ Successfully registered ${data.length} slash commands${guildId ? ` to guild ${guildId}` : " globally"}!`,
    );
  } catch (err) {
    console.error("[LuaMore Discord Sync] Failed to register commands:", err.message);
  }
}

main();
