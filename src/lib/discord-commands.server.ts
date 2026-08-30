// Auto-registers the 16 LuaMore slash commands with Discord.

const OPT = { STRING: 3, INTEGER: 4, BOOLEAN: 5, USER: 6 } as const;

export const DISCORD_COMMANDS = [
  { name: "help", description: "List all LuaMore commands" },
  { name: "setup", description: "Show the LuaMore setup guide" },
  {
    name: "login",
    description: "Link your Discord to your LuaMore account",
    options: [
      { type: OPT.STRING, name: "api_key", description: "Your LuaMore API key", required: false },
      { type: OPT.STRING, name: "email", description: "Account email", required: false },
      { type: OPT.STRING, name: "password", description: "Account password", required: false },
    ],
  },
  {
    name: "create-script",
    description: "Create a new LuaMore script",
    options: [
      { type: OPT.STRING, name: "name", description: "Script name", required: true },
      { type: OPT.STRING, name: "code", description: "Luau source (paste short scripts)", required: false },
      { type: OPT.BOOLEAN, name: "ffa", description: "Free-for-all (no key)", required: false },
      { type: OPT.BOOLEAN, name: "obfuscate", description: "Auto-obfuscate", required: false },
    ],
  },
  {
    name: "panel",
    description: "Post a control panel for a script in this channel",
    options: [
      { type: OPT.STRING, name: "script_id", description: "Script public ID", required: true },
    ],
  },
  {
    name: "generatekey",
    description: "Generate a license key",
    options: [
      { type: OPT.STRING, name: "script_id", description: "Script public ID", required: true },
      { type: OPT.INTEGER, name: "hours", description: "Hours valid (0 = forever)", required: false },
      { type: OPT.STRING, name: "note", description: "Note for this key", required: false },
      { type: OPT.USER, name: "user", description: "Bind key to a Discord user", required: false },
    ],
  },
  {
    name: "whitelist",
    description: "Whitelist a user on this channel's panel",
    options: [
      { type: OPT.USER, name: "user", description: "User to whitelist", required: true },
      { type: OPT.STRING, name: "duration", description: "20s, 35m, 2h, 1d — omit for forever", required: false },
    ],
  },
  {
    name: "blacklist",
    description: "Blacklist a user from your scripts",
    options: [
      { type: OPT.USER, name: "user", description: "User to blacklist", required: true },
      { type: OPT.STRING, name: "reason", description: "Reason", required: false },
    ],
  },
  {
    name: "deletekey",
    description: "Delete a license key you own",
    options: [{ type: OPT.STRING, name: "key", description: "License key", required: true }],
  },
  {
    name: "resethwid",
    description: "Reset your own HWID (or another user's if you are admin)",
    options: [{ type: OPT.USER, name: "user", description: "User (admins only)", required: false }],
  },
  {
    name: "forceresethwid",
    description: "Force-reset HWID for any user (owner only)",
    options: [{ type: OPT.USER, name: "user", description: "User", required: true }],
  },
  {
    name: "banuser",
    description: "Ban a user from LuaMore (owner only)",
    options: [
      { type: OPT.USER, name: "user", description: "User", required: true },
      { type: OPT.STRING, name: "reason", description: "Reason", required: false },
    ],
  },
  {
    name: "unbanuser",
    description: "Unban a user (owner only)",
    options: [{ type: OPT.USER, name: "user", description: "User", required: true }],
  },
  {
    name: "banhwid",
    description: "Ban a hardware ID from your scripts",
    options: [
      { type: OPT.STRING, name: "hwid", description: "HWID string", required: true },
      { type: OPT.STRING, name: "reason", description: "Reason", required: false },
    ],
  },
  {
    name: "unbanhwid",
    description: "Unban a HWID",
    options: [{ type: OPT.STRING, name: "hwid", description: "HWID string", required: true }],
  },
  {
    name: "loader",
    description: "Get the loadstring for a script",
    options: [
      { type: OPT.STRING, name: "script_id", description: "Script public ID", required: true },
    ],
  },
  {
    name: "keys",
    description: "List your 10 most recent license keys",
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
      message: "DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID must be configured.",
    };
  }

  const now = Date.now();
  if (!options?.force && now - lastRegisteredAt < 10 * 60 * 1000) {
    return { ok: true, message: "Commands up to date.", count: DISCORD_COMMANDS.length };
  }
  if (registrationPromise && !options?.force) return registrationPromise;

  registrationPromise = (async () => {
    try {
      const globalUrl = `https://discord.com/api/v10/applications/${clientId}/commands`;
      const res = await fetch(globalUrl, {
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
        try {
          await fetch(
            `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`,
            {
              method: "PUT",
              headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify([]),
            },
          );
        } catch {
          /* ignore */
        }
      }

      console.log(`[Discord Auto-Register] Registered ${result.length} commands globally.`);
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
