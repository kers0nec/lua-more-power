import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOwnerAccount } from "@/lib/site";

export const syncDiscordCommands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userEmail = (context.claims as { email?: string })?.email;
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", context.userId)
      .maybeSingle();
    const isOwner =
      isOwnerAccount(userEmail) ||
      isOwnerAccount(profile?.email) ||
      isOwnerAccount(profile?.display_name);
    if (!isOwner) return { ok: false, message: "Only the LuaMore owner can sync commands." };
    const { autoRegisterDiscordCommands } = await import("@/lib/discord-commands.server");
    return autoRegisterDiscordCommands({ force: true });
  });

export const listPanels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("panels")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    name: string;
    description?: string;
    scriptId?: string;
    channelId?: string;
    whitelistChannelId?: string;
  }) => z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional(),
    scriptId: z.string().uuid().optional(),
    channelId: z.string().regex(/^\d{5,25}$/, "Enter a valid Discord channel ID").optional(),
    whitelistChannelId: z.string().regex(/^\d{5,25}$/, "Enter a valid Discord channel ID").optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("panels")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        script_id: data.scriptId ?? null,
        channel_id: data.channelId ?? null,
        whitelist_channel_id: data.whitelistChannelId ?? null,
        webhook_url: null,
        admin_role_ids: [],
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Panel could not be created");
    return row;
  });

export const deletePanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("panels")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id: string;
    name: string;
    description?: string | null;
    scriptId?: string | null;
    channelId?: string | null;
    whitelistChannelId?: string | null;
    roleId?: string | null;
    adminRoleIds?: string[];
  }) => z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).nullable().optional(),
    scriptId: z.string().uuid().nullable().optional(),
    channelId: z.string().regex(/^\d{5,25}$/, "Enter a valid Discord channel ID").nullable().optional(),
    whitelistChannelId: z.string().regex(/^\d{5,25}$/, "Enter a valid Discord channel ID").nullable().optional(),
    roleId: z.string().regex(/^\d{5,25}$/, "Enter a valid Discord role ID").nullable().optional(),
    adminRoleIds: z.array(z.string().regex(/^\d{5,25}$/, "Enter valid Discord role IDs")).max(20).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const { error } = await context.supabase
      .from("panels")
      .update({
        name: values.name,
        description: values.description ?? null,
        script_id: values.scriptId ?? null,
        channel_id: values.channelId ?? null,
        whitelist_channel_id: values.whitelistChannelId ?? null,
        discord_role_id: values.roleId ?? null,
        admin_role_ids: values.adminRoleIds ?? [],
        webhook_url: null,
      })
      .eq("id", id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const discordGet = async (path: string, token: string) => {
      const response = await fetch(`https://discord.com/api/v10${path}`, {
        headers: { Authorization: `Bot ${token}` },
      });
      if (!response.ok) {
        const detail = await response.text();
        if (response.status === 403) throw new Error("The LuaMore bot cannot access that server or channel.");
        if (response.status === 404) throw new Error("Discord channel not found. Check the channel ID and invite the LuaMore bot.");
        if (response.status === 429) throw new Error("Discord is rate limiting requests. Wait a moment and try again.");
        throw new Error(`Discord permission check failed (${response.status}): ${detail.slice(0, 180)}`);
      }
      return response.json();
    };

    const { data: panel, error } = await context.supabase
      .from("panels")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!panel) throw new Error("Panel not found");
    if (!panel.script_id) throw new Error("Attach a script before sending this panel.");
    if (!panel.channel_id) throw new Error("Set a Discord channel ID before sending this panel.");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name, email, discord_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.discord_id) throw new Error("Link your Discord account in Settings before sending a panel.");

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) throw new Error("The LuaMore Discord bot is not configured.");

    const channel = await discordGet(`/channels/${panel.channel_id}`, botToken) as { id?: string; guild_id?: string; name?: string };
    if (!channel.guild_id) throw new Error("That channel is not a server text channel the bot can access.");

    const guild = await discordGet(`/guilds/${channel.guild_id}`, botToken) as {
      owner_id?: string;
      roles?: Array<{ id: string; permissions: string }>;
    };
    let allowed = guild.owner_id === profile.discord_id;
    if (!allowed) {
      const member = await discordGet(`/guilds/${channel.guild_id}/members/${profile.discord_id}`, botToken) as { roles?: string[] };
      const roleIds = new Set([channel.guild_id, ...(member.roles ?? [])]);
      let permissions = 0n;
      for (const role of guild.roles ?? []) if (roleIds.has(role.id)) permissions |= BigInt(role.permissions);
      const administrator = 0x8n;
      const manageChannels = 0x10n;
      allowed = (permissions & administrator) === administrator || (permissions & manageChannels) === manageChannels;
    }
    if (!allowed) throw new Error("You need Administrator or Manage Channels permission in that Discord server.");

    const { buildPanelComponents, buildPanelEmbed } = await import("@/lib/discord-panel");
    const response = await fetch(`https://discord.com/api/v10/channels/${panel.channel_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [buildPanelEmbed({
          id: panel.id,
          name: panel.name,
          description: panel.description,
          sentBy: profile.display_name || profile.email?.split("@")[0] || null,
        })],
        components: buildPanelComponents(panel.id),
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 403) throw new Error("The bot needs View Channel, Send Messages, Embed Links, and Use External Emojis permissions.");
      if (response.status === 404) throw new Error("Discord channel not found. Check the saved channel ID.");
      if (response.status === 429) throw new Error("Discord is rate limiting panel posts. Wait a moment and try again.");
      throw new Error(`Discord could not send the panel (${response.status}): ${detail.slice(0, 180)}`);
    }
    const message = await response.json() as { id?: string; channel_id?: string };
    return { ok: true, messageId: message.id ?? null, channelId: message.channel_id ?? panel.channel_id, channelName: channel.name ?? null };
  });
