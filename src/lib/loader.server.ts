// Shared handler for the public script loader endpoints.
// Served at /api/public/r/<token>, /api/public/loader/<token>, and /scripts/raw/<publicId>.lua
//
// <token> may be a script public_id (FFA scripts) or a license key.
// Query params (added by the hosted stub): key, hwid, user, uid, place.

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
  const robloxUsername = url.searchParams.get("user")?.trim() || null;
  const robloxUserId = url.searchParams.get("uid")?.trim() || null;
  const placeId = url.searchParams.get("place")?.trim() || null;
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;

  let key = url.searchParams.get("key")?.trim() || null;
  if (key === "" || key === "undefined" || key === "nil") key = null;
  let script: ScriptRecord | null = null;

  try {
    const { data: dbScript } = await supabaseAdmin
      .from("scripts")
      .select("id, user_id, name, code, obfuscated_code, is_protected, ffa, public_id, is_active, run_count")
      .eq("public_id", token)
      .maybeSingle();
    if (dbScript) script = dbScript;
  } catch { /* ignore */ }

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
          .select("id, user_id, name, code, obfuscated_code, is_protected, ffa, public_id, is_active, run_count")
          .eq("id", byKey.script_id)
          .maybeSingle();
        script = s2 ?? null;
      }
    } catch { /* ignore */ }
  }

  if (!script) return luaError("Script not found");
  if (!script.is_active) return luaError("Script is disabled");
  if (!script.code) return luaError("Script has no code yet");

  const payload =
    script.is_protected && script.obfuscated_code
      ? script.obfuscated_code
      : obfuscateLua(script.code);

  const finalize = async (licenseKeyId: string | null, resolvedKey: string | null) => {
    bumpScriptRuns(script.id);
    try {
      await supabaseAdmin
        .from("scripts")
        .update({ run_count: (script.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
        .eq("id", script.id);
    } catch { /* ignore */ }
    try {
      await supabaseAdmin.from("execution_logs").insert({
        user_id: script.user_id,
        script_id: script.id,
        license_key_id: licenseKeyId,
        key: resolvedKey,
        hwid,
        roblox_username: robloxUsername,
        roblox_user_id: robloxUserId,
        place_id: placeId,
        ip,
      });
    } catch { /* ignore */ }
    // Fire webhook if any panel for this owner+script has one
    try {
      const { data: panel } = await supabaseAdmin
        .from("panels")
        .select("webhook_url")
        .eq("user_id", script.user_id)
        .eq("script_id", script.id)
        .not("webhook_url", "is", null)
        .limit(1)
        .maybeSingle();
      if (panel?.webhook_url) {
        void fetch(panel.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "LuaMore Executions",
            embeds: [{
              title: `▶ ${script.name} executed`,
              color: 0x1e40af,
              fields: [
                { name: "Roblox User", value: robloxUsername ? `${robloxUsername} (${robloxUserId ?? "?"})` : "unknown", inline: true },
                { name: "Place", value: placeId ?? "unknown", inline: true },
                { name: "Key", value: resolvedKey ? `\`${maskKey(resolvedKey)}\`` : (script.ffa ? "FFA" : "none"), inline: false },
                { name: "HWID", value: hwid ? `\`${hwid}\`` : "unknown", inline: false },
                { name: "IP", value: ip ?? "unknown", inline: true },
              ],
              timestamp: new Date().toISOString(),
            }],
          }),
        }).catch(() => undefined);
      }
    } catch { /* ignore */ }
  };

  if (script.ffa) {
    await finalize(null, null);
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

  await finalize(lic.id, key);
  return lua(payload);
}

function maskKey(k: string) {
  if (k.length <= 8) return k;
  return `${k.slice(0, 4)}…${k.slice(-6)}`;
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
