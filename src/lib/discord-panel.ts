// Shared builders for the LuaMore Discord control panel message.
// Used by both the website (panels.functions.ts) and the Discord
// interactions endpoint so the embed always looks identical.

export type PanelEmbedInput = {
  id: string;
  name: string;
  description?: string | null;
  sentBy?: string | null;
};

export const PANEL_ACCENT = 0x00aaff;

export function buildPanelEmbed({ id, name, description, sentBy }: PanelEmbedInput) {
  void id;
  const body =
    description?.trim() ||
    `This control panel is for the project: **${name}**\n\nIf you're a buyer, click on the buttons below to redeem your key, get the script or get your role.`;

  return {
    title: `${name} Control Panel`,
    description: body,
    color: PANEL_ACCENT,
    footer: { text: sentBy ? `Sent by ${sentBy}. • LuaMore` : "LuaMore" },
    timestamp: new Date().toISOString(),
  };
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

export function buildWhitelistMessage(discordId: string, channelId?: string | null) {
  const where = channelId ? `<#${channelId}>` : "the control panel channel";
  return `<@${discordId}> You have been whitelisted!\nYou can access the script via this message --> ${where}`;
}
