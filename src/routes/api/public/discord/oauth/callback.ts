import { createFileRoute } from "@tanstack/react-router";

// Discord OAuth callback: exchanges the code, finds/creates the matching
// LuaMore account, links the Discord ID, then signs the user in by
// redirecting to a one-time magic link.
//   GET /api/public/discord/oauth/callback?code=...
export const Route = createFileRoute("/api/public/discord/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        if (!clientId || !clientSecret) return fail("Discord login is not configured");

        const reqUrl = new URL(request.url);
        let origin = process.env.PUBLIC_BASE_URL || reqUrl.origin;
        if (!/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
        origin = origin.replace(/\/+$/, "");
        const code = reqUrl.searchParams.get("code");
        if (!code) return fail("Discord did not return an authorization code");

        const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: `${origin}/api/public/discord/oauth/callback`,
          }),
        });
        if (!tokenRes.ok) return fail(`Discord token exchange failed (${tokenRes.status})`);
        const token = (await tokenRes.json()) as { access_token?: string };
        if (!token.access_token) return fail("Discord token exchange returned no token");

        const meRes = await fetch("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        if (!meRes.ok) return fail("Could not read your Discord profile");
        const me = (await meRes.json()) as {
          id: string;
          email?: string | null;
          username?: string;
          global_name?: string | null;
        };
        if (!me.email) return fail("Your Discord account has no verified email address");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const displayName = me.global_name || me.username || me.email.split("@")[0];

        // Existing profile linked to this Discord ID?
        const { data: linked } = await supabaseAdmin
          .from("profiles")
          .select("id, email")
          .eq("discord_id", me.id)
          .maybeSingle();

        let email = linked?.email ?? me.email;

        if (!linked) {
          const { data: byEmail } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", me.email)
            .maybeSingle();

          if (byEmail) {
            await supabaseAdmin.from("profiles").update({ discord_id: me.id }).eq("id", byEmail.id);
          } else {
            const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
              email: me.email,
              email_confirm: true,
              user_metadata: { display_name: displayName, provider_id: me.id },
            });
            if (createErr && !/already/i.test(createErr.message)) return fail(createErr.message);
            if (created?.user) {
              await supabaseAdmin
                .from("profiles")
                .update({ discord_id: me.id, display_name: displayName })
                .eq("id", created.user.id);
            }
          }
          email = me.email;
        }

        const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: email!,
          options: { redirectTo: `${origin}/dashboard` },
        });
        if (linkErr || !link?.properties?.action_link) {
          return fail(linkErr?.message ?? "Could not create a sign-in link");
        }

        return Response.redirect(link.properties.action_link, 302);
      },
    },
  },
});

function fail(message: string) {
  const url = `/auth?error=${encodeURIComponent(message)}`;
  return new Response(null, { status: 302, headers: { Location: url } });
}
