import { createFileRoute } from "@tanstack/react-router";

// Raw loader — returns the obfuscated payload directly.
// Called by the hosted snippet with ?key=...&hwid=...

export const Route = createFileRoute("/scripts/raw/$publicId.lua")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const url = new URL(request.url);
          const p = params as Record<string, string>;
          const match = url.pathname.match(/\/scripts\/raw\/([^/]+?)(?:\.lua)?$/i);
          let publicId = match?.[1] ?? p.publicId ?? p["publicId.lua"] ?? "";
          publicId = publicId.replace(/\.lua$/i, "").trim();

          const { handleLoaderRequest } = await import("@/lib/loader.server");
          return handleLoaderRequest({ publicId }, request);
        } catch (err: any) {
          return new Response(`error("[LuaMore] Raw route error: ${err?.message || "unknown"}")`, {
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
