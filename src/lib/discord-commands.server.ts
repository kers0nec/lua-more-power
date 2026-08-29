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
      const url = guildId
        ? `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`
        : `https://discord.com/api/v10/applications/${clientId}/commands`;

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
        console.warn(`[Discord Auto-Register] Failed (${res.status}): ${errorText}`);
        return {
          ok: false,
          status: res.status,
          message: `Discord API returned ${res.status}: ${errorText}`,
        };
      }

      const result = (await res.json()) as Array<{ id: string; name: string }>;
      lastRegisteredAt = Date.now();
      console.log(
        `[Discord Auto-Register] Successfully registered ${result.length} slash commands${guildId ? ` to guild ${guildId}` : " globally"}.`,
      );
      return {
        ok: true,
        message: `Successfully registered ${result.length} slash commands${guildId ? ` (Guild: ${guildId})` : " globally"}.`,
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
