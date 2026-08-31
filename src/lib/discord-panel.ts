// Shared builders for the LuaMore Discord control panel message.
// Used by both the website (panels.functions.ts) and the Discord
// interactions endpoint so the embed always looks identical.

export type PanelEmbedInput = {
  id?: string;
  name: string;
  description?: string | null;
  sentBy?: string | null;
  avatarUrl?: string | null;
  scriptName?: string | null;
};

export const PANEL_ACCENT = 0x5865f2;

export function buildPanelEmbed({
  id,
  name,
  description,
  sentBy,
  avatarUrl,
  scriptName,
}: PanelEmbedInput) {
  void id;
  const projectName = scriptName || name || "daf";
  const title = name || `${projectName} Control Panel`;
  const body =
    description?.trim() ||
    `This control panel is for the project: **${projectName}**\nIf you're a buyer, click on the buttons below to redeem your key, get the script or get your role`;

  return {
    title,
    description: body,
    color: PANEL_ACCENT,
    footer: {
      text: sentBy ? `Sent by ${sentBy}` : "LuaMore",
      icon_url: avatarUrl || undefined,
    },
    timestamp: new Date().toISOString(),
  };
}

export function buildPanelComponents(panelId: string) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3, // Success (Green)
          label: "Redeem Key",
          emoji: { name: "🔑" },
          custom_id: `lm:redeem:${panelId}`,
        },
        {
          type: 2,
          style: 1, // Primary (Blurple)
          label: "Get Script",
          emoji: { name: "📜" },
          custom_id: `lm:script:${panelId}`,
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1, // Primary (Blurple)
          label: "Get Role",
          emoji: { name: "👤" },
          custom_id: `lm:role:${panelId}`,
        },
        {
          type: 2,
          style: 2, // Secondary (Grey)
          label: "Reset HWID",
          emoji: { name: "⚙️" },
          custom_id: `lm:hwid:${panelId}`,
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 2, // Secondary (Grey)
          label: "Get Stats",
          emoji: { name: "📊" },
          custom_id: `lm:stats:${panelId}`,
        },
      ],
    },
  ];
}

export function buildWhitelistMessage(
  discordId: string,
  targetLinkOrChannel?:
    | { guildId?: string; channelId?: string; messageId?: string; customUrl?: string }
    | string
    | null,
) {
  let where = "the control panel channel";
  if (typeof targetLinkOrChannel === "string") {
    where = targetLinkOrChannel.startsWith("http")
      ? targetLinkOrChannel
      : `<#${targetLinkOrChannel}>`;
  } else if (targetLinkOrChannel) {
    if (targetLinkOrChannel.customUrl) {
      where = targetLinkOrChannel.customUrl;
    } else if (
      targetLinkOrChannel.guildId &&
      targetLinkOrChannel.channelId &&
      targetLinkOrChannel.messageId
    ) {
      where = `https://discord.com/channels/${targetLinkOrChannel.guildId}/${targetLinkOrChannel.channelId}/${targetLinkOrChannel.messageId}`;
    } else if (targetLinkOrChannel.channelId) {
      where = `<#${targetLinkOrChannel.channelId}>`;
    }
  }

  return `« <@${discordId}> » You have been whitelisted!\nYou can access the script via this message --> ${where}`;
}

// Loader snippet shown in two formats: a fenced block for PC, an inline
// code span for mobile (mobile Discord can't copy from fenced blocks).
export function buildLoaderMessage(loader: string) {
  return ["**PC**", "```lua", loader, "```", "**Mobile**", `\`${loader}\``].join("\n");
}

// "20s" | "35m" | "2h" | "1d" | "7d" | "30d" → milliseconds. Empty = forever.
export function parseDuration(input?: string | null): number | null {
  const s = String(input ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  const m = s.match(/^(\d+)\s*(s|m|h|d|w)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] ?? "h";
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 }[unit]!;
  return n * mult;
}

export function formatDuration(ms: number | null) {
  if (!ms) return "forever";
  const units: [number, string][] = [
    [86_400_000, "d"],
    [3_600_000, "h"],
    [60_000, "m"],
    [1000, "s"],
  ];
  for (const [size, label] of units) if (ms >= size) return `${Math.round(ms / size)}${label}`;
  return `${ms}ms`;
}
