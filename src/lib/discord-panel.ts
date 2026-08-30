// Shared builders for the LuaMore Discord control panel message.
// Used by both the website (panels.functions.ts) and the Discord
// interactions endpoint so the embed always looks identical.

export type PanelEmbedInput = {
  id: string;
  name: string;
  description?: string | null;
  sentBy?: string | null;
  projectName?: string | null;
  access?: string | null;
};

export const PANEL_ACCENT = 0x00aaff;

export function buildPanelEmbed({
  id,
  name,
  description,
  sentBy,
  projectName,
  access,
}: PanelEmbedInput) {
  void id;
  const body = description?.trim() || "Use the controls below to manage your LuaMore access.";

  return {
    title: `🎮 ${name}`,
    description: body,
    color: PANEL_ACCENT,
    fields: [
      { name: "Project", value: projectName || name, inline: true },
      { name: "Access", value: access || "Key required", inline: true },
    ],
    footer: { text: sentBy ? `Sent by ${sentBy} • LuaMore` : "LuaMore" },
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
          style: 3,
          label: "Redeem Key",
          emoji: { name: "🔑" },
          custom_id: `lm:redeem:${panelId}`,
        },
        {
          type: 2,
          style: 1,
          label: "Get Script",
          emoji: { name: "🧵" },
          custom_id: `lm:script:${panelId}`,
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          label: "Get Role",
          emoji: { name: "👤" },
          custom_id: `lm:role:${panelId}`,
        },
        {
          type: 2,
          style: 2,
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
          style: 2,
          label: "Get Stats",
          emoji: { name: "📊" },
          custom_id: `lm:stats:${panelId}`,
        },
      ],
    },
  ];
}

export function buildWhitelistMessage(discordId: string, channelId?: string | null) {
  const where = channelId ? `<#${channelId}>` : "the control panel channel";
  return `<@${discordId}> You have been whitelisted!\nYou can access the script via this message --> ${where}`;
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
