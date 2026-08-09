import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function extractKey(request: Request, body: Record<string, unknown> | null): string | null {
  const h = request.headers;
  const auth = h.get("authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1].trim();
    return auth.trim();
  }
  const x = h.get("x-api-key");
  if (x) return x.trim();
  if (body && typeof body["api_key"] === "string") return (body["api_key"] as string).trim();
  return null;
}

export const Route = createFileRoute("/api/public/obfuscate")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: Record<string, unknown> | null = null;
        const ct = request.headers.get("content-type") || "";
        try {
          if (ct.includes("application/json")) {
            body = (await request.json()) as Record<string, unknown>;
          } else {
            const text = await request.text();
            try { body = JSON.parse(text) as Record<string, unknown>; }
            catch { body = { source: text }; }
          }
        } catch {
          return json({ error: "invalid body" }, 400);
        }

        const apiKey = extractKey(request, body);
        if (!apiKey) return json({ error: "missing api key — send Authorization: Bearer <key>" }, 401);

        const source = typeof body?.["source"] === "string"
          ? (body!["source"] as string)
          : typeof body?.["code"] === "string" ? (body!["code"] as string) : "";
        if (!source || source.trim().length === 0) {
          return json({ error: "missing 'source' string in body" }, 400);
        }
        if (source.length > 1_000_000_000) {
          return json({ error: "source too large" }, 413);
        }

        const hash = await sha256Hex(apiKey);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: keyRow, error: keyErr } = await supabaseAdmin
          .from("api_keys")
          .select("id, user_id")
          .eq("key_hash", hash)
          .maybeSingle();
        if (keyErr) return json({ error: "auth lookup failed" }, 500);
        if (!keyRow) return json({ error: "invalid api key" }, 401);

        try {
          const { obfuscateLua } = await import("@/lib/obfuscator.server");
          const out = obfuscateLua(source);
          // fire-and-forget last_used bump
          void supabaseAdmin
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", keyRow.id);
          return json({
            ok: true,
            obfuscated: out,
            bytes_in: source.length,
            bytes_out: out.length,
            engine: "LuaMore VM v4",
          });
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "obfuscation failed" }, 500);
        }
      },
    },
  },
});
