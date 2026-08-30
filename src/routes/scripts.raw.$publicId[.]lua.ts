import { createFileRoute } from "@tanstack/react-router";

// Raw loader — returns the obfuscated payload directly.
// Called by the hosted snippet with ?key=...&hwid=...

export const Route = createFileRoute("/scripts/raw/$publicId.lua")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const p = params as Record<string, string>;
        const match = url.pathname.match(/\/scripts\/raw\/([^/]+)\.lua$/);
        const publicId = match?.[1] ?? p.publicId ?? p["publicId.lua"] ?? "";
        const { handleLoaderRequest } = await import("@/lib/loader.server");
        return handleLoaderRequest({ publicId }, request);
      },
    },
  },
});
