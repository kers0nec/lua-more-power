import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
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
    return {
      scripts: scripts.count ?? 0,
      keys: keys.count ?? 0,
      panels: panels.count ?? 0,
      releases: releases.count ?? 0,
      profile: profile.data,
    };
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
