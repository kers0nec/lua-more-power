import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AccessGrant {
  id: string;
  discord_id: string;
  script_id: string;
  script_name: string;
  script_public_id: string;
  expires_at: string | null;
  revoked: boolean;
  hwid: string | null;
  kind: "whitelist" | "key";
  created_at: string;
}

export interface MyAccessSummary {
  discordId: string | null;
  grants: AccessGrant[];
  totalActive: number;
  totalExpired: number;
  totalRevoked: number;
}

/**
 * Everything the authenticated user has granted or issued: Discord whitelists
 * plus license keys bound to a Discord user. Script names are resolved so the
 * page can show *which* script each access belongs to.
 */
export const listMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyAccessSummary> => {
    const empty: MyAccessSummary = {
      discordId: null,
      grants: [],
      totalActive: 0,
      totalExpired: 0,
      totalRevoked: 0,
    };

    try {
      const [profile, whitelists, keys, scripts] = await Promise.all([
        context.supabase
          .from("profiles")
          .select("discord_id")
          .eq("id", context.userId)
          .maybeSingle(),
        context.supabase
          .from("whitelists")
          .select("id, discord_id, script_id, expires_at, created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(500),
        context.supabase
          .from("license_keys")
          .select("id, discord_id, script_id, expires_at, revoked, hwid, created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(500),
        context.supabase
          .from("scripts")
          .select("id, name, public_id")
          .eq("user_id", context.userId)
          .limit(500),
      ]);

      const scriptById = new Map<string, { name: string; public_id: string }>();
      for (const s of scripts.data ?? []) {
        if (s?.id) scriptById.set(s.id, { name: s.name, public_id: s.public_id });
      }

      const now = Date.now();
      const grants: AccessGrant[] = [];

      for (const w of whitelists.data ?? []) {
        if (!w?.discord_id) continue;
        const script = w.script_id ? scriptById.get(w.script_id) : undefined;
        const expires_at = w.expires_at ?? null;
        grants.push({
          id: w.id,
          discord_id: w.discord_id,
          script_id: w.script_id ?? "",
          script_name: script?.name ?? "Unknown script",
          script_public_id: script?.public_id ?? "",
          expires_at,
          revoked: false,
          hwid: null,
          kind: "whitelist",
          created_at: w.created_at,
        });
      }

      for (const k of keys.data ?? []) {
        if (!k?.discord_id) continue;
        const script = k.script_id ? scriptById.get(k.script_id) : undefined;
        grants.push({
          id: k.id,
          discord_id: k.discord_id,
          script_id: k.script_id ?? "",
          script_name: script?.name ?? "Unknown script",
          script_public_id: script?.public_id ?? "",
          expires_at: k.expires_at ?? null,
          revoked: Boolean(k.revoked),
          hwid: k.hwid ?? null,
          kind: "key",
          created_at: k.created_at,
        });
      }

      grants.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        discordId: profile.data?.discord_id ?? null,
        grants,
        totalActive: grants.filter(
          (g) => !g.revoked && (!g.expires_at || new Date(g.expires_at).getTime() > now),
        ).length,
        totalExpired: grants.filter(
          (g) => !g.revoked && g.expires_at && new Date(g.expires_at).getTime() <= now,
        ).length,
        totalRevoked: grants.filter((g) => g.revoked).length,
      };
    } catch {
      return empty;
    }
  });
