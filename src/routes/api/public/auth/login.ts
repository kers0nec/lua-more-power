import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractKeyOrToken(
  request: Request,
  body: Record<string, unknown> | null,
): {
  type: "bearer_jwt" | "api_key" | null;
  value: string | null;
} {
  const auth = request.headers.get("authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const val = (m ? m[1] : auth).trim();
    if (val.startsWith("lm_") || val.length === 64) {
      return { type: "api_key", value: val };
    }
    return { type: "bearer_jwt", value: val };
  }
  const x = request.headers.get("x-api-key");
  if (x) return { type: "api_key", value: x.trim() };
  if (body && typeof body["api_key"] === "string") {
    return { type: "api_key", value: (body["api_key"] as string).trim() };
  }
  return { type: null, value: null };
}

export const Route = createFileRoute("/api/public/auth/login")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      // GET: Validate current session token or API key and return profile
      GET: async ({ request }) => {
        const { type, value } = extractKeyOrToken(request, null);
        if (!value) {
          return json(
            {
              ok: false,
              error:
                "Missing credentials. Provide Authorization: Bearer <token_or_api_key> or X-API-Key.",
            },
            401,
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (type === "api_key") {
          const hash = await sha256Hex(value);
          const { data: keyRow, error: keyErr } = await supabaseAdmin
            .from("api_keys")
            .select("id, label, user_id, last_used_at, created_at")
            .eq("key_hash", hash)
            .maybeSingle();

          if (keyErr || !keyRow) {
            return json({ ok: false, error: "Invalid API key" }, 401);
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id, display_name, email, discord_id, plan, created_at")
            .eq("id", keyRow.user_id)
            .maybeSingle();

          return json({
            ok: true,
            authenticated_via: "api_key",
            key: { id: keyRow.id, name: keyRow.label },
            user: {
              id: keyRow.user_id,
              email: profile?.email || null,
              username: profile?.display_name || null,
              discord_id: profile?.discord_id || null,
              tier: profile?.plan || "free",
            },
          });
        }

        // Supabase JWT session token
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(value);
        if (userErr || !userData?.user) {
          return json({ ok: false, error: "Invalid or expired session token" }, 401);
        }

        const user = userData.user;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, display_name, email, discord_id, plan, created_at")
          .eq("id", user.id)
          .maybeSingle();

        return json({
          ok: true,
          authenticated_via: "jwt",
          user: {
            id: user.id,
            email: user.email,
            username: profile?.display_name || user.user_metadata?.username || null,
            discord_id: profile?.discord_id || null,
            tier: profile?.plan || "free",
          },
        });
      },

      // POST: Authenticate via email+password, magic link, or API key
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          const ct = request.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            body = (await request.json()) as Record<string, unknown>;
          } else {
            const txt = await request.text();
            body = JSON.parse(txt) as Record<string, unknown>;
          }
        } catch {
          return json({ ok: false, error: "Invalid JSON body" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. API Key authentication
        const apiKey =
          (typeof body["api_key"] === "string" && body["api_key"].trim()) ||
          request.headers.get("x-api-key")?.trim() ||
          null;

        if (apiKey) {
          const hash = await sha256Hex(apiKey);
          const { data: keyRow, error: keyErr } = await supabaseAdmin
            .from("api_keys")
            .select("id, label, user_id, last_used_at, created_at")
            .eq("key_hash", hash)
            .maybeSingle();

          if (keyErr || !keyRow) {
            return json({ ok: false, error: "Invalid API key" }, 401);
          }

          // Bump last_used_at
          void supabaseAdmin
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", keyRow.id);

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id, display_name, email, discord_id, plan, created_at")
            .eq("id", keyRow.user_id)
            .maybeSingle();

          return json({
            ok: true,
            authenticated_via: "api_key",
            key: { id: keyRow.id, name: keyRow.label },
            user: {
              id: keyRow.user_id,
              email: profile?.email || null,
              username: profile?.display_name || null,
              discord_id: profile?.discord_id || null,
              tier: profile?.plan || "free",
            },
          });
        }

        const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : "";
        const password = typeof body["password"] === "string" ? body["password"] : "";
        const isMagicLink = Boolean(body["magic_link"]);

        if (!email) {
          return json(
            {
              ok: false,
              error: "Missing credentials. Provide { email, password } or { api_key }.",
            },
            400,
          );
        }

        // 2. Magic Link login
        if (isMagicLink) {
          const redirect =
            typeof body["redirect_to"] === "string"
              ? body["redirect_to"]
              : typeof request.headers.get("origin") === "string"
                ? `${request.headers.get("origin")}/dashboard`
                : "https://luamore.app/dashboard";

          const { error: otpErr } = await supabaseAdmin.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirect,
            },
          });

          if (otpErr) {
            return json({ ok: false, error: otpErr.message }, 400);
          }

          return json({
            ok: true,
            message: `Magic link dispatched to ${email}. Check your inbox.`,
          });
        }

        // 3. Email + Password login
        if (!password) {
          return json({ ok: false, error: "Missing password in request body" }, 400);
        }

        const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        });

        if (authErr || !authData.session || !authData.user) {
          return json(
            {
              ok: false,
              error: authErr?.message || "Invalid email or password",
            },
            401,
          );
        }

        const user = authData.user;
        const session = authData.session;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, display_name, email, discord_id, plan, created_at")
          .eq("id", user.id)
          .maybeSingle();

        return json({
          ok: true,
          authenticated_via: "password",
          user: {
            id: user.id,
            email: user.email,
            username: profile?.display_name || user.user_metadata?.username || null,
            discord_id: profile?.discord_id || null,
            tier: profile?.plan || "free",
          },
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            token_type: "bearer",
            expires_in: session.expires_in,
            expires_at: session.expires_at,
          },
        });
      },
    },
  },
});
