import { createFileRoute } from "@tanstack/react-router";

// Legacy loader URL — kept working; prefer /api/public/r/<public_id>.

export const Route = createFileRoute("/api/public/loader/$publicId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const publicId = String(params?.publicId || "").replace(/\.lua$/i, "").trim();
          const { handleLoaderRequest } = await import("@/lib/loader.server");
          return handleLoaderRequest({ publicId }, request);
        } catch (err: any) {
          return new Response(`error("[LuaMore] API loader error: ${err?.message || "unknown"}")`, {
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
