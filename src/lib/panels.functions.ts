import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPanelComponents, buildPanelEmbed } from "@/lib/discord-panel";

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
  .inputValidator(
    (input: {
      name: string;
      description?: string;
      scriptId?: string;
      webhookUrl?: string;
      roleId?: string;
      channelId?: string;
      whitelistChannelId?: string;
      adminRoleIds?: string[];
    }) =>
      z
        .object({
          name: z.string().trim().min(1).max(120),
          description: z.string().max(1000).optional(),
          scriptId: z.string().uuid().optional(),
          webhookUrl: z.string().url().optional(),
          roleId: z.string().max(64).optional(),
          channelId: z.string().regex(/^\d{5,25}$/).optional(),
          whitelistChannelId: z.string().regex(/^\d{5,25}$/).optional(),
          adminRoleIds: z.array(z.string().regex(/^\d{5,25}$/)).max(20).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("panels")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        script_id: data.scriptId ?? null,
        webhook_url: data.webhookUrl ?? null,
        discord_role_id: data.roleId ?? null,
        channel_id: data.channelId ?? null,
        whitelist_channel_id: data.whitelistChannelId ?? null,
        admin_role_ids: data.adminRoleIds ?? [],
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row!;
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

// Update the roles / channels of an existing panel (also used for panels
// created from Discord via /setup).
export const updatePanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; roleId?: string | null; adminRoleIds?: string[] }) =>
    z
      .object({
        id: z.string().uuid(),
        roleId: z.string().regex(/^\d{5,25}$/).nullable().optional(),
        adminRoleIds: z.array(z.string().regex(/^\d{5,25}$/)).max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { discord_role_id?: string | null; admin_role_ids?: string[] } = {};
    if (data.roleId !== undefined) patch.discord_role_id = data.roleId || null;
    if (data.adminRoleIds !== undefined) patch.admin_role_ids = data.adminRoleIds;
    const { error } = await context.supabase
      .from("panels")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Post the control panel to Discord — via the bot (channel id) or a webhook URL.
export const sendPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: panel, error } = await context.supabase
      .from("panels")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!panel) throw new Error("Panel not found");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    const payload = {
      embeds: [
        buildPanelEmbed({
          id: panel.id,
          name: panel.name,
          description: panel.description,
          sentBy: profile?.display_name || profile?.email?.split("@")[0] || null,
        }),
      ],
      components: buildPanelComponents(panel.id),
    };

    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (panel.channel_id && botToken) {
      const res = await fetch(`https://discord.com/api/v10/channels/${panel.channel_id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Discord API ${res.status}: ${await res.text()}`);
      return { ok: true, via: "bot" as const };
    }

    if (!panel.webhook_url) {
      throw new Error("Set a Discord channel ID (recommended) or a webhook URL for this panel");
    }

    const res = await fetch(panel.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(
        `Discord webhook ${res.status}: ${await res.text()} — interactive buttons require a channel ID so the bot can post.`,
      );
    }
    return { ok: true, via: "webhook" as const };
  });
