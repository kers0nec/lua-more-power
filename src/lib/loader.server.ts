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
  try {
    let supabaseAdmin: any = null;
    try {
      const mod = await import("@/integrations/supabase/client.server");
      supabaseAdmin = mod.supabaseAdmin;
    } catch {
      // Supabase client unavailable
    }

    const url = new URL(request.url);
    const rawToken = params.publicId || "";
    const token = rawToken.replace(/\.lua$/i, "").trim();
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

    if (supabaseAdmin) {
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
    }

    if (!script) {
      const local = getScriptByPublicId(token);
      if (local) script = local;
    }

    if (!script && supabaseAdmin) {
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

    if (!script) return luaError("Script not found (" + token + ")");
    if (script.is_active === false) return luaError("Script is disabled");
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

  // Serve fresh hardened obfuscated payload whenever source code is present
  const payload = script.code
    ? obfuscateLua(script.code, script.public_id)
    : (script.obfuscated_code ?? `-- Empty script\nprint("No payload")`);

  if (script.ffa) {
    await bumpRuns(null);
    return lua(payload);
  }

  // First hit without a HWID: hand back a clean, robust stub that captures executor HWID & LocalPlayer safely
  if (!hwid) {
    const rawUrl = new URL(request.url);
    rawUrl.search = ""; // clear query params for clean base
    const baseUrl = rawUrl.toString();

    return lua(`--[[ LuaMore Smart Bootstrap Loader ]]
local _type = (function()
    if type(typeof) == "function" then return typeof end
    if type(type) == "function" then return type end
    return function(v) return "unknown" end
end)()

local _k = (_type(script_key) == "string" and script_key) or (getgenv and _type(getgenv) == "function" and _type(getgenv().script_key) == "string" and getgenv().script_key) or (_type(_G) == "table" and _type(_G.script_key) == "string" and _G.script_key) or "${key || ""}"

local _hwid = "Unknown_HWID"
pcall(function()
    if _type(gethwid) == "function" then
        _hwid = tostring(gethwid())
    elseif _type(get_hwid) == "function" then
        _hwid = tostring(get_hwid())
    elseif getgenv and _type(getgenv) == "function" and _type(getgenv().gethwid) == "function" then
        _hwid = tostring(getgenv().gethwid())
    elseif game and _type(game.GetService) == "function" then
        local analytics = game:GetService("RbxAnalyticsService")
        if analytics and _type(analytics.GetClientId) == "function" then
            _hwid = tostring(analytics:GetClientId())
        end
    end
end)

local _rbx_user = "Unknown_Player"
local _rbx_id = "0"
pcall(function()
    if game and _type(game.GetService) == "function" then
        local plrs = game:GetService("Players")
        if plrs and plrs.LocalPlayer then
            _rbx_user = tostring(plrs.LocalPlayer.Name or "Unknown_Player")
            _rbx_id = tostring(plrs.LocalPlayer.UserId or 0)
        end
    end
end)

local function _escape(str)
    return string.gsub(tostring(str), "([^%w_%-.])", function(c)
        return string.format("%%%02X", string.byte(c))
    end)
end

local _reqUrl = "${baseUrl}?hwid=" .. _escape(_hwid) .. "&rbx_user=" .. _escape(_rbx_user) .. "&rbx_id=" .. _escape(_rbx_id)
if _k and _k ~= "" then
    _reqUrl = _reqUrl .. "&key=" .. _escape(_k)
end

local _http = nil
if game and (_type(game) == "userdata" or _type(game) == "table") then
    pcall(function()
        if game.HttpGet then
            _http = function(u) return game:HttpGet(u) end
        end
    end)
end
if not _http and _type(HttpGet) == "function" then
    _http = function(u) return HttpGet(u) end
end
if not _http then
    pcall(function()
        local r = (_type(request) == "function" and request) or (_type(http_request) == "function" and http_request) or (_type(syn) == "table" and _type(syn.request) == "function" and syn.request) or (_type(http) == "table" and _type(http.request) == "function" and http.request)
        if r then
            _http = function(u)
                local res = r({ Url = u, Method = "GET" })
                return (res and res.Body) or ""
            end
        end
    end)
end

if not _http then
    error("[LuaMore] Unable to find HTTP client (game:HttpGet/request) in executor environment!")
end

local _response = _http(_reqUrl)
local _fn = (function()
    if _type(loadstring) == "function" then return loadstring end
    if _type(load) == "function" then return load end
    return nil
end)()

if not _fn then
    error("[LuaMore] Executor environment missing loadstring/load function!")
end

local _compiled, _err = _fn(_response)
if not _compiled then
    error("[LuaMore Compile Error]: " .. tostring(_err))
end
return _compiled()`);
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
  } catch (err: any) {
    console.error("[LuaMore Loader Error]", err);
    return luaError("Loader server error: " + (err?.message || "unknown error"));
  }
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
