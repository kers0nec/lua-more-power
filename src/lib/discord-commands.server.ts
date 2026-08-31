// Automatic Discord Slash Commands Registration for LuaMore.
// Automatically syncs slash commands with Discord whenever the application starts,
// interactions endpoint is hit, or panels are created/updated.

const OPT = {
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
} as const;

export const DISCORD_COMMANDS = [
  {
    name: "help",
    description: "How to use LuaMore and control panels",
  },
  {
    name: "login",
    description: "Link your Discord to your LuaMore account via API key",
    options: [
      {
        type: OPT.STRING,
        name: "api_key",
        description: "Your LuaMore API key from the dashboard (Settings)",
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
        description: "Script public ID (optional — automatically detected if omitted)",
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
        description: "Discord user to whitelist",
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
    name: "blacklist",
    description: "Blacklist or revoke access for a Discord user",
    options: [
      {
        type: OPT.USER,
        name: "user",
        description: "Discord user to blacklist",
        required: true,
      },
      {
        type: OPT.STRING,
        name: "reason",
        description: "Reason for blacklist",
        required: false,
      },
    ],
  },
  {
    name: "generatekey",
    description: "Generate a license key for this channel's script",
    options: [
      {
        type: OPT.STRING,
        name: "duration",
        description: "Duration (e.g. 2h, 1d, 7d, 30d, 0 for lifetime)",
        required: false,
      },
      {
        type: OPT.USER,
        name: "user",
        description: "Discord user to assign key to",
        required: false,
      },
      {
        type: OPT.STRING,
        name: "note",
        description: "Note or tag for this key",
        required: false,
      },
    ],
  },
  {
    name: "setwebhook",
    description: "Set a Discord execution logging webhook URL for this panel/script",
    options: [
      {
        type: OPT.STRING,
        name: "url",
        description: "Discord Webhook URL (embeds key, HWID and Roblox user on execution)",
        required: true,
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

let lastRegisteredAt = 0;
let registrationPromise: Promise<{ ok: boolean; message: string; count?: number }> | null = null;

export async function autoRegisterDiscordCommands(options?: {
  force?: boolean;
}): Promise<{ ok: boolean; message: string; count?: number; status?: number }> {
  const token = (process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || "").trim();
  const clientId = (
    process.env.DISCORD_CLIENT_ID ||
    process.env.DISCORD_APPLICATION_ID ||
    process.env.DISCORD_APP_ID ||
    ""
  ).trim();
  const guildId = (process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID || "").trim();

  if (!token || !clientId) {
    return {
      ok: false,
      message:
        "DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID (or DISCORD_APPLICATION_ID) must be configured in environment variables.",
    };
  }

  const now = Date.now();
  // Don't spam Discord API if already registered within the last 10 minutes unless forced
  if (!options?.force && now - lastRegisteredAt < 10 * 60 * 1000) {
    return {
      ok: true,
      message: "Discord commands already automatically registered and up to date.",
      count: DISCORD_COMMANDS.length,
    };
  }

  if (registrationPromise && !options?.force) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      // Always register commands globally so they work everywhere with a single set of definitions
      const globalUrl = `https://discord.com/api/v10/applications/${clientId}/commands`;
      const res = await fetch(globalUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(DISCORD_COMMANDS),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Discord Auto-Register] Failed (${res.status}): ${errorText}`);
        return {
          ok: false,
          status: res.status,
          message: `Discord API returned ${res.status}: ${errorText}`,
        };
      }

      const result = (await res.json()) as Array<{ id: string; name: string }>;
      lastRegisteredAt = Date.now();

      // If a guildId was configured or provided, clear any guild-scoped duplicate commands
      // to avoid Discord showing 2 copies of each command in that server.
      if (guildId) {
        try {
          const guildUrl = `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`;
          await fetch(guildUrl, {
            method: "PUT",
            headers: {
              Authorization: `Bot ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify([]), // empty array wipes guild-scoped duplicates
          });
          console.log(
            `[Discord Auto-Register] Cleared guild-scoped duplicate commands for guild ${guildId}`,
          );
        } catch {
          /* ignore guild cleanup failure */
        }
      }

      console.log(
        `[Discord Auto-Register] Successfully registered ${result.length} slash commands globally.`,
      );
      return {
        ok: true,
        message: `Successfully registered ${result.length} slash commands globally${guildId ? ` (and cleaned guild duplicates for ${guildId})` : ""}.`,
        count: result.length,
      };
    } catch (err) {
      console.error("[Discord Auto-Register] Error registering commands:", err);
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Failed to register commands",
      };
    } finally {
      registrationPromise = null;
    }
  })();

  return registrationPromise;
}
