import { createFileRoute } from "@tanstack/react-router";

// Hosted loader — returns a small stub that captures HWID + Roblox player
// identity and re-fetches the raw script with those params appended.

export const Route = createFileRoute("/scripts/hosted/$publicId.lua")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const p = params as Record<string, string>;
        const match = url.pathname.match(/\/scripts\/hosted\/([^/]+)\.lua$/);
        const publicId = match?.[1] ?? p.publicId ?? p["publicId.lua"] ?? "";

        // FFA scripts: proxy directly (still logs identity via query params).
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
          /* fall through */
        }

        const snippet = `local env = (getgenv and getgenv()) or _G
local key = env.script_key or script_key or ""
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ok, hwid = pcall(function() return game:GetService("RbxAnalyticsService"):GetClientId() end)
if not ok then hwid = "unknown" end
local plr = Players.LocalPlayer
local uname = plr and plr.Name or "server"
local uid = plr and tostring(plr.UserId) or "0"
local place = tostring(game.PlaceId or 0)
local q = "?key=" .. HttpService:UrlEncode(tostring(key))
  .. "&hwid=" .. HttpService:UrlEncode(tostring(hwid))
  .. "&user=" .. HttpService:UrlEncode(uname)
  .. "&uid=" .. HttpService:UrlEncode(uid)
  .. "&place=" .. HttpService:UrlEncode(place)
local chunk = game:HttpGet("${origin}/scripts/raw/${publicId}.lua" .. q)
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
