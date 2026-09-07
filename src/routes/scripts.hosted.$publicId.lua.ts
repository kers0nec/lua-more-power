import { createFileRoute } from "@tanstack/react-router";

// Luasnapper-style raw hosted loader:
//   loadstring(game:HttpGet("https://<host>/scripts/hosted/<public_id>.lua"))()
// Returns obfuscated payload directly. No source exposure.

export const Route = createFileRoute("/scripts/hosted/$publicId/lua")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const publicId = String(params?.publicId || "")
            .replace(/\.lua$/i, "")
            .trim();

          if (!publicId) {
            return new Response(`error("[LuaMore] Missing script id")`, {
              status: 200,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-store",
              },
            });
          }

          const { handleLoaderRequest } = await import("@/lib/loader.server");
          return handleLoaderRequest({ publicId }, request);
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown";
          return new Response(`error("[LuaMore] Hosted loader error: ${message}")`, {
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
