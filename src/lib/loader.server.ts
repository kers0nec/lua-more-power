// Shared handler for the public script loader endpoints.
// Served at both /api/public/r/<token> (short) and /api/public/loader/<token>.
//
// <token> may be a script public_id (FFA scripts) or a license key. Clean
// user-facing loader:  loadstring(game:HttpGet(".../api/public/r/<token>"))()
// On the first hit (no ?hwid=) we return a tiny stub that re-requests with
// the client's HWID appended, so HWID locking still works.

export async function handleLoaderRequest(params: { publicId: string }, request: Request) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const url = new URL(request.url);
  const token = params.publicId;
  const hwid = url.searchParams.get("hwid")?.trim() || null;

  // Resolve the token: script public_id first, then license key.
  let key = url.searchParams.get("key")?.trim() || null;
  let { data: script } = await supabaseAdmin
    .from("scripts")
    .select("id, user_id, name, code, ffa, public_id, is_active, run_count")
    .eq("public_id", token)
    .maybeSingle();

  if (!script) {
    const { data: byKey } = await supabaseAdmin
      .from("license_keys")
      .select("key, script_id")
      .eq("key", token)
      .maybeSingle();
    if (!byKey?.script_id) return luaError("Script not found");
    key = byKey.key;
    const { data: s2 } = await supabaseAdmin
      .from("scripts")
      .select("id, user_id, name, code, ffa, public_id, is_active, run_count")
      .eq("id", byKey.script_id)
      .maybeSingle();
    script = s2 ?? null;
  }

  if (!script) return luaError("Script not found");
  if (!script.is_active) return luaError("Script is disabled");
  if (!script.code) return luaError("Script has no code yet");

  const bumpRuns = () =>
    supabaseAdmin
      .from("scripts")
      .update({ run_count: (script!.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
      .eq("id", script!.id);

  if (script.ffa) {
    await bumpRuns();
    return lua(script.code);
  }

  if (!key) return luaError("License key required");

  // First hit without a HWID: hand back a stub that re-requests with the HWID.
  if (!hwid) {
    const again = new URL(request.url);
    again.searchParams.set("hwid", "__HWID__");
    const target = again.toString().replace("__HWID__", '"..game:GetService(\'RbxAnalyticsService\'):GetClientId().."');
    return lua(`return loadstring(game:HttpGet("${target}"))()`);
  }

  const { data: lic } = await supabaseAdmin
    .from("license_keys")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (!lic) return luaError("Invalid key");
  if (lic.revoked) return luaError("Key revoked");
  if (lic.script_id && lic.script_id !== script.id) return luaError("Key not valid for this script");
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
  return lua(script.code);
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
