import { createFileRoute } from "@tanstack/react-router";

// FFA / Direct Hosted loader route:
// loadstring(game:HttpGet("https://luamore.app/files/loaders/<public_id>.lua"))()

export const Route = createFileRoute("/files/loaders/$publicId.lua")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const url = new URL(request.url);
          const p = params as Record<string, string>;
          const match = url.pathname.match(/\/files\/loaders\/([^/]+?)(?:\.lua)?$/i);
          let publicId = match?.[1] ?? p.publicId ?? p["publicId.lua"] ?? "";
          publicId = publicId.replace(/\.lua$/i, "").trim();
          const { handleLoaderRequest } = await import("@/lib/loader.server");
          return handleLoaderRequest({ publicId }, request);
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown";
          return new Response(`error("[LuaMore] Route error: ${message}")`, {
            status: 200,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }
      },
    },
  },
});
