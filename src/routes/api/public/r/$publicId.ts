import { createFileRoute } from "@tanstack/react-router";

// Short public loader URL:
//   loadstring(game:HttpGet("https://.../api/public/r/<public_id>"))()

export const Route = createFileRoute("/api/public/r/$publicId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { handleLoaderRequest } = await import("@/lib/loader.server");
        return handleLoaderRequest(params, request);
      },
    },
  },
});
