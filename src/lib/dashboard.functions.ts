import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOwnerAccount, USERNAME_RE } from "@/lib/site";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
      const [scripts, keys, panels, releases, profile] = await Promise.all([
        supabase.from("scripts").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase
          .from("license_keys")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase.from("panels").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase
          .from("script_releases")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      ]);

      const userEmail = (context.claims as { email?: string })?.email;
      const isOwner =
        isOwnerAccount(userEmail) ||
        isOwnerAccount(profile.data?.email) ||
        isOwnerAccount(profile.data?.display_name);

      return {
        scripts: scripts.count ?? 0,
        keys: keys.count ?? 0,
        panels: panels.count ?? 0,
        releases: releases.count ?? 0,
        isOwner: Boolean(isOwner),
        profile: profile.data
          ? { ...profile.data, plan: "free", max_scripts: 999999999, max_panels: 999999999 }
          : null,
      };
    } catch {
      return {
        scripts: 0,
        keys: 0,
        panels: 0,
        releases: 0,
        isOwner: false,
        profile: null,
      };
    }
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { display_name: string; discord_id?: string }) =>
    z
      .object({
        display_name: z.string().trim().regex(USERNAME_RE, "Use 3–24 letters or numbers only"),
        discord_id: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const updatePayload: Record<string, unknown> = {
      display_name: data.display_name,
      plan: "free",
      max_scripts: 999999999,
      max_panels: 999999999,
    };
    if (data.discord_id !== undefined) {
      updatePayload.discord_id = data.discord_id || null;
    }

    const { error } = await context.supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    if (data.discord_id) {
      const { setDiscordSession } = await import("@/lib/discord-auth-store.server");
      setDiscordSession(data.discord_id, {
        userId: context.userId,
        discordId: data.discord_id,
        username: data.display_name,
        linkedAt: new Date().toISOString(),
      });
    }

    return { ok: true as const };
  });

// Public site counters — aggregated counts only, safe to expose.
export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [scripts, releases, keys, users] = await Promise.all([
      supabaseAdmin.from("scripts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("script_releases").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("license_keys").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    ]);
    return {
      releasesPublished: releases.count ?? 0,
      scriptsHosted: scripts.count ?? 0,
      keysGenerated: keys.count ?? 0,
      activeUsers: users.count ?? 0,
    };
  } catch {
    return { releasesPublished: 0, scriptsHosted: 0, keysGenerated: 0, activeUsers: 0 };
  }
});
