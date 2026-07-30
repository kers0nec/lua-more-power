import { createFileRoute } from "@tanstack/react-router";

// Starts the Discord OAuth login flow.
//   GET /api/public/discord/oauth/start
export const Route = createFileRoute("/api/public/discord/oauth/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.DISCORD_CLIENT_ID;
        if (!clientId) return new Response("Discord login is not configured", { status: 500 });

        let origin = process.env.PUBLIC_BASE_URL || new URL(request.url).origin;
        if (!/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
        origin = origin.replace(/\/+$/, "");
        const redirectUri = `${origin}/api/public/discord/oauth/callback`;

        const url = new URL("https://discord.com/oauth2/authorize");
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("redirect_uri", redirectUri);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", "identify email");
        url.searchParams.set("prompt", "consent");

        return Response.redirect(url.toString(), 302);
      },
    },
  },
});
