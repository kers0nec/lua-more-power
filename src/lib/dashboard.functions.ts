import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [scripts, keys, panels, releases, profile] = await Promise.all([
      supabase.from("scripts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("license_keys").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("panels").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("script_releases").select("id", { count: "exact", head: true }).eq("user_id", userId),
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

// Public site counters — cached brief numbers for the homepage.
export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const [scripts, releases, keys, users] = await Promise.all([
    supabase.from("scripts").select("id", { count: "exact", head: true }),
    supabase.from("script_releases").select("id", { count: "exact", head: true }),
    supabase.from("license_keys").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  return {
    scriptsObfuscated: releases.count ?? 0,
    scriptsHosted: scripts.count ?? 0,
    keysGenerated: keys.count ?? 0,
    activeUsers: users.count ?? 0,
  };
});
