import { createFileRoute } from "@tanstack/react-router";

// Hosted loader URL — returns a small snippet that reads script_key from
// _G / getgenv() and re-fetches the raw script with hwid appended.
//   loadstring(game:HttpGet("https://luamore.app/scripts/hosted/<public_id>.lua"))()

export const Route = createFileRoute("/scripts/hosted/$publicId.lua")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        // Filename `$publicId[.]lua` compiles to a param whose key includes the escape.
        // Read from the URL path directly to be safe across TSR versions.
        const p = params as Record<string, string>;
        const match = url.pathname.match(/\/scripts\/hosted\/([^/]+)\.lua$/);
        const publicId = match?.[1] ?? p.publicId ?? p["publicId.lua"] ?? "";
        // Determine if the script is FFA — if so, just proxy directly to raw.
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("scripts")
            .select("ffa")
            .eq("public_id", publicId)
            .maybeSingle();
          if (data?.ffa) {
            const { handleLoaderRequest } = await import("@/lib/loader.server");
            return handleLoaderRequest({ publicId }, request);
          }
        } catch {
          /* fall through to keyed snippet */
        }

        const snippet = `local env = (getgenv and getgenv()) or _G
local key = env.script_key or script_key
if not key or tostring(key) == "" then
  warn("[LuaMore] script_key was not set.")
  return
end
local hwid = game:GetService("RbxAnalyticsService"):GetClientId()
local chunk = game:HttpGet("${origin}/scripts/raw/${publicId}.lua?key=" .. key .. "&hwid=" .. hwid)
loadstring(chunk)()
`;
        return new Response(snippet, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
