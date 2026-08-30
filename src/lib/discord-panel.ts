// Shared builders for the LuaMore Discord control panel message.

export type PanelEmbedInput = {
  id: string;
  name: string;
  description?: string | null;
  sentBy?: string | null;
  sentByAvatarUrl?: string | null;
  projectName?: string | null;
  access?: string | null;
};

export const PANEL_ACCENT = 0x1e40af;

export function buildPanelEmbed({
  id,
  name,
  description,
  sentBy,
  sentByAvatarUrl,
  projectName,
  access,
}: PanelEmbedInput) {
  void id;
  const scriptName = projectName || name;
  const body =
    description?.trim() ||
    `This control panel is for **${scriptName}**.\n\nUse the buttons below to redeem your key, get the script, claim your role, reset your HWID, or view stats.`;

  const embed: Record<string, unknown> = {
    title: scriptName,
    description: body,
    color: PANEL_ACCENT,
    fields: [
      { name: "Project", value: scriptName, inline: true },
      { name: "Access", value: access || "Key required", inline: true },
    ],
    footer: { text: sentBy ? `Sent by ${sentBy} • LuaMore` : "LuaMore" },
    timestamp: new Date().toISOString(),
  };
  if (sentBy) {
    embed.author = sentByAvatarUrl
      ? { name: sentBy, icon_url: sentByAvatarUrl }
      : { name: sentBy };
  }
  return embed;
}

export function buildPanelComponents(panelId: string) {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "Redeem Key", emoji: { name: "🔑" }, custom_id: `lm:redeem:${panelId}` },
        { type: 2, style: 1, label: "Get Script", emoji: { name: "🧵" }, custom_id: `lm:script:${panelId}` },
      ],
    },
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: "Get Role", emoji: { name: "👤" }, custom_id: `lm:role:${panelId}` },
        { type: 2, style: 2, label: "Reset HWID", emoji: { name: "⚙️" }, custom_id: `lm:hwid:${panelId}` },
      ],
    },
    {
      type: 1,
      components: [
        { type: 2, style: 2, label: "Get Stats", emoji: { name: "📊" }, custom_id: `lm:stats:${panelId}` },
      ],
    },
  ];
}

// Legacy generic whitelist message (kept for backwards compat with modal redeem flow).
export function buildWhitelistMessage(discordId: string, channelId?: string | null) {
  const where = channelId ? `<#${channelId}>` : "the control panel channel";
  return `<@${discordId}> You have been whitelisted!\nYou can access the script via this message --> ${where}`;
}

// New: exact format the owner requested — links to the specific panel message.
export function buildWhitelistDmMessage(discordId: string, messageLink: string) {
  return `« <@${discordId}> » You have been whitelisted!\nYou can access the script via this message --> ${messageLink}`;
}

export function buildLoaderMessage(loader: string) {
  return ["**PC**", "```lua", loader, "```", "**Mobile**", `\`${loader}\``].join("\n");
}

export function parseDuration(input?: string | null): number | null {
  const s = String(input ?? "").trim().toLowerCase();
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
    [86_400_000, "d"], [3_600_000, "h"], [60_000, "m"], [1000, "s"],
  ];
  for (const [size, label] of units) if (ms >= size) return `${Math.round(ms / size)}${label}`;
  return `${ms}ms`;
}
