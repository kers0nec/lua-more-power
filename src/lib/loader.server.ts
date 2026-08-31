// Shared handler for the public script loader endpoints.
// Served at both /api/public/r/<token> (short) and /api/public/loader/<token>.
//
// <token> may be a script public_id (FFA scripts) or a license key. Clean
// user-facing loader:  loadstring(game:HttpGet(".../api/public/r/<token>"))()
// On the first hit (no ?hwid=) we return a stub that re-requests with
// the client's HWID & Roblox LocalPlayer info appended, so HWID locking & Discord logging work seamlessly.
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
  const hwid =
    url.searchParams.get("hwid")?.trim() || request.headers.get("x-hwid")?.trim() || null;
  const rbxUser =
    url.searchParams.get("rbx_user")?.trim() ||
    request.headers.get("x-roblox-user")?.trim() ||
    "Unknown Player";
  const rbxId =
    url.searchParams.get("rbx_id")?.trim() || request.headers.get("x-roblox-id")?.trim() || "0";

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

  const sendExecutionWebhook = async (licenseKeyStr: string | null) => {
    try {
      // Look up webhook URL on associated panel or user profile
      const { data: panel } = await supabaseAdmin
        .from("panels")
        .select("webhook_url, name")
        .eq("script_id", script!.id)
        .not("webhook_url", "is", null)
        .limit(1)
        .maybeSingle();

      const webhookUrl = panel?.webhook_url;
      if (webhookUrl && webhookUrl.startsWith("http")) {
        const embed = {
          title: `🚀 Script Executed — ${script!.name}`,
          color: 0x00aaff,
          fields: [
            {
              name: "🔑 License Key",
              value: licenseKeyStr
                ? `\`${licenseKeyStr}\``
                : script!.ffa
                  ? "`FFA (Public)`"
                  : "`Direct Execution`",
              inline: true,
            },
            {
              name: "💻 Hardware ID (HWID)",
              value: hwid ? `\`${hwid.slice(0, 36)}\`` : "`Not Provided`",
              inline: true,
            },
            {
              name: "👤 Roblox User",
              value:
                rbxId !== "0" && rbxId !== "Unknown"
                  ? `**${rbxUser}** (ID: \`${rbxId}\`)`
                  : `**${rbxUser}**`,
              inline: false,
            },
            {
              name: "📜 Script Name",
              value: `**${script!.name}** (\`${script!.public_id}\`)`,
              inline: true,
            },
            {
              name: "⏰ Time",
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            },
          ],
          footer: {
            text: "LuaMore Execution Logger • Verified",
          },
          timestamp: new Date().toISOString(),
        };

        void fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "LuaMore Logger",
            avatar_url:
              "https://ais-pre-wjegb7zmws6zwg54su3x6o-944319576513.europe-west2.run.app/favicon.ico",
            embeds: [embed],
          }),
        }).catch((err) => console.warn("[Webhook Log Error]", err));
      }
    } catch {
      // ignore webhook failures
    }
  };

  const bumpRuns = async (usedKey: string | null) => {
    bumpScriptRuns(script!.id);
    try {
      void supabaseAdmin
        .from("scripts")
        .update({ run_count: (script!.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
        .eq("id", script!.id);
    } catch {
      // ignore
    }
    void sendExecutionWebhook(usedKey);
  };

  // Serve stored obfuscated_code when protection is enabled and a build exists;
  // otherwise obfuscate on the fly with derived keystream.
  const payload =
    script.is_protected && script.obfuscated_code
      ? script.obfuscated_code
      : obfuscateLua(script.code, script.public_id);

  if (script.ffa) {
    await bumpRuns(null);
    return lua(payload);
  }

  // First hit without a HWID: hand back a stub that re-requests with the HWID, LocalPlayer info, and script_key.
  if (!hwid) {
    const again = new URL(request.url);
    again.searchParams.set("hwid", "__HWID__");
    again.searchParams.set("rbx_user", "__RBX_USER__");
    again.searchParams.set("rbx_id", "__RBX_ID__");
    if (!key) {
      again.searchParams.set("key", "__SCRIPT_KEY__");
    }

    let target = again
      .toString()
      .replace(
        "__HWID__",
        "\"..(pcall(function() return game:GetService('RbxAnalyticsService'):GetClientId() end) and game:GetService('RbxAnalyticsService'):GetClientId() or 'Unknown_HWID')..\"",
      )
      .replace(
        "__RBX_USER__",
        "\"..(game:GetService('Players').LocalPlayer and game:GetService('Players').LocalPlayer.Name or 'Unknown_Player')..\"",
      )
      .replace(
        "__RBX_ID__",
        "\"..(game:GetService('Players').LocalPlayer and tostring(game:GetService('Players').LocalPlayer.UserId) or '0')..\"",
      );

    if (!key) {
      target = target.replace("__SCRIPT_KEY__", '"..(_k).."');
      return lua(`local _k = (typeof(script_key) == "string" and script_key) or (getgenv and typeof(getgenv().script_key) == "string" and getgenv().script_key) or (typeof(_G.script_key) == "string" and _G.script_key) or ""
if _k == "" then
    return error("[LuaMore] License key required! Please define script_key = \\"your_key\\" before executing.")
end
return loadstring(game:HttpGet("${target}"))()`);
    }

    return lua(`return loadstring(game:HttpGet("${target}"))()`);
  }

  if (!key) return luaError("License key required");

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

  await bumpRuns(lic.key);
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
