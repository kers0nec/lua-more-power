import { createFileRoute } from "@tanstack/react-router";

// FFA / Direct Hosted loader route:
// loadstring(game:HttpGet("https://luasnapper.xyz/files/loaders/<public_id>.lua"))()

export const Route = createFileRoute("/files/loaders/$publicId.lua")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const p = params as Record<string, string>;
        const match = url.pathname.match(/\/files\/loaders\/([^/]+)\.lua$/);
        const publicId = match?.[1] ?? p.publicId ?? p["publicId.lua"] ?? "";
        const { handleLoaderRequest } = await import("@/lib/loader.server");
        return handleLoaderRequest({ publicId }, request);
      },
    },
  },
});
