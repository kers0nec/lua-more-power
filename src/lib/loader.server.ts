// Shared handler for the public script loader endpoints.
// Served at both /api/public/r/<token> (short) and /api/public/loader/<token>.
//
// <token> may be a script public_id (FFA scripts) or a license key. Clean
// user-facing loader:  loadstring(game:HttpGet(".../api/public/r/<token>"))()
// On the first hit (no ?hwid=) we return a tiny stub that re-requests with
// the client's HWID appended, so HWID locking still works.
//
// Every served script is passed through the LuaMore VM obfuscator so the
// response body never contains plaintext source.
import { obfuscateLua } from "@/lib/obfuscator.server";
import { getScriptByPublicId, bumpScriptRuns } from "@/lib/scripts-store.server";

interface ScriptRecord {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  obfuscated_code?: string | null;
  is_protected?: boolean;
  ffa?: boolean;
  public_id: string;
  is_active?: boolean;
  run_count?: number;
}

export async function handleLoaderRequest(params: { publicId: string }, request: Request) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const url = new URL(request.url);
  const token = params.publicId;
  const hwid = url.searchParams.get("hwid")?.trim() || null;

  // Resolve the token: script public_id first, then license key.
  let key = url.searchParams.get("key")?.trim() || null;
  let script: ScriptRecord | null = null;

  try {
    const { data: dbScript } = await supabaseAdmin
      .from("scripts")
      .select(
        "id, user_id, name, code, obfuscated_code, is_protected, ffa, public_id, is_active, run_count",
      )
      .eq("public_id", token)
      .maybeSingle();
    if (dbScript) script = dbScript;
  } catch {
    // ignore
  }

  if (!script) {
    const local = getScriptByPublicId(token);
    if (local) script = local;
  }

  if (!script) {
    try {
      const { data: byKey } = await supabaseAdmin
        .from("license_keys")
        .select("key, script_id")
        .eq("key", token)
        .maybeSingle();
      if (byKey?.script_id) {
        key = byKey.key;
        const { data: s2 } = await supabaseAdmin
          .from("scripts")
          .select(
            "id, user_id, name, code, obfuscated_code, is_protected, ffa, public_id, is_active, run_count",
          )
          .eq("id", byKey.script_id)
          .maybeSingle();
        script = s2 ?? null;
      }
    } catch {
      // ignore
    }
  }

  if (!script) return luaError("Script not found");
  if (!script.is_active) return luaError("Script is disabled");
  if (!script.code) return luaError("Script has no code yet");

  const bumpRuns = () => {
    bumpScriptRuns(script.id);
    try {
      supabaseAdmin
        .from("scripts")
        .update({ run_count: (script.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
        .eq("id", script.id);
    } catch {
      // ignore
    }
  };

  // Serve stored obfuscated_code when protection is enabled and a build exists;
  // otherwise obfuscate on the fly. Non-protected scripts still get VM-wrapped
  // so raw source never leaves the server.
  const payload =
    script.is_protected && script.obfuscated_code
      ? script.obfuscated_code
      : obfuscateLua(script.code);

  if (script.ffa) {
    await bumpRuns();
    return lua(payload);
  }

  if (!key) return luaError("License key required");

  // First hit without a HWID: hand back a stub that re-requests with the HWID.
  if (!hwid) {
    const again = new URL(request.url);
    again.searchParams.set("hwid", "__HWID__");
    const target = again
      .toString()
      .replace("__HWID__", "\"..game:GetService('RbxAnalyticsService'):GetClientId()..\"");
    return lua(`return loadstring(game:HttpGet("${target}"))()`);
  }

  const { data: lic } = await supabaseAdmin
    .from("license_keys")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (!lic) return luaError("Invalid key");
  if (lic.revoked) return luaError("Key revoked");
  if (lic.script_id && lic.script_id !== script.id)
    return luaError("Key not valid for this script");
  if (lic.expires_at && new Date(lic.expires_at) < new Date()) return luaError("Key expired");

  const { data: banned } = await supabaseAdmin
    .from("hwid_bans")
    .select("id")
    .eq("user_id", script.user_id)
    .eq("hwid", hwid)
    .maybeSingle();
  if (banned) return luaError("HWID banned");

  if (!lic.hwid) {
    await supabaseAdmin.from("license_keys").update({ hwid }).eq("id", lic.id);
  } else if (lic.hwid !== hwid) {
    return luaError("HWID mismatch — reset your HWID first");
  }

  await bumpRuns();
  return lua(payload);
}

function lua(body: string) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
function luaError(msg: string) {
  const escaped = msg.replace(/"/g, '\\"');
  return new Response(`error("[LuaMore] ${escaped}")`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
