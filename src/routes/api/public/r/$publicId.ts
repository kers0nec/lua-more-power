import { createFileRoute } from "@tanstack/react-router";

// Short public loader URL:
//   loadstring(game:HttpGet("https://.../api/public/r/<public_id>"))()

export const Route = createFileRoute("/api/public/r/$publicId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const publicId = String(params?.publicId || "")
            .replace(/\.lua$/i, "")
            .trim();
          const { handleLoaderRequest } = await import("@/lib/loader.server");
          return handleLoaderRequest({ publicId }, request);
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown";
          return new Response(`error("[LuaMore] Public r loader error: ${message}")`, {
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
