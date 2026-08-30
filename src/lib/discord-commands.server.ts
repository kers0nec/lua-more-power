// Canonical LuaMore Discord slash-command definitions.

const OPT = { STRING: 3, INTEGER: 4, BOOLEAN: 5, USER: 6 } as const;

const MODE_CHOICES = [
  { name: "Basic", value: "basic" },
  { name: "Standard", value: "standard" },
  { name: "Advanced", value: "advanced" },
];

export const DISCORD_COMMANDS = [
  {
    name: "create-script",
    description: "Create a new LuaMore script",
    options: [
      { type: OPT.STRING, name: "name", description: "Script name", required: true },
      { type: OPT.STRING, name: "code", description: "Lua source code", required: true },
      { type: OPT.BOOLEAN, name: "ffa", description: "Allow access without a key", required: false },
      { type: OPT.BOOLEAN, name: "obfuscate", description: "Protect the source before hosting", required: false },
      { type: OPT.STRING, name: "mode", description: "Protection level", required: false, choices: MODE_CHOICES },
    ],
  },
  {
    name: "panel",
    description: "Send an interactive panel to this channel",
    options: [{ type: OPT.STRING, name: "panel_id", description: "Panel ID", required: true }],
  },
  {
    name: "generatekey",
    description: "Generate a license key for a panel",
    options: [
      { type: OPT.STRING, name: "panel_id", description: "Panel ID", required: true },
      { type: OPT.INTEGER, name: "hours", description: "Hours valid (0 = permanent)", required: false, min_value: 0 },
      { type: OPT.STRING, name: "note", description: "Optional note", required: false },
      { type: OPT.USER, name: "user", description: "Discord user to assign", required: false },
    ],
  },
  {
    name: "whitelist",
    description: "Grant a Discord user access to a script",
    options: [
      { type: OPT.STRING, name: "script_id", description: "Script ID or public ID", required: true },
      { type: OPT.USER, name: "user", description: "User to whitelist", required: true },
      { type: OPT.INTEGER, name: "duration", description: "Hours valid (0 = permanent)", required: false, min_value: 0 },
    ],
  },
  {
    name: "blacklist",
    description: "Revoke a Discord user's access to a script",
    options: [
      { type: OPT.STRING, name: "script_id", description: "Script ID or public ID", required: true },
      { type: OPT.USER, name: "user", description: "User to blacklist", required: true },
    ],
  },
  {
    name: "deletekey",
    description: "Permanently delete a license key you own",
    options: [{ type: OPT.STRING, name: "key", description: "License key", required: true }],
  },
  {
    name: "resethwid",
    description: "Reset your HWID for a script",
    options: [{ type: OPT.STRING, name: "script_id", description: "Script ID or public ID", required: true }],
  },
  {
    name: "forceresethwid",
    description: "Force-reset a user's HWID (LuaMore owner only)",
    options: [
      { type: OPT.STRING, name: "script_id", description: "Script ID or public ID", required: true },
      { type: OPT.USER, name: "user", description: "Discord user", required: true },
    ],
  },
  {
    name: "banuser",
    description: "Ban a Discord ID from the website (owner only)",
    options: [
      { type: OPT.STRING, name: "discord_id", description: "Discord user ID", required: true },
      { type: OPT.STRING, name: "reason", description: "Reason", required: false },
    ],
  },
  {
    name: "unbanuser",
    description: "Restore website access for a Discord ID (owner only)",
    options: [{ type: OPT.STRING, name: "discord_id", description: "Discord user ID", required: true }],
  },
  {
    name: "banhwid",
    description: "Ban a hardware ID from your scripts",
    options: [
      { type: OPT.STRING, name: "hwid", description: "Hardware ID", required: true },
      { type: OPT.STRING, name: "reason", description: "Reason", required: false },
    ],
  },
  {
    name: "unbanhwid",
    description: "Remove a hardware ID ban",
    options: [{ type: OPT.STRING, name: "hwid", description: "Hardware ID", required: true }],
  },
  {
    name: "loader",
    description: "Get the loader for a script",
    options: [{ type: OPT.STRING, name: "script_id", description: "Script ID or public ID", required: true }],
  },
  {
    name: "keys",
    description: "List your 10 most recent license keys",
    options: [{ type: OPT.STRING, name: "panel_id", description: "Filter by panel ID", required: false }],
  },
  { name: "setup", description: "Show the LuaMore setup guide" },
  { name: "help", description: "List all LuaMore commands" },
] as const;

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
    return { ok: false, message: "DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID must be configured." };
  }

  const now = Date.now();
  if (!options?.force && now - lastRegisteredAt < 10 * 60 * 1000) {
    return { ok: true, message: "Commands up to date.", count: DISCORD_COMMANDS.length };
  }
  if (registrationPromise && !options?.force) return registrationPromise;

  registrationPromise = (async () => {
    try {
      const res = await fetch(`https://discord.com/api/v10/applications/${clientId}/commands`, {
        method: "PUT",
        headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(DISCORD_COMMANDS),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Discord Auto-Register] Failed (${res.status}): ${errorText}`);
        return { ok: false, status: res.status, message: `Discord API ${res.status}: ${errorText}` };
      }
      const result = (await res.json()) as Array<{ id: string; name: string }>;
      lastRegisteredAt = Date.now();
      if (guildId) {
        await fetch(`https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`, {
          method: "PUT",
          headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify([]),
        }).catch(() => undefined);
      }
      return { ok: true, message: `Registered ${result.length} commands.`, count: result.length };
    } catch (err) {
      console.error("[Discord Auto-Register] Error:", err);
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    } finally {
      registrationPromise = null;
    }
  })();

  return registrationPromise;
}
