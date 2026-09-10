import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    return (m ? m[1] : auth).trim();
  }
  const x = request.headers.get("x-api-key");
  return x ? x.trim() : null;
}

async function authenticate(request: Request) {
  const key = extractKey(request);
  if (!key) return { error: json({ ok: false, error: "missing api key" }, 401) };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = await sha256Hex(key);
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, label")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error || !data) return { error: json({ ok: false, error: "invalid api key" }, 401) };
  supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {}, () => {});
  return { userId: data.user_id as string, supabase: supabaseAdmin };
}

function parseDurationToHours(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = s.trim().toLowerCase().match(/^(\d+)\s*([smhd])?$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const u = m[2] || "h";
  const mult = u === "s" ? 1 / 3600 : u === "m" ? 1 / 60 : u === "h" ? 1 : 24;
  return n * mult;
}

function genKey() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return "LM-" + Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
function genPublicId() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return "LM-" + Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function handle(request: Request, params: { _splat?: string }): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const path = (params._splat ?? "").replace(/^\/+|\/+$/g, "");
  const segs: string[] = path.length ? path.split("/").filter(Boolean) : [];
  const method = request.method.toUpperCase();

  const auth = await authenticate(request);
  if ("error" in auth) return auth.error;
  const { userId, supabase } = auth;

  let body: any = null;
  if (method !== "GET" && method !== "DELETE") {
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return json({ ok: false, error: "invalid json body" }, 400);
    }
  }

  // /me
  if (segs[0] === "me" && segs.length === 1 && method === "GET") {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, discord_id, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    return json({ ok: true, user: data });
  }

  // /scripts
  if (segs[0] === "scripts") {
    if (segs.length === 1 && method === "GET") {
      const { data } = await supabase
        .from("scripts")
        .select("id, public_id, name, description, ffa, is_active, is_protected, run_count, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return json({ ok: true, scripts: data ?? [] });
    }
    if (segs.length === 1 && method === "POST") {
      const name = String(body?.name ?? "").trim();
      const code = String(body?.code ?? body?.source ?? "");
      if (!name || !code) return json({ ok: false, error: "name and code required" }, 400);
      const ffa = !!body?.ffa;
      const publicId = genPublicId();
      const { data, error } = await supabase
        .from("scripts")
        .insert({ user_id: userId, name, code, ffa, public_id: publicId })
        .select("id, public_id, name, ffa, is_active")
        .maybeSingle();
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({
        ok: true,
        script: data,
        loader: `loadstring(game:HttpGet("https://luamore.app/api/public/r/${publicId}"))()`,
      });
    }
    if (segs.length === 2 && method === "GET") {
      const { data } = await supabase
        .from("scripts")
        .select("*")
        .eq("user_id", userId)
        .or(`id.eq.${segs[1]},public_id.eq.${segs[1]}`)
        .maybeSingle();
      if (!data) return json({ ok: false, error: "not found" }, 404);
      return json({ ok: true, script: data });
    }
    if (segs.length === 2 && method === "PATCH") {
      const patch: Record<string, unknown> = {};
      for (const k of ["name", "description", "code", "ffa", "is_active", "category"]) {
        if (k in (body || {})) patch[k] = body[k];
      }
      const { data, error } = await supabase
        .from("scripts")
        .update(patch as never)
        .eq("user_id", userId)
        .or(`id.eq.${segs[1]},public_id.eq.${segs[1]}`)
        .select("id, public_id, name")
        .maybeSingle();
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true, script: data });
    }
    if (segs.length === 2 && method === "DELETE") {
      const { error } = await supabase
        .from("scripts")
        .delete()
        .eq("user_id", userId)
        .or(`id.eq.${segs[1]},public_id.eq.${segs[1]}`);
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true });
    }
  }

  async function resolveScriptId(idOrPublic: string): Promise<string | null> {
    const { data } = await supabase
      .from("scripts")
      .select("id")
      .eq("user_id", userId)
      .or(`id.eq.${idOrPublic},public_id.eq.${idOrPublic}`)
      .maybeSingle();
    return data?.id ?? null;
  }

  // /keys
  if (segs[0] === "keys") {
    if (segs.length === 1 && method === "GET") {
      const scriptFilter = new URL(request.url).searchParams.get("script_id");
      let q = supabase
        .from("license_keys")
        .select("id, key, script_id, discord_id, hwid, note, expires_at, revoked, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (scriptFilter) {
        const sid = await resolveScriptId(scriptFilter);
        if (sid) q = q.eq("script_id", sid);
      }
      const { data } = await q;
      return json({ ok: true, keys: data ?? [] });
    }
    if (segs.length === 1 && method === "POST") {
      const sid = body?.script_id ? await resolveScriptId(String(body.script_id)) : null;
      if (!sid) return json({ ok: false, error: "script_id required" }, 400);
      const hours =
        typeof body?.hours === "number"
          ? body.hours
          : parseDurationToHours(body?.duration) ?? null;
      const expires_at = hours && hours > 0 ? new Date(Date.now() + hours * 3600_000).toISOString() : null;
      const key = genKey();
      const { data, error } = await supabase
        .from("license_keys")
        .insert({
          user_id: userId,
          script_id: sid,
          key,
          hours_valid: hours ?? null,
          expires_at,
          discord_id: body?.discord_id ? String(body.discord_id) : null,
          note: body?.note ? String(body.note) : null,
        })
        .select("id, key, expires_at")
        .maybeSingle();
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true, license: data });
    }
    if (segs.length === 2 && method === "DELETE") {
      const { error } = await supabase
        .from("license_keys")
        .delete()
        .eq("user_id", userId)
        .or(`id.eq.${segs[1]},key.eq.${segs[1]}`);
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true });
    }
  }

  // /whitelist
  if (segs[0] === "whitelist") {
    if (segs.length === 1 && method === "GET") {
      const { data } = await supabase
        .from("whitelists")
        .select("id, discord_id, script_id, license_key_id, expires_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500);
      return json({ ok: true, whitelist: data ?? [] });
    }
    if (segs.length === 1 && method === "POST") {
      const sid = body?.script_id ? await resolveScriptId(String(body.script_id)) : null;
      if (!sid) return json({ ok: false, error: "script_id required" }, 400);
      const discord_id = body?.discord_id ? String(body.discord_id) : null;
      if (!discord_id) return json({ ok: false, error: "discord_id required" }, 400);
      const hours =
        typeof body?.hours === "number"
          ? body.hours
          : parseDurationToHours(body?.duration) ?? null;
      const expires_at = hours && hours > 0 ? new Date(Date.now() + hours * 3600_000).toISOString() : null;
      const key = genKey();
      const { data: lk, error: lkErr } = await supabase
        .from("license_keys")
        .insert({
          user_id: userId,
          script_id: sid,
          key,
          hours_valid: hours ?? null,
          expires_at,
          discord_id,
          note: "whitelist",
        })
        .select("id, key")
        .maybeSingle();
      if (lkErr) return json({ ok: false, error: lkErr.message }, 400);
      const { data, error } = await supabase
        .from("whitelists")
        .insert({
          user_id: userId,
          script_id: sid,
          discord_id,
          license_key_id: lk!.id,
          expires_at,
        })
        .select("id, discord_id, expires_at")
        .maybeSingle();
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true, whitelist: data, key: lk!.key });
    }
    if (segs.length === 2 && method === "DELETE") {
      const { error } = await supabase
        .from("whitelists")
        .delete()
        .eq("user_id", userId)
        .or(`id.eq.${segs[1]},discord_id.eq.${segs[1]}`);
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true });
    }
  }

  // /blacklist  (user_bans)
  if (segs[0] === "blacklist") {
    if (segs.length === 1 && method === "GET") {
      const { data } = await supabase
        .from("user_bans")
        .select("id, discord_id, reason, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return json({ ok: true, blacklist: data ?? [] });
    }
    if (segs.length === 1 && method === "POST") {
      const discord_id = body?.discord_id ? String(body.discord_id) : null;
      if (!discord_id) return json({ ok: false, error: "discord_id required" }, 400);
      const { data, error } = await supabase
        .from("user_bans")
        .insert({
          user_id: userId,
          discord_id,
          reason: body?.reason ? String(body.reason) : null,
        })
        .select("id, discord_id")
        .maybeSingle();
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true, ban: data });
    }
    if (segs.length === 2 && method === "DELETE") {
      const { error } = await supabase
        .from("user_bans")
        .delete()
        .eq("user_id", userId)
        .or(`id.eq.${segs[1]},discord_id.eq.${segs[1]}`);
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true });
    }
  }

  // /hwid-bans
  if (segs[0] === "hwid-bans" || segs[0] === "hwid_bans") {
    if (segs.length === 1 && method === "GET") {
      const { data } = await supabase
        .from("hwid_bans")
        .select("id, hwid, reason, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return json({ ok: true, hwid_bans: data ?? [] });
    }
    if (segs.length === 1 && method === "POST") {
      const hwid = body?.hwid ? String(body.hwid) : null;
      if (!hwid) return json({ ok: false, error: "hwid required" }, 400);
      const { data, error } = await supabase
        .from("hwid_bans")
        .insert({ user_id: userId, hwid, reason: body?.reason ? String(body.reason) : null })
        .select("id, hwid")
        .maybeSingle();
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true, ban: data });
    }
    if (segs.length === 2 && method === "DELETE") {
      const { error } = await supabase
        .from("hwid_bans")
        .delete()
        .eq("user_id", userId)
        .or(`id.eq.${segs[1]},hwid.eq.${segs[1]}`);
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true });
    }
  }

  // /reset-hwid
  if (segs[0] === "reset-hwid" && method === "POST") {
    const discord_id = body?.discord_id ? String(body.discord_id) : null;
    let q = supabase.from("license_keys").update({ hwid: null }).eq("user_id", userId);
    if (discord_id) q = q.eq("discord_id", discord_id);
    else if (body?.key) q = q.eq("key", String(body.key));
    else return json({ ok: false, error: "discord_id or key required" }, 400);
    const { error } = await q;
    if (error) return json({ ok: false, error: error.message }, 400);
    return json({ ok: true });
  }

  // /logs
  if (segs[0] === "logs" && method === "GET") {
    const url = new URL(request.url);
    const limit = Math.min(500, parseInt(url.searchParams.get("limit") || "100", 10));
    const { data } = await supabase
      .from("execution_logs")
      .select("id, script_id, key, hwid, roblox_username, roblox_user_id, place_id, ip, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return json({ ok: true, logs: data ?? [] });
  }

  // /panels
  if (segs[0] === "panels" && segs.length === 1 && method === "GET") {
    const { data } = await supabase
      .from("panels")
      .select("id, name, description, script_id, channel_id, webhook_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return json({ ok: true, panels: data ?? [] });
  }

  return json({ ok: false, error: `no route for ${method} /${path}` }, 404);
}

export const Route = createFileRoute("/api/public/v1/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handle(request, params as any),
      POST: async ({ request, params }) => handle(request, params as any),
      PATCH: async ({ request, params }) => handle(request, params as any),
      DELETE: async ({ request, params }) => handle(request, params as any),
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
    },
  },
});
