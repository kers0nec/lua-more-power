import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPanelComponents, buildPanelEmbed } from "@/lib/discord-panel";
import { autoRegisterDiscordCommands } from "@/lib/discord-commands.server";
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

    if (!isOwner) {
      return {
        ok: false,
        message:
          "Unauthorized: Discord slash command manual synchronization is restricted to the owner account.",
      };
    }

    const result = await autoRegisterDiscordCommands({ force: true });
    return result;
  });

export const listPanels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      // Proactively register slash commands in the background on panel listing
      void autoRegisterDiscordCommands().catch(() => undefined);
      const { data, error } = await context.supabase
        .from("panels")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    } catch {
      return [];
    }
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
          channelId: z
            .string()
            .regex(/^\d{5,25}$/)
            .optional(),
          whitelistChannelId: z
            .string()
            .regex(/^\d{5,25}$/)
            .optional(),
          adminRoleIds: z
            .array(z.string().regex(/^\d{5,25}$/))
            .max(20)
            .optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Automatically trigger Discord slash commands registration
    void autoRegisterDiscordCommands().catch(() => undefined);
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

// Update the roles, channels, webhook, script, or info of an existing panel.
export const updatePanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      description?: string | null;
      scriptId?: string | null;
      channelId?: string | null;
      whitelistChannelId?: string | null;
      webhookUrl?: string | null;
      roleId?: string | null;
      adminRoleIds?: string[];
    }) =>
      z
        .object({
          id: z.string().uuid(),
          name: z.string().trim().min(1).max(120).optional(),
          description: z.string().max(1000).nullable().optional(),
          scriptId: z.string().uuid().nullable().optional(),
          channelId: z
            .string()
            .regex(/^\d{5,25}$/)
            .nullable()
            .optional(),
          whitelistChannelId: z
            .string()
            .regex(/^\d{5,25}$/)
            .nullable()
            .optional(),
          webhookUrl: z.string().url().nullable().optional(),
          roleId: z
            .string()
            .regex(/^\d{5,25}$/)
            .nullable()
            .optional(),
          adminRoleIds: z
            .array(z.string().regex(/^\d{5,25}$/))
            .max(20)
            .optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description || null;
    if (data.scriptId !== undefined) patch.script_id = data.scriptId || null;
    if (data.channelId !== undefined) patch.channel_id = data.channelId || null;
    if (data.whitelistChannelId !== undefined)
      patch.whitelist_channel_id = data.whitelistChannelId || null;
    if (data.webhookUrl !== undefined) patch.webhook_url = data.webhookUrl || null;
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

const ADMINISTRATOR = 0x8n;

async function discordGet(path: string, botToken: string) {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!res.ok) throw new Error(`Discord ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function userHasAdminInGuild(
  guildId: string,
  userId: string,
  botToken: string,
): Promise<boolean> {
  const guild = (await discordGet(`/guilds/${guildId}`, botToken)) as {
    owner_id: string;
    roles: Array<{ id: string; permissions: string }>;
  };
  if (guild.owner_id === userId) return true;
  const member = (await discordGet(`/guilds/${guildId}/members/${userId}`, botToken)) as {
    roles: string[];
  };
  const roleIds = new Set([guildId, ...member.roles]); // @everyone role id equals guild id
  let perms = 0n;
  for (const r of guild.roles) {
    if (roleIds.has(r.id)) perms |= BigInt(r.permissions);
  }
  return (perms & ADMINISTRATOR) === ADMINISTRATOR;
}

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
      .select("display_name, email, discord_id")
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

    // 1. If channel_id is provided and botToken is available, try sending via Bot
    if (panel.channel_id && botToken) {
      try {
        if (profile?.discord_id) {
          const channel = (await discordGet(`/channels/${panel.channel_id}`, botToken)) as {
            guild_id?: string;
          };
          if (channel.guild_id) {
            try {
              const isAdmin = await userHasAdminInGuild(
                channel.guild_id,
                profile.discord_id,
                botToken,
              );
              if (!isAdmin) {
                // If not full admin, log warning but allow authenticated panel owner to proceed if bot has channel access
                console.warn(
                  `[Panels] User ${profile.discord_id} is not admin in guild ${channel.guild_id}`,
                );
              }
            } catch (permErr) {
              console.warn(`[Panels] Admin check exception:`, permErr);
            }
          }
        }

        const res = await fetch(
          `https://discord.com/api/v10/channels/${panel.channel_id}/messages`,
          {
            method: "POST",
            headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (res.ok) {
          return { ok: true, via: "bot" as const };
        }

        // If bot message failed but webhook is not set, throw the error
        if (!panel.webhook_url) {
          const errText = await res.text();
          throw new Error(`Discord Bot API (${res.status}): ${errText}`);
        }
      } catch (botErr) {
        if (!panel.webhook_url) {
          throw botErr instanceof Error ? botErr : new Error(String(botErr));
        }
      }
    }

    // 2. If webhook_url is provided, post directly to the webhook!
    if (panel.webhook_url) {
      let res = await fetch(panel.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // If Discord rejects components on basic non-app webhooks (400), retry with embed-only payload
      if (!res.ok && res.status === 400) {
        res = await fetch(panel.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: payload.embeds,
          }),
        });
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Discord Webhook failed (${res.status}): ${errText}`);
      }

      return { ok: true, via: "webhook" as const };
    }

    // 3. Neither channel_id nor webhook_url is set
    throw new Error(
      "Please set a Discord Channel ID or a Discord Webhook URL for this panel before sending.",
    );
  });
