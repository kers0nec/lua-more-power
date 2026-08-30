import { createFileRoute } from "@tanstack/react-router";

// Raw loader — returns the obfuscated payload directly.
// Called by the hosted snippet with ?key=...&hwid=...

export const Route = createFileRoute("/scripts/raw/$publicId.lua")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { handleLoaderRequest } = await import("@/lib/loader.server");
        return handleLoaderRequest({ publicId: params.publicId }, request);
      },
    },
  },
});
